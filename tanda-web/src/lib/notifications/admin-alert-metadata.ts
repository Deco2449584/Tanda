/** Admin bell alerts that need a follow-up action in the app (approval, manual checkout). */
const ADMIN_ALERTS_REQUIRING_ACTION = new Set([
  'leave_pending',
  'forgotten_checkout',
]);

export function adminAlertRequiresAction(alertId: string): boolean {
  return ADMIN_ALERTS_REQUIRING_ACTION.has(alertId);
}

export function isInformationalAdminAlert(alertId: string): boolean {
  return !adminAlertRequiresAction(alertId);
}
