import { Routine, RoutineLog, RoutineRepeatMode } from './types';

export const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nextOccurrenceDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  if (d <= now) d.setDate(d.getDate() + 1);
  return d;
}

// Próxima ocorrência futura para um dia da semana específico (0=Dom..6=Sáb) + horário "HH:MM".
export function nextWeeklyOccurrence(time: string, weekday: number): Date {
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  let delta = (weekday - d.getDay() + 7) % 7;
  if (delta === 0 && d <= now) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

export function isRoutineForToday(routine: Routine): boolean {
  if (!routine.active) return false;
  if ((routine.repeat ?? 'repeat') === 'once') {
    const [h, m] = routine.time.split(':').map(Number);
    const now = new Date();
    return now.getHours() < h || (now.getHours() === h && now.getMinutes() <= m);
  }
  if (routine.days.length === 0) return true;
  return routine.days.includes(new Date().getDay());
}

export function isRoutineCompletedToday(routineId: string, logs: RoutineLog[]): boolean {
  const today = getTodayKey();
  return logs.some((l) => l.routineId === routineId && l.date === today);
}

export function withRoutineMarkedDone(routineId: string, logs: RoutineLog[]): RoutineLog[] {
  if (isRoutineCompletedToday(routineId, logs)) return logs;
  const log: RoutineLog = {
    id: Date.now().toString(),
    routineId,
    date: getTodayKey(),
    completedAt: new Date().toISOString(),
  };
  return [log, ...logs];
}

export function withRoutineUnmarkedDone(routineId: string, logs: RoutineLog[]): RoutineLog[] {
  const today = getTodayKey();
  return logs.filter((l) => !(l.routineId === routineId && l.date === today));
}

export function toggleRoutineDone(routineId: string, logs: RoutineLog[]): RoutineLog[] {
  return isRoutineCompletedToday(routineId, logs)
    ? withRoutineUnmarkedDone(routineId, logs)
    : withRoutineMarkedDone(routineId, logs);
}

export function formatRoutineDays(days: number[], repeat?: RoutineRepeatMode): string {
  if (repeat === 'once') return 'Uma vez';
  if (days.length === 0 || days.length === 7) return 'Todo dia';
  if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Dias úteis';
  if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Fins de semana';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}
