import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Goal, WidgetSize } from '../../../lib/types';

interface Props {
  goal: Goal;
  size: WidgetSize;
}

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function deadlineColor(remaining: number, Colors: ColorPalette): string {
  if (remaining < 0) return Colors.danger;
  if (remaining <= 7) return Colors.danger;
  if (remaining <= 30) return Colors.warning;
  return Colors.success;
}

export function GoalWidget({ goal, size }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const progress = goal.targetAmount > 0
    ? Math.min(goal.currentAmount / goal.targetAmount, 1)
    : 0;
  const pct = Math.round(progress * 100);

  const now = new Date();
  const remaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    : null;

  const deadlineLabel =
    remaining === null ? null :
    remaining < 0 ? 'Vencida' :
    remaining === 0 ? 'Vence hoje' :
    remaining === 1 ? 'Vence amanhã' :
    `${remaining}d restantes`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        router.push({ pathname: '/(tabs)/expenses', params: { tab: 'metas', goalId: goal.id } } as any)
      }
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={[styles.emojiContainer, { backgroundColor: goal.color + '20' }]}>
          <Text style={{ fontSize: 22 }}>{goal.emoji}</Text>
        </View>
        {remaining !== null && (
          <View style={[styles.deadlineBadge, { backgroundColor: deadlineColor(remaining, Colors) + '18' }]}>
            <Text style={[styles.deadlineText, { color: deadlineColor(remaining, Colors) }]}>
              {deadlineLabel}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>{goal.name}</Text>

      <View style={styles.amountsRow}>
        <Text style={[styles.currentAmount, { color: goal.color }]}>
          {fmtCurrency(goal.currentAmount)}
        </Text>
        <Text style={styles.targetAmount}>de {fmtCurrency(goal.targetAmount)}</Text>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${pct}%` as any, backgroundColor: goal.color },
            ]}
          />
        </View>
        <Text style={[styles.pct, { color: goal.color }]}>{pct}%</Text>
      </View>
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
      minHeight: 110,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    emojiContainer: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deadlineBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    deadlineText: { fontSize: 12, fontWeight: '600' },
    name: { fontSize: 15, fontWeight: '700', color: Colors.text },
    amountsRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
      flexWrap: 'wrap',
    },
    currentAmount: { fontSize: 18, fontWeight: '800' },
    targetAmount: { fontSize: 12, color: Colors.textSecondary },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: Colors.borderLight,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    pct: { fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'right' },
  });
}
