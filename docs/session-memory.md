# MTM Machine-Maintenance — Session Memory & Architecture Reference

> **Document Purpose**: Complete reference and persistent session memory for the **MTM Machine-Maintenance** project. Captures architectural patterns, domain rules, database schemas, dynamic RBAC design, Google OAuth vs. Local auth detection, and operational procedures.

---

## 1. Project Overview & Identity

- **System Name**: MTM Machine-Maintenance
- **Domain**: Machine Maintenance & Alarm Logging (CMMS / Plant Asset Management)
- **Key Capabilities**:
  - Real-time Plant Dashboard & KPI monitoring (Running, Stop, Alarm, Maintenance counts, MTTR, Alarm trends).
  - Machine Master registry with status tracking.
  - Alarm logging with cause analysis, technician assignment, and corrective action recording.
  - Preventive Maintenance (PM) scheduler with intervals (7, 14, 30, 90, 180, 365 days) and automated work order generation.
  - Dynamic Role-Based Access Control (RBAC) with custom role creation, page-level routing, and action permissions.
  - User management supporting both Google OAuth and Local email/password accounts.
  - Full audit trail logging for compliance.
  - Bilingual interface (Thai default / English) with Roboto typography and fluid responsive layout.

---

## 2. Technology Stack & Frameworks

| Layer / Concern | Technology |
|---|---|
| **Framework** | Next.js 16.3.5 (App Router, Server Actions, Server Components) |
| **Bundler & Compiler** | Turbopack (Enabled in Dev & Build) |
| **Language & Runtime** | TypeScript 5.7+ / Node.js 20+ |
| **UI Styling** | Tailwind CSS 3.4 with custom plant theme tokens |
| **Typography** | Google Fonts **Roboto** (`next/font/google`) |
| **Database & Auth** | Supabase (PostgreSQL 15+, Supabase Auth, GoTrue Admin API, Row-Level Security) |
| **Offline / Test Fallback** | In-memory mock repository (`src/lib/data/seed.ts`) |
| **Validation** | Zod 3.23+ with Thai / English error localization |
| **Testing** | Vitest 5.0 (74 unit & integration tests) |

---

## 3. Clean Architecture Implementation

The project follows Clean Architecture principles divided into decoupled layers:

```
src/
├── app/                        # ── Delivery / App Router Layer ──
│   ├── (app)/                  # Authenticated application shell & pages
│   │   ├── alarms/             # Alarm logging & management
│   │   ├── audit/              # System audit trail
│   │   ├── dashboard/          # Metric cards & SVG charts
│   │   ├── machines/           # Machine registry & details
│   │   ├── maintenance/        # Maintenance work orders
│   │   ├── plan/               # PM planner & calendar
│   │   ├── users/              # User administration & RBAC management
│   │   └── AppShell.tsx        # Responsive layout shell & collapsible sidebar
│   ├── api/auth/callback/      # Google OAuth callback handler
│   ├── auth/callback/          # Supabase standard auth callback
│   ├── login/                  # Login page (Local & Google OAuth)
│   ├── layout.tsx              # Root HTML layout & theme provider
│   └── globals.css             # Theme variables & utility styles
│
├── components/                 # ── Presentation Layer ──
│   ├── charts.tsx              # SVG vector charts (AlarmChart, StatusBar, TopMachines)
│   ├── client.tsx              # Interactive client controls (FilterForm, SubmitButton)
│   ├── icons.tsx               # Scalable 24x24 SVG icon system (Icon component)
│   └── ui.tsx                  # Core UI atoms (PageHeader, StatusPill, Field, Notice)
│
├── lib/                        # ── Application, Domain, and Infrastructure ──
│   ├── domain/                 # ── Domain Layer (Zero external dependencies) ──
│   │   ├── types.ts            # Core entity interfaces (Profile, Machine, Alarm, RoleDefinition, etc.)
│   │   ├── permissions.ts      # RBAC permission rules (can, canView, pagesFor, ALL_PAGES, ALL_PERMISSIONS)
│   │   ├── pm.ts               # PM scheduling, due dates, state calculations
│   │   ├── time.ts             # Timezone formatting (Plant timezone UTC+7)
│   │   ├── validation.ts       # Zod schemas (userCreateSchema, roleCreateSchema, machineSchema, etc.)
│   │   └── index.ts            # Domain barrel export
│   │
│   ├── auth/                   # ── Application Layer (Security & Auth) ──
│   │   ├── dal.ts              # Data Access Layer & permission guards (requireUser, requirePage, requirePermission)
│   │   ├── session.ts          # Session cookies for offline fallback
│   │   └── credentials.ts      # Local password verification
│   │
│   ├── i18n/                   # ── Application Layer (Internationalization) ──
│   │   └── index.ts            # Bilingual dictionaries (TH / EN) & getDictionary()
│   │
│   ├── data/                   # ── Infrastructure Layer (Repositories) ──
│   │   ├── repo.ts             # Repository pattern handling Supabase queries & mock fallback
│   │   └── seed.ts             # In-memory mock seed data for offline mode and tests
│   │
│   └── supabase/               # ── Infrastructure Layer (Database & External Services) ──
│       ├── client.ts           # Browser Supabase client
│       ├── server.ts           # Server-side Supabase client (cookies)
│       ├── proxy.ts            # Edge session refresh proxy
│       └── config.ts           # Configuration validation
```

