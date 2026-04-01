# Expertech Digital Hub — Database Setup Guide

## Overview

Your external Supabase project already has these tables:
- `orders` — M-Pesa order tracking
- `payments` — Payment records with STK push responses
- `permissions` — User permission mappings
- `users` — Staff/admin user accounts

You need to add these **two new tables** for the admin panel:
- `print_jobs` — Core table for managing print job uploads
- `business_settings` — Key-value store for admin configuration

---

## Quick Setup (Recommended)

1. Open your Supabase Dashboard → **SQL Editor**
2. Copy the contents of `docs/sql/03_all_tables_combined.sql`
3. Paste into the SQL Editor and click **Run**
4. Done! Both tables, enums, triggers, and RLS policies will be created.

---

## Individual Table Setup

If you prefer to run them separately:

| File | Description |
|------|-------------|
| `docs/sql/01_print_jobs.sql` | Print jobs table with status enums and RLS |
| `docs/sql/02_business_settings.sql` | Business settings key-value table |

Run each file in order in the SQL Editor.

---

## Environment Variables

Make sure your Supabase project has these env vars set in your deployment (Netlify/Vercel):

### Frontend (Vite)
```
VITE_SUPABASE_URL=https://bnwuvphqnjextkbaxigx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (API routes)
```
SUPABASE_URL=https://bnwuvphqnjextkbaxigx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## How It All Connects

```
┌─────────────────┐     ┌──────────────────┐
│  Upload Form    │────▶│  print_jobs table │
│  (public site)  │     │  (status: pending)│
└─────────────────┘     └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   Admin Panel    │
                        │  View/Edit/Track │
                        └────────┬─────────┘
                                 │
┌─────────────────┐     ┌────────▼─────────┐
│  M-Pesa STK     │────▶│  orders/payments │
│  Payment Flow   │     │  (existing)      │
└─────────────────┘     └──────────────────┘
```

- **Upload form** inserts a row into `print_jobs` with status `pending`
- **Admin panel** reads/updates `print_jobs` for job management
- **M-Pesa payments** continue using the existing `orders` and `payments` tables
- **Business settings** are read by the admin settings page

---

## Verifying Setup

After running the SQL, check that:

1. ✅ `print_jobs` table exists with all columns
2. ✅ `business_settings` table exists with seed data
3. ✅ RLS is enabled on both tables
4. ✅ Enums `job_status` and `payment_method` are created
5. ✅ The `update_updated_at_column` trigger is attached to `print_jobs`

---

## GitHub Sync

This project is connected to GitHub. All changes (including these docs) will automatically sync to your repository when saved in Lovable.
