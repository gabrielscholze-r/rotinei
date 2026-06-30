import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Routine, RoutineLog, WidgetSize } from '../../../lib/types';

interface Props {
  routine: Routine;
  isCompleted: boolean;
  size: WidgetSize;
  logs: RoutineLog[];
}

function calcStreak(routineId: string, logs: RoutineLog[]): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (!logs.some((l) => l.routineId === routineId && l.date === key)) break;
    streak++;
  }
  return streak;
}

export function RoutineWidget({ routine, isCompleted, size, logs }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const isSmall = size === 'small';
  const streak = calcStreak(routine.id, logs);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: routine.color + '18' }]}
      onPress={() => router.push('/(tabs)/routines')}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <Text style={styles.emoji}>{routine.icon}</Text>
        <View style={styles.badges}>
          {streak > 1 && !isSmall && (
            <View style={[styles.streakBadge, { backgroundColor: routine.color + '25' }]}>
              <Text style={[styles.streakText, { color: routine.color }]}>🔥 {streak}</Text>
            </View>
          )}
          {isCompleted && (
            <View style={[styles.doneBadge, { backgroundColor: routine.color + '30' }]}>
              <Text style={[styles.doneBadgeText, { color: routine.color }]}>✓</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.name} numberOfLines={isSmall ? 2 : 1}>{routine.name}</Text>
      <Text style={[styles.time, { color: routine.color }]}>{routine.time}</Text>

      {!isSmall && (
        <Text style={styles.status}>
          {isCompleted ? 'Concluída hoje' : 'Pendente hoje'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: 16,
      gap: 6,
      minHeight: 100,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emoji: { fontSize: 26 },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    streakBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    streakText: { fontSize: 12, fontWeight: '700' },
    doneBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneBadgeText: { fontSize: 13, fontWeight: '700' },
    name: { fontSize: 14, fontWeight: '700', color: Colors.text },
    time: { fontSize: 13, fontWeight: '600' },
    status: { fontSize: 12, color: Colors.textSecondary },
  });
}
