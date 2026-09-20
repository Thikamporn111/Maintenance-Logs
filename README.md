# 🏭 MTM · Machine-Maintenance Logs

> ระบบบันทึกงานซ่อมบำรุงเครื่องจักรโรงงาน — Factory Machine Maintenance Tracking System

A full-stack web application for managing factory machine maintenance operations, built with **Next.js 16**, **Supabase**, and **Tailwind CSS v4**. Supports role-based access control (RBAC), bilingual UI (Thai/English), light/dark theme, and Google OAuth.

![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3fcf8e?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Vitest](https://img.shields.io/badge/Tests-Vitest-6e9f18?logo=vitest)
![Deploy](https://img.shields.io/badge/Deploy-Vercel-000?logo=vercel)

**🌐 Live:** https://maintenance-logs-ten.vercel.app

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Running the App](#-running-the-app)
- [Testing](#-testing)
- [Project Structure](#-project-structure)
- [Authentication & RBAC](#-authentication--rbac)
- [Internationalization (i18n)](#-internationalization-i18n)
- [Theming](#-theming)
- [Deployment](#-deployment)
- [License](#-license)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication** | Supabase Auth with email/password + Google OAuth |
| 👥 **Role-Based Access** | 3 system roles — Admin, Technician, Viewer — with dynamic RBAC |
| 🏭 **Machine Management** | CRUD operations for factory machines (CNC, Robot, Press, etc.) |
| 🚨 **Alarm Tracking** | Log and track machine alarms with error codes and resolution actions |
| 🔧 **Maintenance Logs** | Record corrective and preventive maintenance with status tracking |
| 📅 **PM Planning** | Preventive Maintenance scheduling with interval-based planning (7–365 days) |
| 📊 **Dashboard** | Overview with machine status, alarm counts, and maintenance summaries |
| 📝 **Audit Trail** | Track all data changes with user attribution and timestamps |
| 👤 **User Management** | Admin panel for managing users, roles, and account status |
| 🌐 **Bilingual UI** | Full Thai (TH) and English (EN) language support |
| 🌙 **Dark/Light Theme** | Cookie-based theme system with smooth transitions |
| 📱 **Responsive Design** | Works on desktop, tablet, and mobile devices |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16.3.5](https://nextjs.org/) (App Router, Server Actions, RSC) |
| **UI** | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) |
| **Auth & DB** | [Supabase](https://supabase.com/) (Auth, PostgreSQL, RLS) |
| **Validation** | [Zod v4](https://zod.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Testing** | [Vitest 5](https://vitest.dev/) |
| **Deploy** | [Vercel](https://vercel.com/) (Serverless) |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────┐
│                      Browser                         │
│   Login Page ──→ App Shell ──→ Feature Pages         │
│   (LoginForm)    (Sidebar)     (Dashboard, Machines, │
│                                 Alarms, Maintenance, │
│                                 Plan, Users, Audit)  │
└─────────────────────┬────────────────────────────────┘
                      │ HTTP / Server Actions
┌─────────────────────▼────────────────────────────────┐
│               Next.js Server (RSC)                   │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Actions  │  │   DAL    │  │   Middleware      │    │
│  │ (CRUD)   │  │ (Auth)   │  │  (Session Check)  │    │
│  └────┬─────┘  └────┬─────┘  └──────────────────┘    │
│       │              │                                │
│  ┌────▼──────────────▼───────────────────────────┐   │
│  │           Domain Layer (Pure Logic)            │   │
│  │  Types · Validation · Permissions · PM Calc    │   │
│  └────────────────────┬──────────────────────────┘   │
│                       │                               │
│  ┌────────────────────▼──────────────────────────┐   │
│  │         Supabase Client (SSR / Browser)        │   │
│  └────────────────────┬──────────────────────────┘   │
└───────────────────────┼──────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────┐
│              Supabase Cloud                          │
│   Auth (JWT) · PostgreSQL · RLS Policies             │
└──────────────────────────────────────────────────────┘
```

### Key Design Decisions

- **Server Actions** for all mutations — no REST API boilerplate
- **Domain Layer** (`src/lib/domain/`) — pure TypeScript, zero dependencies, fully testable
- **Data Access Layer** (`src/lib/auth/dal.ts`) — single entry point for authenticated user context
- **Repository Pattern** (`src/lib/data/repo.ts`) — abstracts Supabase queries
- **Cookie-based theme/locale** — server-rendered with no flash of unstyled content

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.9
- **npm** ≥ 10
- A **Supabase** project ([create one free](https://supabase.com/dashboard))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Thikamporn111/Maintenance-Logs.git
cd Maintenance-Logs

# 2. Switch to the development branch
git checkout frontend-dev

# 3. Install dependencies
npm install

# 4. Copy environment template
cp .env.example .env.local
```

---

## 🔑 Environment Variables

Create `.env.local` from `.env.example`:

```env
# ── Required: Supabase ────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# ── Optional: Service Role (for admin operations) ────────────
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Required in Production: Session Secret ────────────────────
SESSION_SECRET=  # Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ── Optional: Demo Mode ──────────────────────────────────────
DEMO_LOGIN=      # "off" to disable, or leave empty
DEMO_PASSWORD=   # 12+ chars for demo accounts

# ── Optional: Google OAuth ────────────────────────────────────
# Configure in Supabase Dashboard → Auth → Providers → Google
# GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
# GOOGLE_CLIENT_SECRET=your-client-secret
```

> **⚠️ Important:** Never commit `.env.local` — it's already in `.gitignore`.

---

## 🗄 Database Setup

### 1. Run the Schema

1. Open your [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** → **New Query**
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql)
4. Click **Run**

### 2. What Gets Created

| Table | Description |
|-------|-------------|
| `roles` | Dynamic RBAC role definitions with pages and permissions |
| `profiles` | User profiles linked to Supabase Auth (id, name, email, role) |
| `machines` | Factory machines registry (ID format: `M-000`) |
| `alarms` | Machine alarm logs with error codes (ID: `ALM-0000`, Code: `E-000`) |
| `maintenance_logs` | Maintenance work records (ID: `MNT-0000`) |
| `pm_plans` | Preventive maintenance schedules (ID: `PM-0000`) |
| `audit_trail` | All data changes with user tracking |

### 3. Row Level Security (RLS)

RLS policies are included in `schema.sql`:
- **Authenticated users** can read data based on their role
- **Admin** has full CRUD on all tables
- **Technician** can create/update maintenance logs and alarms
- **Viewer** has read-only access

### 4. Create Users

After running the schema, create users in **Supabase Auth** → **Users** → **Add User**, then insert matching profiles:

```sql
INSERT INTO public.profiles (id, name, email, role) VALUES
  ('auth-user-uuid', 'Your Name', 'your@email.com', 'admin');
```

---

## ▶️ Running the App

```bash
# Development server (http://localhost:3000)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Production build
npm run build
npm start
```

---

## 🧪 Testing

The project uses **Vitest** with 12 test suites covering all modules:

```bash
# Run all tests
npm test

# Run with watch mode
npx vitest

# Run a specific test file
npx vitest tests/validation.test.ts
```

### Test Suites

| File | Coverage |
|------|----------|
| `validation.test.ts` | Zod schemas — machines, alarms, maintenance, plans, users |
| `pm-and-permissions.test.ts` | PM calculations, role permissions, page access |
| `machines.test.ts` | Machine CRUD validation and status transitions |
| `alarms.test.ts` | Alarm creation, status flow, error code validation |
| `maintenance.test.ts` | Maintenance log validation, type/status checks |
| `plan.test.ts` | PM plan scheduling, interval calculations |
| `users.test.ts` | User profile validation, role assignment |
| `roles.test.ts` | RBAC role definitions, permission checks |
| `dashboard.test.ts` | Dashboard data aggregation logic |
| `audit.test.ts` | Audit trail entry validation |
| `i18n.test.ts` | Translation key completeness (TH/EN) |
| `session.test.ts` | Session handling and auth state |

---

## 📁 Project Structure

```
Maintenance-Logs/
├── public/                    # Static assets
├── supabase/
│   └── schema.sql             # Complete database schema with RLS
├── docs/
│   ├── architecture.md        # Architecture documentation
│   ├── production-guide.md    # Production deployment guide
│   ├── supabase-handoff.md    # Supabase setup guide
│   └── test-checklist.md      # Tester checklist before hand-in
├── tests/
│   ├── *.test.ts              # 12 test suites
│   └── stubs/
│       └── empty.ts           # Test stub
├── src/
│   ├── proxy.ts               # Supabase proxy middleware
│   ├── app/
│   │   ├── layout.tsx         # Root layout (theme, locale)
│   │   ├── globals.css        # Tailwind v4 + CSS variables
│   │   ├── actions.ts         # setTheme, setLocale server actions
│   │   ├── page.tsx           # Root redirect → /login
│   │   ├── login/
│   │   │   ├── page.tsx       # Login page with SVG illustration
│   │   │   ├── LoginForm.tsx  # Login form component
│   │   │   └── actions.ts     # login, signInWithGoogle actions
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts   # OAuth callback handler
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── google/
│   │   │               └── route.ts  # Google OAuth route
│   │   └── (app)/             # Authenticated app group
│   │       ├── layout.tsx     # App layout with sidebar
│   │       ├── AppShell.tsx   # Navigation shell component
│   │       ├── dashboard/     # 📊 Dashboard page
│   │       ├── machines/      # 🏭 Machine management (CRUD)
│   │       ├── alarms/        # 🚨 Alarm tracking (CRUD)
│   │       ├── maintenance/   # 🔧 Maintenance logs (CRUD)
│   │       ├── plan/          # 📅 PM planning (CRUD)
│   │       ├── users/         # 👤 User management (Admin)
│   │       └── audit/         # 📝 Audit trail (Read-only)
│   ├── components/
│   │   ├── ui.tsx             # Shared UI components
│   │   ├── icons.tsx          # SVG icon system
│   │   ├── charts.tsx         # Chart components
│   │   └── client.tsx         # Client-side components
│   └── lib/
│       ├── index.ts           # Barrel exports
│       ├── types.ts           # Re-exports from domain
│       ├── permissions.ts     # Re-exports from domain
│       ├── validation.ts      # Re-exports from domain
│       ├── pm.ts              # Re-exports from domain
│       ├── time.ts            # Re-exports from domain
│       ├── domain/            # 🧠 Pure domain logic (zero deps)
│       │   ├── types.ts       # Entity types & constants
│       │   ├── validation.ts  # Zod schemas
│       │   ├── permissions.ts # RBAC definitions
│       │   ├── pm.ts          # PM schedule calculations
│       │   ├── time.ts        # Date/time utilities
│       │   └── index.ts       # Barrel exports
│       ├── auth/
│       │   ├── dal.ts         # Data Access Layer (getCurrentUser)
│       │   ├── session.ts     # Session management
│       │   └── credentials.ts # Credential validation
│       ├── data/
│       │   ├── repo.ts        # Repository (Supabase queries)
│       │   └── seed.ts        # Database seeding
│       ├── i18n/
│       │   └── index.ts       # Thai/English translations
│       └── supabase/
│           ├── client.ts      # Browser Supabase client
│           ├── server.ts      # Server Supabase client
│           ├── config.ts      # Supabase configuration
│           └── proxy.ts       # Supabase proxy utilities
├── .env.example               # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 🔐 Authentication & RBAC

### Auth Flow

```
User enters email/password
       │
       ▼
LoginForm (Client Component)
       │
       ▼ Server Action
login() in actions.ts
       │
       ├── Supabase signInWithPassword()
       │       │
       │       ▼
       │   Check profiles table (active status)
       │       │
       │       ▼
       │   Set session cookie → Redirect to /dashboard
       │
       └── (Fallback) Demo credentials check
```

### Roles & Permissions

| Role | Pages | Capabilities |
|------|-------|-------------|
| **Admin** | All pages | Full CRUD on everything, user management |
| **Technician** | Dashboard, Machines, Alarms, Maintenance, Plans | Create/edit maintenance & alarms |
| **Viewer** | Dashboard, Machines, Alarms (read-only) | View data only |

### Google OAuth

1. Configure Google OAuth provider in Supabase Dashboard → Auth → Providers
2. Set callback URL: `https://your-domain.com/auth/callback`
3. Users signing in with Google are auto-linked to profiles by email

---

## 🌐 Internationalization (i18n)

The app supports **Thai (TH)** and **English (EN)** with a cookie-based locale system:

- Translation file: `src/lib/i18n/index.ts`
- Toggle: Language switcher in the app header (TH / EN buttons)
- Server-rendered: Locale cookie read on the server → no hydration mismatch

### Adding/Editing Translations

```typescript
// src/lib/i18n/index.ts
const dictionaries = {
  th: {
    login: {
      title: "เข้าสู่ระบบ",
      emailPlaceholder: "กรอกอีเมล",
      // ...
    },
    // ...
  },
  en: {
    login: {
      title: "Login",
      emailPlaceholder: "Enter email",
      // ...
    },
    // ...
  },
};
```

---

## 🎨 Theming

Cookie-based theme system with **Light** and **Dark** modes:

- Theme cookie → `data-theme` attribute on `<html>`
- CSS variables in `globals.css`:
  - Light: `--ink: #0F172A`, `--bg: #F8FAFC`
  - Dark: `--ink: #F9FAFB`, `--bg: #0A0E1A`
- Tailwind `dark:` variant mapped to `[data-theme="dark"]` via `@custom-variant`
- Toggle: Sun/Moon icon in the header

---

## 🚀 Deployment

### Live Deployment

| | |
|---|---|
| **Production URL** | https://maintenance-logs-ten.vercel.app |
| **Production branch** | `main` — every push deploys automatically |
| **Preview** | every other branch / pull request gets its own preview URL |

### Vercel (Recommended)

1. **Connect repository** to Vercel (Framework preset: Next.js, Root directory: `./`)
2. **Set environment variables** in Vercel Dashboard (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, bypasses RLS)
   - `SESSION_SECRET` (random 32+ char string)
   - `DEMO_LOGIN=off` (disables the demo accounts in production)
3. **Deploy** — Vercel auto-detects Next.js

```bash
# Or deploy via CLI
npx vercel --prod
```

### Supabase Configuration for Production

1. **Supabase** → Authentication → URL Configuration → **Site URL**
   - `https://maintenance-logs-ten.vercel.app`
2. Same page → **Redirect URLs**:
   - `https://maintenance-logs-ten.vercel.app/auth/callback`
   - `https://maintenance-logs-ten.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/**` (local development)
3. **Google Cloud Console** → Credentials → OAuth client → Authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`

> Leaving Site URL as `http://localhost:3000` makes Google sign-in bounce back to localhost after login.

> For detailed production setup, see [`docs/production-guide.md`](docs/production-guide.md).
> Before hand-in, run through [`docs/test-checklist.md`](docs/test-checklist.md).

---

## 📄 License

This project is developed for educational and internal factory use.

---

<p align="center">
  <b>MTM · Machine-Maintenance</b><br>
  Built with ❤️ using Next.js, React, Supabase & Tailwind CSS
</p>