---

## 4. Dynamic Role-Based Access Control (RBAC)

### 4.1 Database Table: `public.roles`

```sql
create table if not exists public.roles (
  id text primary key check (id ~ '^[a-z0-9_-]{2,30}$'),
  label text not null,
  description text not null default '',
  pages text[] not null default '{}',
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 4.2 Available Pages (`ALL_PAGES`)
- `dashboard`: ภาพรวมและสถิติ (Dashboard)
- `machines`: เครื่องจักร (Machines)
- `alarms`: สัญญาณเตือน (Alarms)
- `maintenance`: งานซ่อมบำรุง (Maintenance)
- `plan`: แผนบำรุงรักษา (PM Plans)
- `users`: ผู้ใช้งาน & สิทธิ์ (Users & Roles)
- `audit`: ประวัติการทำงาน (Audit Log)

### 4.3 Available Action Permissions (`ALL_PERMISSIONS`)
- `machine:write`: เพิ่ม/แก้ไขข้อมูลเครื่องจักร
- `alarm:create`: สร้างการแจ้งเตือน Alarm
- `alarm:update`: รับงานและปิด Alarm
- `maintenance:write`: สร้างและแก้ไขใบงานซ่อมบำรุง
- `plan:write`: จัดการแผนงาน PM
- `plan:issue`: ออกใบงานซ่อมบำรุงจากแผน PM
- `users:manage`: จัดการผู้ใช้และกำหนดสิทธิ์ Role
- `audit:read`: เข้าถึงและตรวจสอบ Audit Log

### 4.4 System Roles vs. Custom Roles
1. **System Default Roles**:
   - `admin` (`is_system: true`): Has full access to all pages and permissions.
   - `technician`: Machine, Alarm, Maintenance, Plan access.
   - `viewer`: Dashboard access only.
2. **Custom Roles**:
   - Admin can create new custom roles (e.g., `supervisor`, `operator`, `qc`) with any combination of pages and permissions.
3. **Critical Safety Rules**:
   - **Admin Lockout Protection**: The `admin` role can NEVER lose `users:manage` permission or `users` page access. Even if edited in UI or API, `repo.ts` automatically enforces these two permissions.
   - **System Roles Immutability**: System roles cannot be deleted.
   - **Referential Protection**: A custom role cannot be deleted while users are assigned to it. Admins must reassign users before deleting.

---

## 5. Google OAuth vs. Local Provider Detection

### 5.1 The Problem Solved
In Supabase Auth:
- When a user logs in via Google OAuth, `admin.listUsers()` returns `app_metadata.provider = "email"` while `app_metadata.providers = ["email", "google"]`.
- `identities` array is empty on list queries unless queried individually via `admin.getUserById()`.
- Local accounts only have `app_metadata.provider = "email"` and have a password.

### 5.2 Resolution Algorithm (`src/lib/data/repo.ts`)
```ts
const isGoogle =
  au.app_metadata?.provider === "google" ||
  (Array.isArray(au.app_metadata?.providers) && au.app_metadata.providers.includes("google")) ||
  au.user_metadata?.iss === "https://accounts.google.com" ||
  Boolean(au.user_metadata?.provider_id) ||
  au.identities?.some((ident) => ident.provider === "google");

