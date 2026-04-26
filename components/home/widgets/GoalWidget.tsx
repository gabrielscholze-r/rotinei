import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Goal, WidgetSize } from '../../../lib/types';

interface Props {
  goal: Goal;
  size: WidgetSize;
}

export function GoalWidget({ goal, size }: Props) {
  const router = useRouter();
  const progress = goal.targetAmount > 0
    ? Math.min(goal.currentAmount / goal.targetAmount, 1)
    : 0;
  const now = new Date();
  const remaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { tab: 'metas', goalId: goal.id } } as any)}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={[styles.emojiContainer, { backgroundColor: goal.color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{goal.emoji}</Text>
        </View>
        {remaining !== null && (
          <Text style={[styles.deadline, remaining < 0 && { color: Colors.danger }]}>
            {remaining < 0 ? 'Vencida' : remaining === 0 ? 'Hoje' : `${remaining}d`}
          </Text>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>
      <Text style={styles.amounts}>
        {`R$ ${goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` as any, backgroundColor: goal.color },
          ]}
        />
      </View>
      <Text style={[styles.percentage, { color: goal.color }]}>
        {Math.round(progress * 100)}%
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    minHeight: 110,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emojiContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deadline: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text },
  amounts: { fontSize: 12, color: Colors.textSecondary },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  percentage: { fontSize: 12, fontWeight: '700' },
});
