# RSVP Setup Guide

Everything you need to do to turn the RSVP on. No coding — you fill in a spreadsheet,
build one Google Form, copy six values out of it, and paste them into one file.

Work through this in order. **Part 5 is the switch that makes it go live**, so nothing
guests see changes until you get there.

---

## Part 1 — Review the guest list

Your filled-in list has been cleaned up and saved as
**`Wedding_Guest_List_FILLED.xlsx`** in this folder. Two things changed:

1. **Names are no longer ALL CAPS.** They now read "Nicole Fairweather", "Colm Whitfield",
   "Odette Vandermere". Guests see exactly what's in this sheet, so this is what appears on
   the site.
2. **A `Household Name` column was added** — the heading shown at the top of each RSVP
   form. All 101 were generated for you.

### What to check

Open the **Review** tab. It lists:

- **Two names I couldn't be sure about**, highlighted in yellow. `VANDERMERE` became
  "Vandermere", but if it should be "VanDermere", fix it on the Guest List tab. Same for
  `O'HALLORAN`.
- **All 101 household names**, with their members beside them, so you can skim for
  anything that reads oddly. Edit them directly on the Guest List tab — just keep the
  text identical for every person in that household.

A few worth a look:

- Solo guests → "Peregrine Halloway"
- Couples and families sharing a surname → "The Fairweather Family"
- Mixed surnames → "Odette Vandermere & Colm Whitfield"
- With an unnamed plus-one → "Marisol Quintanilla & Guest"
- The one three-person mixed household → "Bev Larkspur, Colm Whitfield & Greta Sunderland"

### The columns

| Column | What goes in it |
|---|---|
| `Household ID` | Same code for everyone on one invitation |
| `Guest ID` | Unique per person |
| `Household Name` | The heading they see, e.g. "The Fairweather Family" |
| `First Name` | Legal / formal first name |
| `Nickname` | Optional. Either name finds them |
| `Last Name` | Surname |
| `Is Child` | `Y` for 12 and under, otherwise blank |
| `Is Unnamed +1` | `Y` for a plus-one whose name you don't have yet |
| `Rehearsal Dinner Invite` | `Y` if invited, otherwise blank |

You can rename these headings if you like — the site matches them loosely, ignoring case,
spaces and punctuation. Don't delete a column.

**Unnamed plus-ones** (you have three — find them by filtering the `is_unnamed_+1` column
to `Y`) can't be looked up, since they have no name yet. They appear inside their host's household as
"Your Guest", and the host must type their name before they can submit. If you learn a name
before invitations go out, replace the row with the real name and clear the `Y`.

**Children** (you have eight) see the kids' meal notice instead of the entrée dropdown, and
aren't asked about dietary needs.

**Rehearsal dinner** (67 guests) get an extra accept/decline block on the same form.

### Then move it into Google Sheets

