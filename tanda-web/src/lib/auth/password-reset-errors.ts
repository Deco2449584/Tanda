export function getPasswordResetErrorMessage(code: string): string {
  switch (code) {
    case 'auth/expired-action-code':
      return 'This link has expired. Ask your administrator to send a new invite.';
    case 'auth/invalid-action-code':
      return 'This link is invalid or was already used. Request a new invite.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/user-disabled':
      return 'This account has been deactivated. Contact your administrator.';
    default:
      return 'Could not set your password. Please try again or request a new invite.';
  }
}
