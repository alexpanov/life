import * as O from "../../../packages/foundation/src/option";
const pendingInvitationKey = "life.pending-invitation";
const isInvitationCode = (value: string) =>
  /^[A-Za-z0-9_-]{8,128}$/.test(value);
/** Pending context only: never a signup, verification, or entitlement. */
export function incomingInvitationRepository(): O.Option<string> {
  const incoming = new URL(window.location.href).searchParams.get("ref") || "";
  if (isInvitationCode(incoming)) {
    try {
      sessionStorage.setItem(pendingInvitationKey, incoming);
    } catch {
      /* URL remains the fallback. */
    }
    return O.some(incoming);
  }
  try {
    const saved = sessionStorage.getItem(pendingInvitationKey) || "";
    return isInvitationCode(saved) ? O.some(saved) : O.none();
  } catch {
    return O.none();
  }
}
export function invitationUrl(code: string): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set("ref", code);
  return url.toString();
}
