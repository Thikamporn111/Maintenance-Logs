"use client";

import { useActionState, useState } from "react";
import type { Profile, RoleDefinition, Page, Permission } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { ALL_PAGES, ALL_PERMISSIONS, ROLE_LABEL } from "@/lib/permissions";
import { getDictionary, type Locale } from "@/lib/i18n";
import { SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Field, FormError, Options } from "@/components/ui";
import {
  createRoleAction,
  createUserAction,
  deleteRoleAction,
  updateRoleAction,
  updateUserAction,
} from "./actions";

export function UserCreateForm({
  locale = "th",
  roles = [],
}: {
  locale?: Locale;
  roles?: RoleDefinition[];
}) {
  const t = getDictionary(locale);
  const [state, formAction] = useActionState(createUserAction, {
    values: { name: "", email: "", role: "technician", password: "", provider: "local" },
  });

  const v = state.values ?? {};
  const e = state.errors ?? {};
  
  const [provider, setProvider] = useState<string>(v.provider || "local");

  const roleOptions: readonly [string, string][] =
    roles.length > 0
      ? roles.map((r) => [r.id, r.label] as const)
      : ROLES.map((r) => [r, locale === "en" ? (t.roles as Record<string, string>)[r] || r : ROLE_LABEL[r] || r] as const);

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-col gap-1 pb-3 border-b border-line">
        <div className="eyebrow">{t.users.managePermissions}</div>
        <h2 className="text-base sm:text-lg font-semibold">{t.users.addTitle}</h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          {t.users.addDesc}
        </p>
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-4" noValidate>
        <FormError message={state.message} />

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-5 items-start">
          <Field label={t.common.name} name="name" error={e.name} required>
            <input
              className="input"
              id="name"
              name="name"
              type="text"
              defaultValue={v.name}
              placeholder={t.users.namePlaceholder}
              maxLength={60}
              required
            />
          </Field>

          <Field label={t.common.email} name="email" error={e.email} required>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              defaultValue={v.email}
              placeholder={t.users.emailPlaceholder}
              maxLength={150}
              required
            />
          </Field>

          <Field label={t.common.role} name="role" error={e.role} required>
            <select className="input" id="role" name="role" defaultValue={v.role || "technician"}>
              <Options list={roleOptions} />
            </select>
          </Field>

          <Field label="Login Method" name="provider" error={e.provider} required>
            <select 
              className="input" 
              id="provider" 
              name="provider" 
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="local">Email & Password</option>
              <option value="google">Google OAuth</option>
            </select>
          </Field>

          {provider === "google" ? (
            <div className="rounded-lg border border-line bg-surface-2 p-3 flex items-start gap-2.5 text-xs text-muted">
              <Icon name="lock" className="size-4 shrink-0 mt-0.5 text-muted" />
              <div>
                <b className="block text-ink font-medium">Google OAuth</b>
                <span>ไม่ต้องตั้งรหัสผ่าน</span>
              </div>
            </div>
          ) : (
            <Field label={t.users.passwordInit} name="password" error={e.password} hint={t.users.passwordHintMin}>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                defaultValue={v.password}
                placeholder="••••••••"
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <SubmitButton className="btn btn-primary w-full sm:w-auto" pendingText={t.common.saving}>
            {t.users.addSubmit}
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}

export function UserEditModal({
  user,
  currentUserId,
  locale = "th",
  roles = [],
  onClose,
}: {
  user: Profile;
  currentUserId: string;
  locale?: Locale;
  roles?: RoleDefinition[];
  onClose: () => void;
}) {
  const t = getDictionary(locale);
  const isSelf = user.id === currentUserId;

  const [state, formAction] = useActionState(
    updateUserAction.bind(null, user.id),
    {
      values: {
        name: user.name,
        email: user.email,
        role: user.role,
        active: String(user.active),
        password: "",
      },
    }
  );

  const v = state.values ?? {};
  const e = state.errors ?? {};

  const roleOptions: readonly [string, string][] =
    roles.length > 0
      ? roles.map((r) => [r.id, r.label] as const)
      : ROLES.map((r) => [r, locale === "en" ? (t.roles as Record<string, string>)[r] || r : ROLE_LABEL[r] || r] as const);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 id="edit-user-title" className="text-base sm:text-lg font-semibold">
              {t.users.editTitle}
            </h2>
            <p className="text-xs text-muted font-mono">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn rounded-lg p-1.5 hover:bg-surface-2"
            aria-label={t.common.cancel}
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-4" noValidate>
          <FormError message={state.message} />

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <Field label={t.common.name} name="name" error={e.name} required full>
              <input
                className="input"
                id="edit-name"
                name="name"
                type="text"
                defaultValue={v.name}
                placeholder={t.users.namePlaceholder}
                maxLength={60}
                required
              />
            </Field>

            <Field label={t.common.email} name="email" error={e.email} required full>
              <input
                className="input"
                id="edit-email"
                name="email"
                type="email"
                defaultValue={v.email}
                placeholder={t.users.emailPlaceholder}
                maxLength={150}
                required
              />
            </Field>

            <Field
              label={t.common.role}
              name="role"
              error={e.role}
              required
              hint={isSelf ? t.common.editOwnRoleNote : undefined}
            >
              <select className="input" id="edit-role" name="role" defaultValue={v.role}>
                <Options list={roleOptions} />
              </select>
            </Field>

            <Field
              label={t.common.accountStatus}
              name="active"
              error={e.active}
              required
              hint={isSelf ? t.common.cannotDeactivateSelf : undefined}
            >
              <select
                className="input"
                id="edit-active"
                name="active"
                defaultValue={v.active === "false" ? "false" : "true"}
              >
                <option value="true">{t.common.active}</option>
                <option value="false">{t.common.inactive}</option>
              </select>
            </Field>

            {user.provider === "google" ? (
              <div className="sm:col-span-2 rounded-lg border border-line bg-surface-2 p-3.5 flex items-start gap-2.5 text-xs text-muted">
                <Icon name="lock" className="size-4 shrink-0 mt-0.5 text-muted" />
                <div>
                  <b className="block text-ink font-medium">Google OAuth</b>
                  <span>{t.common.googleAccountNotice}</span>
                </div>
              </div>
            ) : (
              <Field
                label={t.common.newPassword}
                name="password"
                error={e.password}
                hint={t.common.passwordHint}
                full
              >
                <input
                  className="input"
                  id="edit-password"
                  name="password"
                  type="password"
                  defaultValue={v.password}
                  placeholder={`•••••••• (${t.users.passwordHintMin})`}
                />
              </Field>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button type="button" onClick={onClose} className="btn">
              {t.common.cancel}
            </button>
            <SubmitButton className="btn btn-primary" pendingText={t.common.saving}>
              {t.users.saveChanges}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersTableClient({
  users,
  currentUserId,
  locale = "th",
  roles = [],
}: {
  users: Profile[];
  currentUserId: string;
  locale?: Locale;
  roles?: RoleDefinition[];
}) {
  const t = getDictionary(locale);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const roleMap = new Map<string, string>();
  roles.forEach((r) => roleMap.set(r.id, r.label));

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>{t.users.listTitle}</h2>
          <span className="ml-auto text-[13px] text-muted">
            {users.length} {t.users.accountsBadge}
          </span>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t.common.name}</th>
                <th>{t.common.email}</th>
                <th className="w-44">{t.common.role}</th>
                <th className="w-36">{t.common.accountStatus}</th>
                <th className="w-28 text-right">{t.common.actionHeader}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === currentUserId;
                const roleLabel =
                  roleMap.get(u.role) ||
                  (locale === "en" ? (t.roles as Record<string, string>)[u.role] || u.role : ROLE_LABEL[u.role] || u.role);

                return (
                  <tr key={u.id}>
                    <td>
                      <b>{u.name}</b>
                      {self && <span className="tag">{t.common.you}</span>}
                    </td>
                    <td className="font-mono text-[13px]">
                      {u.email}
                      {u.provider === "google" ? (
                        <span className="tag text-[10px]">Google</span>
                      ) : (
                        <span className="tag text-[10px] text-muted bg-surface-2">Local</span>
                      )}
                    </td>
                    <td>
                      <span className="inline-flex items-center font-medium">
                        {roleLabel}
                      </span>
                    </td>
                    <td>
                      {u.active ? (
                        <span className="pill pill-ok">{t.common.active}</span>
                      ) : (
                        <span className="pill">{t.common.inactive}</span>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditingUser(u)}
                        className="btn btn-sm btn-primary inline-flex items-center gap-1.5"
                        title={`${t.common.edit} ${u.name}`}
                      >
                        <Icon name="edit" className="size-3.5" />
                        <span>{t.common.edit}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          currentUserId={currentUserId}
          locale={locale}
          roles={roles}
          onClose={() => setEditingUser(null)}
        />
      )}
    </>
  );
}

// ── Role Create Modal ────────────────────────────────────────────────────────
export function RoleCreateModal({
  locale = "th",
  onClose,
}: {
  locale?: Locale;
  onClose: () => void;
}) {
  const t = getDictionary(locale);
  const [selectedPages, setSelectedPages] = useState<Set<Page>>(
    new Set(["dashboard", "machines", "alarms", "maintenance"])
  );
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(
    new Set(["alarm:create", "alarm:update", "maintenance:write"])
  );

  const [state, formAction] = useActionState(createRoleAction, {
    values: { id: "", label: "", description: "" },
  });

  const v = state.values ?? {};
  const e = state.errors ?? {};

  function togglePage(p: Page) {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function togglePermission(perm: Permission) {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-role-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 id="create-role-title" className="text-base sm:text-lg font-semibold">
              {t.users.addRoleTitle}
            </h2>
            <p className="text-xs text-muted">{t.users.addRoleDesc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn rounded-lg p-1.5 hover:bg-surface-2"
            aria-label={t.common.cancel}
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-5" noValidate>
          <FormError message={state.message} />

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <Field
              label={t.users.roleId}
              name="id"
              error={e.id}
              required
              hint={t.users.roleIdHint}
            >
              <input
                className="input font-mono lowercase"
                id="role-id"
                name="id"
                type="text"
                defaultValue={v.id}
                placeholder={t.users.roleIdPlaceholder}
                pattern="^[a-z0-9_-]+$"
                maxLength={30}
                required
              />
            </Field>

            <Field label={t.users.roleName} name="label" error={e.label} required>
              <input
                className="input"
                id="role-label"
                name="label"
                type="text"
                defaultValue={v.label}
                placeholder={t.users.roleNamePlaceholder}
                maxLength={60}
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label={t.users.roleDesc} name="description" error={e.description}>
                <input
                  className="input"
                  id="role-description"
                  name="description"
                  type="text"
                  defaultValue={v.description}
                  placeholder={t.users.roleDescPlaceholder}
                  maxLength={200}
                />
              </Field>
            </div>
          </div>

          {/* ── Accessible Pages Checklist ─────────────────────────── */}
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.users.pagesAccess}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPages(new Set(ALL_PAGES.map((p) => p.id)))}
                  className="text-xs text-primary hover:underline"
                >
                  {t.users.selectAll}
                </button>
                <span className="text-xs text-muted">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPages(new Set())}
                  className="text-xs text-muted hover:underline"
                >
                  {t.users.deselectAll}
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {ALL_PAGES.map((p) => {
                const checked = selectedPages.has(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${
                      checked
                        ? "border-primary/40 bg-primary/5 text-ink"
                        : "border-line bg-surface hover:bg-surface-2 text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="pages"
                      value={p.id}
                      checked={checked}
                      onChange={() => togglePage(p.id)}
                      className="mt-0.5 rounded border-line text-primary focus:ring-primary"
                    />
                    <div className="text-xs">
                      <b className="block text-ink font-medium">
                        {locale === "en" ? p.labelEn : p.labelTh}
                      </b>
                      <span className="text-[11px] text-muted leading-tight">
                        {locale === "en" ? p.descEn : p.descTh}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Action Permissions Checklist ─────────────────────────── */}
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.users.permissionsAccess}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPermissions(new Set(ALL_PERMISSIONS.map((p) => p.id)))}
                  className="text-xs text-primary hover:underline"
                >
                  {t.users.selectAll}
                </button>
                <span className="text-xs text-muted">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPermissions(new Set())}
                  className="text-xs text-muted hover:underline"
                >
                  {t.users.deselectAll}
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = selectedPermissions.has(perm.id);
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-2.5 p-2 rounded-md border cursor-pointer transition-colors ${
                      checked
                        ? "border-primary/40 bg-primary/5 text-ink"
                        : "border-line bg-surface hover:bg-surface-2 text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={perm.id}
                      checked={checked}
                      onChange={() => togglePermission(perm.id)}
                      className="mt-0.5 rounded border-line text-primary focus:ring-primary"
                    />
                    <div className="text-xs">
                      <b className="block text-ink font-medium">
                        {locale === "en" ? perm.labelEn : perm.labelTh}
                      </b>
                      <span className="text-[11px] text-muted leading-tight">
                        {locale === "en" ? perm.descEn : perm.descTh}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button type="button" onClick={onClose} className="btn">
              {t.common.cancel}
            </button>
            <SubmitButton className="btn btn-primary" pendingText={t.common.saving}>
              {t.users.saveRole}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Role Edit Modal ──────────────────────────────────────────────────────────
export function RoleEditModal({
  role,
  locale = "th",
  onClose,
}: {
  role: RoleDefinition;
  locale?: Locale;
  onClose: () => void;
}) {
  const t = getDictionary(locale);
  const isAdmin = role.id === "admin";

  const [selectedPages, setSelectedPages] = useState<Set<Page>>(new Set(role.pages));
  const [selectedPermissions, setSelectedPermissions] = useState<Set<Permission>>(
    new Set(role.permissions)
  );

  const [state, formAction] = useActionState(updateRoleAction.bind(null, role.id), {
    values: { label: role.label, description: role.description },
  });

  const v = state.values ?? {};
  const e = state.errors ?? {};

  function togglePage(p: Page) {
    if (isAdmin && p === "users") return; // Admin must keep users page
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function togglePermission(perm: Permission) {
    if (isAdmin && perm === "users:manage") return; // Admin must keep users:manage
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-role-title"
    >
      <div className="w-full max-w-2xl rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="edit-role-title" className="text-base sm:text-lg font-semibold">
                {t.users.editRoleTitle}
              </h2>
              <span className="font-mono text-xs text-muted tag">{role.id}</span>
              {role.isSystem && (
                <span className="tag text-[10px] text-muted bg-surface-2">
                  {t.users.systemRoleBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted">{role.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn rounded-lg p-1.5 hover:bg-surface-2"
            aria-label={t.common.cancel}
          >
            <Icon name="x" className="size-5" />
          </button>
        </div>

        <form action={formAction} className="mt-4 flex flex-col gap-5" noValidate>
          <FormError message={state.message} />

          {isAdmin && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-ink">
              <Icon name="lock" className="size-4 shrink-0 mt-0.5 text-primary" />
              <span>{t.users.adminLockoutNotice}</span>
            </div>
          )}

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <Field label={t.users.roleName} name="label" error={e.label} required full>
              <input
                className="input"
                id="edit-role-label"
                name="label"
                type="text"
                defaultValue={v.label || role.label}
                maxLength={60}
                required
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label={t.users.roleDesc} name="description" error={e.description}>
                <input
                  className="input"
                  id="edit-role-desc"
                  name="description"
                  type="text"
                  defaultValue={v.description || role.description}
                  maxLength={200}
                />
              </Field>
            </div>
          </div>

          {/* ── Accessible Pages Checklist ─────────────────────────── */}
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.users.pagesAccess}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPages(new Set(ALL_PAGES.map((p) => p.id)))}
                  className="text-xs text-primary hover:underline"
                >
                  {t.users.selectAll}
                </button>
                <span className="text-xs text-muted">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(new Set(isAdmin ? ["users"] : []))
                  }
                  className="text-xs text-muted hover:underline"
                >
                  {t.users.deselectAll}
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {ALL_PAGES.map((p) => {
                const checked = selectedPages.has(p.id) || (isAdmin && p.id === "users");
                const isLocked = isAdmin && p.id === "users";
                return (
                  <label
                    key={p.id}
                    className={`flex items-start gap-2.5 p-2 rounded-md border transition-colors ${
                      isLocked ? "opacity-90 cursor-not-allowed bg-surface-2 border-line" : "cursor-pointer"
                    } ${
                      checked
                        ? "border-primary/40 bg-primary/5 text-ink"
                        : "border-line bg-surface hover:bg-surface-2 text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="pages"
                      value={p.id}
                      checked={checked}
                      disabled={isLocked}
                      onChange={() => togglePage(p.id)}
                      className="mt-0.5 rounded border-line text-primary focus:ring-primary"
                    />
                    {isLocked && <input type="hidden" name="pages" value={p.id} />}
                    <div className="text-xs">
                      <b className="block text-ink font-medium">
                        {locale === "en" ? p.labelEn : p.labelTh}
                        {isLocked && <span className="ml-1 text-[10px] text-primary font-normal">{t.common.required}</span>}
                      </b>
                      <span className="text-[11px] text-muted leading-tight">
                        {locale === "en" ? p.descEn : p.descTh}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Action Permissions Checklist ─────────────────────────── */}
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface-2 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                {t.users.permissionsAccess}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPermissions(new Set(ALL_PERMISSIONS.map((p) => p.id)))}
                  className="text-xs text-primary hover:underline"
                >
                  {t.users.selectAll}
                </button>
                <span className="text-xs text-muted">|</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPermissions(new Set(isAdmin ? ["users:manage"] : []))
                  }
                  className="text-xs text-muted hover:underline"
                >
                  {t.users.deselectAll}
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 pt-1">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = selectedPermissions.has(perm.id) || (isAdmin && perm.id === "users:manage");
                const isLocked = isAdmin && perm.id === "users:manage";
                return (
                  <label
                    key={perm.id}
                    className={`flex items-start gap-2.5 p-2 rounded-md border transition-colors ${
                      isLocked ? "opacity-90 cursor-not-allowed bg-surface-2 border-line" : "cursor-pointer"
                    } ${
                      checked
                        ? "border-primary/40 bg-primary/5 text-ink"
                        : "border-line bg-surface hover:bg-surface-2 text-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="permissions"
                      value={perm.id}
                      checked={checked}
                      disabled={isLocked}
                      onChange={() => togglePermission(perm.id)}
                      className="mt-0.5 rounded border-line text-primary focus:ring-primary"
                    />
                    {isLocked && <input type="hidden" name="permissions" value={perm.id} />}
                    <div className="text-xs">
                      <b className="block text-ink font-medium">
                        {locale === "en" ? perm.labelEn : perm.labelTh}
                        {isLocked && <span className="ml-1 text-[10px] text-primary font-normal">{t.common.required}</span>}
                      </b>
                      <span className="text-[11px] text-muted leading-tight">
                        {locale === "en" ? perm.descEn : perm.descTh}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-line">
            <button type="button" onClick={onClose} className="btn">
              {t.common.cancel}
            </button>
            <SubmitButton className="btn btn-primary" pendingText={t.common.saving}>
              {t.users.saveChanges}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Role Delete Confirmation Modal ──────────────────────────────────────────
export function RoleDeleteModal({
  role,
  locale = "th",
  onClose,
}: {
  role: RoleDefinition;
  locale?: Locale;
  onClose: () => void;
}) {
  const t = getDictionary(locale);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 overflow-y-auto backdrop-blur-xs"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-role-title"
    >
      <div className="w-full max-w-md rounded-xl border border-line bg-surface p-5 sm:p-6 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 pb-3 border-b border-line text-error">
          <div className="rounded-full bg-error/10 p-2 text-error">
            <Icon name="alert" className="size-5" />
          </div>
          <div>
            <h2 id="delete-role-title" className="text-base sm:text-lg font-semibold text-ink">
              {t.users.deleteRole}
            </h2>
            <p className="text-xs text-muted font-mono">{role.label} ({role.id})</p>
          </div>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-muted leading-relaxed">
          {t.users.deleteRoleConfirm}
        </p>

        <form action={deleteRoleAction} className="mt-5 flex justify-end gap-2">
          <input type="hidden" name="id" value={role.id} />
          <button type="button" onClick={onClose} className="btn">
            {t.common.cancel}
          </button>
          <SubmitButton className="btn btn-danger" pendingText={t.common.processing}>
            {t.users.deleteRole}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

// ── Dynamic Role Management Panel ────────────────────────────────────────────
export function RoleManagementPanel({
  roles,
  users,
  locale = "th",
}: {
  roles: RoleDefinition[];
  users: Profile[];
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleDefinition | null>(null);

  // Count users assigned to each role
  const userCountByRole = new Map<string, number>();
  users.forEach((u) => {
    userCountByRole.set(u.role, (userCountByRole.get(u.role) ?? 0) + 1);
  });

  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
        <div>
          <div className="eyebrow">{t.users.managePermissions}</div>
          <h2 className="text-base sm:text-lg font-semibold">{t.users.roleManagementTitle}</h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {t.users.roleManagementDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingRole(true)}
          className="btn btn-primary inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Icon name="plus" className="size-4" />
          <span>{t.users.addRole}</span>
        </button>
      </div>

      <div className="mt-4 table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-48">{t.users.tableRole}</th>
              <th>{t.users.pagesAccess}</th>
              <th>{t.users.permissionsAccess}</th>
              <th className="w-24 text-center">{t.users.accountsBadge}</th>
              <th className="w-36 text-right">{t.common.actionHeader}</th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const count = userCountByRole.get(r.id) ?? 0;
              const isSystemRole = Boolean(r.isSystem || r.id === "admin" || r.id === "technician" || r.id === "viewer");
              const canDelete = !isSystemRole && count === 0;

              return (
                <tr key={r.id}>
                  <td>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-semibold">{r.label}</b>
                        {isSystemRole ? (
                          <span className="tag text-[10px] text-muted bg-surface-2">
                            {t.users.systemRoleBadge}
                          </span>
                        ) : (
                          <span className="tag text-[10px] text-primary border-primary/30">
                            {t.users.customRoleBadge}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-muted">{r.id}</span>
                      {r.description && (
                        <p className="text-xs text-muted leading-snug line-clamp-2 mt-0.5">
                          {r.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {r.pages.length === 0 ? (
                        <span className="text-xs text-muted">-</span>
                      ) : (
                        r.pages.map((p) => {
                          const meta = ALL_PAGES.find((x) => x.id === p);
                          const label = locale === "en" ? meta?.labelEn ?? p : meta?.labelTh ?? p;
                          return (
                            <span key={p} className="tag text-[11px] bg-surface-2 text-ink">
                              {label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {r.permissions.length === 0 ? (
                        <span className="text-xs text-muted">-</span>
                      ) : (
                        r.permissions.map((perm) => {
                          const meta = ALL_PERMISSIONS.find((x) => x.id === perm);
                          const label = locale === "en" ? meta?.labelEn ?? perm : meta?.labelTh ?? perm;
                          return (
                            <span key={perm} className="tag text-[11px] bg-surface-2 text-muted">
                              {label}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="pill font-mono text-xs">
                      {count}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingRole(r)}
                        className="btn btn-sm btn-primary inline-flex items-center gap-1"
                        title={`${t.users.editRole} ${r.label}`}
                      >
                        <Icon name="edit" className="size-3.5" />
                        <span>{t.users.editRole}</span>
                      </button>

                      {!isSystemRole && (
                        <button
                          type="button"
                          onClick={() => setDeletingRole(r)}
                          disabled={count > 0}
                          className="btn btn-sm btn-danger inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={
                            count > 0
                              ? t.common.cannotDeleteRoleInUse.replace("{count}", String(count))
                              : `${t.users.deleteRole} ${r.label}`
                          }
                        >
                          <Icon name="trash" className="size-3.5" />
                          <span>{t.common.delete}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {creatingRole && (
        <RoleCreateModal locale={locale} onClose={() => setCreatingRole(false)} />
      )}

      {editingRole && (
        <RoleEditModal
          role={editingRole}
          locale={locale}
          onClose={() => setEditingRole(null)}
        />
      )}

      {deletingRole && (
        <RoleDeleteModal
          role={deletingRole}
          locale={locale}
          onClose={() => setDeletingRole(null)}
        />
      )}
    </section>
  );
}
