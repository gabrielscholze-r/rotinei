import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { TodoList, WidgetSize } from '../../../lib/types';

interface Props {
  list: TodoList;
  size: WidgetSize;
}

export function TodoListWidget({ list, size }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const done = list.items.filter((i) => i.done).length;
  const total = list.items.length;
  const progress = total > 0 ? done / total : 0;
  const pct = Math.round(progress * 100);
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  const pendingItems = list.items.filter((i) => !i.done).slice(0, 3);

  return (
    <TouchableOpacity
      style={[styles.card, isSmall && styles.smallCard]}
      onPress={() => router.push(`/todos/${list.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: list.color + '20' }]}>
          <Text style={{ fontSize: isSmall ? 16 : 20 }}>{list.icon}</Text>
        </View>
        <Text style={[styles.countBadge, { color: list.color }]}>
          {done}/{total}
        </Text>
      </View>

      <Text style={styles.title} numberOfLines={isSmall ? 2 : 1}>{list.title}</Text>

      {isSmall ? (
        <Text style={[styles.pctText, { color: list.color }]}>{pct}% concluído</Text>
      ) : (
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${pct}%` as any, backgroundColor: list.color },
              ]}
            />
          </View>
          <Text style={[styles.pctLabel, { color: list.color }]}>{pct}%</Text>
        </View>
      )}

      {isLarge && pendingItems.length > 0 && (
        <View style={styles.itemsList}>
          {pendingItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={[styles.itemDot, { borderColor: list.color }]} />
              <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
            </View>
          ))}
        </View>
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
      gap: 6,
      minHeight: 100,
    },
    smallCard: {
      padding: 14,
      minHeight: 90,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countBadge: { fontSize: 13, fontWeight: '700' },
    title: { fontSize: 14, fontWeight: '700', color: Colors.text },
    pctText: { fontSize: 12, fontWeight: '600' },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 2,
    },
    progressTrack: {
      flex: 1,
      height: 5,
      backgroundColor: Colors.borderLight,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    pctLabel: { fontSize: 12, fontWeight: '700', minWidth: 32, textAlign: 'right' },
    itemsList: { marginTop: 6, gap: 6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    itemDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
    },
    itemText: { fontSize: 13, color: Colors.text, flex: 1 },
  });
}
