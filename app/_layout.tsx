import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { registerBackgroundTask, rescheduleAllNotifications, cleanupFiredOnceRoutines } from '../lib/backgroundTask';

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
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
