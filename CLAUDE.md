# CLAUDE.md

Context for Claude when working on this repository.

## What this is

A real, production wedding website for **Sophie King & Jacob Schuller**.

- **Wedding:** November 7, 2026 — Hotel ZaZa, Austin, Texas
- **Live at:** https://schullerkingwedding.com
- **Repo:** https://github.com/jschuller16/schullerkingwedding

This is not a demo. Code must be clean, commented, and shippable.

## Tech stack

Plain HTML, CSS, and vanilla JavaScript. **No frameworks, no build step, no package manager.**
Hosted on GitHub Pages. Do not introduce tools, libraries, or bundlers without asking first.

## File structure

```
index.html          # ~1,180 lines — ALL page sections live here inline
CNAME               # schullerkingwedding.com
css/
  variables.css     # Color palette + type scale as CSS custom properties. Start here.
  reset.css
  typography.css
  layout.css        # Page structure, section gradients
  components.css    # Buttons, forms, cards
  sections.css      # Wedding party, FAQ, accordion, map
  animations.css
  celestial.css     # Hero constellation SVG styling
js/
  config.js         # Wedding details + Google Sheets/Forms integration config
  rsvp.js           # Full RSVP flow (lookup -> household form -> confirmation)
  navigation.js
  animations.js
  celestial.js
  accordion.js      # Travel + FAQ expanders
  map.js
data/
  guests.json       # Sample/dev guest data (not real guests)
images/             # Wedding party portraits, story.jpg, Attire.png
```

Page sections in `index.html`, in order: `hero`, `story`, `details` (The Day),
`dresscode` (Attire), `party` (Wedding Party), `travel`, `faq`, `registry`, `rsvp`.

## Design direction

Editorial, fashion-forward, cinematic. Grand, dramatic, celestial, luxurious.
Mood and clarity over minimalism. Mobile-first, fully functional on desktop.

**Typography**

- Display/headlines: `--font-display` → Playfair Display (Didot stand-in)
- Body/nav/utility: `--font-body` → Helvetica Neue

**Color** — use only palette variables from `css/variables.css`. Never hardcode hex values
in other files. Core background is near-black `#0D0A0E` moving through Deep Eggplant
`#241224` and Deep Aubergine `#3F1F4A`, with Orchid Purple, Lavender Mist, and Rosewater
Glow as accents.

**Section gradients — important.** There is no single body gradient. Each section carries its
own gradient, and every section's *start* color matches the previous section's *end* color.
This is what keeps the boundaries seamless. Roughly 35% near-black / 40% Deep Eggplant /
25% Deep Aubergine overall, with Aubergine peaking mid-page (Details, Party, FAQ). If you
touch background colors, preserve this chain or the page gets hard color seams.

## Layout conventions

BEM-ish naming: `block__element--modifier` (e.g. `party__row--4`, `member-card--attending`).

**Wedding party grid** is the trickiest layout in the codebase:

- Desktop (≥600px): explicit rows via `party__row--4`, `party__row--3`, `party__row--flowers`.
  Currently 4 rows — 4 / 4 / 3 (centered at 75% width) / 2 flower girls (centered at 50%).
- Mobile (≤599px): rows use `display: contents` inside a `party__members` wrapper so all
  members collapse into one flat 2-column grid. `party__member--solo` centers a trailing
  odd member (currently Audrey).

Desktop and mobile are deliberately decoupled. **Always verify both** after any party change.

Portraits use `object-fit: cover; object-position: center top`.

## Git workflow

- Work happens on the **`site-redesign`** branch.
- Claude commits locally. **Claude cannot push** — GitHub auth is not available in this
  environment. Jake pushes from Terminal:
  ```
  cd ~/Documents/schullerkingwedding
  git push origin site-redesign
  ```
- Jake then opens a PR on GitHub and merges `site-redesign` → `main`.
- **GitHub Pages serves `main`.** A change is not live until the PR is merged.
- `.DS_Store` files show up constantly and are noise.

### The `.git/index.lock` problem — cause and cure

