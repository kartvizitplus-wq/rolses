// Komisyon modeli: yetenekten %15, görev verenden %5 hizmet bedeli.
export const TALENT_COMMISSION_RATE = 0.15;
export const OWNER_FEE_RATE = 0.05;
export const MIN_ROLE_BUDGET = 50; // TL
export const AUTO_APPROVE_HOURS = 72;
export const MAX_REVISIONS = 2;

export function priceBreakdown(amount: number) {
  const ownerFee = Math.round(amount * OWNER_FEE_RATE * 100) / 100;
  const talentCommission = Math.round(amount * TALENT_COMMISSION_RATE * 100) / 100;
  return {
    amount,
    ownerFee,
    ownerTotal: Math.round((amount + ownerFee) * 100) / 100,
    talentCommission,
    talentNet: Math.round((amount - talentCommission) * 100) / 100,
    platformGross: Math.round((ownerFee + talentCommission) * 100) / 100,
  };
}

export function formatTL(n: number) {
  const fixed = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' TL';
}
