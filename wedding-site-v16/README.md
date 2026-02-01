# Sophie & Jacob Schuller Wedding Website

A modern, editorial wedding website built with plain HTML, CSS, and vanilla JavaScript. Designed for GitHub Pages hosting.

**Wedding Date:** November 7, 2026  
**Location:** Hotel ZaZa, Austin, Texas

## Live Site

[Coming soon - deploy to GitHub Pages]

## Features

- **Editorial Design**: Fashion-forward, cinematic aesthetic with dramatic colors and sophisticated typography
- **Celestial Hero**: Enhanced SVG linework with Sagittarius & Taurus constellations, increased star density, and metallic Smokey Quartz name treatment
- **Wedding Party Page**: Editorial grid layout for bride's side (8), groom's side (4), and flower girls (2)
- **Interactive Travel Section**: Accordion-style expanding sections with Austin map featuring 4-point star markers
- **FAQ Section**: Expandable question/answer format with 10 placeholder questions
- **Mobile-First**: Fully responsive design that works beautifully on all devices
- **RSVP System**: Hybrid architecture using Google Sheets for guest data and Google Forms for submissions
- **Smooth Animations**: Scroll-triggered animations with respect for reduced motion preferences
- **Static-First**: No build step required, deploys directly to GitHub Pages

## File Structure

```
wedding-website/
├── index.html              # Main HTML with all sections
├── css/
│   ├── variables.css       # CSS custom properties (colors, typography, spacing)
│   ├── reset.css           # CSS reset for consistent baseline
│   ├── typography.css      # Font styles and text treatments
│   ├── layout.css          # Page structure and sections
│   ├── components.css      # Buttons, forms, cards
│   ├── animations.css      # Entrance and scroll animations
│   ├── celestial.css       # Celestial SVG texture styling and effects
│   └── sections.css        # Wedding party, FAQ, accordion, map styles
├── js/
│   ├── config.js           # Configuration (Google integration URLs)
│   ├── rsvp.js             # RSVP system logic
│   ├── navigation.js       # Mobile menu and scroll behavior
│   ├── animations.js       # Scroll-triggered animations
│   ├── celestial.js        # Subtle parallax for celestial elements
│   ├── accordion.js        # Travel & FAQ expandable sections
│   └── map.js              # Austin map hover interactions
├── data/
│   └── guests.json         # Sample guest data for development
└── README.md               # This file
```

## Color Palette

The site uses a gemstone-inspired color palette:

### Amethyst (Deep Purples)
- Deep Aubergine: `#3F1F4A`
- Deep Eggplant: `#241224`
- Orchid Purple: `#A67BBE`
- Lavender Mist: `#D6CBE8`

### Peridot (Botanical Greens)
- Deep Juniper: `#3F5634`
- Modern Moss: `#7F9B5C`
- Bright Botanical: `#8FBF6A`

### Pink Tourmaline (Romantic Pinks)
- Cabernet: `#4B0F1C`
- Bordeaux: `#5A1A2C`
- Maroon: `#6B1F2B`
- Rosewater Glow: `#F9DCE7`
- Petal Pop Pink: `#FBE3EC`

## Typography

- **Display Font**: Playfair Display (Didot alternative) - used for headlines and hero text
- **Body Font**: Helvetica Neue / Helvetica - used for body text and navigation

## RSVP System Setup

The RSVP system uses a hybrid architecture:

### Reading Guest Data (Google Sheets)

1. Create a Google Sheet with guest information
2. Required columns:
   - `guest_id` - Unique identifier
   - `household_id` - Groups guests together
   - `first_name`
   - `last_name`
   - `household_name` - Display name (e.g., "The Smith Family")
   - `email` (optional)
   - `has_plus_one` (true/false)
   - `plus_one_name` (if applicable)

3. Publish the sheet:
   - File → Share → Publish to web
   - Select "Comma-separated values (.csv)"
   - Copy the URL

4. Update `js/config.js`:
   ```javascript
   googleSheets: {
       guestListUrl: 'YOUR_PUBLISHED_CSV_URL',
       useLocalData: false
   }
   ```

### Submitting RSVPs (Google Forms)

1. Create a Google Form with these fields:
   - Household ID (Short answer)
   - Guest Responses (Long answer)
   - Note to Couple (Long answer)

2. Get the form action URL and entry IDs:
   - View the form's page source
   - Find the `action` URL
   - Find `entry.XXXXXXXXX` IDs for each field

3. Update `js/config.js`:
   ```javascript
   googleForms: {
       formUrl: 'https://docs.google.com/forms/d/e/FORM_ID/formResponse',
       fields: {
           householdId: 'entry.XXXXXXXXX',
           guestResponses: 'entry.XXXXXXXXX',
           note: 'entry.XXXXXXXXX'
       }
   }
   ```

## Local Development

1. Clone the repository
2. Open `index.html` in a browser, or use a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with npx)
   npx serve
   ```
3. The site uses local guest data by default (`data/guests.json`)

## Deployment (GitHub Pages)

1. Push the repository to GitHub
2. Go to Settings → Pages
3. Set source to "main" branch
4. The site will be available at `https://username.github.io/repository-name/`

## Customization

### Content Updates

All placeholder content is marked with `[Placeholder: ...]` comments. Update these in `index.html`:

- Couple's story and photos
- Venue name and address
- Hotel information and booking links
- Registry links
- Contact email

### Meal Options

Update meal choices in `js/config.js`:

```javascript
mealOptions: [
    { value: '', label: 'Select meal preference' },
    { value: 'beef', label: 'Your Beef Option' },
    { value: 'fish', label: 'Your Fish Option' },
    // Add more options as needed
]
```

### Colors

Modify the color palette in `css/variables.css`. Update the CSS custom properties to change colors site-wide.

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- iOS Safari
- Android Chrome

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Respects `prefers-reduced-motion`
- Reasonable color contrast for editorial design

## License

Private - All rights reserved for Sophie & Jacob Schuller
