// Usernames nobody can claim: the company's own name and names that
// imitate staff or the platform. The database enforces the same rule
// (supabase-reserved-usernames.sql); this copy gives a friendly message
// before the request is sent.

const RESERVED = new Set([
  'mitype', 'mitypeapp', 'admin', 'administrator', 'support', 'help',
  'official', 'staff', 'team', 'moderator', 'mod', 'security', 'system',
  'root', 'info', 'contact', 'billing', 'founder', 'ceo', 'cmo',
]);

export function isReservedUsername(raw: string): boolean {
  const name = raw.trim().toLowerCase().replace(/^@/, '');
  if (!name) return false;
  if (RESERVED.has(name)) return true;
  // Anything containing the company name could pass for the company.
  const squeezed = name.replace(/[^a-z0-9]/g, '');
  return squeezed.includes('mitype');
}

export const RESERVED_USERNAME_MESSAGE =
  'That username is reserved. Please choose another.';
