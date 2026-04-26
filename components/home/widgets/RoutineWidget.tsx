import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Routine } from '../../../lib/types';
import { WidgetSize } from '../../../lib/types';

interface Props {
  routine: Routine;
  isCompleted: boolean;
  size: WidgetSize;
}

export function RoutineWidget({ routine, isCompleted, size }: Props) {
  const router = useRouter();
  const isSmall = size === 'small';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: routine.color + '20' }, isSmall && styles.smallCard]}
      onPress={() => router.push('/(tabs)/routines')}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{routine.icon}</Text>
        {isCompleted && (
          <View style={[styles.doneBadge, { backgroundColor: routine.color + '30' }]}>
            <Text style={[styles.doneBadgeText, { color: routine.color }]}>✓</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={isSmall ? 2 : 1}>{routine.name}</Text>
      <Text style={[styles.time, { color: routine.color }]}>{routine.time}</Text>
      {!isSmall && (
        <Text style={styles.status}>
          {isCompleted ? 'Concluída hoje' : 'Pendente'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 6,
    minHeight: 100,
  },
  smallCard: {
    padding: 14,
    minHeight: 90,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emoji: { fontSize: 26 },
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
