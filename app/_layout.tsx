import * as NavigationBar from 'expo-navigation-bar';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import notifee, { EventType } from '@notifee/react-native';
import { registerBackgroundTask, rescheduleAllNotifications, cleanupFiredOnceRoutines } from '../lib/backgroundTask';
import { ensureAlarmChannels, stopRingingAlarm, snoozeRoutineAlarm } from '../lib/alarms';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

let lastAlarmOpen = 0;
function openAlarmScreen(routineId?: string) {
  // Evita empilhar a tela duas vezes quando cold-start e DELIVERED coincidem.
  const now = Date.now();
  if (now - lastAlarmOpen < 3000) return;
  lastAlarmOpen = now;
  router.push(routineId ? `/alarm?routineId=${routineId}` : '/alarm');
}

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

export default function RootLayout() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }

    registerBackgroundTask();
    rescheduleAllNotifications();
    cleanupFiredOnceRoutines();
    ensureAlarmChannels();

    // App aberto por full-screen intent do alarme (cold start).
    notifee.getInitialNotification().then((initial) => {
      const data = initial?.notification?.data;
      if (data?.type === 'alarm') openAlarmScreen(data.routineId as string | undefined);
    });

    // Alarme disparado / tocado com o app em foreground.
    const alarmSub = notifee.onForegroundEvent(({ type, detail }) => {
      const data = detail.notification?.data;
      if (data?.type !== 'alarm') return;
      const routineId = data.routineId as string | undefined;
      if (type === EventType.DELIVERED || type === EventType.PRESS) {
        openAlarmScreen(routineId);
      } else if (type === EventType.ACTION_PRESS) {
        if (detail.pressAction?.id === 'stop') stopRingingAlarm(routineId);
        else if (detail.pressAction?.id === 'snooze' && routineId) snoozeRoutineAlarm(routineId);
      }
    });

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        cleanupFiredOnceRoutines();
        rescheduleAllNotifications();
      }
      appState.current = next;
    });

    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      cleanupFiredOnceRoutines();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      cleanupFiredOnceRoutines();
    });

    return () => {
      sub.remove();
      receivedSub.remove();
      responseSub.remove();
      alarmSub();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <RootContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootContent() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
