import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Routine, RoutineLog } from '../../../lib/types';
import { isRoutineForToday, isRoutineCompletedToday } from '../../../lib/routines';

interface Props {
  routines: Routine[];
  logs: RoutineLog[];
}

export function RoutinesTodayWidget({ routines, logs }: Props) {
  const router = useRouter();
  const todayRoutines = routines.filter(isRoutineForToday);
  const pendingRoutines = todayRoutines.filter((r) => !isRoutineCompletedToday(r.id, logs));
  const sortedPending = [...pendingRoutines].sort((a, b) => a.time.localeCompare(b.time));
  const allDone = todayRoutines.length > 0 && pendingRoutines.length === 0;

  return (
    <TouchableOpacity
      style={allDone ? styles.doneCard : styles.card}
      onPress={() => router.push('/(tabs)/routines')}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rotinas de hoje</Text>
        {todayRoutines.length === 0 ? null : allDone ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>tudo feito</Text>
          </View>
        ) : (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{pendingRoutines.length} pendentes</Text>
          </View>
        )}
      </View>

      {todayRoutines.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma rotina para hoje</Text>
      ) : allDone ? (
        <Text style={styles.doneText}>Todas as rotinas concluídas!</Text>
      ) : (
        <>
          {sortedPending.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Text style={styles.emoji}>{r.icon}</Text>
              <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
              <Text style={styles.time}>{r.time}</Text>
            </View>
          ))}
          {pendingRoutines.length > 3 && (
            <Text style={styles.more}>+{pendingRoutines.length - 3} mais</Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  doneCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  pendingBadge: {
    backgroundColor: Colors.primaryLighter,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  doneBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  emoji: { fontSize: 16 },
  name: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  time: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  more: { fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  emptyText: { fontSize: 14, color: Colors.textTertiary },
  doneText: { fontSize: 14, color: Colors.success, fontWeight: '500' },
});
