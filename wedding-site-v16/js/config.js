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
            full: 'September 30, 2026',
            iso: '2026-09-30'
        }
    },

    // ----------------------------------------
    // GOOGLE SHEETS INTEGRATION
    // Guest list data source
    // ----------------------------------------
    // 
    // SETUP INSTRUCTIONS:
    // 1. Create a Google Sheet with guest data
    // 2. Required columns:
    //    - guest_id (unique identifier)
    //    - household_id (groups guests together)
    //    - first_name
    //    - last_name
    //    - household_name (e.g., "The Smith Family")
    //    - email (optional)
    //    - has_plus_one (true/false)
    //    - plus_one_name (if applicable)
    // 3. Publish sheet: File > Share > Publish to web
    // 4. Select CSV format and copy the URL below
    //
    googleSheets: {
        // Published CSV URL for guest list
        // Replace with your actual published Google Sheet URL
        guestListUrl: 'YOUR_GOOGLE_SHEET_CSV_URL_HERE',
        
        // Fallback: Use local JSON for development/testing
        // Set to true to use local data instead of Google Sheets
        useLocalData: true,
        localDataPath: 'data/guests.json'
    },

    // ----------------------------------------
    // GOOGLE FORMS INTEGRATION
    // RSVP submission endpoint
    // ----------------------------------------
    //
    // SETUP INSTRUCTIONS:
    // 1. Create a Google Form with these fields:
    //    - Household ID (Short answer)
    //    - Guest Responses (Long answer - JSON format)
    //    - Note to Couple (Long answer)
    //    - Submission Timestamp (automatically captured)
    // 2. Get the form action URL:
    //    - Open form, click ⋮ menu > Get pre-filled link
    //    - Fill in test data and click "Get link"
    //    - Extract the base URL (before the "?")
    // 3. Get entry IDs:
    //    - View page source of the form
    //    - Search for "entry." to find field IDs
    //
    googleForms: {
        // Form submission URL (action URL from the form)
        formUrl: 'YOUR_GOOGLE_FORM_URL_HERE',
        
        // Field entry IDs (from form source)
        // These map to the hidden form fields
        fields: {
            householdId: 'entry.XXXXXXXXX',
            guestResponses: 'entry.XXXXXXXXX',
            note: 'entry.XXXXXXXXX',
            timestamp: 'entry.XXXXXXXXX'
        }
    },

    // ----------------------------------------
    // MEAL OPTIONS
    // ----------------------------------------
    mealOptions: [
        { value: '', label: 'Select meal preference' },
        { value: 'beef', label: 'Filet Mignon' },
        { value: 'fish', label: 'Pan-Seared Salmon' },
        { value: 'vegetarian', label: 'Garden Risotto (Vegetarian)' },
        { value: 'vegan', label: 'Roasted Vegetable Plate (Vegan)' }
    ],

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
        guestNotFound: "We couldn't find that name on our guest list. Please check the spelling and try again, or contact us directly at wedding@example.com.",
        submitError: "Something went wrong submitting your RSVP. Please try again or contact us directly.",
        networkError: "Unable to connect. Please check your internet connection and try again.",
        loadError: "Unable to load guest list. Please refresh the page or try again later."
    }
};

// Freeze config to prevent accidental modification
Object.freeze(CONFIG);
Object.freeze(CONFIG.wedding);
Object.freeze(CONFIG.googleSheets);
Object.freeze(CONFIG.googleForms);
Object.freeze(CONFIG.mealOptions);
Object.freeze(CONFIG.ui);
Object.freeze(CONFIG.messages);