1. Select everything on the **Guest List** tab and copy it
2. Go to [sheets.new](https://sheets.new), name it `Wedding Guest List`, paste
3. **File → Share → Publish to web**
4. First dropdown: pick your sheet tab (not "Entire Document")
5. Second dropdown: **Comma-separated values (.csv)**
6. Click **Publish**, confirm
7. **Copy the URL** — it ends in `output=csv`

That's value ① .

> Publishing makes the guest list readable by anyone with that link. It's names only — no
> addresses, no emails — which is normal for this kind of site. Don't add sensitive columns.

> **Don't commit the spreadsheet to GitHub.** The website repo is public, so anything
> committed to it is published. `.gitignore` already blocks `RSVP.xlsx` and
> `Wedding_Guest_List_FILLED.xlsx`, so you can safely leave them in this folder — just
> don't rename them to something else and then `git add -A`.

---

## Part 2 — Build the submission form

Go to [forms.new](https://forms.new). Name it `Wedding RSVP Submissions`.

Add exactly **five** questions, in this order:

1. `Household ID` — Short answer
2. `Household Name` — Short answer
3. `Responses` — **Paragraph**
4. `Note` — **Paragraph**
5. `Submitted At` — Short answer

Don't mark any of them required. Don't add any other questions.

> This form is never seen by your guests. The website fills it in invisibly on their behalf.
> Your RSVP page is the real form.

### Link it to a results spreadsheet

In the form: **Responses** tab → the Sheets icon → **Create a new spreadsheet**. This is
where RSVPs land as they come in.

The `Responses` column will read like this, one line per person:

```
Nicole Fairweather — Accepts — Red wine-braised short rib
Thomas Fairweather — Accepts — Porcini & truffle mezzelune ravioli — Dietary: Gluten free
Mia Fairweather — Accepts — Children's meal

Rehearsal Dinner:
Nicole Fairweather — Accepts
```

### Get the form's submit URL and field IDs

1. In the form, click the **⋮** menu (top right) → **Get pre-filled link**
2. Type a recognisable dummy value into each of the five boxes — `AAA`, `BBB`, `CCC`,
   `DDD`, `EEE`
3. Click **Get link**, then **Copy link**
4. Paste it into a notes app. It'll look like:

```
https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxxxxxx/viewform?usp=pp_url
&entry.111111111=AAA&entry.222222222=BBB&entry.333333333=CCC
&entry.444444444=DDD&entry.555555555=EEE
```

Read it off:

- The part before `?`, with **`viewform` changed to `formResponse`** → value ② :
  `https://docs.google.com/forms/d/e/1FAIpQLSxxxxxxxxxxxx/formResponse`
- The `entry.` paired with `AAA` → **Household ID** → value ③
- paired with `BBB` → **Household Name** → value ④
- paired with `CCC` → **Responses** → value ⑤
- paired with `DDD` → **Note** → value ⑥
- paired with `EEE` → **Submitted At** → value ⑦

**Send me all seven values and I'll paste them in**, or do it yourself in Part 3.

---

## Part 3 — Put the values into the code

Open `js/config.js`. Find the `googleSheets` block:

```javascript
googleSheets: {
    guestListUrl: 'PASTE VALUE ① HERE',
    useLocalData: false,          // <- change true to false
    localDataPath: 'data/guests.json'
},
```

`useLocalData: false` is what tells the site to use your real guest list instead of the
sample data. **It's easy to miss and nothing works without it.**

Then the `googleForms` block:

```javascript
googleForms: {
    formUrl: 'PASTE VALUE ② HERE',
    fields: {
        householdId:    'PASTE VALUE ③ HERE',
        householdName:  'PASTE VALUE ④ HERE',
        guestResponses: 'PASTE VALUE ⑤ HERE',
        note:           'PASTE VALUE ⑥ HERE',
        timestamp:      'PASTE VALUE ⑦ HERE'
    }
},
```

Each `entry.` value keeps its quote marks and includes the word `entry.` — e.g.
`'entry.111111111'`.

---

## Part 4 — Preview it locally first

In Terminal:

```
cd ~/Documents/schullerkingwedding
python3 -m http.server 8000
```

Open **http://localhost:8000**. Leave that Terminal window running; `Control + C` stops it.

To see the form while it's still switched off, open `js/config.js`, set `isOpen: true`,
and refresh with **Command + Shift + R**. Set it back to `false` when you're done looking,
unless you're ready for Part 5.

Things to try:

- Type a partial name like `Jake` → you should get a list of suggested names
- Type a full name → straight to the household form
- Accept for someone → the entrée dropdown appears
- Accept for a child → the chicken finger notice appears instead
- Try a name that isn't on the list → you should be stopped
- Resize the window narrow, or open it on your phone

---

## Part 5 — Turn it on

In `js/config.js`, near the top:

```javascript
rsvp: {
    isOpen: false,     // <- change to true
```

**This one line is the whole on/off switch.** Change it back to `false` after the deadline
and guests see the holding message again.

Then push it live:

```
cd ~/Documents/schullerkingwedding
git add -A
git commit -m "Turn on RSVP"
git push origin site-redesign
```

Then open the pull request on GitHub and merge `site-redesign` into `main`. The site
updates a minute or two later.

---

## Part 6 — Test on the live site

Do this on the real site, not just locally.

1. Look yourself up by full name → your household appears with everyone in it
2. Answer for each person, pick entrées, add a note, submit
3. **Check the responses spreadsheet** — a new row should appear within a few seconds
4. Try a name that isn't on the list → you should be stopped
5. Try it **on your phone**
6. Delete your test rows from the responses sheet when you're done

If step 3 shows nothing, the `entry.` IDs are the usual culprit — they're easy to pair up
wrong. Send me the pre-filled link and I'll check them.

---

## Things to know once it's live

**Editing the guest sheet is instant-ish.** Add or fix guests any time without touching the
website. Google caches the published CSV for about five minutes.

**Submissions are one-way.** The site can't read anything back from Google, so it always
shows the thank-you screen. If a guest RSVPs twice you'll get two rows — sort by timestamp
and the later one wins.

**Nothing emails anyone.** There's no confirmation email and the site doesn't claim there is.

**Names are the login.** There's no password, so anyone who knows a guest's name could RSVP
as them. That's normal for wedding sites, but it's why the guest list link shouldn't be
broadcast. Typing fewer than three letters won't return suggestions, so the list can't be
fished out one letter at a time.
