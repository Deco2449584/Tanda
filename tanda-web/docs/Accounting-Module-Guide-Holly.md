# Continental Cargo — Accounting module user guide

**Audience:** Accounting / finance administrators (Holly)  
**Path in app:** Finance → Accounting  
**Version:** September 2026

> Printable PDF: `Accounting-Module-Guide-Holly.pdf` (from `Accounting-Module-Guide-Holly.html`).

---

## 1. What this module does

Turns real clocked hours into:

- **Pay** — wage cost  
- **Charge** — client billing  
- **Margin** — Charge − Pay  

Then produces two kinds of files:

- **Xero** — one sales line per client for the week, one bill line per staff member  
- **Client timesheet** — the detailed sheet you attach to the invoice (time in, time out, break, hours by band, overtime start, $)

**Important:** Use a real workforce employee for timesheets — not admin, master, or kiosk accounts.

---

## 2. Scope — what this is and is not

This is **not a live connection to Xero**. The system does not log in to Xero, sync invoices, or post bills automatically. You download CSV files and import them into Xero yourself (or attach the timesheet to the client invoice).

**In scope**

- Rate and time-band setup (company, staff, and per client)
- Weekly review and close
- Xero-ready **CSV exports** (sales invoices and bills)
- Detailed client timesheet (time in / out, break, bands, overtime start, $)

**Out of scope**

- Xero API, bank feed, or automatic posting
- Automatic invoice email to clients
- Payroll lodging (STP, super, PAYG)

---

## 3. Where everything lives

| Tab | Use |
|---|---|
| Overview | Week health, totals, setup warnings |
| Settings → Pay & charge rules | Company bands, day types, OT, minimums, holidays, employment types, Xero |
| Settings → Rate cards → Staff | Employment type, hourly rate, pay matrix |
| Settings → Rate cards → Clients | Client hours (From / To) and charge % or $ |
| Settings → Rate cards → Defaults | Company fallback rate and matrices |
| Weekly close | Review exceptions, freeze or reopen the week |
| Exports | Xero, client timesheet, band summary, journal, charge pack |

---

## 4. Configure this first

1. **Access role** — Accounting module + *Edit staff and site rate cards* + *Edit pay rules, bands, and holidays* + *Export accounting reports (CSV)*. Without Export you will see “No export permission”.
2. **Settings → Clients** — set **State** (NSW / QLD / VIC…) for Xero Location tracking.
3. **Accounting → Settings → Pay & charge rules** — company time bands, overtime (daily and weekly), minimum hours, holidays, employment types / GL, Xero settings.
4. **Rate cards → Defaults** — default hourly rate and pay/charge matrices.
5. **Rate cards → Staff** — real employee, **hourly rate > $0**.
6. **Rate cards → Clients** — that client’s From / To hours and charge % or $.

If totals are $0: the hourly rate is usually still 0 while matrices are %, or hours were logged on an admin account.

---

## 5. Client hours and rates (per customer)

Different clients can have different early-morning windows and loadings. Example:

- Client A — Early morning **00:00–06:00 @ 125%**  
- Client B — Early morning **00:00–06:30 @ 120%**

Path: **Accounting → Settings → Rate cards → Clients**

1. Select the client.
2. **Client time bands** already shows the company hours (Name, From, To). You do not need to add a band first.
3. Change **From** / **To** for that client (e.g. Early morning to 06:30). Overnight wrap is allowed (22:00–06:00).
4. Under **Client charge rates**, set **Edit** on the cells you want to customise (% or $). Leave a cell on **Default** to use company rules.
5. Click **Save client rates**.

**Reset to company bands** clears this client’s custom hours so they inherit the company bands again. **Add client band** adds an extra window; it appears as a new row in the charge matrix.

Empty saved bands still inherit company hours. As soon as you edit a field, those hours are stored for that client only. The charge matrix uses the same bands (the row label shows the hours, e.g. Early morning (00:00–06:30)).

---

## 6. Staff rates

Path: **Accounting → Settings → Rate cards → Staff**

- Employment type (Full Time, Part Time, Casual, Contractor)  
- Base hourly rate — % loadings multiply against this  
- Optional min pay hours  
- Pay matrix — Default inherits company; Edit sets a custom $ or %  

