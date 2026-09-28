// CNIC helpers. Students type their CNIC in different formats
// ("12345-1234567-1", "1234512345671", with spaces...), so we always compare digits only.

export function cnicDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

export function sameCnic(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = cnicDigits(a);
  const y = cnicDigits(b);
  return x.length >= 13 && x === y;
}
