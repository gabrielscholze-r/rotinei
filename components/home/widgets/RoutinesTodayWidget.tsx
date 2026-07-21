import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Routine, RoutineLog } from '../../../lib/types';
import { isRoutineForToday, isRoutineCompletedToday } from '../../../lib/routines';

interface Props {
  routines: Routine[];
  logs: RoutineLog[];
  onToggleDone?: (routineId: string) => void;
}

export function RoutinesTodayWidget({ routines, logs, onToggleDone }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const todayRoutines = routines.filter(isRoutineForToday);
  const pendingRoutines = todayRoutines.filter((r) => !isRoutineCompletedToday(r.id, logs));
  const doneCount = todayRoutines.length - pendingRoutines.length;
  const sortedPending = [...pendingRoutines].sort((a, b) => a.time.localeCompare(b.time));
  const allDone = todayRoutines.length > 0 && pendingRoutines.length === 0;
  const progress = todayRoutines.length > 0 ? doneCount / todayRoutines.length : 0;

  return (
    <TouchableOpacity
      style={[styles.card, allDone && styles.doneCard]}
      onPress={() => router.push('/(tabs)/routines')}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Rotinas de hoje</Text>
        {todayRoutines.length === 0 ? null : allDone ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>tudo feito ✓</Text>
          </View>
        ) : (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{doneCount}/{todayRoutines.length}</Text>
          </View>
        )}
      </View>

      {todayRoutines.length > 0 && !allDone && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` as any },
            ]}
          />
        </View>
      )}

      {todayRoutines.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma rotina para hoje</Text>
      ) : allDone ? (
        <Text style={styles.doneText}>Parabéns! Todas as rotinas concluídas.</Text>
      ) : (
        <>
          {sortedPending.slice(0, 3).map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Text style={styles.emoji}>{r.icon}</Text>
              <Text style={styles.name} numberOfLines={1}>{r.name}</Text>
              <Text style={[styles.time, { color: r.color }]}>{r.time}</Text>
              {onToggleDone && (
                <TouchableOpacity
                  onPress={() => onToggleDone(r.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.rowCheckBtn}
                >
                  <Ionicons name="ellipse-outline" size={18} color={r.color} />
                </TouchableOpacity>
              )}
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

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: Colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: Colors.primaryLight,
      gap: 10,
    },
    doneCard: {
      backgroundColor: Colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: Colors.success,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: { fontSize: 15, fontWeight: '700', color: Colors.text },
    countBadge: {
      backgroundColor: Colors.primaryLighter,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    countBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
    doneBadge: {
      backgroundColor: Colors.successLight,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    doneBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.success },
    progressTrack: {
      height: 4,
      backgroundColor: Colors.borderLight,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: Colors.primary,
      borderRadius: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 3,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    rowCheckBtn: { padding: 2 },
    emoji: { fontSize: 16 },
    name: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
    time: { fontSize: 13, fontWeight: '600' },
    more: { fontSize: 13, color: Colors.textTertiary, textAlign: 'center' },
    emptyText: { fontSize: 14, color: Colors.textTertiary },
    doneText: { fontSize: 14, color: Colors.success, fontWeight: '500' },
  });
}