This has looked like a mystery across several sessions. It isn't one, and nothing has
crashed.

Git creates `.git/index.lock` during any command that touches the index (`status`, `add`,
`rm --cached`, `commit`) and removes it when the command finishes. **Claude's sandbox is not
permitted to delete files inside `.git`**, so the lock is left behind every time. The next
git command then refuses to run: *"Another git process seems to be running in this
repository."*

So the stale lock is created by Claude's own git commands, not by anything Jake did.

**Rules that follow from this:**

1. **Read-only checks must use `--no-optional-locks`** — `git --no-optional-locks status`,
   `... log`, `... diff`. These never create the lock. Use them for every inspection.
2. **Batch the write path.** When Jake has cleared the lock and approved a commit, do the
   `add` and `commit` in ONE bash call. Every extra index-touching command leaves another
   lock behind and burns Jake's goodwill.
3. **Never commit without Jake's explicit go-ahead.** Confirming that the lock is cleared is
   *not* the same as approving a commit — Claude made exactly that mistake on 2026-08-11.
   Ask, then commit.

The line to give Jake when a commit is genuinely ready. `rm` prints nothing on success,
which has confused him before, so the `echo` matters:

```
rm -f ~/Documents/schullerkingwedding/.git/index.lock && echo "lock cleared"
```

## Working with Jake

- Jake is **not a developer**. Explain anything git- or terminal-related in plain English,
  with the exact command to paste.
- Jake adds photos to `images/` himself, named by first name (`Nick.jpg`), or first + last
  where names collide (`Emma_Creedon.jpg`). **Filenames use underscores, never spaces.**
- iPhone photos arrive as **HEIC** and need conversion to JPEG.
- Screenshot-derived images often carry white-line artifacts at the top or bottom that need
  trimming, and transparent PNGs may have large dead padding that breaks section spacing
  (this happened with `Attire.png`).
- Jake cares that **both** desktop and mobile look right. A fix that breaks one is not a fix.

## RSVP architecture

Hybrid, deliberately: **read from Google Sheets, write to Google Forms.**
Setup walkthrough for Jake lives in `RSVP-SETUP.md`. The real guest list lives in
`Wedding_Guest_List_FILLED.xlsx` (gitignored — see Privacy below). Household headings in it
come from the "Addressed As" column of Jake's separate invitation spreadsheet, so they read
formally: "Mr. & Mrs. Peregrine Halloway", "The Fairweather Family".

1. `rsvp.js` fetches the published Google Sheet as CSV (or `data/guests.json` when
   `CONFIG.googleSheets.useLocalData` is `true`).
2. Guests are grouped into households client-side by `household_id`.
3. Guest types their name:
   - Exact match on `first last` **or** `nickname last` → straight to their household.
   - Anything else → a list of suggested guest names to pick from, each labelled with its
     household so two people with the same name can tell themselves apart.
   - Under `CONFIG.rsvp.minSuggestChars` (3) characters, no suggestions are offered at all
     — otherwise a stranger could fish the guest list out a letter at a time. Capped at
     `maxSuggestions` (8).
4. Household form: per person Joyfully Accepts / Regretfully Declines. The entrée and
   dietary fields are hidden until that person is marked attending. Children
   (`is_child = Y`) get the kids' meal notice instead and are never asked for an entrée or
   dietary needs. Households with rehearsal-dinner invitees get an extra block listing only
   those members.
5. Submission POSTs to a hidden Google Form endpoint with `mode: 'no-cors'`
   (fire-and-forget — the response cannot be read). It sends a **human-readable** summary,
   one line per person, because Jake reads the responses sheet directly.

**Rules:** RSVP is household-based; responses, meals and dietary needs are per person; a
name that is not on the list must never be able to proceed; and the code must never guess
between two possible households.

Guest sheet columns: `household_id`, `guest_id`, `household_name`, `first_name`,
`nickname`, `last_name`, `is_child`, `is_unnamed_+1`, `rehearsal_dinner_invite`.

