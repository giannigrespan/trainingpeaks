// Set to false to re-enable paid subscription enforcement
export const FREE_PLAN = true;

export function isSubscribed(user: {
  subscriptionStatus?: string;
  trialEndsAt?: Date | string | null;
}): boolean {
  if (FREE_PLAN) return true;
  if (user.subscriptionStatus === "active") return true;
  if (
    user.subscriptionStatus === "trialing" &&
    user.trialEndsAt &&
    new Date(user.trialEndsAt) > new Date()
  )
    return true;
  return false;
}

export function trialDaysLeft(trialEndsAt?: Date | string | null): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
