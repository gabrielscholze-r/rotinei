import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getItem, KEYS } from '../../lib/storage';
import { Routine, RoutineLog, TodoList, Note, Expense, Goal, CustomCategory, CATEGORY_ICONS, CATEGORY_LABELS } from '../../lib/types';
import { isRoutineForToday, isRoutineCompletedToday } from '../../lib/routines';
import { currentPeriodKey, isInPeriod } from '../../lib/billing';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [rts, logs, todos, nts, exps, day, gls, cats] = await Promise.all([
          getItem<Routine[]>(KEYS.ROUTINES),
          getItem<RoutineLog[]>(KEYS.ROUTINE_LOGS),
          getItem<TodoList[]>(KEYS.TODO_LISTS),
          getItem<Note[]>(KEYS.NOTES),
          getItem<Expense[]>(KEYS.EXPENSES),
          getItem<number>(KEYS.BILLING_CYCLE_DAY),
          getItem<Goal[]>(KEYS.GOALS),
          getItem<CustomCategory[]>(KEYS.CUSTOM_CATEGORIES),
        ]);
        setRoutines(rts ?? []);
        setRoutineLogs(logs ?? []);
        setTodoLists(todos ?? []);
        setNotes(nts ?? []);
        setExpenses(exps ?? []);
        setCycleDay(day ?? 1);
        setGoals(gls ?? []);
        setCustomCategories(cats ?? []);
      }
      load();
    }, [])
  );

  const now = new Date();
  const activePeriodKey = currentPeriodKey(cycleDay);
  const monthExpenses = expenses
    .filter((e) => isInPeriod(e.date, activePeriodKey, cycleDay))
    .reduce((sum, e) => sum + e.amount, 0);

  const todayRoutines = routines.filter(isRoutineForToday);
  const pendingRoutines = todayRoutines.filter((r) => !isRoutineCompletedToday(r.id, routineLogs));

  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);

  const sortedNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const recentExpenses = expenses
    .filter((e) => isInPeriod(e.date, activePeriodKey, cycleDay))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  function getCategoryIcon(cat: string): string {
    if (cat in CATEGORY_ICONS) return CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS];
    return customCategories.find((c) => c.id === cat)?.emoji ?? '🏷️';
  }

  function getCategoryLabel(cat: string): string {
    if (cat in CATEGORY_LABELS) return CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS];
    return customCategories.find((c) => c.id === cat)?.name ?? cat;
  }

  const tabBarHeight = 64 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 20 }]}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Menu</Text>
            <Text style={styles.date}>
              {now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(tabs)/routines', params: { from: 'menu' } } as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#2564eb3d' }]}>
              <Ionicons name="alarm" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.quickLabel}>Rotinas</Text>
            <Text style={[styles.quickCount, { color: Colors.primary }]}>{routines.length}</Text>
            {pendingRoutines.length > 0 && (
              <Text style={styles.quickSub}>{pendingRoutines.length} pendentes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(tabs)/todos', params: { from: 'menu' } } as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="checkbox" size={22} color="#7C3AED" />
            </View>
            <Text style={styles.quickLabel}>Listas</Text>
            <Text style={[styles.quickCount, { color: '#7C3AED' }]}>{todoLists.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(tabs)/notes', params: { from: 'menu' } } as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="document-text" size={22} color="#059669" />
            </View>
            <Text style={styles.quickLabel}>Notas</Text>
            <Text style={[styles.quickCount, { color: '#059669' }]}>{notes.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { from: 'menu' } } as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.quickIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="wallet" size={22} color="#DC2626" />
            </View>
            <Text style={styles.quickLabel}>Gastos</Text>
            <Text style={[styles.quickCount, { color: '#DC2626' }]}>
              {`R$ ${monthExpenses.toFixed(2)}`}
            </Text>
          </TouchableOpacity>
        </View>

        {todoLists.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Listas</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/todos', params: { from: 'menu' } } as any)}>
                <Text style={styles.sectionLink}>ver todas</Text>
              </TouchableOpacity>
            </View>
            {todoLists.map((list) => {
              const done = list.items.filter((i) => i.done).length;
              const total = list.items.length;
              return (
                <TouchableOpacity
                  key={list.id}
                  style={styles.rowCard}
                  onPress={() => router.push(`/todos/${list.id}` as any)}
                >
                  <View style={[styles.rowIcon, { backgroundColor: list.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{list.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{list.title}</Text>
                    <Text style={styles.rowSub}>{done}/{total} concluídos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {activeGoals.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Metas</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { tab: 'metas', from: 'menu' } } as any)}>
                <Text style={styles.sectionLink}>ver todas</Text>
              </TouchableOpacity>
            </View>
            {activeGoals.map((goal) => {
              const progress = goal.targetAmount > 0
                ? Math.min(goal.currentAmount / goal.targetAmount, 1)
                : 0;
              const remaining = goal.deadline
                ? Math.ceil((new Date(goal.deadline + 'T00:00:00').getTime() - now.getTime()) / 86400000)
                : null;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { tab: 'metas', goalId: goal.id, from: 'menu' } } as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.goalHeader}>
                    <View style={[styles.rowIcon, { backgroundColor: goal.color + '20' }]}>
                      <Text style={{ fontSize: 20 }}>{goal.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{goal.name}</Text>
                      <Text style={styles.rowSub}>
                        {`R$ ${goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </Text>
                    </View>
                    {remaining !== null && (
                      <Text style={[styles.goalDeadline, remaining < 0 && { color: Colors.danger }]}>
                        {remaining < 0 ? 'Vencido' : remaining === 0 ? 'Hoje' : `${remaining}d`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: goal.color }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {sortedNotes.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notas</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/notes', params: { from: 'menu' } } as any)}>
                <Text style={styles.sectionLink}>ver todas</Text>
              </TouchableOpacity>
            </View>
            {sortedNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.rowCard}
                onPress={() => router.push(`/notes/${note.id}` as any)}
              >
                <View style={[styles.colorDot, { backgroundColor: note.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{note.title}</Text>
                  {note.content.length > 0 && (
                    <Text style={styles.rowSub} numberOfLines={1}>{note.content}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {recentExpenses.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gastos recentes</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { from: 'menu' } } as any)}>
                <Text style={styles.sectionLink}>ver todos</Text>
              </TouchableOpacity>
            </View>
            {recentExpenses.map((expense) => (
              <TouchableOpacity
                key={expense.id}
                style={styles.rowCard}
                onPress={() => router.push({ pathname: '/(tabs)/expenses', params: { from: 'menu' } } as any)}
              >
                <View style={styles.expenseIcon}>
                  <Text style={{ fontSize: 20 }}>{getCategoryIcon(expense.category)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{expense.description}</Text>
                  <Text style={styles.rowSub}>
                    {getCategoryLabel(expense.category)} · {new Date(expense.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>
                  {`- R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {todoLists.length === 0 && notes.length === 0 && goals.length === 0 && expenses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="apps-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Tudo vazio por aqui</Text>
            <Text style={styles.emptyText}>Comece criando rotinas, listas ou notas.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  quickCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  quickCount: { fontSize: 18, fontWeight: '800' },
  quickSub: { fontSize: 12, color: Colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  sectionLink: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  rowCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  goalCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalDeadline: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  progressTrack: {
    height: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseAmount: { fontSize: 14, fontWeight: '700', color: Colors.danger },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
});
