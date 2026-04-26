import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/colors';
import { TodoList, WidgetSize } from '../../../lib/types';

interface Props {
  list: TodoList;
  size: WidgetSize;
}

export function TodoListWidget({ list, size }: Props) {
  const router = useRouter();
  const done = list.items.filter((i) => i.done).length;
  const total = list.items.length;
  const progress = total > 0 ? done / total : 0;
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
      </View>
      <Text style={styles.title} numberOfLines={isSmall ? 2 : 1}>{list.title}</Text>
      <Text style={styles.sub}>{done}/{total} concluídos</Text>

      {!isSmall && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` as any, backgroundColor: list.color },
            ]}
          />
        </View>
      )}

      {isLarge && pendingItems.length > 0 && (
        <View style={styles.itemsList}>
          {pendingItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={[styles.itemDot, { backgroundColor: list.color }]} />
              <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
            </View>
          ))}
        </View>
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
    borderColor: Colors.border,
    gap: 6,
    minHeight: 100,
  },
  smallCard: {
    padding: 14,
    minHeight: 90,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textSecondary },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: { height: '100%', borderRadius: 2 },
  itemsList: { marginTop: 8, gap: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemDot: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 13, color: Colors.text, flex: 1 },
});
