// Data access layer for authentication and authorization.
// Every page and server action goes through these checks on the server.
import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { readSession } from "./session";
import { getUser } from "../data/repo";
import { can, canView, type Page, type Permission } from "../permissions";
import type { Profile } from "../types";

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  const session = await readSession();
  if (!session) return null;
  const user = await getUser(session.uid);
  // A deactivated account loses access immediately, even with a valid cookie.
  return user && user.active ? user : null;
});

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requirePage(page: Page): Promise<Profile> {
  const user = await requireUser();
  if (!canView(user.role, page)) forbidden();
  return user;
}

export async function requirePermission(permission: Permission): Promise<Profile> {
  const user = await requireUser();
  if (!can(user.role, permission)) forbidden();
  return user;
}