const provider = isGoogle ? "google" : "local";
```

### 5.3 UI Behavior
- **Google OAuth Users**:
  - Badge displays `Google`.
  - Password change input is disabled and hidden, replaced with an informative notice: *"Google OAuth: บัญชีนี้จัดการรหัสผ่านผ่าน Google โดยตรง"*.
- **Local Users**:
  - Badge displays `Local`.
  - Admin can update passwords directly via `adminSupabase.auth.admin.updateUserById()`.

---

## 6. UI & Responsive Design Standards

1. **Fluid Full-Width Layout**:
   - Removed artificial `max-w-[1280px]` constraint from `AppShell.tsx`.
   - Pages stretch smoothly to utilize widescreen monitors while adapting to mobile screens.
2. **Collapsible Sidebar**:
   - Desktop sidebar toggles between expanded (236px) and collapsed (68px icon-only).
   - State persisted in `localStorage.getItem("mtm_sidebar_collapsed")` and `sidebar_collapsed` cookie.
   - Mobile uses a compact sticky bottom navigation bar.
3. **Typography**:
   - Loaded Google Font **Roboto** via `next/font/google` applied to `html, body`.
4. **SVG Vector Charts**:
   - Scalable 640x220 viewBox rendering responsive bar charts, trend lines, and top machine breakdowns without heavy client chart libraries.

---

## 7. Internationalization (i18n)

- **Supported Languages**: Thai (`th`, default) and English (`en`).
- **Persistence**: Cookie `locale` read on server in `layout.tsx` and Server Components.
- **Toggle**: Language switch button (`setLocale`) located in the top header bar.
- **Dictionary**: Type-safe deep dictionary in `src/lib/i18n/index.ts` with complete coverage for:
  - Navigation, roles, machine and job statuses, common actions and dialog labels.
  - Page-specific sections: `dashboard`, `machines`, `alarms`, `maintenance`, `plan`, `users`, `audit`.
  - Dynamic RBAC metadata (all pages and action permissions include bilingual `labelTh`/`labelEn` and `descTh`/`descEn`).
  - Action feedback banners (`Notice` component) explicitly bound to active `locale`.

---

## 8. Recent Key Fixes & Refinements

### 8.1 Unified Menu Toggle Button
- Removed duplicate hamburger menu button from the sidebar brand header.
- Preserved a single, accessible hamburger button in the sticky top bar (`AppShell.tsx`), functioning identically across desktop (collapsing sidebar between 236px and 68px icon-only mode) and mobile.

### 8.2 Comprehensive i18n Alignment (TH / EN)
- **Audit Page (`src/app/(app)/audit/page.tsx`)**: Refactored from inline ternaries to `t.audit.*` keys (`title`, `latestEvents`, `subtitle`, `timestamp`, `user`, `actionDetails`, `noEvents`).
- **Users Page & RBAC Forms (`UserForms.tsx`, `users/page.tsx`)**: Replaced all hardcoded inline messages, placeholders (`roleIdPlaceholder`, `roleNamePlaceholder`, `roleDescPlaceholder`), locked admin indicators (`(Required)` / `(จำเป็น)`), and deletion prevention tooltips (`cannotDeleteRoleInUse`) with dictionary keys.
- **Client Form Buttons (`src/components/client.tsx`)**: Removed hardcoded Thai fallback defaults from `SubmitButton` and `ConfirmButton`.
- **Plan Page (`src/app/(app)/plan/page.tsx`)**: Added `viewLabel` localization for view switcher accessibility attributes.
- **Notice Banners (`src/components/ui.tsx`)**: Connected all caller pages (`machines`, `alarms`, `maintenance`, `plan`, `users`) with `locale={locale}` to ensure success toasts render in the user's selected language.

### 8.3 Full Form & Add/Edit Data Bilingual Localization (TH / EN)
- **Machines Domain**:
  - `MachineForm.tsx`: Full dictionary integration for labels, placeholders, input hints, machine status options, and submit/cancel buttons.
  - `machines/new/page.tsx` & `machines/[id]/edit/page.tsx`: Locale extracted via cookies and passed to both headers and form.
  - `machines/[id]/page.tsx`: Detail list labels, PM plan sub-tables, delete modal confirmations, and history log.
- **Alarms Domain**:
  - `AlarmForms.tsx`: Both `AlarmCreateForm` and `AlarmUpdateForm` accept `locale?: Locale`; localized all error summaries, field labels, status options, and closing requirements callout.
  - `alarms/new/page.tsx` & `alarms/[id]/page.tsx`: Localized header actions, details metadata, locked notice, and work order log.
- **Maintenance Domain**:
  - `MaintenanceForm.tsx`: Fully localized labels, PM plan origin banner, job statuses, action hints, and submit controls.
  - `maintenance/new/page.tsx` & `maintenance/[id]/edit/page.tsx`: Localized dynamic headers (`createTitle` vs `createPmTitle`), save buttons, and breadcrumbs.
- **Plan Domain**:
  - `PlanForm.tsx`: Field labels, checklist instructions, and dynamic frequency options mapped via `t.plan.freqOptions`.
  - `plan/new/page.tsx`, `plan/[id]/edit/page.tsx`, & `plan/[id]/page.tsx`: Localized page headers, deactivate warnings, work order links, and metadata dl.
  - `plan/views.tsx`: Localized `Legend`, `MachineTimeline` (table headers, this week, empty states), `PlanCalendar` (locale-aware month/year headers, day abbreviations `["Mon", ...]` vs `["จ", ...]`), and `PlanList` (table columns).
- **Charts, Dashboard, and System Pages**:
  - `src/components/charts.tsx`: `AlarmChart` ("Today" vs "วันนี้" and date formatting), `StatusBar`, and `TopMachines` (empty states and aria labels).
  - `src/app/(app)/dashboard/page.tsx`: Passes `locale` to charts and time formatters.
  - `src/app/not-found.tsx` & `src/app/forbidden.tsx`: Server components reading `locale` from cookies and rendering bilingual 404/403 pages.
- **Domain Helpers**:
  - `dueText` and `freqLabel` (`src/lib/domain/pm.ts`) accept `locale: string = "th"`.
  - `fmtDateTime` and `fmtDate` (`src/lib/domain/time.ts`) accept `locale: string = "th"`.

### 8.4 ACID Compliance & Comprehensive Validation
- **Atomicity**:
  - PostgreSQL triggers (`sync_machine_status_on_alarm`, `sync_machine_and_pm_on_maintenance`) execute in the same atomic transaction as the mutating statement.
  - Multi-entity updates (e.g. Alarm closure -> Machine status revert, Maintenance completion -> PM plan nextDue advance) are executed atomically.
- **Consistency**:
  - **Machine Invariants**: Cannot delete machines referenced by alarms, maintenance records, or active PM plans (enforced in repo check and DB foreign key `on delete restrict`). Deletion failures redirect with specific error messages.
  - **Alarm Invariants**: Closing an alarm strictly requires `cause` and `action` across both Zod schema and Repository layers. Closed alarms are immutable.
  - **Maintenance Invariants**: Closing a work order (`Done` or `Waiting Part`) strictly requires `action` recorded across schema and repo. Plan advancement is idempotent (only triggers on transition from non-done to done).
  - **Plan Invariants**: `lastDone` cannot be in the future; `nextDue` must be strictly after `lastDone`; duplicate active tasks on the same machine are prevented. Deactivation failures are checked and reported.
  - **RBAC & User Invariants**: System default roles (`admin`, `technician`, `viewer`) cannot be deleted. Custom roles assigned to active users cannot be deleted. The last active administrator cannot be demoted or deactivated via `updateUser`, `setUserRole`, or `setUserActive`. Non-existent roles are rejected.
- **Isolation**:
  - Unique primary keys with deterministic regex formats across all tables.
- **Durability**:
  - All mutations persisted to PostgreSQL (or in-memory mock store for offline/test) accompanied by immutable audit log records.
- **Validation**:
  - Server actions across all modules validate inputs with Zod (`safeParse`), map field errors, and render `FormError` banners with localized feedback.

### 8.5 Theme Overhaul & SaleSkip Login Page Redesign
- **Design System Tokens (`src/app/globals.css`)**:
  - Light mode modernized with clean Slate-50 background (`#F8FAFC`), pure white cards (`#FFFFFF`), subtle Slate-200 borders (`#E2E8F0`), high-contrast Slate-900 typography (`#0F172A`), and vibrant industrial Crimson/Garnet accents (`#B91C1C` / `#881337`).
  - Dark mode upgraded from muddy grey to deep aerospace obsidian (`#090D16`), slate-900 surfaces (`#0F172A`), slate-800 interactive elements (`#1E293B`), and radiant rose accents (`#FB7185`).
  - Radar-pulse CSS animation added for live Alarm indicators (`.pill-alarm`).
  - Sleek custom thin scrollbar and micro-interaction states on buttons (`active:scale-[0.98]`) and inputs.
