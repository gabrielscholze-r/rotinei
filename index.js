// Entry point customizado: registra o handler de background do Notifee e o
// foreground service ANTES do app iniciar (exigência do Notifee). Depois carrega
// o entry padrão do expo-router.
import notifee, { EventType } from '@notifee/react-native';
import { stopRingingAlarm, snoozeRoutineAlarm, registerAlarmForegroundService } from './lib/alarms';

registerAlarmForegroundService();

notifee.onBackgroundEvent(async ({ type, detail }) => {
  const data = detail.notification?.data;
  if (data?.type !== 'alarm') return;
  const routineId = data.routineId;
  if (type === EventType.ACTION_PRESS) {
    if (detail.pressAction?.id === 'stop') {
      await stopRingingAlarm(routineId);
    } else if (detail.pressAction?.id === 'snooze') {
      if (routineId) await snoozeRoutineAlarm(routineId);
    }
  }
});

require('expo-router/entry');
