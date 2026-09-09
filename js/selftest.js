/**
 * ============================================
 * RSVP SELF-TEST
 * Sophie & Jacob Schuller Wedding Website
 * ============================================
 *
 * WHY THIS EXISTS
 *
 * RSVPs are submitted with `mode: 'no-cors'`, which means the browser is
 * allowed to send the POST to Google but is NOT allowed to read the reply.
 * The site therefore cannot tell "Google accepted this" apart from "Google
 * threw it away", and shows every guest a cheerful "Thank You" either way.
 *
 * That is not theoretical. On 2026-09-02 the form was unpublished, Google
 * silently rejected every single submission, and the site kept confirming
 * them. It was only caught by going and looking at the spreadsheet.
 *
 * So this file does what CAN be done automatically, and is honest about
 * the one thing that cannot:
 *
 *   1. Guest list loads          — fully verifiable
 *   2. Guest list parses         — fully verifiable
 *   3. Config is complete        — fully verifiable
 *   4. Submission accepted       — NOT verifiable. We send a clearly
 *                                  marked test row and tell Jake exactly
 *                                  what to look for in the sheet.
 *
 * HOW TO RUN IT
 *
 *   Add ?selftest to the end of the site's address and press enter:
 *     https://schullerkingwedding.com/?selftest
 *     http://localhost:8000/?selftest
 *
 *   A panel appears. Read the first three lines, press the button to send
 *   a test row, then open the responses sheet and confirm it arrived.
 *
 * The test row is labelled so it can never be mistaken for a real guest,
 * and it uses a household ID of SELFTEST so the whole lot can be found and
 * deleted by sorting that column.
 */

