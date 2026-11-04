// Single source of truth for "does this member have paid access?".
//
// A member has access while their subscription is active or in its free
// trial. Every page that needs this answer should call hasActiveAccess()
// instead of re-typing the status comparison, so a future rule change
// (grace period, comped accounts, etc.) only has to be made here.

export function hasActiveAccess(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}
