import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Routine, RoutineLog, WidgetSize } from '../../../lib/types';

interface Props {
  routine: Routine;
  logs: RoutineLog[];
  size: WidgetSize;
}

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function buildLast7Days(routineId: string, logs: RoutineLog[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return {
      key,
      label: DAY_LABELS[d.getDay()],
      isToday: i === 6,
      completed: logs.some((l) => l.routineId === routineId && l.date === key),
    };
  });
}

function calcStreak(days: ReturnType<typeof buildLast7Days>): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].completed) streak++;
    else break;
  }
  return streak;
}

export function WeekOverviewWidget({ routine, logs, size }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const days = buildLast7Days(routine.id, logs);
  const completedCount = days.filter((d) => d.completed).length;
  const streak = calcStreak(days);
  const isSmall = size === 'small';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push('/(tabs)/routines')}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: routine.color + '20' }]}>
          <Text style={{ fontSize: isSmall ? 16 : 20 }}>{routine.icon}</Text>
        </View>
        {streak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: routine.color + '20' }]}>
            <Text style={[styles.streakText, { color: routine.color }]}>🔥 {streak}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>{routine.name}</Text>

      <View style={styles.grid}>
        {days.map((day) => (
          <View key={day.key} style={styles.dayCell}>
            <View
              style={[
                styles.circle,
                day.completed
                  ? { backgroundColor: routine.color }
                  : day.isToday
                  ? { borderColor: routine.color, borderWidth: 2 }
                  : { borderColor: Colors.borderLight, borderWidth: 1.5 },
              ]}
            />
            <Text
              style={[
                styles.dayLabel,
                day.isToday && { color: routine.color, fontWeight: '700' },
              ]}
            >
              {day.label}
            </Text>
          </View>
        ))}
      </View>

      {!isSmall && (
        <Text style={styles.sub}>{completedCount}/7 esta semana</Text>
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
      borderColor: Colors.border,
      gap: 8,
      minHeight: 100,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconContainer: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    streakBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    streakText: { fontSize: 13, fontWeight: '700' },
    name: { fontSize: 14, fontWeight: '700', color: Colors.text },
    grid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayCell: {
      alignItems: 'center',
      gap: 4,
    },
    circle: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    dayLabel: {
      fontSize: 10,
      color: Colors.textTertiary,
      fontWeight: '500',
    },
    sub: { fontSize: 12, color: Colors.textSecondary },
  });
}
