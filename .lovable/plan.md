

## Problem Diagnosis

The entire app crashes with a blank white page on ANY route (including `/login`, `/admin`, `/dashboard`) because:

1. **`supabaseClient.ts` calls `createClient("", "")` when env vars are missing** -- the Supabase JS SDK throws `"supabaseUrl is required"`, which is an unrecoverable crash that prevents React from rendering anything.
2. **No Supabase connection exists** in this Lovable project -- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set.
3. **The `AuthProvider` wraps the entire app**, so the crash blocks ALL routes, including the public homepage (`/`).

This means routing is actually correct -- the issue is that the app never gets far enough to render any route.

## Plan

### Step 1: Connect Supabase to this project

Use the Supabase connector to link an external Supabase project. This will set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` automatically.

### Step 2: Make the app resilient to missing Supabase credentials

Update `supabaseClient.ts` so that it does not crash the entire app when env vars are absent. Instead, it should create a no-op or fallback client, and the `AuthProvider` should gracefully handle a missing/broken client by setting `loading: false` and `user: null` -- allowing public routes (homepage, login, register) to still render.

### Step 3: Restructure App.tsx so public routes are not blocked by auth failures

Move the `AuthProvider` to only wrap routes that need it, OR make the `AuthProvider` resilient so it never blocks rendering of public pages. The homepage (`/`) should always render even if Supabase is completely down.

### Step 4: Build out the full Admin Panel

With auth working, expand the existing `Admin.tsx` into the comprehensive admin panel requested:

- **Dashboard overview tab**: Upload stats (today/week), pending/completed/cancelled job counts, simple chart (uploads per day), recent uploads list.
- **Print Jobs management tab**: Full table of all `print_jobs` with search/filter by name, email, phone, status, date, branch. Color-coded status badges. Inline status dropdown. File preview modal (PDF/image). Download/delete buttons. Notes field.
- **Job detail view**: Modal or expandable row with full customer info, file preview, editable status/notes/price fields.
- **Customer communication**: WhatsApp button (pre-filled message) and email button per job.
- **Payment management**: Price field, paid/unpaid toggle, payment method selector (Cash/M-Pesa/Card).
- **Branch management**: Branch field per job, branch filter, branch switcher.
- **User management** (super admin only): Create/delete staff users, assign roles.
- **Settings page**: Business name, contact info, WhatsApp number, default pricing.
- **Notifications**: Badge counter for new jobs, toast on new uploads.
- **Bulk actions**: Select multiple jobs, bulk delete/mark completed.
- **CSV export**: Export filtered jobs to CSV.
- **Activity logs**: Existing tab, enhanced with more detail.

### Step 5: Database schema

Create Supabase migration for the `print_jobs` table:
- `id`, `name`, `email`, `phone`, `file_url`, `instructions`, `copies`, `color_option`, `paper_size`, `status`, `price`, `paid`, `payment_method`, `branch`, `notes`, `created_at`

Add RLS policies so only authenticated users can read/write.

### Step 6: Connect upload form to print_jobs

Update `UploadPrint.tsx` to save job metadata to the `print_jobs` table after successful upload, so the admin panel can display all uploads.

### Technical Details

- **Files to modify**: `src/lib/supabaseClient.ts`, `src/hooks/useAuth.tsx`, `src/App.tsx`, `src/pages/Admin.tsx`
- **Files to create**: Multiple admin sub-components (job table, job detail modal, dashboard stats, settings form, user management), Supabase migration for `print_jobs`
- **No changes to**: M-Pesa APIs (`/api/stkPush`, `/api/mpesaCallback`, `/api/checkStatus`, `/api/saveOrder`), `UploadPrint.tsx` core payment logic, `vercel.json`

