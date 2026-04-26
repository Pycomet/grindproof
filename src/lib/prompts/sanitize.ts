/**
 * Sanitize user-supplied text before embedding it inside an LLM prompt.
 *
 * Strips ASCII control characters (except newline/tab), removes our
 * untrusted-input delimiters so a user can't close the fence early,
 * collapses whitespace runs, and truncates to maxLen.
 * Use `wrapUntrustedBlock` to fence the result.
 */
export function sanitizeForPrompt(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";

  let cleaned = "";
  for (const ch of input) {
    const code = ch.charCodeAt(0);
    // Allow printable ASCII and above (>= 32), plus tab (9) and newline (10).
    // Drop everything else, including DEL (127).
    if (code === 9 || code === 10 || (code >= 32 && code !== 127)) {
      cleaned += ch;
    }
  }

  const collapsed = cleaned
    .replace(/<\/?untrusted_user_reflections>/gi, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  if (collapsed.length <= maxLen) return collapsed;
  return collapsed.slice(0, maxLen) + "…";
}

export const UNTRUSTED_OPEN = "<untrusted_user_reflections>";
export const UNTRUSTED_CLOSE = "</untrusted_user_reflections>";

export function wrapUntrustedBlock(body: string): string {
  return `${UNTRUSTED_OPEN}\n${body}\n${UNTRUSTED_CLOSE}`;
}
