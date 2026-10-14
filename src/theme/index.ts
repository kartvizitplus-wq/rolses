// "Stüdyo" teması: krem kâğıt zemin, mürekkep yazı, kayıt lambası kırmızısı.
export const colors = {
  bg: '#F6F1E9',
  card: '#FFFDF8',
  ink: '#17141F',
  inkSoft: '#5B5566',
  line: '#E4DCCD',
  onAir: '#E8412C',
  onAirSoft: '#FBE3DD',
  green: '#1F8A5B',
  greenSoft: '#DDF1E6',
  amber: '#B7791F',
  amberSoft: '#FAEFD7',
  blue: '#2D5BFF',
  blueSoft: '#E1E8FF',
  white: '#FFFFFF',
};

export const radius = { s: 8, m: 14, l: 22, pill: 999 };
export const space = (n: number) => n * 4;

export const font = {
  h1: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.6, color: colors.ink },
  h2: { fontSize: 22, fontWeight: '800' as const, letterSpacing: -0.3, color: colors.ink },
  h3: { fontSize: 17, fontWeight: '700' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.inkSoft },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: colors.inkSoft,
  },
};

export const statusLabels: Record<string, { text: string; fg: string; bg: string }> = {
  open: { text: 'Açık', fg: colors.green, bg: colors.greenSoft },
  in_progress: { text: 'Sürüyor', fg: colors.blue, bg: colors.blueSoft },
  completed: { text: 'Tamamlandı', fg: colors.inkSoft, bg: colors.line },
  cancelled: { text: 'İptal', fg: colors.inkSoft, bg: colors.line },
  cast: { text: 'Seçildi', fg: colors.blue, bg: colors.blueSoft },
  delivered: { text: 'Teslim edildi', fg: colors.amber, bg: colors.amberSoft },
  approved: { text: 'Onaylandı', fg: colors.green, bg: colors.greenSoft },
  pending: { text: 'Değerlendiriliyor', fg: colors.amber, bg: colors.amberSoft },
  shortlisted: { text: 'Kısa listede', fg: colors.blue, bg: colors.blueSoft },
  selected: { text: 'Seçildin', fg: colors.green, bg: colors.greenSoft },
  rejected: { text: 'Seçilmedi', fg: colors.inkSoft, bg: colors.line },
  awaiting_payment: { text: 'Ödeme bekleniyor', fg: colors.amber, bg: colors.amberSoft },
  funded: { text: 'Ödeme güvende · kayıt bekleniyor', fg: colors.blue, bg: colors.blueSoft },
  revision: { text: 'Revizyon istendi', fg: colors.onAir, bg: colors.onAirSoft },
};
