// Data access layer for authentication and authorization.
// Every page and server action goes through these checks on the server.
import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { readSession } from "./session";
import { getRole, getUser } from "../data/repo";
import { can, canView, type Page, type Permission } from "../permissions";
import type { Profile, Role } from "../types";
import { isSupabaseConfigured } from "../supabase/config";
import { createClient } from "../supabase/server";

export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  // 1. Check Supabase Auth if configured
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Query profiles table to ensure Admin has added this user and assigned a role
        let { data: profile } = await supabase
          .from("profiles")
          .select("id, name, email, role, active")
          .eq("id", user.id)
          .single();

        // If not found by id, check if Admin pre-added them by email
        if (!profile && user.email) {
          const { data: profileByEmail } = await supabase
            .from("profiles")
            .select("id, name, email, role, active")
            .ilike("email", user.email)
            .single();

          if (profileByEmail) {
            profile = profileByEmail;
            try {
              await supabase
                .from("profiles")
                .update({ id: user.id })
                .eq("id", profileByEmail.id);
            } catch {
              // Ignore if already linked
            }
          }
        }

        // Only Admin-created/approved active profiles are allowed
        if (!profile || !profile.active) {
          return null;
        }

        return {
          id: user.id,
          name: profile.name,
          email: profile.email,
          role: profile.role as Role,
          active: profile.active,
        };
      }
    } catch (e) {
      if (e instanceof Error && (e as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE") {
        throw e;
      }
      console.error("Error reading Supabase user:", e);
    }
  }

  // 2. Fallback to demo/mock session cookie (for offline/development mode)
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
  const role = await getRole(user.role);
  const allowed = role ? role.pages.includes(page) : canView(user.role, page);
  if (!allowed) forbidden();
  return user;
}

export async function requirePermission(permission: Permission): Promise<Profile> {
  const user = await requireUser();
  const role = await getRole(user.role);
  const allowed = role ? role.permissions.includes(permission) : can(user.role, permission);
  if (!allowed) forbidden();
  return user;
}
