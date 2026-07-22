import { Platform } from 'react-native';
import notifee, {
  AndroidCategory,
  AndroidImportance,
  AndroidVisibility,
  RepeatFrequency,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { Routine } from './types';
import { getItem, KEYS } from './storage';
import { nextOccurrenceDate, nextWeeklyOccurrence } from './routines';

/**
 * Núcleo dos alarmes estilo despertador (Android apenas), via Notifee.
 * Rotinas com `isAlarm` são agendadas aqui em vez do fluxo de expo-notifications.
 * O Notifee persiste os triggers e os reagenda no boot (RECEIVE_BOOT_COMPLETED).
 */

export interface AlarmSoundOption {
  key: string; // salvo em routine.alarmSound
  label: string;
  channelId: string;
  resource: string; // nome do arquivo em res/raw (sem extensão)
}

// Os arquivos são copiados para res/raw pelo plugin expo-notifications (app.json > sounds).
export const ALARM_SOUNDS: AlarmSoundOption[] = [
  { key: 'classico', label: 'Clássico', channelId: 'alarm_classico', resource: 'alarm_classico' },
  { key: 'digital', label: 'Digital', channelId: 'alarm_digital', resource: 'alarm_digital' },
  { key: 'suave', label: 'Suave', channelId: 'alarm_suave', resource: 'alarm_suave' },
];

export const DEFAULT_ALARM_SOUND = 'classico';
export const DEFAULT_SNOOZE_MINUTES = 5;

const VIBRATION_PATTERN = [300, 600, 300, 600];

function resolveSound(key?: string): AlarmSoundOption {
  return ALARM_SOUNDS.find((s) => s.key === key) ?? ALARM_SOUNDS[0];
}

function idFor(routineId: string, suffix: string): string {
  return `alarm-${routineId}-${suffix}`;
}

/** Cria um canal Notifee por som (Android O+ fixa o som no canal). Idempotente. */
export async function ensureAlarmChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    for (const s of ALARM_SOUNDS) {
      await notifee.createChannel({
        id: s.channelId,
        name: `Alarme • ${s.label}`,
        importance: AndroidImportance.HIGH,
        sound: s.resource,
        vibration: true,
        vibrationPattern: VIBRATION_PATTERN,
        bypassDnd: true,
        visibility: AndroidVisibility.PUBLIC,
      });
    }
  } catch {}
}

/**
 * Foreground service exigido pelo Notifee para manter o som/vibração tocando.
 * Deve ser registrado UMA vez no boot do app (module scope da entry).
 * A promise nunca resolve: o serviço vive até a notificação ser cancelada
 * (Parar/Soneca) ou stopForegroundService ser chamado.
 */
export function registerAlarmForegroundService(): void {
  if (Platform.OS !== 'android') return;
  notifee.registerForegroundService(() => new Promise(() => {}));
}

function buildAlarmNotification(routine: Pick<Routine, 'id' | 'name' | 'icon' | 'description' | 'alarmSound'>, id: string) {
  const sound = resolveSound(routine.alarmSound);
  return {
    id,
    title: `${routine.icon} ${routine.name}`,
    body: routine.description || 'Hora da sua rotina!',
    data: { routineId: routine.id, type: 'alarm' as const },
    android: {
      channelId: sound.channelId,
      category: AndroidCategory.ALARM,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      loopSound: true,
      ongoing: true,
      autoCancel: false,
      asForegroundService: true,
      fullScreenAction: { id: 'default', launchActivity: 'default' },
      pressAction: { id: 'default', launchActivity: 'default' },
      actions: [
        { title: 'Soneca', pressAction: { id: 'snooze', launchActivity: 'default' } },
        { title: 'Parar', pressAction: { id: 'stop' } },
      ],
    },
  };
}

async function createTrigger(
  routine: Routine,
  suffix: string,
  timestamp: number,
  repeatFrequency?: RepeatFrequency
) {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: { allowWhileIdle: true },
    ...(repeatFrequency !== undefined ? { repeatFrequency } : {}),
  };
  await notifee.createTriggerNotification(buildAlarmNotification(routine, idFor(routine.id, suffix)), trigger);
}

/** Agenda (ou reagenda) todos os disparos de uma rotina em modo alarme. */
export async function scheduleRoutineAlarm(routine: Routine): Promise<void> {
  if (Platform.OS !== 'android') return;
  await ensureAlarmChannels();
  await cancelRoutineAlarm(routine.id);
  try {
    if ((routine.repeat ?? 'repeat') === 'once') {
      await createTrigger(routine, 'once', nextOccurrenceDate(routine.time).getTime());
    } else if (routine.days.length === 0) {
      await createTrigger(routine, 'daily', nextOccurrenceDate(routine.time).getTime(), RepeatFrequency.DAILY);
    } else {
      for (const day of routine.days) {
        await createTrigger(
          routine,
          `w${day}`,
          nextWeeklyOccurrence(routine.time, day).getTime(),
          RepeatFrequency.WEEKLY
        );
      }
    }
  } catch {}
}

/** Remove todos os triggers e notificações ativas de uma rotina de alarme. */
export async function cancelRoutineAlarm(routineId: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  const prefix = `alarm-${routineId}-`;
  try {
    const triggerIds = await notifee.getTriggerNotificationIds();
    for (const id of triggerIds) {
      if (id.startsWith(prefix)) await notifee.cancelTriggerNotification(id);
    }
    const displayed = await notifee.getDisplayedNotifications();
    for (const n of displayed) {
      if (n.id && n.id.startsWith(prefix)) await notifee.cancelDisplayedNotification(n.id);
    }
  } catch {}
}

/**
 * Para o alarme que está tocando AGORA (cancela a notificação exibida e o serviço),
 * sem mexer nos disparos recorrentes futuros. Usado no botão "Parar".
 */
export async function stopRingingAlarm(routineId?: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    const displayed = await notifee.getDisplayedNotifications();
    for (const n of displayed) {
      const isAlarm = n.notification?.data?.type === 'alarm';
      const matches = !routineId || n.notification?.data?.routineId === routineId;
      if (n.id && isAlarm && matches) await notifee.cancelDisplayedNotification(n.id);
    }
    await notifee.stopForegroundService();
  } catch {}
}

/** Adia o alarme: para o toque atual e reprograma um disparo único em now + minutes. */
export async function snoozeRoutineAlarm(routineId: string, minutes?: number): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await stopRingingAlarm(routineId);
    const routines = (await getItem<Routine[]>(KEYS.ROUTINES)) ?? [];
    const routine = routines.find((r) => r.id === routineId);
    if (!routine) return;
    const mins = minutes ?? routine.snoozeMinutes ?? DEFAULT_SNOOZE_MINUTES;
    await createTrigger(routine, 'snooze', Date.now() + mins * 60 * 1000);
  } catch {}
}
