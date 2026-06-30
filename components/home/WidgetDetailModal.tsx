import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { isExpenseInCurrentPeriod } from '../../lib/billing';
import { isRoutineCompletedToday, isRoutineForToday } from '../../lib/routines';
import { stripHtml } from '../../lib/textFormatting';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  Expense,
  ExpenseCategory,
  ExpenseSection,
  Goal,
  HomeWidget,
  Note,
  Routine,
  RoutineLog,
  TodoList,
} from '../../lib/types';

interface Props {
  widget: HomeWidget | null;
  onClose: () => void;
  routines: Routine[];
  routineLogs: RoutineLog[];
  todoLists: TodoList[];
  notes: Note[];
  goals: Goal[];
  expenses: Expense[];
  expenseSections: ExpenseSection[];
  cycleDay: number;
}

const fmtCurrency = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export function WidgetDetailModal({
  widget,
  onClose,
  routines,
  routineLogs,
  todoLists,
  notes,
  goals,
  expenses,
  expenseSections,
  cycleDay,
}: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  if (!widget) return null;

  function goToFull() {
    onClose();
    if (widget!.type === 'todo_list') {
      router.push(`/todos/${widget!.entityId}` as any);
    } else if (widget!.type === 'note') {
      router.push(`/notes/${widget!.entityId}` as any);
    } else if (widget!.type === 'goal') {
      router.push({ pathname: '/(tabs)/expenses', params: { tab: 'metas', goalId: widget!.entityId } } as any);
    } else if (widget!.type === 'expense_summary') {
      router.push('/(tabs)/expenses' as any);
    } else {
      router.push('/(tabs)/routines' as any);
    }
  }

  let title = '';
  let content: React.ReactNode = null;

  switch (widget.type) {
    case 'routines_today': {
      title = 'Rotinas de hoje';
      const today = [...routines.filter(isRoutineForToday)].sort((a, b) => a.time.localeCompare(b.time));
      content = (
        <View style={styles.list}>
          {today.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma rotina para hoje</Text>
          ) : (
            today.map((r) => {
              const done = isRoutineCompletedToday(r.id, routineLogs);
              return (
                <View key={r.id} style={styles.row}>
                  <Text style={styles.rowEmoji}>{r.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{r.name}</Text>
                    <Text style={[styles.rowSub, { color: r.color }]}>{r.time}</Text>
                  </View>
                  <Ionicons
                    name={done ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={done ? Colors.success : Colors.textTertiary}
                  />
                </View>
              );
            })
          )}
        </View>
      );
      break;
    }
    case 'routine': {
      const routine = routines.find((r) => r.id === widget.entityId);
      if (!routine) return null;
      title = routine.name;
      const streak = calcStreak(routine.id, routineLogs);
      const isCompleted = isRoutineCompletedToday(routine.id, routineLogs);
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        const key = d.toISOString().split('T')[0];
        return { key, completed: routineLogs.some((l) => l.routineId === routine.id && l.date === key) };
      });
      content = (
        <View style={styles.list}>
          <View style={styles.detailHeader}>
            <Text style={styles.bigEmoji}>{routine.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: routine.color }]}>{routine.time}</Text>
              <Text style={styles.rowSub}>{isCompleted ? 'Concluída hoje' : 'Pendente hoje'}</Text>
            </View>
            {streak > 1 && (
              <View style={[styles.streakBadge, { backgroundColor: routine.color + '25' }]}>
                <Text style={[styles.streakText, { color: routine.color }]}>🔥 {streak}</Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionLabel}>Últimos 14 dias</Text>
          <View style={styles.dayGrid}>
            {last14.map((d) => (
              <View
                key={d.key}
                style={[
                  styles.dayDot,
                  d.completed ? { backgroundColor: routine.color } : { borderColor: Colors.borderLight, borderWidth: 1.5 },
                ]}
              />
            ))}
          </View>
        </View>
      );
      break;
    }
    case 'week_routine': {
      const routine = routines.find((r) => r.id === widget.entityId);
      if (!routine) return null;
      title = routine.name;
      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split('T')[0];
        return { key, completed: routineLogs.some((l) => l.routineId === routine.id && l.date === key) };
      });
      const completedCount = last30.filter((d) => d.completed).length;
      content = (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>{completedCount}/30 últimos dias</Text>
          <View style={styles.monthGrid}>
            {last30.map((d) => (
              <View
                key={d.key}
                style={[
                  styles.monthDot,
                  d.completed ? { backgroundColor: routine.color } : { borderColor: Colors.borderLight, borderWidth: 1.5 },
                ]}
              />
            ))}
          </View>
        </View>
      );
      break;
    }
    case 'todo_list': {
      const list = todoLists.find((l) => l.id === widget.entityId);
      if (!list) return null;
      title = list.title;
      const pending = list.items.filter((i) => !i.done);
      const done = list.items.filter((i) => i.done);
      content = (
        <View style={styles.list}>
          {list.items.length === 0 ? (
            <Text style={styles.emptyText}>Lista vazia</Text>
          ) : (
            <>
              {pending.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={[styles.itemDot, { borderColor: list.color }]} />
                  <Text style={styles.rowTitle}>{item.text}</Text>
                </View>
              ))}
              {done.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  <Text style={[styles.rowTitle, styles.doneText]}>{item.text}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      );
      break;
    }
    case 'note': {
      const note = notes.find((n) => n.id === widget.entityId);
      if (!note) return null;
      title = note.title || 'Sem título';
      const preview = stripHtml(note.content);
      content = (
        <View style={styles.list}>
          <Text style={styles.noteContent}>{preview || 'Nota vazia'}</Text>
        </View>
      );
      break;
    }
    case 'goal': {
      const goal = goals.find((g) => g.id === widget.entityId);
      if (!goal) return null;
      title = goal.name;
      const pct = goal.targetAmount > 0 ? Math.round(Math.min(goal.currentAmount / goal.targetAmount, 1) * 100) : 0;
      const sortedTx = [...goal.transactions].sort((a, b) => b.date.localeCompare(a.date));
      content = (
        <View style={styles.list}>
          <View style={styles.detailHeader}>
            <Text style={styles.bigEmoji}>{goal.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: goal.color }]}>{fmtCurrency(goal.currentAmount)}</Text>
              <Text style={styles.rowSub}>de {fmtCurrency(goal.targetAmount)} ({pct}%)</Text>
            </View>
          </View>
          <Text style={styles.sectionLabel}>Movimentações</Text>
          {sortedTx.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma movimentação</Text>
          ) : (
            sortedTx.map((tx) => (
              <View key={tx.id} style={styles.row}>
                <Text style={[styles.rowTitle, { color: tx.amount >= 0 ? Colors.success : Colors.danger }]}>
                  {tx.amount >= 0 ? '+' : ''}
                  {fmtCurrency(tx.amount)}
                </Text>
                <Text style={[styles.rowSub, { flex: 1 }]} numberOfLines={1}>
                  {tx.note || new Date(tx.date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            ))
          )}
        </View>
      );
      break;
    }
    case 'expense_summary': {
      title = 'Gastos do período';
      const periodExpenses = expenses.filter((e) => isExpenseInCurrentPeriod(e, expenseSections, cycleDay));
      const total = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
      const categoryTotals = periodExpenses.reduce(
        (acc, e) => {
          const cat = e.category || 'other';
          acc[cat] = (acc[cat] || 0) + e.amount;
          return acc;
        },
        {} as Record<string, number>
      );
      const cats = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a);
      content = (
        <View style={styles.list}>
          <Text style={styles.bigTotal}>{fmtCurrency(total)}</Text>
          {cats.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum gasto neste período</Text>
          ) : (
            cats.map(([cat, amount]) => {
              const color = CATEGORY_COLORS[cat as ExpenseCategory] ?? '#94A3B8';
              const icon = CATEGORY_ICONS[cat as ExpenseCategory] ?? '📦';
              const label = CATEGORY_LABELS[cat as ExpenseCategory] ?? cat;
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <View key={cat} style={styles.row}>
                  <Text style={styles.rowEmoji}>{icon}</Text>
                  <Text style={[styles.rowTitle, { flex: 1 }]}>{label}</Text>
                  <Text style={[styles.rowSub, { color }]}>{pct}%</Text>
                  <Text style={[styles.rowTitle, { color }]}>{fmtCurrency(amount)}</Text>
                </View>
              );
            })
          )}
        </View>
      );
      break;
    }
    default:
      return null;
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {content}
          </ScrollView>
          <TouchableOpacity style={styles.openBtn} onPress={goToFull}>
            <Text style={styles.openBtnText}>Abrir tela completa</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      maxHeight: '80%',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      backgroundColor: Colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, flex: 1 },
    closeBtn: { marginLeft: 12 },
    scroll: { maxHeight: 420 },
    list: { gap: 10, paddingBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    rowEmoji: { fontSize: 18, width: 24 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
    rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
    doneText: { textDecorationLine: 'line-through', color: Colors.textTertiary },
    itemDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
    emptyText: { fontSize: 14, color: Colors.textTertiary },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bigEmoji: { fontSize: 32 },
    streakBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    streakText: { fontSize: 12, fontWeight: '700' },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginTop: 4 },
    dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    dayDot: { width: 20, height: 20, borderRadius: 10 },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    monthDot: { width: 16, height: 16, borderRadius: 8 },
    noteContent: { fontSize: 14, color: Colors.text, lineHeight: 20 },
    bigTotal: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 4 },
    openBtn: {
      flexDirection: 'row',
      backgroundColor: Colors.primary,
      borderRadius: 14,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 8,
    },
    openBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  });
}
