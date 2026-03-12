# Cutlist Pro

> A cabinet-making cutlist and quoting web app built for woodworkers and cabinet makers. Runs entirely in the browser — no install required.

**Live app → [diedutchman.github.io/cutlist-pro](https://diedutchman.github.io/cutlist-pro/)**

---

## What It Does

Cutlist Pro takes your cabinet layout, generates a clean cut list your supplier can read, calculates material costs, and produces a client quote — all from a single HTML file backed by Supabase.

---

## Features

### 🪵 Cutlist Generation
- Select rooms (Kitchen, Bedrooms, Bathroom, etc.) and unit types with quantities
- Auto-generates a structured cut list with part names, dimensions, material, and edging per part
- Groups parts by material for easy supplier reading
- Export to `.xlsx` for sending directly to your board supplier

### 💰 Quoting
- Full client-facing quote with line items, hardware, bases, skirting/plinth, and custom lines
- VAT-exclusive pricing throughout (15% VAT calculated and shown separately)
- Grand total shown excl. VAT, VAT amount, and incl. VAT
- Download as formatted Excel quote

### 📐 Costing / Margin View
- Per-unit board cost breakdown (sheets used, edging metres, cut & label, drilling, hardware)
- 20% waste factor applied to all board calculations
- Hardware toggle per section — exclude hinges/runners/handles for sections that don't need them
- Supplier price sync via Supabase — all users see live prices
- Per-board minimum sheet charge (e.g. 0.25 sheet minimum) — toggleable per material

### 🧾 Supplier Prices
- Admin sets board, edging, hardware, and extra prices
- Prices sync to Supabase — all users pull the same rates automatically
- Sync badge shows last save time and any errors
- Admin can rename boards and edging (cascades to all dropdowns and calculations)
- Add custom boards with matching edging; set per-board minimum sheet charge

### 📥 Import Any Cutlist
- Upload an Excel or CSV cutlist in **any format**
- AI (Claude) interprets your abbreviations automatically:

| Abbreviation | Meaning |
|---|---|
| `EAR` | Edge All Round (all 4 sides) |
| `1L / L1 / EL1` | Edge Length 1 |
| `2L / L2 / EL2` | Edge Length 2 |
| `1S / W1 / EW1` | Edge Width 1 |
| `2S / W2 / EW2` | Edge Width 2 |
| `3S / 3E` | 3 sides edged |
| `TE` | Top edge only |

- Preview parsed parts in the standard cutlist table before importing
- Send to Panels with one click — feeds straight into costing and export

### 🪵 Panels Tab
- Add free-form boards, shelves, or custom pieces not part of any unit template
- Full material and edging selection per panel
- Included in cutlist export and all costing calculations

### 🔨 Unit Builder
- Build completely custom units from scratch
- Drag-and-drop part editor with edging per side

### 👥 User Management (Admin)
- Invite users via Supabase email invite
- Role-based access: admin vs regular user
- Users get their own room and unit workspace
- Admin template library — users can copy units from the template into their own jobs

### 💾 Jobs
- Save and load named jobs to Supabase
- Auto-saves every 4 seconds
- Saved Quotes (local snapshots) for saving multiple versions of the same job

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — single file, no build step |
| Auth & Database | [Supabase](https://supabase.com) |
| AI Import Parser | [Anthropic Claude API](https://docs.anthropic.com) |
| Excel Export | [ExcelJS](https://github.com/exceljs/exceljs) + [SheetJS](https://sheetjs.com) |
| Hosting | GitHub Pages |

---

## Database Setup (Supabase)

### Tables required

#### `profiles`
```sql
create table profiles (
  id uuid references auth.users primary key,
  email text,
  role text default 'user'
);
```

#### `jobs`
```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  client text,
  house text,
  state jsonb,
  updated_at timestamptz default now()
);
```

#### `supplier_prices`
```sql
create table supplier_prices (
  name text primary key,
  type text,   -- 'board' | 'edge' | 'hardware' | 'extra'
  price numeric,
  updated_at timestamptz default now()
);
```

### Row-Level Security policies

```sql
-- Profiles: users can read all, insert own, admin can update
create policy "Public profiles readable" on profiles for select to authenticated using (true);
create policy "Users can insert own profile" on profiles for insert to authenticated with check (auth.uid() = id);

-- Jobs: users manage their own
create policy "Users manage own jobs" on jobs for all to authenticated using (auth.uid() = user_id);

-- Supplier prices: all authenticated users can read
create policy "All users read prices" on supplier_prices for select to authenticated using (true);
-- Only admin writes prices (handled in app logic via role check)
create policy "Admin writes prices" on supplier_prices for all to authenticated using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
```

### Auth settings
- Set **Site URL** to `https://yourusername.github.io/cutlist-pro/`
- Enable **Email** provider
- Configure invite email template if using user invites

---

## Configuration

Open `cutlist_app_25.html` and update these constants near the top of the `<script>` block:

```js
const SB_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SB_KEY = 'your-anon-public-key';
```

---

## Deployment

This app is a single `.html` file with no dependencies to install.

1. Fork or clone this repo
2. Update `SB_URL` and `SB_KEY` as above
3. Enable GitHub Pages from **Settings → Pages → Deploy from branch → main**
4. The app will be live at `https://yourusername.github.io/cutlist-pro/`

---

## Usage Flow

```
1. Log in (Supabase auth)
2. Select a room → pick unit types → set quantities
3. Set materials per section (wood + edging colour)
4. Generate Cutlist → review grouped parts table
5. Export .xlsx → send to board supplier
6. Switch to Quote tab → add hardware, bases, skirting
7. Download Quote .xlsx → send to client
8. Use Costing tab → check margins before confirming job
```

---

## Screenshots

> *(Add screenshots of the Quote view, Cutlist table, Costing breakdown, and Import preview here)*

---

## License

Private — all rights reserved. Not licensed for public use or redistribution.

---

## Built by

Nico — cabinet maker, Die Dutchman  
App developed with [Claude](https://claude.ai) by Anthropic