- **Complete UI Redesign Across Entire System (`globals.css`, `AppShell.tsx`, `dashboard/page.tsx`, `ui.tsx`, `charts.tsx`)**:
  - **Design System Tokens (`src/app/globals.css`)**:
    - Replaced dull palette with modern **Electric Cobalt & Slate** palette: `--accent: #2563EB` (Light) / `#3B82F6` (Dark), `--accent-soft: #EFF6FF`, and deep aerospace obsidian `--bg: #0A0E1A` in dark mode.
    - Added subtle rounded-2xl panels (`rounded-2xl`), luminous pill indicators with radar pulse for active alarms, micro-interactions for buttons (`active:scale-[0.98]`), and custom sleek thin scrollbars.
  - **AppShell & Navigation (`src/app/(app)/AppShell.tsx`)**:
    - Modern enterprise sidebar with gradient MTM emblem, active accent item highlights, live telemetry pulse pill, and user profile card with avatar and role badges.
    - Sticky glassmorphic top header with real-time plant status pill (`All Systems Operational` / `X Active Alarms`), capsule language switcher (`TH / EN`), theme toggle, and logout button.
  - **Dashboard Overhaul (`src/app/(app)/dashboard/page.tsx`)**:
    - 6 top KPI metric cards with status indicator dots, big bold numbers, and hover elevation.
    - Alarm Trend Bar Chart with gradient rounded SVG bars and clean day labels.
    - Machine Status Bar with live proportion segments and status count legend.
    - Mini-metric cards with icons for Open Maintenance, PM Overdue, MTTR, and Alarms Today.
    - Action Needed Alarms list with alarm code pills, machine tags, elapsed time, and status pills.
    - Ranked Top Machines alarm frequency progress bars.
  - **UI Components (`src/components/ui.tsx`)**:
    - Modernized `PageHeader` with flex alignment and border separator.
    - Refined `StatusPill` with glow dots.
    - Modernized `Notice` and `FormError` alert banners with icons and rounded-xl styling.
    - Redesigned `Empty` state with search icon and dashed border container.
  - **SaleSkip-Style Layout with Exact Screenshot Design (`src/app/login/page.tsx` & `src/app/login/LoginForm.tsx`)**:
    - **Responsive Split Layout**: Configured with `md:grid md:grid-cols-[1.15fr_1fr] lg:grid-cols-[1.25fr_1fr]` to ensure split-screen renders perfectly on all laptops, tablets, and desktop resolutions.
    - **Left Hero Panel**: Deep royal cobalt blue gradient (`#1C2CAE` to `#182498`), 3 concentric tilted rounded wireframe rectangles in SVG, authentic 8-arm rounded starburst asterisk logo, bold `Hello Machine-Maintenance! 👋` typography with value proposition, and clean footer copyright.
    - **Right Auth Canvas**: Clean white canvas with brand title, `Welcome Back!` heading, underlined input fields on soft-grey surface, bold obsidian `Login Now` button, white bordered `Login with Google` OAuth button, `Forget password Click here` link, and 1-click Quick Credentials chips (`test@gmail.com / 123456`, `admin@plant.local`, `tech1@plant.local`).
    - **User Account `test@gmail.com`**: Active in Supabase Auth & profiles with Role: `technician`. Password set and verified as `123456`.

