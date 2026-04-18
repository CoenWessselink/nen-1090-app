export function getPasswordStrength(password: string): 'Zwak' | 'Redelijk' | 'Sterk' {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
  if (score >= 4 && password.length >= 12) return 'Sterk';
  if (score >= 2 && password.length >= 8) return 'Redelijk';
  return 'Zwak';
}

export function normalizeAuthRedirectTarget(input?: string | null): string {
  if (!input) return '/dashboard';
  if (!input.startsWith('/')) return '/dashboard';
  if (input.startsWith('//')) return '/dashboard';

  const [pathOnly] = input.split(/[?#]/, 1);
  const blocked = new Set(['/login', '/logout', '/forgot-password', '/reset-password', '/activate', '/activate-account']);
  if (blocked.has(pathOnly || '')) return '/dashboard';
  return input;
}

export function getFriendlyAuthErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const message = (error.message || '').trim();
  if (!message) return fallback;
  if (/email_already_exists/i.test(message)) {
    return 'Voor dit e-mailadres bestaat al een account. Vraag een nieuwe activatielink aan of log in.';
  }
  if (/account_not_active|inactive_account|account nog niet geactiveerd|account is not active|user inactive/i.test(message)) {
    return 'Je account is nog niet geactiveerd. Open de activatiemail of vraag een nieuwe activatielink aan.';
  }
  if (/tenant header komt niet overeen/i.test(message)) {
    return 'Je sessie hoort bij een andere tenant. Log opnieuw in.';
  }
  if (/missing bearer token|invalid token|refresh token revoked|refresh token expired|invalid session/i.test(message)) {
    return 'Je sessie is niet meer geldig. Log opnieuw in.';
  }
  if (/ongeldige of verlopen resetlink/i.test(message)) {
    return 'Deze resetlink is ongeldig of verlopen. Vraag een nieuwe resetlink aan.';
  }
  return message;
}
