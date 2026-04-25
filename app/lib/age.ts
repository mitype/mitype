// Age helpers driven off `profiles.date_of_birth` (DATE column).

export function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

export function isAtLeast18(dob: string | null | undefined): boolean {
  const age = calculateAge(dob);
  return age !== null && age >= 18;
}

// Cap the date input's max attribute so the picker can't pick a sub-18 date.
export function maxDobIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

// Cap the min so we don't allow nonsense like 1900.
export function minDobIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().slice(0, 10);
}
