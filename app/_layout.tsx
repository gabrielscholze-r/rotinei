import * as NavigationBar from 'expo-navigation-bar';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, LogBox, Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { registerBackgroundTask, rescheduleAllNotifications, cleanupFiredOnceRoutines } from '../lib/backgroundTask';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ConflictResolutionModal from '../components/auth/ConflictResolutionModal';
import { Colors } from '../constants/colors';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

function SyncOverlay() {
  const { syncStatus } = useAuth();
  if (syncStatus !== 'syncing') return null;
  return (
    <View style={styles.syncOverlay} pointerEvents="none">
      <View style={styles.syncBadge}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.syncText}>Sincronizando...</Text>
      </View>
    </View>
  );
}

function ConflictLayer() {
  const { syncStatus, conflicts, resolveConflicts } = useAuth();
  return (
    <ConflictResolutionModal
      visible={syncStatus === 'conflict'}
      conflicts={conflicts}
      onResolve={resolveConflicts}
    />
  );
}

function AppLayout() {
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
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      <SyncOverlay />
      <ConflictLayer />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  syncOverlay: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 999,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  syncText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
});
