const normalize = (email: string) => email.trim().toLowerCase();

/** An invite is for one address; only the account registered with it may accept. */
export function inviteIsFor(invitedEmail: string, accountEmail: string): boolean {
  return normalize(invitedEmail) === normalize(accountEmail);
}