---

## 9. Verification & Test Suite

The project includes **79 automated unit & integration tests** executed via Vitest:

| Test File | Description | Tests |
|---|---|:---:|
| `tests/roles.test.ts` | Dynamic RBAC, Role CRUD, Admin protections, Deletion safeguards, Last-admin checks | 8 |
| `tests/validation.test.ts` | Zod domain validation schemas for forms, roles, users, and entities | 22 |
| `tests/pm-and-permissions.test.ts` | PM schedule calculations, interval advance, permission checkers | 10 |
| `tests/users.test.ts` | User CRUD, Self-demotion safeguards, Email uniqueness, Provider detection | 7 |
| `tests/alarms.test.ts` | Alarm lifecycle (Open -> In Progress -> Closed), validation rules | 6 |
| `tests/plan.test.ts` | PM plan creation, checklist handling, due date projection | 6 |
| `tests/machines.test.ts` | Machine registry CRUD, status synchronization | 5 |
| `tests/maintenance.test.ts` | Work orders, corrective vs. preventive, alarm linking | 5 |
| `tests/i18n.test.ts` | Localization dictionary completeness and fallbacks | 4 |
| `tests/session.test.ts` | Cookie parsing, session security, encryption | 3 |
| `tests/audit.test.ts` | Audit trail logging of user mutations | 2 |
| `tests/dashboard.test.ts` | KPI calculation, MTTR aggregation, trend metrics | 1 |
| **Total** | **All tests passing** | **79** |

### Execution Commands:
- **Run Tests**: `npm test`
- **Run Typecheck**: `npm run typecheck`
- **Run Production Build**: `npm run build`

