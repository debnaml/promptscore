# SE7 — Sales enablement

**Goal**: Convert tool users into Performance Peak clients. Personalised emails, cold outreach templates, and an internal playbook with the lead-detail page wired to make sending easy.

**Deliverable**: Re-engagement emails for Ikos and Sani sent. Three cold-outreach templates committed. Lead-detail page has a one-click "copy email" feature. Internal sales playbook documented.

**Branch**: `se-07-sales-enablement`
**Tag on completion**: `v0.8.1`

---

## Tasks

### SE7.1 — Email templates as data

- New file: `apps/web/src/lib/email-templates/sales.ts`
- Export an array of templates, each with: `key`, `name`, `subject`, `body` (with `{placeholders}`), and `requires` (e.g. `["score", "topFinding1", "topFinding2"]`)
- Templates: warm-reconnection, confident-challenger, hospitality-cold, legal-cold, generic-cold

### SE7.2 — Lead-detail "copy email" UI

On `/admin/leads/[id]`:

- Dropdown: pick a template
- Render the filled email (subject + body) using the lead's most recent scan
- Two buttons: **Copy to clipboard** and **Open in mail client** (`mailto:` with prefilled subject + body)
- Show a list of available placeholders and which ones the current lead actually has (greyed out if missing)

### SE7.3 — Ikos re-engagement email (sent)

- Subject: warm reconnection variant
- Body covers: their actual score, two specific findings, the strategic framing (AI search is a distinct channel), low-pressure 15-min call CTA
- Lee approves before sending
- Sent and logged on the lead record (notes field)

### SE7.4 — Sani re-engagement email (sent)

Same pattern, differentiated copy. No mail-merge feel.

### SE7.5 — Cold outreach templates

Three committed templates:

- **Hospitality** — luxury resort / hotel framing without prior-relationship references
- **Legal** — UK law firm framing, AEO/AI search for legal content
- **Generic** — shorter, broader

### SE7.6 — Internal sales playbook

Markdown doc at `docs/sales-playbook.md`:

- Ideal buyer profile (role, company size, sector)
- When to use the tool (opening gambit vs deep-dive)
- Common objections + responses ("isn't this just SEO?", "we already have an SEO agency", "AI search is hype")
- Follow-up cadence after sending a report
- Conversion benchmarks to aim for (lead → call → proposal → close)
- A worked example for one real prospect (after SE7.3 / SE7.4)

### SE7.7 — Lead status workflow

On the leads list, add filtered views:

- **Hot** — opened report + clicked CTA in last 14 days
- **Warm** — submitted email gate but no CTA click
- **Cold** — scan only
- **Replied** — admin manually marks
- **Closed - won / lost**

These wire into the existing `status` column on leads (already present from S6). Add the missing statuses if not yet supported.

---

## Acceptance tests

- [ ] Lead-detail page lets admin pick a template, see it filled with the lead's score and findings, copy or open in mail client.
- [ ] Missing placeholders are greyed out in the picker (e.g. lead has no calendar click → that template is disabled).
- [ ] Ikos and Sani emails sent (off-platform — confirmed in admin notes).
- [ ] Three cold templates committed to repo.
- [ ] `docs/sales-playbook.md` exists, is reviewed by Lee, contains the worked example.
- [ ] Lead list filters return correct subsets for each status.

---

## Out of scope

- CRM integration (HubSpot etc.) — defer.
- Automated drip campaigns — defer.
- Calendly / scheduling integration — already covered by existing CTA.
