/**
 * ============================================
 * RSVP SYSTEM
 * Sophie & Jacob Schuller Wedding Website
 * ============================================
 *
 * Hybrid RSVP Architecture:
 * - READ:  guest data from a published Google Sheet (CSV), or from
 *          data/guests.json while CONFIG.googleSheets.useLocalData is true
 * - WRITE: submissions to a hidden Google Form endpoint
 *
 * Guest flow:
 *   1. Guest types their name.
 *      - An exact match on "first last" OR "nickname last" goes straight
 *        through to their household.
 *      - Anything else offers a list of suggested names to pick from.
 *      - A name that isn't on the list cannot proceed. That's the point:
 *        the guest's name is the only credential there is.
 *   2. Their whole household appears on one screen. Per person:
 *      accepts/declines, then (only once accepting) an entrée and an
 *      optional dietary note. Children get the kids' meal notice instead.
 *      Anyone invited to the rehearsal dinner also answers for that.
 *   3. Confirmation.
 */

(function() {
    'use strict';

    // ----------------------------------------
    // STATE
    // ----------------------------------------

    const state = {
        guests: [],
        households: {},
        currentHousehold: null,
        isLoading: false,
        hasError: false
    };

    // ----------------------------------------
    // DOM ELEMENTS
    // ----------------------------------------

    const elements = {
        step1: document.getElementById('rsvp-step-1'),
        step2: document.getElementById('rsvp-step-2'),
        step3: document.getElementById('rsvp-step-3'),
        lookupForm: document.getElementById('rsvp-lookup-form'),
        householdForm: document.getElementById('rsvp-household-form'),
        guestNameInput: document.getElementById('guest-name'),
        noteInput: document.getElementById('rsvp-note'),
        householdGreeting: document.getElementById('household-greeting'),
        householdMembers: document.getElementById('household-members'),
        rehearsalBlock: document.getElementById('rsvp-rehearsal'),
        confirmationMessage: document.getElementById('rsvp-confirmation-message'),
        errorMessage: document.getElementById('rsvp-error'),
        formError: document.getElementById('rsvp-form-error'),
        backButton: document.getElementById('rsvp-back'),
        instructions: document.getElementById('rsvp-instructions'),
        choices: document.getElementById('rsvp-choices')
    };

    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------

    /**
     * Preview the RSVP form without opening it to the world.
     *
     * Add ?preview to the URL while running on localhost and the form
     * appears even though CONFIG.rsvp.isOpen is false. This deliberately
     * does nothing on the live site — the hostname check means a stray
     * link can't let a guest RSVP early — so the switch never has to be
     * flipped just to look at it.
     */
    function isLocalPreview() {
        const local = ['localhost', '127.0.0.1', '[::1]', ''];
        if (!local.includes(window.location.hostname)) return false;
        return new URLSearchParams(window.location.search).has('preview');
    }

    async function init() {
        // The RSVP is closed until CONFIG.rsvp.isOpen is flipped to true.
        // While closed we show the holding message and never render the
        // form or fetch the guest list at all.
        if (!CONFIG.rsvp.isOpen && !isLocalPreview()) {
            renderClosedState();
            return;
        }

        renderOpenState();
        await loadGuestData();
        bindEvents();
    }

    /**
     * Closed state: holding message only, no form.
     * Hides rather than removes, so flipping the config flag is all it
     * takes to open the RSVP back up.
     */
    function renderClosedState() {
        if (elements.instructions) {
            elements.instructions.textContent = CONFIG.rsvp.closedMessage;
            elements.instructions.classList.add('rsvp__instructions--closed');
        }
        if (elements.lookupForm) {
            elements.lookupForm.hidden = true;
        }
    }

    /**
     * Open state: swap in the open copy and reveal the lookup form.
     * The form ships hidden in the HTML so that if JavaScript fails to
     * run, guests see the holding message rather than a form that
     * cannot possibly work.
     */
    function renderOpenState() {
        if (elements.instructions) {
            elements.instructions.textContent = CONFIG.rsvp.openMessage;
            elements.instructions.classList.remove('rsvp__instructions--closed');
        }
        if (elements.lookupForm) {
            elements.lookupForm.hidden = false;
        }
    }

    function bindEvents() {
        elements.lookupForm?.addEventListener('submit', handleLookupSubmit);
        elements.householdForm?.addEventListener('submit', handleRSVPSubmit);
        elements.backButton?.addEventListener('click', goToStep1);
    }

    // ----------------------------------------
    // DATA LOADING
    // ----------------------------------------

    async function loadGuestData() {
        state.isLoading = true;

        try {
            let data;

            if (CONFIG.googleSheets.useLocalData) {
                const response = await fetch(CONFIG.googleSheets.localDataPath);
                if (!response.ok) throw new Error('Failed to load guest data');
                data = await response.json();
            } else {
                const response = await fetch(CONFIG.googleSheets.guestListUrl);
                if (!response.ok) throw new Error('Failed to load guest data');
                const csvText = await response.text();
                data = parseCSV(csvText);
            }

            state.guests = data.map(canonicalize).map(decorateGuest).filter(hasUsableName);
            state.households = groupByHousehold(state.guests);
            state.isLoading = false;

        } catch (error) {
            console.error('Error loading guest data:', error);
            state.hasError = true;
            state.isLoading = false;
        }
    }

    /**
     * Column headings the guest sheet is allowed to use, mapped to the
     * one name the code uses internally.
     *
     * Headings are matched loosely — case, spaces and punctuation are all
     * flattened first — so "Rehearsal Dinner Invite", "rehearsal_invited"
     * and "REHEARSAL DINNER INVITED" all land in the same place. This
     * exists so that tidying up the spreadsheet's headers can never
     * silently break the RSVP.
     */
    const FIELD_ALIASES = {
        household_id: 'household_id',
        householdid: 'household_id',
        guest_id: 'guest_id',
        guestid: 'guest_id',
        household_name: 'household_name',
        householdname: 'household_name',
        first_name: 'first_name',
        firstname: 'first_name',
        nickname: 'nickname',
        nick_name: 'nickname',
        last_name: 'last_name',
        lastname: 'last_name',
        surname: 'last_name',
        is_child: 'is_child',
        child: 'is_child',
        is_unnamed_1: 'is_unnamed_plus_one',
        is_unnamed_plus_one: 'is_unnamed_plus_one',
        unnamed_1: 'is_unnamed_plus_one',
        unnamed_plus_one: 'is_unnamed_plus_one',
        is_unnamed_guest: 'is_unnamed_plus_one',
        rehearsal_invited: 'rehearsal_invited',
        rehearsal_dinner_invite: 'rehearsal_invited',
        rehearsal_dinner_invited: 'rehearsal_invited',
        rehearsal_dinner: 'rehearsal_invited'
    };

    /** Flatten a column heading so it can be looked up in FIELD_ALIASES. */
    function normalizeKey(key) {
        return String(key || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /** Rename a row's keys to the canonical internal names. */
    function canonicalize(row) {
        const result = {};
        Object.keys(row).forEach(key => {
            const canonical = FIELD_ALIASES[normalizeKey(key)];
            if (canonical) result[canonical] = row[key];
        });
        return result;
    }

    /**
     * Add the derived fields the rest of the code relies on, so the
     * spreadsheet's loose Y / yes / TRUE conventions only have to be
     * interpreted in one place.
     */
    function decorateGuest(guest) {
        return Object.assign({}, guest, {
            isChild: isYes(guest.is_child),
            rehearsalInvited: isYes(guest.rehearsal_invited),
            isUnnamedPlusOne: isYes(guest.is_unnamed_plus_one)
        });
    }

    /** Treat Y, yes, true and 1 as yes. Blank means no. */
    function isYes(value) {
        if (value === true) return true;
        return ['y', 'yes', 'true', '1'].includes(
            String(value == null ? '' : value).trim().toLowerCase()
        );
    }

    /**
     * Guard against blank rows left at the bottom of the sheet.
     * Unnamed plus-ones are the deliberate exception — they have no real
     * name yet, which is the whole point of them.
     */
    function hasUsableName(guest) {
        if (guest.isUnnamedPlusOne) return Boolean(guest.household_id);
        return Boolean(
            String(guest.first_name || '').trim() &&
            String(guest.last_name || '').trim()
        );
    }

    function parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(h =>
            h.trim().toLowerCase().replace(/\s+/g, '_')
        );

        return lines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const guest = {};
            headers.forEach((header, index) => {
                guest[header] = values[index]?.trim() || '';
            });
            return guest;
        });
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        return values;
    }

    function groupByHousehold(guests) {
        const households = guests.reduce((acc, guest) => {
            const householdId = guest.household_id || guest.guest_id;
            if (!acc[householdId]) {
                acc[householdId] = {
                    id: householdId,
                    name: String(guest.household_name || '').trim(),
                    members: []
                };
            }
            // A household_name on any row wins, in case the first row of
            // the household happens to be an unnamed plus-one.
            if (!acc[householdId].name) {
                acc[householdId].name = String(guest.household_name || '').trim();
            }
            acc[householdId].members.push(guest);
            return acc;
        }, {});

        // Fall back to naming the household after its first real guest if
        // the sheet has no household_name column at all.
        Object.values(households).forEach(household => {
            if (household.name) return;
            const named = household.members.find(m => !m.isUnnamedPlusOne);
            household.name = named
                ? `${named.first_name} ${named.last_name}`
                : 'Your Invitation';
        });

        return households;
    }

    // ----------------------------------------
    // NAME MATCHING
    // ----------------------------------------

    /**
     * The two ways a guest might write their own name: formally, and
     * however people actually address them.
     */
    function nameVariants(guest) {
        const variants = [`${guest.first_name} ${guest.last_name}`];
        if (String(guest.nickname || '').trim()) {
            variants.push(`${guest.nickname} ${guest.last_name}`);
        }
        return variants;
    }

    function displayName(guest) {
        if (guest.isUnnamedPlusOne) return CONFIG.plusOne.label;
        return `${guest.first_name} ${guest.last_name}`;
    }

    /**
     * Only real, named guests can be looked up.
     *
     * An unnamed plus-one has no name yet, so nobody could search for
     * them — and leaving them out means a stranger typing "guest" can't
     * stumble into somebody's household.
     */
    function searchableGuests() {
        return state.guests.filter(guest => !guest.isUnnamedPlusOne);
    }

    /**
     * Guests whose full name matches exactly (legal or nickname form).
     * An exact match is the only thing that skips the suggestion list.
     */
    function findExactMatches(search) {
        return searchableGuests().filter(guest =>
            nameVariants(guest).some(variant => normalizeName(variant) === search)
        );
    }

    /**
     * Guests to offer as suggestions for a partial or misspelled entry.
     *
     * Every word the guest typed must be the start of one of the words in
     * their name, so "jake" and "jake sch" both find Jake Schuller while
     * "ake" finds nobody. A whole-name typo check runs as a fallback so
     * swapped letters still surface the right person.
     */
    function findSuggestions(search) {
        const searchTokens = search.split(' ').filter(Boolean);

        return searchableGuests().filter(guest => {
            const variants = nameVariants(guest).map(normalizeName);

            const prefixHit = variants.some(variant => {
                const nameTokens = variant.split(' ').filter(Boolean);
                return searchTokens.every(searchToken =>
                    nameTokens.some(nameToken => nameToken.startsWith(searchToken))
                );
            });
            if (prefixHit) return true;

            // Typo fallback, only for entries long enough to be a real
            // attempt at the whole name.
            if (searchTokens.length < 2) return false;
            return variants.some(variant =>
                editDistance(search, variant) <= typoBudget(variant)
            );
        });
    }

    /**
     * How many character errors to forgive.
     * Short names get almost no slack — at four characters, a distance of
     * two is a different name, not a typo.
     */
    function typoBudget(name) {
        if (name.length <= 4) return 1;
        if (name.length <= 8) return 2;
        return 3;
    }

    /**
     * Lowercase, strip accents and punctuation, collapse whitespace.
     * "O'Brien-Smith" and "OBrien Smith" normalize the same way.
     */
    function normalizeName(name) {
        return String(name || '')
            .normalize('NFD')                 // split accented chars apart
            .replace(/[\u0300-\u036f]/g, '')  // drop the accent marks
            .toLowerCase()
            .replace(/[^a-z\s]/g, ' ')        // punctuation becomes a space
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Damerau-Levenshtein edit distance (optimal string alignment).
     *
     * Counts an adjacent transposition as ONE edit, not two. That matters
     * here: swapped letters are the single most common way people mistype
     * a name ("Jonh" for "John"), and plain Levenshtein scores that as 2,
     * which would push it outside our deliberately tight typo budget.
     */
    function editDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;

        if (!m) return n;
        if (!n) return m;

        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;

                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,        // deletion
                    dp[i][j - 1] + 1,        // insertion
                    dp[i - 1][j - 1] + cost  // substitution
                );

                // Transposition of two adjacent characters.
                if (i > 1 && j > 1 &&
                    str1[i - 1] === str2[j - 2] &&
                    str1[i - 2] === str2[j - 1]) {
                    dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
                }
            }
        }

        return dp[m][n];
    }

    // ----------------------------------------
    // STEP NAVIGATION
    // ----------------------------------------

    function goToStep1() {
        hideAllSteps();
        elements.step1.classList.add('rsvp__step--active');
        elements.guestNameInput.value = '';
        hideError();
        hideSuggestions();
    }

    function goToStep2(household) {
        hideAllSteps();
        state.currentHousehold = household;
        renderHouseholdForm(household);
        elements.step2.classList.add('rsvp__step--active');
    }

    function goToStep3(responses) {
        hideAllSteps();
        renderConfirmation(responses);
        elements.step3.classList.add('rsvp__step--active');
    }

    function hideAllSteps() {
        elements.step1?.classList.remove('rsvp__step--active');
        elements.step2?.classList.remove('rsvp__step--active');
        elements.step3?.classList.remove('rsvp__step--active');
    }

    // ----------------------------------------
    // STEP 1 — LOOKUP
    // ----------------------------------------

    function handleLookupSubmit(event) {
        event.preventDefault();
        hideError();
        hideSuggestions();

        const typed = elements.guestNameInput.value.trim();
        if (!typed) return;

        // If the guest list never loaded, say so plainly rather than
        // telling the guest their name isn't on the list.
        if (state.hasError) {
            showError(CONFIG.messages.loadError);
            return;
        }

        const search = normalizeName(typed);

        // Don't offer suggestions for one or two stray letters — that
        // would let a stranger fish the guest list out a letter at a time.
        if (search.replace(/\s/g, '').length < CONFIG.rsvp.minSuggestChars) {
            showError(CONFIG.messages.needMoreLetters);
            return;
        }

        // An unambiguous exact match goes straight through.
        const exact = findExactMatches(search);
        if (exact.length === 1) {
            openHouseholdFor(exact[0]);
            return;
        }

        // Two people really can share a name. Never guess between them.
        if (exact.length > 1) {
            showSuggestions(exact);
            return;
        }

        const suggestions = findSuggestions(search);
        if (suggestions.length === 0) {
            showError(CONFIG.messages.guestNotFound);
            return;
        }
        if (suggestions.length === 1) {
            openHouseholdFor(suggestions[0]);
            return;
        }

        showSuggestions(suggestions);
    }

    function openHouseholdFor(guest) {
        const household = state.households[guest.household_id || guest.guest_id];
        if (!household) {
            showError(CONFIG.messages.guestNotFound);
            return;
        }
        hideError();
        hideSuggestions();
        goToStep2(household);
    }

    /**
     * Offer matching names to choose from. Each option shows the person's
     * name and their household, so two different Chris Taylors can tell
     * themselves apart.
     */
    function showSuggestions(guests) {
        if (!elements.choices) return;

        const shown = guests.slice(0, CONFIG.rsvp.maxSuggestions);
        showError(CONFIG.messages.multipleMatches);

        elements.choices.innerHTML = shown
            .map((guest, index) => {
                const household = state.households[guest.household_id || guest.guest_id];
                const householdName = household ? household.name : '';

                return `
                    <button type="button"
                            class="rsvp__choice"
                            data-guest-index="${index}">
                        <span class="rsvp__choice-name">${escapeHtml(displayName(guest))}</span>
                        <span class="rsvp__choice-members">${escapeHtml(householdName)}</span>
                    </button>
                `;
            })
            .join('');

        elements.choices.hidden = false;

        elements.choices.querySelectorAll('.rsvp__choice').forEach(button => {
            button.addEventListener('click', () => {
                openHouseholdFor(shown[Number(button.dataset.guestIndex)]);
            });
        });
    }

    function hideSuggestions() {
        if (!elements.choices) return;
        elements.choices.hidden = true;
        elements.choices.innerHTML = '';
    }

    // ----------------------------------------
    // STEP 2 — HOUSEHOLD FORM
    // ----------------------------------------

    function renderHouseholdForm(household) {
        hideFormError();

        elements.householdGreeting.innerHTML = `
            <h3>${escapeHtml(household.name)}</h3>
            <p>Please respond for each member of your party.</p>
        `;

        elements.householdMembers.innerHTML = household.members
            .map((member, index) => renderMemberCard(member, index))
            .join('');

        renderRehearsalBlock(household);
        bindMemberCards(household);
    }

    /**
     * One card per person. The entrée and dietary fields are rendered but
     * hidden; they only appear once the guest is marked as attending, so
     * nobody is asked to pick dinner for someone who isn't coming.
     */
    function renderMemberCard(member, index) {
        // An unnamed plus-one needs a name box above their entrée, so the
        // host can tell us who they're bringing.
        const nameField = member.isUnnamedPlusOne
            ? `
                <div class="member-card__plus-one-name">
                    <label class="member-card__meal-label" for="plus-one-${index}">
                        ${escapeHtml(CONFIG.plusOne.nameLabel)}
                    </label>
                    <input type="text"
                           id="plus-one-${index}"
                           name="plus-one-${index}"
                           class="form__input"
                           autocomplete="off"
                           placeholder="${escapeHtml(CONFIG.plusOne.namePlaceholder)}">
                </div>
            `
            : '';

        const details = member.isChild
            ? `<p class="member-card__child-notice">${escapeHtml(CONFIG.childMeal.notice)}</p>`
            : nameField + `
                <div class="member-card__meal">
                    <label class="member-card__meal-label" for="meal-${index}">
                        Entrée
                    </label>
                    <select id="meal-${index}" name="meal-${index}" class="member-card__meal-select">
                        ${CONFIG.mealOptions.map(opt => {
                            // The empty first option is the prompt. `hidden`
                            // plus `disabled` keeps it out of the open list
                            // while still showing until a choice is made.
                            if (!opt.value) {
                                return `<option value="" selected disabled hidden>` +
                                       `${escapeHtml(opt.label)}</option>`;
                            }
                            // Uppercase BEFORE escaping — uppercasing an
                            // escaped "&amp;" would produce "&AMP;".
                            return `<option value="${escapeHtml(opt.value)}">` +
                                   `${escapeHtml(opt.label.toUpperCase())}</option>`;
                        }).join('')}
                    </select>
                </div>
                <div class="member-card__dietary">
                    <label class="member-card__meal-label" for="dietary-${index}">
                        ${escapeHtml(CONFIG.dietary.label)}
                    </label>
                    <input type="text"
                           id="dietary-${index}"
                           name="dietary-${index}"
                           class="form__input"
                           placeholder="${escapeHtml(CONFIG.dietary.placeholder)}">
                </div>
            `;

        return `
            <div id="member-card-${index}" class="member-card" data-guest-id="${escapeHtml(member.guest_id)}">
                <div class="member-card__header">
                    <span class="member-card__name">${escapeHtml(displayName(member))}</span>
                    <div class="member-card__attendance">
                        <div class="member-card__radio-group">
                            <input type="radio"
                                   id="attendance-${index}-yes"
                                   name="attendance-${index}"
                                   value="yes"
                                   class="member-card__radio">
                            <label for="attendance-${index}-yes" class="member-card__radio-label">
                                Joyfully Accepts
                            </label>
                            <input type="radio"
                                   id="attendance-${index}-no"
                                   name="attendance-${index}"
                                   value="no"
                                   class="member-card__radio">
                            <label for="attendance-${index}-no" class="member-card__radio-label">
                                Regretfully Declines
                            </label>
                        </div>
                    </div>
                </div>
                <div id="member-details-${index}" class="member-card__details" hidden>
                    ${details}
                </div>
            </div>
        `;
    }

    /**
     * Reveal or hide each person's dinner details as they accept or
     * decline. Declining also clears anything already chosen, so a guest
     * who changes their mind doesn't leave a stale entrée behind.
     */
    function bindMemberCards(household) {
        household.members.forEach((member, index) => {
            const card = document.getElementById(`member-card-${index}`);
            const details = document.getElementById(`member-details-${index}`);
            const radioYes = document.getElementById(`attendance-${index}-yes`);
            const radioNo = document.getElementById(`attendance-${index}-no`);

            const update = () => {
                const attending = radioYes.checked;
                card.classList.toggle('member-card--attending', attending);
                details.hidden = !attending;

                if (!attending) {
                    const meal = document.getElementById(`meal-${index}`);
                    const dietary = document.getElementById(`dietary-${index}`);
                    const plusOne = document.getElementById(`plus-one-${index}`);
                    if (meal) meal.value = '';
                    if (dietary) dietary.value = '';
                    if (plusOne) plusOne.value = '';
                }
            };

            radioYes?.addEventListener('change', update);
            radioNo?.addEventListener('change', update);
        });
    }

    /**
     * The rehearsal dinner block only exists for households that have at
     * least one invited member, and only lists those members. Everyone
     * invited to the rehearsal dinner is also invited to the wedding, so
     * this is always a subset of the household.
     */
    function renderRehearsalBlock(household) {
        if (!elements.rehearsalBlock) return;

        const invited = household.members.filter(m => m.rehearsalInvited);

        if (invited.length === 0) {
            elements.rehearsalBlock.hidden = true;
            elements.rehearsalBlock.innerHTML = '';
            return;
        }

        elements.rehearsalBlock.innerHTML = `
            <h4 class="rsvp__rehearsal-title">${escapeHtml(CONFIG.rehearsal.title)}</h4>
            <p class="rsvp__rehearsal-intro">${escapeHtml(CONFIG.rehearsal.intro)}</p>
            <p class="rsvp__rehearsal-where">
                <span class="rsvp__rehearsal-venue">${escapeHtml(CONFIG.rehearsal.venue)}</span>
                <span class="rsvp__rehearsal-time">${escapeHtml(CONFIG.rehearsal.time)}</span>
            </p>
            ${invited.map(member => {
                const index = household.members.indexOf(member);
                return `
                    <div class="member-card member-card--rehearsal">
                        <div class="member-card__header">
                            <span class="member-card__name">${escapeHtml(displayName(member))}</span>
                            <div class="member-card__radio-group">
                                <input type="radio"
                                       id="rehearsal-${index}-yes"
                                       name="rehearsal-${index}"
                                       value="yes"
                                       class="member-card__radio">
                                <label for="rehearsal-${index}-yes" class="member-card__radio-label">
                                    Joyfully Accepts
                                </label>
                                <input type="radio"
                                       id="rehearsal-${index}-no"
                                       name="rehearsal-${index}"
                                       value="no"
                                       class="member-card__radio">
                                <label for="rehearsal-${index}-no" class="member-card__radio-label">
                                    Regretfully Declines
                                </label>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        `;

        elements.rehearsalBlock.hidden = false;
    }

    // ----------------------------------------
    // SUBMISSION
    // ----------------------------------------

    async function handleRSVPSubmit(event) {
        event.preventDefault();

        const submitButton = elements.householdForm.querySelector('button[type="submit"]');
        hideFormError();
        submitButton.classList.add('btn--loading');

        try {
            const responses = collectResponses();

            // Every guest must accept or decline.
            const unanswered = responses.filter(r => r.attending === null);
            if (unanswered.length > 0) {
                showFormError(
                    `Please choose Joyfully Accepts or Regretfully Declines for ${namesOf(unanswered)}.`
                );
                return;
            }

            // A plus-one who's coming has to be named.
            const unnamed = responses.filter(
                r => r.isUnnamedPlusOne && r.attending && !r.plusOneName
            );
            if (unnamed.length > 0) {
                showFormError("Please tell us your guest's name.");
                return;
            }

            // Attending adults must pick an entrée. Children don't.
            const needsMeal = responses.filter(r => r.attending && !r.isChild && !r.meal);
            if (needsMeal.length > 0) {
                showFormError(`Please choose an entrée for ${namesOf(needsMeal)}.`);
                return;
            }

            // Anyone invited to the rehearsal dinner must answer for it.
            const needsRehearsal = responses.filter(
                r => r.rehearsalInvited && r.rehearsalAttending === null
            );
            if (needsRehearsal.length > 0) {
                showFormError(
                    `Please answer the rehearsal dinner question for ${namesOf(needsRehearsal)}.`
                );
                return;
            }

            await submitRSVP(responses);
            goToStep3(responses);

        } catch (error) {
            console.error('RSVP submission error:', error);
            showFormError(CONFIG.messages.submitError);
        } finally {
            submitButton.classList.remove('btn--loading');
        }
    }

    /**
     * "Tia", "Tia and Ella", "Tia, Ella, and Audrey".
     * Serial comma, to match the editorial tone elsewhere.
     */
    function formatList(items) {
        if (items.length <= 1) return items.join('');
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
    }

    function namesOf(responses) {
        return formatList(responses.map(r => r.label));
    }

    function collectResponses() {
        return state.currentHousehold.members.map((member, index) => {
            const attendingYes = document.getElementById(`attendance-${index}-yes`);
            const attendingNo = document.getElementById(`attendance-${index}-no`);
            const mealSelect = document.getElementById(`meal-${index}`);
            const dietaryInput = document.getElementById(`dietary-${index}`);
            const plusOneInput = document.getElementById(`plus-one-${index}`);
            const rehearsalYes = document.getElementById(`rehearsal-${index}-yes`);
            const rehearsalNo = document.getElementById(`rehearsal-${index}-no`);

            let attending = null;
            if (attendingYes?.checked) attending = true;
            if (attendingNo?.checked) attending = false;

            let rehearsalAttending = null;
            if (rehearsalYes?.checked) rehearsalAttending = true;
            if (rehearsalNo?.checked) rehearsalAttending = false;

            const plusOneName = member.isUnnamedPlusOne && attending
                ? (plusOneInput?.value.trim() || '')
                : '';

            return {
                guestId: member.guest_id,
                firstName: member.first_name,
                lastName: member.last_name,
                isChild: member.isChild,
                isUnnamedPlusOne: member.isUnnamedPlusOne,
                plusOneName: plusOneName,
                // What to call this person in errors and the summary: the
                // typed-in name once we have it, otherwise "Your Guest".
                label: member.isUnnamedPlusOne
                    ? (plusOneName || CONFIG.plusOne.label)
                    : `${member.first_name} ${member.last_name}`,
                attending: attending,
                meal: attending && !member.isChild ? (mealSelect?.value || null) : null,
                dietary: attending && !member.isChild
                    ? (dietaryInput?.value.trim() || '')
                    : '',
                rehearsalInvited: member.rehearsalInvited,
                rehearsalAttending: member.rehearsalInvited ? rehearsalAttending : null
            };
        });
    }

    async function submitRSVP(responses) {
        const note = elements.noteInput?.value.trim() || '';

        const payload = {
            householdId: state.currentHousehold.id,
            householdName: state.currentHousehold.name,
            responses: responses,
            summary: buildSummary(responses),
            note: note,
            submittedAt: new Date().toISOString()
        };

        if (CONFIG.googleForms.formUrl &&
            CONFIG.googleForms.formUrl !== 'YOUR_GOOGLE_FORM_URL_HERE') {
            await submitToGoogleForm(payload);
        } else {
            // Development mode: nothing is configured yet, so just log it.
            console.log('RSVP Submission (dev mode):', payload);
        }

        return payload;
    }

    /**
     * A plain-text summary, one line per person.
     *
     * This is what actually lands in the responses spreadsheet, so it is
     * written to be read by a human at a glance rather than parsed.
     */
    function buildSummary(responses) {
        const mealLabel = value => {
            const option = CONFIG.mealOptions.find(o => o.value === value);
            return option ? option.label : value;
        };

        const lines = responses.map(r => {
            // Make it obvious in the spreadsheet which name was typed in
            // by the host rather than coming from the guest list.
            const name = r.isUnnamedPlusOne
                ? `${r.plusOneName || CONFIG.plusOne.label} (plus-one)`
                : `${r.firstName} ${r.lastName}`;

            if (!r.attending) return `${name} — Declines`;

            const parts = [`${name} — Accepts`];
            parts.push(r.isChild ? "Children's meal" : mealLabel(r.meal));
            if (r.dietary) parts.push(`Dietary: ${r.dietary}`);
            return parts.join(' — ');
        });

        const rehearsal = responses.filter(r => r.rehearsalInvited);
        if (rehearsal.length > 0) {
            lines.push('', 'Rehearsal Dinner:');
            rehearsal.forEach(r => {
                lines.push(`${r.label} — ${r.rehearsalAttending ? 'Accepts' : 'Declines'}`);
            });
        }

        return lines.join('\n');
    }

    async function submitToGoogleForm(payload) {
        const formData = new FormData();
        const fields = CONFIG.googleForms.fields;

        formData.append(fields.householdId, payload.householdId);
        formData.append(fields.householdName, payload.householdName);
        formData.append(fields.guestResponses, payload.summary);
        formData.append(fields.note, payload.note);
        formData.append(fields.timestamp, payload.submittedAt);

        // Google Forms doesn't allow cross-origin reads, so this is
        // fire-and-forget: a network failure throws, but a rejection by
        // Google cannot be detected. Test thoroughly before going live.
        await fetch(CONFIG.googleForms.formUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });
    }

    // ----------------------------------------
    // STEP 3 — CONFIRMATION
    // ----------------------------------------

    function renderConfirmation(responses) {
        const attending = responses.filter(r => r.attending);
        const declining = responses.filter(r => !r.attending);

        let message;

        if (attending.length > 0 && declining.length === 0) {
            message = "We're thrilled you'll be joining us. We can't wait to celebrate with you.";
        } else if (attending.length === 0) {
            message = "We're sorry you can't make it, but thank you for letting us know. You'll be missed.";
        } else {
            message = `Thank you for your response. We're excited to celebrate with ${namesOf(attending)}.`;
        }

        elements.confirmationMessage.textContent = message;
    }

    // ----------------------------------------
    // UI HELPERS
    // ----------------------------------------

    function showError(message) {
        if (!elements.errorMessage) return;
        elements.errorMessage.textContent = message;
        elements.errorMessage.hidden = false;
    }

    function hideError() {
        if (!elements.errorMessage) return;
        elements.errorMessage.hidden = true;
    }

    /** Validation errors on the household form (step 2). */
    function showFormError(message) {
        if (!elements.formError) return;
        elements.formError.textContent = message;
        elements.formError.hidden = false;
        elements.formError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideFormError() {
        if (!elements.formError) return;
        elements.formError.hidden = true;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str == null ? '' : str;
        return div.innerHTML;
    }

    // ----------------------------------------
    // INITIALIZE ON DOM READY
    // ----------------------------------------

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
