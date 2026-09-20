import type { Metadata } from "next";
import { cookies } from "next/headers";
import { requirePage } from "@/lib/auth/dal";
import { listRoles, listUsers } from "@/lib/data/repo";
import { FormError, Notice, PageHeader } from "@/components/ui";
import { getDictionary, type Locale } from "@/lib/i18n";
import { RoleManagementPanel, UserCreateForm, UsersTableClient } from "./UserForms";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const me = await requirePage("users");
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value || "th") as Locale;
  const t = getDictionary(locale);

  const sp = await searchParams;
  const [users, roles] = await Promise.all([listUsers(), listRoles()]);

  const ERRORS: Record<string, string> = {
    self: t.common.selfError,
    invalid: t.common.invalidData,
  };

  const rawError = typeof sp.error === "string" ? sp.error : undefined;
  const errorMessage = rawError ? (ERRORS[rawError] || decodeURIComponent(rawError)) : undefined;

  return (
    <>
      <PageHeader title={t.users.title}>
        <span className="text-[13px] text-muted">
          {users.length} {t.users.accountsBadge}
        </span>
      </PageHeader>
      <Notice code={sp.notice} locale={locale} />
      <FormError message={errorMessage} />

      {/* ── Add User Panel (Admin Only) ─────────────────────────── */}
      <UserCreateForm locale={locale} roles={roles} />

      {/* ── Users Table with Full Edit & Management ──────────────── */}
      <UsersTableClient users={users} currentUserId={me.id} locale={locale} roles={roles} />

      {/* ── Dynamic Role & Permissions Management (RBAC) ────────── */}
      <RoleManagementPanel roles={roles} users={users} locale={locale} />
    </>
  );
}
