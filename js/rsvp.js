/**
 * ============================================
 * RSVP SYSTEM
 * Sophie & Jacob Schuller Wedding Website
 * ============================================
 * 
 * Hybrid RSVP Architecture:
 * - READ: Guest data from published Google Sheet (CSV/JSON)
 * - WRITE: Submissions to hidden Google Form endpoint
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
        confirmationMessage: document.getElementById('rsvp-confirmation-message'),
        errorMessage: document.getElementById('rsvp-error'),
        backButton: document.getElementById('rsvp-back')
    };

    // ----------------------------------------
    // INITIALIZATION
    // ----------------------------------------
    
    async function init() {
        await loadGuestData();
        bindEvents();
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
            
            state.guests = data;
            state.households = groupByHousehold(data);
            state.isLoading = false;
            
        } catch (error) {
            console.error('Error loading guest data:', error);
            state.hasError = true;
            state.isLoading = false;
        }
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
        return guests.reduce((acc, guest) => {
            const householdId = guest.household_id || guest.guest_id;
            if (!acc[householdId]) {
                acc[householdId] = {
                    id: householdId,
                    name: guest.household_name || `${guest.first_name} ${guest.last_name}`,
                    members: []
                };
            }
            acc[householdId].members.push(guest);
            return acc;
        }, {});
    }

    // ----------------------------------------
    // NAME MATCHING
    // ----------------------------------------

    function findGuestByName(searchName) {
        const normalizedSearch = normalizeName(searchName);
        
        // Try exact match first
        for (const guest of state.guests) {
            const fullName = normalizeName(`${guest.first_name} ${guest.last_name}`);
            if (fullName === normalizedSearch) {
                return state.households[guest.household_id || guest.guest_id];
            }
        }
        
        // Try partial/fuzzy match
        for (const guest of state.guests) {
            const fullName = normalizeName(`${guest.first_name} ${guest.last_name}`);
            const firstName = normalizeName(guest.first_name);
            const lastName = normalizeName(guest.last_name);
            
            if (fullName.includes(normalizedSearch) || 
                normalizedSearch.includes(fullName) ||
                firstName === normalizedSearch ||
                lastName === normalizedSearch) {
                return state.households[guest.household_id || guest.guest_id];
            }
        }
        
        // Try Levenshtein distance for typos
        let bestMatch = null;
        let bestScore = Infinity;
        
        for (const guest of state.guests) {
            const fullName = normalizeName(`${guest.first_name} ${guest.last_name}`);
            const distance = levenshteinDistance(normalizedSearch, fullName);
            
            if (distance < bestScore && distance <= 3) {
                bestScore = distance;
                bestMatch = state.households[guest.household_id || guest.guest_id];
            }
        }
        
        return bestMatch;
    }

    function normalizeName(name) {
        return name.toLowerCase()
            .replace(/[^a-z\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,
                    dp[i][j - 1] + 1,
                    dp[i - 1][j - 1] + cost
                );
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
    // FORM RENDERING
    // ----------------------------------------

    function renderHouseholdForm(household) {
        // Greeting
        elements.householdGreeting.innerHTML = `
            <h3>Welcome, ${escapeHtml(household.name)}</h3>
            <p>Please respond for each member of your party.</p>
        `;
        
        // Member cards
        elements.householdMembers.innerHTML = household.members
            .map((member, index) => renderMemberCard(member, index))
            .join('');
        
        // Bind attendance change handlers
        household.members.forEach((member, index) => {
            const card = document.getElementById(`member-card-${index}`);
            const radioYes = document.getElementById(`attendance-${index}-yes`);
            const radioNo = document.getElementById(`attendance-${index}-no`);
            
            const updateCard = () => {
                if (radioYes.checked) {
                    card.classList.add('member-card--attending');
                } else {
                    card.classList.remove('member-card--attending');
                }
            };
            
            radioYes?.addEventListener('change', updateCard);
            radioNo?.addEventListener('change', updateCard);
        });
    }

    function renderMemberCard(member, index) {
        const fullName = `${member.first_name} ${member.last_name}`;
        const mealOptions = CONFIG.mealOptions
            .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
            .join('');
        
        return `
            <div id="member-card-${index}" class="member-card" data-guest-id="${escapeHtml(member.guest_id)}">
                <div class="member-card__header">
                    <span class="member-card__name">${escapeHtml(fullName)}</span>
                    <div class="member-card__attendance">
                        <div class="member-card__radio-group">
                            <input type="radio" 
                                   id="attendance-${index}-yes" 
                                   name="attendance-${index}" 
                                   value="yes"
                                   class="member-card__radio"
                                   required>
                            <label for="attendance-${index}-yes" class="member-card__radio-label">
                                Accepts
                            </label>
                            <input type="radio" 
                                   id="attendance-${index}-no" 
                                   name="attendance-${index}" 
                                   value="no"
                                   class="member-card__radio">
                            <label for="attendance-${index}-no" class="member-card__radio-label">
                                Declines
                            </label>
                        </div>
                    </div>
                </div>
                <div class="member-card__meal">
                    <label class="member-card__meal-label" for="meal-${index}">
                        Meal Selection
                    </label>
                    <select id="meal-${index}" name="meal-${index}" class="member-card__meal-select">
                        ${mealOptions}
                    </select>
                </div>
            </div>
        `;
    }

    function renderConfirmation(responses) {
        const attending = responses.filter(r => r.attending);
        const declining = responses.filter(r => !r.attending);
        
        let message = '';
        
        if (attending.length > 0 && declining.length === 0) {
            message = `We're thrilled you'll be joining us! We can't wait to celebrate with you.`;
        } else if (attending.length === 0 && declining.length > 0) {
            message = `We're sorry you can't make it, but thank you for letting us know. You'll be missed!`;
        } else {
            const attendingNames = attending.map(r => r.firstName).join(', ');
            message = `Thank you for your response. We're excited to celebrate with ${attendingNames}!`;
        }
        
        elements.confirmationMessage.textContent = message;
    }

    // ----------------------------------------
    // FORM HANDLERS
    // ----------------------------------------

    function handleLookupSubmit(event) {
        event.preventDefault();
        hideError();
        
        const name = elements.guestNameInput.value.trim();
        if (!name) return;
        
        const household = findGuestByName(name);
        
        if (household) {
            goToStep2(household);
        } else {
            showError(CONFIG.messages.guestNotFound);
        }
    }

    async function handleRSVPSubmit(event) {
        event.preventDefault();
        
        const submitButton = elements.householdForm.querySelector('button[type="submit"]');
        submitButton.classList.add('btn--loading');
        
        try {
            const responses = collectResponses();
            
            // Validate: at least one response selected
            const hasResponses = responses.every(r => r.attending !== null);
            if (!hasResponses) {
                alert('Please select Accept or Decline for each guest.');
                submitButton.classList.remove('btn--loading');
                return;
            }
            
            // Validate: meal selection for attending guests
            const needsMeal = responses.filter(r => r.attending && !r.meal);
            if (needsMeal.length > 0) {
                alert('Please select a meal preference for each attending guest.');
                submitButton.classList.remove('btn--loading');
                return;
            }
            
            await submitRSVP(responses);
            goToStep3(responses);
            
        } catch (error) {
            console.error('RSVP submission error:', error);
            alert(CONFIG.messages.submitError);
        } finally {
            submitButton.classList.remove('btn--loading');
        }
    }

    function collectResponses() {
        const responses = [];
        
        state.currentHousehold.members.forEach((member, index) => {
            const attendingYes = document.getElementById(`attendance-${index}-yes`);
            const attendingNo = document.getElementById(`attendance-${index}-no`);
            const mealSelect = document.getElementById(`meal-${index}`);
            
            let attending = null;
            if (attendingYes?.checked) attending = true;
            if (attendingNo?.checked) attending = false;
            
            responses.push({
                guestId: member.guest_id,
                firstName: member.first_name,
                lastName: member.last_name,
                attending: attending,
                meal: attending ? (mealSelect?.value || null) : null
            });
        });
        
        return responses;
    }

    // ----------------------------------------
    // FORM SUBMISSION
    // ----------------------------------------

    async function submitRSVP(responses) {
        const note = elements.noteInput?.value.trim() || '';
        
        const payload = {
            householdId: state.currentHousehold.id,
            householdName: state.currentHousehold.name,
            responses: responses,
            note: note,
            submittedAt: new Date().toISOString()
        };
        
        // If Google Forms is configured, submit there
        if (CONFIG.googleForms.formUrl && 
            CONFIG.googleForms.formUrl !== 'YOUR_GOOGLE_FORM_URL_HERE') {
            await submitToGoogleForm(payload);
        } else {
            // Development mode: log to console
            console.log('RSVP Submission (dev mode):', payload);
        }
        
        return payload;
    }

    async function submitToGoogleForm(payload) {
        const formData = new FormData();
        const fields = CONFIG.googleForms.fields;
        
        formData.append(fields.householdId, payload.householdId);
        formData.append(fields.guestResponses, JSON.stringify(payload.responses));
        formData.append(fields.note, payload.note);
        formData.append(fields.timestamp, payload.submittedAt);
        
        // Submit via fetch with no-cors mode (Google Forms doesn't support CORS)
        await fetch(CONFIG.googleForms.formUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });
        
        // Note: We can't check the response due to no-cors mode
        // The form submission is fire-and-forget
    }

    // ----------------------------------------
    // UI HELPERS
    // ----------------------------------------

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.hidden = false;
        }
    }

    function hideError() {
        if (elements.errorMessage) {
            elements.errorMessage.hidden = true;
        }
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
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
