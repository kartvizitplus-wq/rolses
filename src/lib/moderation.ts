// Platform dışına kaymayı engellemek için mesajlarda iletişim bilgisi yakalama.
const patterns: { re: RegExp; label: string }[] = [
  { re: /TR\s?\d{2}(\s?\d{4}){5}\s?\d{2}/i, label: 'IBAN' },
  { re: /(\+?90[\s-]?)?\(?0?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/, label: 'telefon numarası' },
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, label: 'e-posta adresi' },
  { re: /\b(whats?app|wp|telegram|insta(gram)?\s*:|dm\s*at)\b/i, label: 'dış iletişim kanalı' },
];

export function findContactInfo(text: string): string | null {
  for (const p of patterns) {
    if (p.re.test(text)) return p.label;
  }
  return null;
}

export const CONTACT_WARNING =
  'Güvenliğiniz için iletişim ve ödeme bilgisi paylaşılamaz. Ödemeler yalnızca RolSes güvenli ödeme ile korunur.';
