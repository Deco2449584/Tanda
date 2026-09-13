# Continental Cargo — Accounting module user guide

**Audience:** Accounting / finance administrators (Holly)  
**Path in app:** Finance → Accounting  
**Version:** March 2026

> Companion to the designed PDF: `Accounting-Module-Guide-Holly.pdf`

---

## 1. What this module does

Turns real clocked hours into:

- **Pay** — wage cost  
- **Charge** — client billing  
- **Margin** — Charge − Pay  

Then produces exports: Xero sales & bills, client timesheets, journals, charge packs.

**Important:** Use a real workforce employee for timesheets — not admin/master/kiosk accounts.

---

## 2. Configure this first

1. **Access role** — Accounting module + Edit rate cards + Edit pay rules + Export CSV  
2. **Settings → Clients** — set **State** (NSW / QLD / VIC…) for Xero Location tracking  
3. **Accounting → Setup → Pay and charge rules** — bands, day types, OT, holidays, employment types, Xero settings  
4. **Rate cards → Company defaults** — default pay/charge matrices  
5. **Rate cards → Staff** — base hourly rate **> $0**  
6. **Rate cards → Clients** — charge matrix + optional client time bands  

---

## 3. Test end-to-end

1. Complete setup for one employee + one client (with State)  
2. Log hours for that employee (not the admin user)  
3. Check **Overview** — Pay/Charge should not be $0  
4. **Weekly close** → review → Close week  
5. **Exports** → download Xero sales/bills, timesheet, charge pack  
6. Confirm Xero CSV has TrackingName1 / TrackingOption1 when Location tracking is on  

If totals are $0: hourly rate is usually still 0 while matrices are %.

---

## 4. Feature map

| Area | Use |
|---|---|
| Overview | Week health, totals, setup warnings |
| Pay and charge rules | Company rules, time bands, OT, Xero |
| Rate cards → Staff | Hourly + pay matrix |
| Rate cards → Clients | Charge matrix + client time bands |
| Rate cards → Company defaults | Fallback matrices |
| Weekly close | Freeze / reopen week |
| Exports | Xero, timesheet, journal, charge pack, summary |

---

## 5. Xero Location tracking

1. Settings → Clients → State  
2. Accounting → Setup → Xero export settings → Location tracking (category name **Location**)  
3. Export sales/bills — TrackingName1 / TrackingOption1 filled from client state  

---

## 6. Client time bands

- Company bands: Setup → Pay and charge rules → Time bands  
- Per client: Rate cards → Clients → Client time bands  
- Empty client bands inherit company (default Early morning 00:00–06:00)  
- Set per client for 02:00–05:00 or 01:00–08:00 when needed  

---

For historical validation, send a sample week of hours, rates, and expected totals.
