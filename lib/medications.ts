import { Medication, MedicationDose } from './types';

export function generateDoses(
  startTime: Date,
  intervalHours: number,
  durationDays: number
): MedicationDose[] {
  const doses: MedicationDose[] = [];
  const totalDoses = Math.ceil((durationDays * 24) / intervalHours);
  for (let i = 0; i < totalDoses; i++) {
    const scheduledAt = new Date(startTime.getTime() + i * intervalHours * 60 * 60 * 1000);
    doses.push({
      id: `${Date.now()}-${i}`,
      scheduledAt: scheduledAt.toISOString(),
    });
  }
  return doses;
}

export function getNextDose(medication: Medication): MedicationDose | null {
  const now = new Date();
  return (
    medication.doses.find(
      (d) => !d.takenAt && !d.skipped && new Date(d.scheduledAt) >= now
    ) ?? null
  );
}

export function getOverdueDoses(medication: Medication): MedicationDose[] {
  const now = new Date();
  return medication.doses.filter(
    (d) => !d.takenAt && !d.skipped && new Date(d.scheduledAt) < now
  );
}

export function getMedicationProgress(medication: Medication): number {
  const taken = medication.doses.filter((d) => d.takenAt).length;
  return taken / medication.doses.length;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
