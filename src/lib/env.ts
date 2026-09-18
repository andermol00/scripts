// Centralized access to the security-sensitive environment variables used
// by the authentication system. Values are read lazily (not at import
// time) so the production build never fails just because secrets are not
// present yet in the build environment — they only need to exist at
// runtime, when a login is actually attempted.

export type AdminConfig = {
  username: string;
  passwordHash: string;
  totpSecret: string;
  authSecret: string;
};

export function getAdminConfig(): AdminConfig | null {
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const totpSecret = process.env.ADMIN_TOTP_SECRET?.trim();
  const authSecret = process.env.AUTH_SECRET?.trim();

  if (!username || !passwordHash || !totpSecret || !authSecret) {
    return null;
  }

  return { username, passwordHash, totpSecret, authSecret };
}

export function isAuthConfigured(): boolean {
  return getAdminConfig() !== null;
}
