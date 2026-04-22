export function getPeriodStart(date: Date, cycleDay: number): Date {
  if (date.getDate() >= cycleDay) {
    return new Date(date.getFullYear(), date.getMonth(), cycleDay);
  }
  return new Date(date.getFullYear(), date.getMonth() - 1, cycleDay);
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function periodKey(date: Date, cycleDay: number): string {
  return toKey(getPeriodStart(date, cycleDay));
}

export function currentPeriodKey(cycleDay: number): string {
  return periodKey(new Date(), cycleDay);
}

export function parsePeriodKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function prevPeriodKey(key: string, cycleDay: number): string {
  const s = parsePeriodKey(key);
  return toKey(new Date(s.getFullYear(), s.getMonth() - 1, cycleDay));
}

export function nextPeriodKey(key: string, cycleDay: number): string {
  const s = parsePeriodKey(key);
  return toKey(new Date(s.getFullYear(), s.getMonth() + 1, cycleDay));
}

export function isInPeriod(isoDate: string, key: string, cycleDay: number): boolean {
  const start = parsePeriodKey(key);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, cycleDay);
  const d = new Date(isoDate);
  return d >= start && d < end;
}

export function periodLabel(key: string, cycleDay: number): string {
  const start = parsePeriodKey(key);
  if (cycleDay === 1) {
    return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  const end = new Date(start.getFullYear(), start.getMonth() + 1, cycleDay - 1);
  const fmt = (d: Date) =>
    `${d.getDate()} ${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}`;
  return `${fmt(start)} – ${fmt(end)} de ${end.getFullYear()}`;
}