(function() {
    'use strict';

    function isSelfTestRequested() {
        return new URLSearchParams(window.location.search).has('selftest');
    }

    if (!isSelfTestRequested()) return;

    // ----------------------------------------
    // CHECKS
    // ----------------------------------------

    /**
     * Split one CSV line, respecting quoted fields.
     *
     * Household names contain commas ("Bev Larkspur, Colm Whitfield & Greta
     * Sunderland"), so Google quotes that field and a naive split(',')
     * would shift every column after it. Deliberately duplicated from
     * rsvp.js rather than shared: this file is a diagnostic and must keep
     * working even if the RSVP code is mid-edit.
     */
    function parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                // A doubled quote inside a quoted field is a literal quote.
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
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

    /**
     * Check 1 & 2 — can we read the guest list, and does it make sense?
     *
     * This one is genuinely verifiable: the published CSV is served with
     * permissive CORS headers, so unlike the form submission we can read
     * the response and inspect it.
     */
    async function checkGuestList() {
        const url = CONFIG.googleSheets.useLocalData
            ? CONFIG.googleSheets.localDataPath
            : CONFIG.googleSheets.guestListUrl;

        if (CONFIG.googleSheets.useLocalData) {
            return {
                ok: false,
                label: 'Guest list source',
                detail: 'Reading SAMPLE data from data/guests.json. The live ' +
                        'site should read the Google Sheet — set ' +
                        'useLocalData to false in js/config.js.'
            };
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                return {
                    ok: false,
                    label: 'Guest list loads',
                    detail: `The sheet returned ${response.status}. It may have ` +
                            'been unpublished. Open it and check ' +
                            'File → Share → Publish to web.'
                };
            }

            const text = await response.text();

            if (/^\s*<!DOCTYPE|^\s*<html/i.test(text)) {
                return {
                    ok: false,
                    label: 'Guest list loads',
                    detail: 'Google returned a web page instead of CSV, which ' +
                            'usually means the sheet is no longer published.'
                };
            }

            // Count rows without holding on to any names — this panel can
            // be opened on the live site, so it must never print the guest
            // list to the screen. Numbers only.
            const rows = text.trim().split('\n').filter(Boolean);
            const dataRows = Math.max(0, rows.length - 1);
            const header = (rows[0] || '').toLowerCase();

            const hasRehearsalColumn = header.includes('rehearsal');
            const hasHouseholdColumn = header.includes('household');

            if (dataRows === 0) {
                return {
                    ok: false,
                    label: 'Guest list parses',
                    detail: 'The sheet loaded but contains no guest rows.'
                };
            }

            if (!hasHouseholdColumn) {
                return {
                    ok: false,
                    label: 'Guest list parses',
                    detail: 'No household column found in the sheet headings. ' +
                            'Check FIELD_ALIASES in js/rsvp.js.'
                };
            }

            // How many guests are flagged for the Welcome Party. This is
            // the number to watch after editing the sheet: change a row to
            // Y, wait for Google's cache (about five minutes), re-run, and
            // the count should go up. If it doesn't, the edit landed in a
            // different document or a different column.
            let rehearsalNote = '';
            if (hasRehearsalColumn) {
                const headings = parseCsvLine(rows[0]).map(h => h.trim().toLowerCase());
                const column = headings.findIndex(h => h.includes('rehearsal'));
                let invited = 0;
                for (let i = 1; i < rows.length; i++) {
                    const value = (parseCsvLine(rows[i])[column] || '').trim().toLowerCase();
                    if (value === 'y' || value === 'yes' || value === 'true') invited++;
                }
                rehearsalNote = ` ${invited} flagged for the Welcome Party.`;
            } else {
                rehearsalNote = ' NOTE: no rehearsal/Welcome Party column found.';
            }

            return {
                ok: true,
                label: 'Guest list loads and parses',
                detail: `${dataRows} guest rows read from the published sheet.` + rehearsalNote
            };

        } catch (error) {
            return {
                ok: false,
                label: 'Guest list loads',
                detail: 'Could not reach the sheet at all: ' + error.message
            };
        }
    }

    /**
     * Check 3 — is everything the submission needs actually filled in?
     *
     * Catches the placeholder values the config shipped with, and any
     * entry ID that got lost while editing.
     */
    function checkConfig() {
        const problems = [];
        const form = CONFIG.googleForms;

        if (!form.formUrl || form.formUrl.includes('YOUR_GOOGLE_FORM_URL')) {
            problems.push('the form URL is still a placeholder');
        } else if (!form.formUrl.endsWith('/formResponse')) {
            problems.push('the form URL should end in /formResponse, not /viewform');
        }

        const required = ['householdId', 'householdName', 'guestResponses', 'note', 'timestamp'];
        required.forEach(key => {
            const value = form.fields[key];
            if (!value || value.includes('XXXX')) {
                problems.push(`the ${key} entry ID is missing`);
            } else if (!/^entry\.\d+$/.test(value)) {
                problems.push(`the ${key} entry ID does not look like entry.123456`);
            }
        });

        return problems.length === 0
            ? {
                ok: true,
                label: 'Form settings complete',
                detail: 'Form URL and all five entry IDs look right.'
            }
            : {
                ok: false,
                label: 'Form settings complete',
                detail: 'Problems in js/config.js: ' + problems.join('; ') + '.'
            };
    }

    /**
     * Check 4 — send a test row.
     *
     * This is the honest one. `no-cors` means a rejection by Google is
     * invisible to us, so all this can report is "sent without a network
     * error". Whether it ARRIVED can only be confirmed by looking at the
     * spreadsheet, which is what the panel then asks Jake to do.
     */
    async function sendTestRow(stamp) {
        const fields = CONFIG.googleForms.fields;
        const formData = new FormData();

        formData.append(fields.householdId, 'SELFTEST');
        formData.append(fields.householdName, 'SELF-TEST — NOT A REAL GUEST');
        formData.append(fields.guestResponses,
            'This row was created by the built-in self-test.\n' +
            'It is safe to delete.\n' +
            'Reference: ' + stamp);
        formData.append(fields.note, 'Self-test reference ' + stamp);
        formData.append(fields.timestamp, new Date().toISOString());

        await fetch(CONFIG.googleForms.formUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
        });
    }

    // ----------------------------------------
    // PANEL
    // ----------------------------------------

    function row(result) {
        return `
            <li class="selftest__row selftest__row--${result.ok ? 'pass' : 'fail'}">
                <span class="selftest__mark">${result.ok ? '✓' : '✕'}</span>
                <span class="selftest__text">
                    <strong>${result.label}</strong>
                    <span>${result.detail}</span>
                </span>
            </li>
        `;
    }

    async function run() {
        const panel = document.createElement('div');
        panel.className = 'selftest';
        panel.innerHTML = `
            <div class="selftest__inner">
                <h2 class="selftest__title">RSVP self-test</h2>
                <p class="selftest__note">Checking…</p>
            </div>
        `;
        document.body.appendChild(panel);

        const results = [await checkGuestList(), checkConfig()];
        const inner = panel.querySelector('.selftest__inner');
        const canSubmit = results.every(r => r.ok);

        // A short, human-readable reference so the row is easy to spot and
        // easy to match against this run. Not a timestamp — Google adds its
        // own, and this needs to be findable with ctrl-F.
        const stamp = 'T' + Date.now().toString(36).toUpperCase().slice(-5);

        inner.innerHTML = `
            <h2 class="selftest__title">RSVP self-test</h2>
            <ul class="selftest__list">${results.map(row).join('')}</ul>

            <div class="selftest__submit">
                <p class="selftest__note">
                    The last step can't be checked automatically. Submissions
                    are sent one-way, so the site can't see whether Google
                    accepted them — that's the whole reason this page exists.
                    Send a test row, then look for it in the responses sheet.
                </p>
                <button type="button" class="btn btn--primary selftest__button"
                        ${canSubmit ? '' : 'disabled'}>
                    <span class="btn__text">
                        ${canSubmit ? 'Send test row' : 'Fix the above first'}
                    </span>
                </button>
                <p class="selftest__result" hidden></p>
            </div>

            <p class="selftest__note selftest__note--quiet">
                Test rows use the household ID <strong>SELFTEST</strong>, so you
                can sort by that column to find and delete them. Close this by
                removing <strong>?selftest</strong> from the address.
            </p>
        `;

        const button = inner.querySelector('.selftest__button');
        const result = inner.querySelector('.selftest__result');

        button?.addEventListener('click', async () => {
            button.disabled = true;
            button.querySelector('.btn__text').textContent = 'Sending…';
            try {
                await sendTestRow(stamp);
                result.hidden = false;
                result.className = 'selftest__result selftest__result--sent';
                result.innerHTML =
                    `Sent, with reference <strong>${stamp}</strong>.<br>` +
                    'Now open the RSVP responses sheet. A row marked ' +
                    '<strong>SELF-TEST</strong> containing that reference should ' +
                    'appear within a few seconds.<br><br>' +
                    '<strong>If it appears, RSVPs are working.</strong><br>' +
                    'If it does not, the form has almost certainly been ' +
                    'unpublished — open it in edit mode and check ' +
                    'Publish → Responders → "Anyone with the link".';
            } catch (error) {
                result.hidden = false;
                result.className = 'selftest__result selftest__result--fail';
                result.textContent =
                    'The request failed before it left the browser: ' +
                    error.message + '. Check your internet connection.';
            }
            button.querySelector('.btn__text').textContent = 'Send another';
            button.disabled = false;
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }

})();
