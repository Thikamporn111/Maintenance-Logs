// Checks if Supabase environment variables are configured.
export function getSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseConfigured(): boolean {
  if (process.env.VITEST && process.env.TEST_WITH_SUPABASE !== "true") {
    return false;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseKey();
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("your-project-ref") &&
      !url.includes("your-supabase-url")
  );
}
