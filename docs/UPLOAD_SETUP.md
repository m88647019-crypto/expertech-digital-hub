# Upload & Download Setup Guide

## Overview

The file upload pipeline works as follows:

1. **Customer uploads files** → `POST /api/uploadFile` → Files stored in Supabase Storage (`uploads` bucket)
2. **Order saved** → `POST /api/saveOrder` → File paths saved to `print_jobs.file_url` (comma-separated)
3. **Admin downloads** → Admin panel uses Supabase signed URLs directly (no API route needed)

## Required Supabase Setup

### 1. Run the SQL Script

Go to your **Supabase Dashboard → SQL Editor** and run the contents of:

```
docs/sql/08_storage_and_setup.sql
```

This creates:
- The `uploads` storage bucket (private, not public)
- RLS policies allowing anonymous uploads and authenticated downloads
- Default business settings
- Realtime subscription for live admin updates

### 2. Environment Variables

Ensure these are set in your **Vercel deployment**:

| Variable | Where | Purpose |
|----------|-------|---------|
| `SUPABASE_URL` | Backend (Vercel) | API endpoint for server-side Supabase calls |
| `SUPABASE_ANON_KEY` | Backend (Vercel) | Anon key for public operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (Vercel) | Service role key for admin operations (file management) |
| `VITE_SUPABASE_URL` | Frontend (.env) | Same URL for client-side Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend (.env) | Anon key for client-side |

### 3. How File Downloads Work

The admin panel now uses **Supabase client-side signed URLs** instead of a backend API route:

```typescript
const { data } = await supabase.storage
  .from("uploads")
  .createSignedUrl(filePath, 300); // 5-minute expiry
window.open(data.signedUrl, "_blank");
```

This means:
- Admin must be **logged in** (authenticated) to download files
- Signed URLs expire after 5 minutes for security
- No server-side route needed for downloads

### 4. Troubleshooting

**Files not uploading?**
- Check that the `uploads` bucket exists in Supabase Dashboard → Storage
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel env vars
- Check Vercel function logs for errors at `/api/uploadFile`

**Downloads not working?**
- Ensure you ran the storage policies SQL (step 1)
- Verify admin is logged in (signed URLs require authentication)
- Check browser console for errors

**Settings not showing on website?**
- Run the SQL script to seed default business settings
- Update settings in Admin Panel → Settings tab
- Settings apply immediately — refresh the public site to see changes

## File Storage Structure

Files are stored at: `uploads/{checkoutRequestID}/{filename}`

Example: `uploads/ws_CO_123456/document.pdf`
