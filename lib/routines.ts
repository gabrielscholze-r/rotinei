import { Routine, RoutineLog } from './types';

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isRoutineForToday(routine: Routine): boolean {
  if (!routine.active) return false;
  if (routine.days.length === 0) return true;
  return routine.days.includes(new Date().getDay());
}

export function isRoutineCompletedToday(routineId: string, logs: RoutineLog[]): boolean {
  const today = getTodayKey();
  return logs.some((l) => l.routineId === routineId && l.date === today);
}

export function formatRoutineDays(days: number[]): string {
  if (days.length === 0 || days.length === 7) return 'Todo dia';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fins de semana';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}
