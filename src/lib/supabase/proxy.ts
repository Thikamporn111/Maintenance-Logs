import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseKey, isSupabaseConfigured } from "./config";

export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured()) {
    return { response, user: null };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = getSupabaseKey()!;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
