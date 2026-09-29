// Turns a raw Supabase/Postgrest error (or any thrown value) into a message
// that's safe and useful to show a non-technical user, instead of a raw
// Postgres error string leaking through the UI.
export function getErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong. Please try again.";
  const msg = typeof err === "string" ? err : (err as { message?: string })?.message ?? "";

  if (!msg) return "Something went wrong. Please try again.";
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Network error — check your internet connection and try again.";
  }
  if (msg.toLowerCase().includes("duplicate key") || msg.includes("_key")) {
    return "That record already exists.";
  }
  if (msg.toLowerCase().includes("permission denied") || msg.toLowerCase().includes("rls")) {
    return "You don't have permission to do that.";
  }
  if (msg.toLowerCase().includes("jwt") || msg.toLowerCase().includes("session")) {
    return "Your session has expired. Please sign in again.";
  }
  return msg;
}
