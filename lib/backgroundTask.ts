import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { getItem, setItem, KEYS } from './storage';
import { Routine } from './types';

export const BACKGROUND_TASK_NAME = 'RESCHEDULE_ROUTINE_NOTIFICATIONS';

async function scheduleForRoutine(
  routine: Pick<Routine, 'name' | 'icon' | 'description' | 'time' | 'days'>
): Promise<string[]> {
  const [h, m] = routine.time.split(':');
  const hour = parseInt(h);
  const minute = parseInt(m);
  const content = {
    title: `${routine.icon} ${routine.name}`,
    body: routine.description || 'Hora da sua rotina!',
    sound: 'default' as const,
  };
  const ids: string[] = [];
  try {
    if (routine.days.length === 0) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        } as Notifications.DailyTriggerInput,
      });
      ids.push(id);
    } else {
      for (const day of routine.days) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
          } as Notifications.WeeklyTriggerInput,
        });
        ids.push(id);
      }
    }
  } catch {}
  return ids;
}

export async function rescheduleAllNotifications(): Promise<void> {
  try {
    const routines = await getItem<Routine[]>(KEYS.ROUTINES);
    if (!routines) return;

    const activeRoutines = routines.filter((r) => r.active);
    if (activeRoutines.length === 0) return;

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((n) => n.identifier));

    const updated = [...routines];
    let changed = false;

    for (const routine of activeRoutines) {
      const allScheduled =
        routine.notificationIds.length > 0 &&
        routine.notificationIds.every((id) => scheduledIds.has(id));

      if (!allScheduled) {
        for (const id of routine.notificationIds) {
          try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
        }
        const newIds = await scheduleForRoutine(routine);
        const idx = updated.findIndex((r) => r.id === routine.id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], notificationIds: newIds };
          changed = true;
        }
      }
    }

    if (changed) {
      await setItem(KEYS.ROUTINES, updated);
    }
  } catch {}
}

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    await rescheduleAllNotifications();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (!isRegistered) {
      await BackgroundTask.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 15,
      });
    }
  } catch {}
}
