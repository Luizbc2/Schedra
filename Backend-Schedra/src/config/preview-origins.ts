const previewOrigin = "https://collection-sentence-car-feels.trycloudflare.com";
const expiresAt = Date.parse("2026-09-12T23:59:59Z");

// Temporary user-authorized preview. Never trust all tunnel subdomains.
export function getTemporaryPreviewOrigins(now = Date.now()): string[] {
  return now < expiresAt ? [previewOrigin] : [];
}
