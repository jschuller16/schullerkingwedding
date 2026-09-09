/**
 * ============================================
 * CONFIGURATION
 * Sophie & Jacob Schuller Wedding Website
 * ============================================
 * 
 * This file contains all configuration values
 * for the wedding website, including Google
 * Sheets/Forms integration URLs.
 */

const CONFIG = {
    // ----------------------------------------
    // WEDDING DETAILS
    // ----------------------------------------
    wedding: {
        couple: {
            person1: 'Sophie',
            person2: 'Jacob',
            surname: 'Schuller'
        },
        date: {
            full: 'November 7, 2026',
            iso: '2026-11-07',
            display: 'November Seventh, Two Thousand Twenty-Six'
        },
        location: {
            venue: 'Hotel ZaZa, Austin',
            city: 'Austin',
            state: 'Texas'
        },
        rsvpDeadline: {
            full: 'October 7, 2026',
            iso: '2026-10-07'
        },

        // Contact address shown to guests who can't find their name.
        contactEmail: 'schullerkingwedding@gmail.com'
    },

    // ----------------------------------------
    // RSVP OPEN / CLOSED
    // ----------------------------------------
    //
    // THIS IS THE SWITCH. Set `isOpen` to true on the day invitations
    // go out, and the RSVP form appears. Set it back to false after the
    // deadline and the closed message returns. Nothing else to change.
    //
    rsvp: {
        // LIVE as of the September 2026 push — invitations are out and
        // the form is accepting responses. Set back to false after the
        // October 7 deadline to retire the form and restore the closed
        // message below.
        isOpen: true,

        // Shown in place of the form when isOpen is false.
        closedMessage: 'RSVP opens once invitations are in the mail. Check back soon.',

        // Shown above the name lookup when isOpen is true. This carries
        // the deadline because the "Please respond by" line that used to
        // sit at the foot of the section has been removed — the button
        // beneath already says "Find My Invitation", so repeating that
        // instruction here was redundant.
        openMessage: 'Please respond no later than October 7, 2026.',

        // Name lookup behaviour.
        // Below minSuggestChars we don't offer suggestions at all, so a
        // single stray letter can't list the guest list to a stranger.
        minSuggestChars: 3,
        maxSuggestions: 8
    },

    // ----------------------------------------
    // WELCOME PARTY
    // ----------------------------------------
    // Only guests with Y in the guest sheet's rehearsal-dinner column
    // ever see this block. Accept/decline only — no meal choice.
    //
    // Guests see "Welcome Party"; the spreadsheet column and the code
    // still say "rehearsal", so don't rename the column to match.
    rehearsal: {
        title: 'Welcome Party',
        intro: 'You are also invited to join us the evening before for some bites, booze, and shuffleboard.',
        venue: 'Electric Shuffle',

        // En dash, one meridiem. "6:00 – 9:00 PM" is the standard way to
        // write a range that stays within the same half of the day.
        time: '6:00 – 9:00 PM',

        // Shown only once somebody in the household accepts. One number
        // per household, not per person — a family of three entering
        // three numbers gets you duplicates and blanks from the children.
        phone: {
            label: 'Please add your phone number so we can send you more information about the evening.',
            placeholder: '(512) 555-0134',
            // Digits are counted after stripping spaces, dashes, brackets
            // and a leading +, so any formatting is accepted. Ten is the
            // shortest a real US number can be; the check exists to catch
            // an empty or obviously mistyped field, not to police format.
            minDigits: 10,
            error: 'Please enter a phone number we can reach you on.'
        }
    },

    // ----------------------------------------
    // GOOGLE SHEETS INTEGRATION
    // Guest list data source
    // ----------------------------------------
    // 
    // Required columns in the guest sheet:
    //    guest_id           unique per person
    //    household_id       groups people onto one invitation
    //    household_name     the greeting, e.g. "The Fairweather Family"
    //    first_name         legal / formal first name
    //    nickname           optional; either one finds them
    //    last_name
    //    is_child           Y for 12 and under, otherwise blank
    //    rehearsal_invited  Y if invited to the rehearsal dinner
    //
    // >>> Step-by-step walkthrough lives in RSVP-SETUP.md <<<
    googleSheets: {
        // Published CSV of the "Wedding Guest List" sheet.
        // Google caches this for roughly five minutes, so edits to the
        // sheet take a little while to show up on the site.
        guestListUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLdF6NvNOL_rNBOglPgPaO_7-di-sMRnb9Eh6o5qckPkEDz8ubcI0HvoBWls7tgrha38VlSFEB2kqE/pub?gid=0&single=true&output=csv',

        // false = use the real guest list above.
        // true  = use the SAMPLE data in data/guests.json (ten fake
        //         guests) — for development only.
        useLocalData: false,
        localDataPath: 'data/guests.json'
    },

    // ----------------------------------------
    // GOOGLE FORMS INTEGRATION
    // RSVP submission endpoint
    // ----------------------------------------
    //
    // The hidden Google Form needs FIVE questions, in this order:
    //    1. Household ID     (Short answer)
    //    2. Household Name   (Short answer)
    //    3. Responses        (Paragraph)
    //    4. Note             (Paragraph)
    //    5. Submitted At     (Short answer)
    //
    // >>> Step-by-step walkthrough lives in RSVP-SETUP.md <<<
    googleForms: {
        // The form's action URL: the pre-filled link with /viewform
        // swapped for /formResponse.
        formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdc4uKr8zNY7rjbjvZeHViKx55hg8SL17cZ5tx7fNEMOuWttw/formResponse',

        // Entry IDs read off the pre-filled link, in the order the
        // questions appear on the form.
        fields: {
            householdId: 'entry.1960544909',    // Q1 Household ID
            householdName: 'entry.783790586',   // Q2 Household Name
            guestResponses: 'entry.790764868',  // Q3 Responses
            note: 'entry.1977665246',           // Q4 Note
            timestamp: 'entry.1120193440'       // Q5 Submitted At
        }
    },

    // ----------------------------------------
    // MEAL OPTIONS
    // ----------------------------------------
    // The `value` is what gets recorded in the spreadsheet, the `label`
    // is what guests see. Keep the empty first option.
    // Adults only — children are handled by childMeal below.
    mealOptions: [
        { value: '', label: 'Select your entrée' },
        { value: 'short-rib', label: 'Red wine-braised short rib' },
        { value: 'ravioli', label: 'Porcini & truffle mezzelune ravioli' }
    ],

    // ----------------------------------------
    // CHILDREN
    // ----------------------------------------
    // Guests flagged with Y in the `is_child` column don't choose an
    // entrée and are not asked about dietary needs — they just see this
    // notice once they're marked as attending.
    childMeal: {
        notice: 'Guests 12 and under will receive a children\'s chicken finger meal.'
    },

    // ----------------------------------------
    // UNNAMED PLUS-ONES
    // ----------------------------------------
    // Guests flagged with Y in the `is_unnamed_+1` column are a plus-one
    // whose name wasn't known when the guest list was built. They can't
    // be looked up (they have no name to search for) — they appear inside
    // their host's household, and the host types their name in.
    plusOne: {
        label: 'Your Guest',
        nameLabel: "Your guest's name",
        namePlaceholder: 'First and last name'
    },

    // ----------------------------------------
    // DIETARY NEEDS
    // ----------------------------------------
    dietary: {
        label: 'Allergies or dietary needs (optional)',
        placeholder: 'e.g. nut allergy, gluten free'
    },

    // ----------------------------------------
    // UI SETTINGS
    // ----------------------------------------
    ui: {
        // Scroll threshold for nav background
        navScrollThreshold: 50,
        
        // Animation timing
        animationDuration: 800,
        
        // Form debounce delay (ms)
        debounceDelay: 300
    },

    // ----------------------------------------
    // ERROR MESSAGES
    // ----------------------------------------
    messages: {
        guestNotFound: "We couldn't find that name on our guest list. Please check the spelling, and try the name exactly as it appears on your invitation.",
        needMoreLetters: "Please type at least three letters of your name.",
        multipleMatches: "Please select your name below.",
        submitError: "Something went wrong submitting your RSVP. Please try again.",
        networkError: "Unable to connect. Please check your internet connection and try again.",
        loadError: "We're having trouble loading the guest list. Please refresh the page and try again."
    }
};

// Append the contact email to guest-facing error messages in one place,
// so the address only ever has to be changed in wedding.contactEmail.
CONFIG.messages.guestNotFound +=
    ` If you're still stuck, email us at ${CONFIG.wedding.contactEmail}.`;
CONFIG.messages.submitError +=
    ` If it keeps happening, email us at ${CONFIG.wedding.contactEmail}.`;

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.wedding);
Object.freeze(CONFIG.rsvp);
Object.freeze(CONFIG.googleSheets);
Object.freeze(CONFIG.googleForms);
Object.freeze(CONFIG.mealOptions);
Object.freeze(CONFIG.rehearsal);
// Object.freeze is shallow, so the nested phone block needs its own call.
Object.freeze(CONFIG.rehearsal.phone);
Object.freeze(CONFIG.childMeal);
Object.freeze(CONFIG.plusOne);
Object.freeze(CONFIG.dietary);
Object.freeze(CONFIG.ui);
Object.freeze(CONFIG.messages);
