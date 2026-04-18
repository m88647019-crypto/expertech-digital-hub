# EXPERTECH Cyber

A modern, full-stack web platform for **EXPERTECH Cyber Café** — built to manage online printing, government portal services, and customer bookings across multiple branches in Kenya. Live at **[expertech.vercel.app](https://expertech.vercel.app/)**.

---

## ✨ Overview

EXPERTECH Cyber is a production-ready web application that brings a traditional cyber café online. Customers can:

- 📤 **Upload documents** for printing and pay instantly via **M-Pesa STK Push**
- 📝 **Book services** like KRA/iTax filing, eCitizen, NTSA, HELB, CV writing, graphic design, and more
- 🏢 **Choose a branch** (Eldoret / additional locations) for service fulfillment
- 💬 **Reach support** instantly through the WhatsApp floating button

Behind the scenes, staff use a premium dark-themed admin panel to manage jobs, services, payments, users, and reports — all in real time.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui |
| State & Data | TanStack Query, React Router, Supabase Realtime |
| Backend | Vercel Serverless Functions (Node.js), consolidated routing |
| Database & Auth | Supabase (PostgreSQL + Row-Level Security + Storage) |
| Payments | Safaricom **M-Pesa Daraja API** (STK Push + Callback) |
| Deployment | Vercel (Hobby-plan optimized — single API entrypoint) |

---

## 🚀 Key Features

### Customer-Facing
- **Hero + Services Grid** — clean landing experience with all available services
- **Upload & Print** — drag-and-drop file uploads, B&W/Color pricing, page count detection (PDF.js)
- **Service Booking Form** — dynamic forms that render extra required fields per service (e.g. KRA PIN, Business Name)
- **M-Pesa Checkout** — STK Push with live status polling and debug panel
- **Branch Toggle** — customers pick their preferred branch for fulfillment
- **WhatsApp FAB** — one-tap support

### Admin Panel (`/admin`)
- **Premium dark UI** with glassmorphism, gradient stat cards, and responsive sidebar
- **Dashboard** — revenue, jobs, requests, and live stats
- **Print Jobs** — view, filter, mark complete, download files via signed URLs
- **Service Requests** — track customer bookings end-to-end with multi-line detail view
- **Reports** — popular services, revenue trends
- **Services Management** — create/edit services with **multiple dynamic required fields** per service
- **User Management** — create cashiers, assign granular permissions
- **Settings** — pricing, business info
- **Activity Logs** — audit trail of staff actions
- **Real-time updates** via Supabase Realtime + in-app notifications

### Cashier Dashboard (`/dashboard`)
- Streamlined view for in-store staff — process print jobs and confirm service requests

### Security
- JWT-verified admin APIs
- Role-based access control via a dedicated `user_roles` table (no privilege escalation)
- Private Supabase Storage bucket; files served only via 5-minute signed URLs
- Service role key never exposed to the client
- RLS enabled on every table

---

## 📁 Project Structure

```
expertech/
├── api/                    # Vercel serverless functions (consolidated)
│   └── index.js            # Single dynamic route → M-Pesa, uploads, admin, cleanup
├── lib/                    # Shared backend utilities (Supabase clients, auth)
├── src/
│   ├── components/         # UI + admin components
│   │   ├── admin/          # Admin panel modules
│   │   └── ui/             # shadcn/ui primitives
│   ├── hooks/              # React Query hooks (auth, jobs, services, settings)
│   ├── pages/              # Index, Login, Register, Admin, Dashboard, NotFound
│   ├── lib/                # Frontend Supabase client + utils
│   └── index.css           # Design tokens & admin theme
├── docs/sql/               # Versioned SQL migrations for Supabase
├── public/                 # Static assets, robots.txt, sitemap.xml
└── vercel.json             # Vercel config + cron for auto-cleanup
```

---

## ⚙️ Local Development

### Prerequisites
- Node.js 18+ and npm/bun
- A Supabase project
- Safaricom Daraja API credentials (for M-Pesa)

### Setup

```bash
# 1. Install
npm install

# 2. Configure environment variables (see below)
cp .env.example .env.local

# 3. Run dev server
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

**Frontend (Vite):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Backend (Vercel / API):**
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
```

---

## 🗄️ Database Setup

All schema is versioned under `docs/sql/`. Run the files **in order** in your Supabase SQL Editor:

1. `01_print_jobs.sql` — Print jobs table
2. `02_business_settings.sql` — Pricing & business info
3. `04_auth_tables.sql` — Roles, permissions, activity logs
4. `08_storage_and_setup.sql` — Private storage bucket + policies
5. `09_services_tables.sql` — Service categories, services, requests
6. `10_services_details_and_reports.sql` — Detail flags
7. `11_services_required_fields.sql` — Multi-field dynamic service forms

Then create your first admin user — see `SETUP.md` for the full walkthrough.

---

## 🌐 Deployment (Vercel)

This project is **Hobby-plan friendly** — all backend routes are consolidated into a single serverless function (`api/index.js`) to stay well under the 12-function limit.

```bash
# Push to GitHub, import to Vercel, set env vars, deploy.
```

**Auto-cleanup:** A Vercel Cron job calls `/api/cleanup` every 6 hours to purge expired uploaded files (24h retention).

---

## 🔄 Real-time Architecture

- Admin & cashier dashboards subscribe to Supabase `postgres_changes` on `print_jobs` and `service_requests`
- New job notifications appear instantly with a badge counter
- M-Pesa callback updates order status; frontend polls `/api/checkStatus` for confirmation

---

## 📜 Scripts

```bash
npm run dev       # Start Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint
npm run test      # Vitest
```

---

## 📄 Documentation

- **[SETUP.md](./SETUP.md)** — Full backend, database, and deployment guide
- **[docs/SETUP_DATABASE.md](./docs/SETUP_DATABASE.md)** — DB-specific setup
- **[docs/UPLOAD_SETUP.md](./docs/UPLOAD_SETUP.md)** — File upload configuration

---

## 🤝 Contributing

This is a private business project for EXPERTECH Cyber. For issues, contact the maintainers directly.

---

## 📝 License

Proprietary — © EXPERTECH Cyber. All rights reserved.