Company overtime rules apply to everyone: daily (default > 8 hours) and weekly (default > 38 hours).

---

## 7. Weekly close — what it does

**Close week** freezes the pay and charge figures for that week. It does **not** send anything to Xero, stop staff from clocking in, or lock Attendance.

### If you leave the week open

Accounting keeps recalculating. Overview and Exports always show the **current** hours and rates. You can still export. If someone later adds a missed punch or edits a time, **the totals change**. If you already imported a CSV into Xero, the next export may no longer match.

### If you close the week

The system saves a snapshot (who closed, when, and the totals). Overview, Weekly close, and Exports for **that week** use that snapshot. New clocks, attendance edits, or rate changes **do not change those numbers** until you click **Reopen week**.

### If you close, then new records come in, and you do not reopen

The new punches **are saved** in Attendance. Nobody loses a clock. They simply **do not appear** in Accounting totals or in the CSVs until you reopen.

Example: you close Monday at $4,000. Tuesday someone enters 4 forgotten hours. Attendance has those hours. Accounting still shows $4,000. After **Reopen week**, the live total includes the 4 hours. If you already imported the old CSV into Xero, export again (or adjust Xero by hand).

**Recommended:** review exceptions → **Close week** when the figure is the one you will invoice or import → then download Xero and the client timesheet. Reopen only if you need to correct hours.

Weeks closed before September 2026 may not show time in / out on the timesheet until reopened.

---

## 8. Weekly flow

1. Hours come from kiosk, employee app, or **Attendance → Add manual record** (real employee only).
2. **Overview** — Pay / Charge should not be $0.
3. **Weekly close** — review exceptions, then **Close week** (freezes figures).
4. **Exports** — download Xero and the client timesheet.
5. **Reopen week** if you need to recalculate (needs pay-rules permission).

---

## 9. Exports — which file to use

| File | Who uses it | What it contains |
|---|---|---|
| **Xero sales invoices** | Xero import | **One charge line per client for the week.** TrackingName1 / TrackingOption1 = Location / state when tracking is on. |
| **Xero bills** | Xero import | **One pay line per staff member for the week**, split by site when Location tracking is on. |
| **Client timesheet CSV** | Attach to the client invoice | **One row per shift:** staff, date, client, day type, time in, time out, break (minutes), hours, hours and $ by band (Base, Early morning, Afternoon, Overtime), OT starts, total $. |
| **Band summary CSV** | Internal only | Pay/charge already split by day type and band. Not the file you send to clients. |
| **Journal** | GL / internal | Debit/credit by employment type. |
| **Charge pack** | Internal | Hours and $ by site and band. |
| **Summary CSV** | Internal | Pay / charge / margin for the current filters. |

Xero stays one line per week on purpose. The **client timesheet** is the detailed proof (clock times and how each hour was classified).

---

## 10. Xero Location tracking

1. **Settings → Clients** → set **State**.  
2. **Accounting → Settings → Pay & charge rules → Xero export settings** → Location tracking category name **Location** (must match Xero).  
3. Export sales / bills — columns TrackingName1 / TrackingOption1 fill from the client state.

---

## 11. Worked example

Staff hourly rate **$30**. Monday **04:00–12:00** (8 hours). Weekday early morning **00:00–06:00 @ 125%**.

| Segment | Hours | Pay rate | Pay $ |
|---|---:|---|---:|
| Early morning 04:00–06:00 | 2 | 125% = $37.50 | $75.00 |
| Base 06:00–12:00 | 6 | 100% = $30.00 | $180.00 |
| **Total pay** | **8** | | **$255.00** |

Charge uses that **client’s** From / To and charge matrix (which may differ from pay).

If the same staff works 4 hours at JAS, the **Client timesheet** row should show the actual in / out, any unpaid break, which hours sit in Early morning vs Base, and the total charge. Use that file to check the $ yourself.

---

## 12. Checklist

- Role has Accounting + rates + rules + export  
- Clients have State set  
- Company bands, OT (daily + weekly), and minimums reviewed  
- Staff hourly rate > $0  
- Each client’s hours (From / To) and charge % checked  
- Hours logged on a real employee  
- Overview shows non-zero totals  
- Week closed before final Xero files  
- Client invoice gets **Client timesheet CSV**, not the band summary  

---

Continental Cargo · Finance → Accounting · Internal use
