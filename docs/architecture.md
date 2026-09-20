# MTM Machine-Maintenance — Clean Architecture Documentation

## 1. Architectural Overview

The application follows the principles of **Clean Architecture** adapted for Next.js 16 (App Router), separating business logic, infrastructure, application services, and presentation into distinct, decoupled layers.

```
┌─────────────────────────────────────────────────────────────┐
│                     App / Delivery Layer                    │
│            (Next.js 16 App Router, Pages, Actions)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Presentation Layer                     │
│           (Reusable UI components, SVG charts, Icons)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Application Layer                      │
│        (Auth DAL, Session Management, i18n Localization)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Infrastructure Layer                     │
│           (Supabase SSR / Server, Data Repositories)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                        Domain Layer                         │
│    (Entities, Business Rules, RBAC Permissions, PM Logic)   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
src/
├── app/                        # Delivery / Web Layer (Next.js 16 App Router)
│   ├── (app)/                  # Authenticated routes (AppShell Layout)
│   │   ├── alarms/             # Alarm logging & management
│   │   ├── audit/              # Audit trail log
│   │   ├── dashboard/          # Real-time metrics & KPIs
│   │   ├── machines/           # Machine registry & history
│   │   ├── maintenance/        # Maintenance work orders
│   │   ├── plan/               # Preventive maintenance planner
│   │   ├── users/              # User management & RBAC settings
│   │   └── AppShell.tsx        # Responsive layout shell & collapsible sidebar
│   ├── auth/                   # OAuth callback routes
│   ├── login/                  # Authentication page & form
│   ├── layout.tsx              # Root HTML, Roboto font, theme provider
│   └── globals.css             # Tailwind CSS & theme tokens
│
├── components/                 # Presentation Layer
│   ├── charts.tsx              # SVG visualization charts (AlarmChart, StatusBar, TopMachines)
│   ├── client.tsx              # Interactive client controls (FilterForm, SubmitButton)
│   ├── icons.tsx               # Scalable SVG icon system
│   └── ui.tsx                  # Core UI components (PageHeader, StatusPill, Field, Notice)
│
├── lib/                        # Core Application, Domain, and Infrastructure
│   ├── domain/                 # ── Domain Layer ──
│   │   ├── types.ts            # Entity models (Profile, Machine, Alarm, PmPlan, etc.)
│   │   ├── permissions.ts      # Role-Based Access Control (RBAC) rules
│   │   ├── pm.ts               # Preventive maintenance scheduling & interval calculations
│   │   ├── time.ts             # Plant timezone (UTC+7) calculations
│   │   ├── validation.ts       # Zod domain validation schemas
│   │   └── index.ts            # Domain barrel export
│   │
│   ├── auth/                   # ── Application Layer (Auth) ──
│   │   ├── dal.ts              # Data Access Layer & permission guards
│   │   ├── session.ts          # Session cookie management
│   │   └── credentials.ts      # Password hashing & verification
│   │
│   ├── i18n/                   # ── Application Layer (Localization) ──
│   │   └── index.ts            # Bilingual dictionaries (TH / EN) & getDictionary()
│   │
│   ├── data/                   # ── Infrastructure Layer (Repositories) ──
│   │   ├── repo.ts             # Data repository implementing CRUD & Supabase queries
│   │   └── seed.ts             # Initial mock seed data
│   │
│   └── supabase/               # ── Infrastructure Layer (Database & External) ──
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server-side Supabase client
│       ├── proxy.ts            # Edge session refresh proxy
│       └── config.ts           # Configuration validation
│
├── proxy.ts                    # Edge proxy middleware (CSP & session check)
```

---

## 3. Layer Responsibilities

### 3.1 Domain Layer (`src/lib/domain/`)
- **Independent**: Has zero dependencies on UI frameworks or databases.
- **Entities (`types.ts`)**: Defines `Profile`, `Machine`, `Alarm`, `MaintenanceRecord`, `PmPlan`, `AuditEntry`.
- **Business Logic (`permissions.ts`, `pm.ts`)**: Pure functions defining who can do what (`can()`, `canView()`) and how PM dates advance (`advancePlan()`, `planState()`).
- **Validation (`validation.ts`)**: Zod validation schemas enforcing business constraints.

### 3.2 Infrastructure Layer (`src/lib/data/`, `src/lib/supabase/`)
- **Database Access**: Interacts with Supabase PostgreSQL using Row-Level Security (RLS).
- **Fallback Capability**: Seamlessly switches to in-memory mock repository if Supabase credentials are not provided.
- **Audit Logging**: Automatically records user activities to `audit_log`.

### 3.3 Application Layer (`src/lib/auth/`, `src/lib/i18n/`)
- **Authentication DAL (`dal.ts`)**: Enforces page-level authorization on the server (`requireUser()`, `requirePage()`, `requirePermission()`).
- **Internationalization (`i18n/`)**: Delivers complete Thai and English localizations.

### 3.4 Presentation & Delivery Layers (`src/components/`, `src/app/`)
- **Server-First Components**: Pages are React Server Components by default for optimal performance and SEO.
- **Fluid Layout**: Fully responsive full-width layout with collapsible icon sidebar.
- **Dynamic Role-Based Access Control (RBAC)**: Supports custom role creation, editable page/action permissions, and automatic admin lockout protection.

---

## 4. Extended Session Memory & Operational Documentation

For in-depth architectural details, Google OAuth vs Local provider detection rules, database schema synchronization, and test suite breakdowns, see:
- [docs/session-memory.md](file:///D:/Machine-Maintenance/Maintenance-Logs/docs/session-memory.md)
- [docs/production-guide.md](file:///D:/Machine-Maintenance/Maintenance-Logs/docs/production-guide.md)
- [docs/supabase-handoff.md](file:///D:/Machine-Maintenance/Maintenance-Logs/docs/supabase-handoff.md)
