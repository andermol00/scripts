import { authenticator } from "otplib";

authenticator.options = { window: 1, step: 30 };

export function verifyTotp(token: string, secret: string) {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    return authenticator.verify({ token: clean, secret });
  } catch {
    return false;
  }
}

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(username: string, secret: string, issuer = "TM Vault") {
  return authenticator.keyuri(username, issuer, secret);
}

export function currentTotp(secret: string) {
  return authenticator.generate(secret);
}
