import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { getItem, KEYS } from '../lib/storage';
import { Routine } from '../lib/types';
import { stopRingingAlarm, snoozeRoutineAlarm, DEFAULT_SNOOZE_MINUTES } from '../lib/alarms';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AlarmScreen() {
  useKeepAwake();
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      if (!routineId) return;
      const routines = (await getItem<Routine[]>(KEYS.ROUTINES)) ?? [];
      setRoutine(routines.find((r) => r.id === routineId) ?? null);
    })();
  }, [routineId]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }

  async function handleStop() {
    await stopRingingAlarm(routineId);
    close();
  }

  async function handleSnooze() {
    if (routineId) await snoozeRoutineAlarm(routineId);
    else await stopRingingAlarm();
    close();
  }

  const snoozeMin = routine?.snoozeMinutes ?? DEFAULT_SNOOZE_MINUTES;
  const accent = routine?.color ?? '#3B82F6';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />

      <View style={styles.top}>
        <Text style={styles.clock}>
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </Text>
        <Text style={styles.seconds}>{pad(now.getSeconds())}</Text>
      </View>

      <View style={styles.middle}>
        <View style={[styles.iconRing, { borderColor: accent }]}>
          <Text style={styles.icon}>{routine?.icon ?? '⏰'}</Text>
        </View>
        <Text style={styles.name}>{routine?.name ?? 'Alarme'}</Text>
        {routine?.description ? <Text style={styles.desc}>{routine.description}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.snoozeBtn} onPress={handleSnooze} activeOpacity={0.8}>
          <Ionicons name="time-outline" size={26} color="#0B1220" />
          <Text style={styles.snoozeText}>Soneca {snoozeMin} min</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.stopBtn, { backgroundColor: accent }]} onPress={handleStop} activeOpacity={0.85}>
          <Ionicons name="alarm" size={30} color="#fff" />
          <Text style={styles.stopText}>Parar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 60) + 40,
    paddingBottom: 48,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  top: { alignItems: 'center' },
  clock: { fontSize: 88, fontWeight: '200', color: '#F1F5F9', letterSpacing: 2 },
  seconds: { fontSize: 22, fontWeight: '400', color: '#64748B', marginTop: -4 },
  middle: { alignItems: 'center', gap: 18 },
  iconRing: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 56 },
  name: { fontSize: 30, fontWeight: '800', color: '#F1F5F9', textAlign: 'center' },
  desc: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: -6 },
  actions: { gap: 16 },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    paddingVertical: 18,
  },
  snoozeText: { fontSize: 18, fontWeight: '700', color: '#0B1220' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 22,
    paddingVertical: 24,
  },
  stopText: { fontSize: 22, fontWeight: '800', color: '#fff' },
});
