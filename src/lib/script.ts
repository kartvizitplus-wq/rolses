import type { NewRoleInput } from '../types';
import { MIN_ROLE_BUDGET } from './pricing';

/**
 * Serbest yazılmış senaryo metnini rollere ayırır. Örnek:
 *   Ahmet: Ayşe bugün gelmiyormuş, neden? (kızgın) (bütçe: 50tl)
 *   Yusuf: Ne bileyim, ben Ayşe'nin bekçisi miyim? (50 TL)
 *   Melike: Ben biliyorum.
 * Aynı karakterin tüm replikleri tek rolde toplanır; replik bütçeleri toplanır.
 */
export function parseScript(text: string, defaultBudget = 100): NewRoleInput[] {
  const roles = new Map<string, { budget: number; hasBudget: boolean; role: NewRoleInput }>();
  const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const row of rows) {
    const m = row.match(/^([^:：]{1,40})[:：]\s*(.+)$/);
    if (!m) continue;
    const name = m[1].replace(/[*_#-]/g, '').trim();
    let body = m[2].trim();
    if (!name || /^https?$/i.test(name)) continue;

    let lineBudget = 0;
    const emotions: string[] = [];
    // Kapanmamış parantezleri de kabul et: "(bütçe: 50tl" gibi.
    body = body.replace(/\(([^)]*)(?:\)|$)/g, (_all, inner: string) => {
      const money = inner.match(/(\d[\d.,]*)\s*(tl|₺|lira)?/i);
      const looksLikeMoney = /(tl|₺|lira|bütçe|butce|ücret|ucret)/i.test(inner) || /^\s*\d[\d.,]*\s*$/.test(inner);
      if (money && looksLikeMoney) {
        lineBudget += Number(money[1].replace(/\./g, '').replace(',', '.')) || 0;
      } else if (inner.trim()) {
        emotions.push(inner.trim());
      }
      return '';
    });
    body = body.replace(/\s{2,}/g, ' ').trim();
    if (!body) continue;

    const key = name.toLocaleLowerCase('tr');
    let entry = roles.get(key);
    if (!entry) {
      entry = {
        budget: 0,
        hasBudget: false,
        role: { name, description: '', gender_pref: '', budget: defaultBudget, lines: [] },
      };
      roles.set(key, entry);
    }
    entry.role.lines.push({ text: body, emotion: emotions.join(', ') });
    if (lineBudget > 0) {
      entry.budget += lineBudget;
      entry.hasBudget = true;
    }
  }

  return [...roles.values()].map((e) => ({
    ...e.role,
    budget: Math.max(MIN_ROLE_BUDGET, e.hasBudget ? Math.round(e.budget) : defaultBudget),
  }));
}