**Column headings are matched loosely.** `FIELD_ALIASES` in `rsvp.js` flattens case, spaces
and punctuation, so "Rehearsal Dinner Invite", `rehearsal_invited` and
`REHEARSAL_DINNER_INVITED` all resolve to the same field. This exists because Jake maintains
the sheet by hand and a tidied-up header must never silently break the RSVP. If you add a
column, add its aliases there too.

**Unnamed plus-ones** (`is_unnamed_+1` = Y) are guests whose name wasn't known when the list
was built. They sit in their host's household with no `last_name`. They are excluded from
name lookup entirely — nobody can search "guest" — and appear on the form as "Your Guest"
with a name box the host must fill in before they can submit.

**A household name may contain a comma** ("Bev Larkspur, Colm Whitfield & Greta Sunderland"),
which means the published CSV quotes that field. `parseCSVLine` handles quoting; don't
replace it with a naive `split(',')`.

### Privacy — important

**The GitHub repo is public** (GitHub Pages serves from it). The real guest list must never
be committed. `.gitignore` already excludes `RSVP.xlsx`, `*_FILLED.xlsx` and stray guest
CSV/JSON exports — keep it that way, and add to it rather than removing entries.

`data/guests.json` is **sample data only**. Never paste real guests into it; it is committed
and therefore public. The real list lives in Google Sheets and is fetched at runtime.

### The RSVP is OPEN (since 2026-09-02)

`CONFIG.rsvp.isOpen` is the entire switch, and it is now `true`. Set it back to `false`
after the October 7 deadline to retire the form and restore `closedMessage`.

`openMessage` is **"Please respond no later than October 7, 2026."** — Jake chose the
deadline over the earlier "Find your invitation below." on 2026-09-02, reasoning that the
button underneath already says "Find My Invitation", so the instruction was redundant.

The lookup form still ships with `hidden` in the HTML and is revealed by JS. The paragraph
above it is now a neutral "One moment — finding your invitation." rather than a holding
message, because a "check back soon" line would be actively wrong while the RSVP is open.
A `<noscript>` block points JavaScript-less guests at the wedding email instead.

**A Google Form must be published before it accepts anything.** This cost a session on
2026-09-02: the form existed and the entry IDs were correct, but it was unpublished, so
Google silently rejected every submission. Because submission is `mode: 'no-cors'`, the
site cannot read the response and showed guests "Thank You" regardless. If responses stop
arriving, check the form's Publish state *first*. Open the form in edit mode → Publish →
Manage → Responders set to "Anyone with the link".

### Verifying submissions still work

There is no automatic detection of a rejected submission — see the blind spot above. Jake
opted on 2026-09-02 for a built-in self-test over re-architecting onto Apps Script; **that
self-test is not built yet** and is the next task.

### Previewing without going live

`?preview` on **localhost only** shows the RSVP form while `isOpen` is `false`:
`http://localhost:8000/?preview`. The hostname check in `isLocalPreview()` means the
parameter does nothing on the live site, so nobody can RSVP early — and Jake never has to
edit the config just to look at the form. Now that `isOpen` is `true` this does nothing;
it matters again if the RSVP is ever closed and reopened.

## Outstanding requests

- **RSVP submission self-test** — the next task. See "Verifying submissions still work".
- **Things to Do map** (Travel section) — the *map* itself is still outstanding. The
  section is no longer "COMING SOON": it now holds Sophie's "Our Favorite Spots" list
  (ten places, `.favorites` in `sections.css`), added 2026-09-02. A map alongside it was
  Jake's 2026-08-11 request and has not been built.

## Content rules

Placeholder copy should read editorial and intentional, never generic. Structure content so
it is easy to swap later. Real copy is only real when Jake says it is.

## Accessibility & performance

Semantic HTML, reasonable contrast, keyboard-friendly where natural, respects
`prefers-reduced-motion`. Do **not** flatten the editorial design to chase strict WCAG
compliance — elegance takes priority, within reason.

## When in doubt

Clarity over cleverness. Editorial confidence over safety. Ask before adding complexity.
