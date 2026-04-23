import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getItem, KEYS } from '../../lib/storage';
import { Routine, RoutineLog, TodoList, Note, Expense, Goal } from '../../lib/types';
import { isRoutineForToday, isRoutineCompletedToday, formatRoutineDays } from '../../lib/routines';
import { currentPeriodKey, isInPeriod } from '../../lib/billing';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface QuickCard {
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
  route: string;
  count?: number;
  subtitle?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [goals, setGoals] = useState<Goal[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [rts, logs, todos, nts, exps, day, gls] = await Promise.all([
          getItem<Routine[]>(KEYS.ROUTINES),
          getItem<RoutineLog[]>(KEYS.ROUTINE_LOGS),
          getItem<TodoList[]>(KEYS.TODO_LISTS),
          getItem<Note[]>(KEYS.NOTES),
          getItem<Expense[]>(KEYS.EXPENSES),
          getItem<number>(KEYS.BILLING_CYCLE_DAY),
          getItem<Goal[]>(KEYS.GOALS),
        ]);
        setRoutines(rts ?? []);
        setRoutineLogs(logs ?? []);
        setTodoLists(todos ?? []);
        setNotes(nts ?? []);
        setExpenses(exps ?? []);
        setCycleDay(day ?? 1);
        setGoals(gls ?? []);
      }
      load();
    }, [])
  );

  const now = new Date();
  const activePeriodKey = currentPeriodKey(cycleDay);
  const monthExpenses = expenses
    .filter((e) => isInPeriod(e.date, activePeriodKey, cycleDay))
    .reduce((sum, e) => sum + e.amount, 0);

  const pendingTodos = todoLists.reduce(
    (sum, l) => sum + l.items.filter((i) => !i.done).length,
    0
  );

  const todayRoutines = routines.filter(isRoutineForToday);
  const pendingRoutines = todayRoutines.filter((r) => !isRoutineCompletedToday(r.id, routineLogs));
  const sortedPendingRoutines = [...pendingRoutines].sort((a, b) => a.time.localeCompare(b.time));

  const activeGoals = goals.filter((g) => g.currentAmount < g.targetAmount);
  const totalGoalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const goalsNearDeadline = activeGoals.filter((g) => {
    if (!g.deadline) return false;
    const diff = Math.ceil((new Date(g.deadline + 'T00:00:00').getTime() - now.getTime()) / 86400000);
    return diff >= 0 && diff <= 7;
  });
  const goalsNearCompletion = activeGoals.filter(
    (g) => g.targetAmount > 0 && g.currentAmount / g.targetAmount >= 0.8
  );
  const priorityIds = new Set([
    ...goalsNearDeadline.map((g) => g.id),
    ...goalsNearCompletion.map((g) => g.id),
  ]);
  const featuredGoals = [
    ...activeGoals.filter((g) => priorityIds.has(g.id)),
    ...activeGoals.filter((g) => !priorityIds.has(g.id)),
  ].slice(0, 3);

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}! 👋</Text>
            <Text style={styles.date}>
              {now.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
          </View>
        </View>

        {/* Today's pending routines card */}
        {pendingRoutines.length > 0 && (
          <TouchableOpacity
            style={styles.routinesCard}
            onPress={() => router.push('/(tabs)/routines')}
            activeOpacity={0.85}
          >
            <View style={styles.routinesCardHeader}>
              <Text style={styles.routinesCardTitle}>Rotinas de hoje</Text>
              <View style={styles.routinesCardBadge}>
                <Text style={styles.routinesCardBadgeText}>{pendingRoutines.length} pendentes</Text>
              </View>
            </View>
            {sortedPendingRoutines.slice(0, 3).map((r) => (
              <View key={r.id} style={styles.routineRow}>
                <View style={[styles.routineDot, { backgroundColor: r.color }]} />
                <Text style={styles.routineEmoji}>{r.icon}</Text>
                <Text style={styles.routineName} numberOfLines={1}>{r.name}</Text>
                <Text style={styles.routineTime}>{r.time}</Text>
              </View>
            ))}
            {pendingRoutines.length > 3 && (
              <Text style={styles.routinesMore}>+{pendingRoutines.length - 3} mais</Text>
            )}
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Atalhos</Text>

        <View style={styles.grid}>
          {([
            {
              label: 'Rotinas',
              icon: 'alarm' as IoniconName,
              color: Colors.primary,
              bg: Colors.primaryLighter,
              route: '/(tabs)/routines',
              count: todayRoutines.length - pendingRoutines.length,
              subtitle: pendingRoutines.length > 0 ? `${pendingRoutines.length} pendentes` : 'tudo feito hoje',
            },
            {
              label: 'Listas',
              icon: 'checkbox' as IoniconName,
              color: '#7C3AED',
              bg: '#EDE9FE',
              route: '/(tabs)/todos',
              count: pendingTodos,
              subtitle: 'pendentes',
            },
            {
              label: 'Notas',
              icon: 'document-text' as IoniconName,
              color: '#059669',
              bg: '#D1FAE5',
              route: '/(tabs)/notes',
              count: notes.length,
              subtitle: 'notas',
            },
            {
              label: 'Gastos',
              icon: 'wallet' as IoniconName,
              color: '#DC2626',
              bg: '#FEE2E2',
              route: '/(tabs)/expenses',
              subtitle: 'este mês',
            },
          ] as QuickCard[]).map((card) => (
            <TouchableOpacity
              key={card.label}
              style={[styles.gridCard, { backgroundColor: card.bg }]}
              onPress={() => router.push(card.route as any)}
            >
              <View style={[styles.gridIcon, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={22} color="#fff" />
              </View>
              <Text style={[styles.gridCount, { color: card.color }]}>
                {card.label === 'Gastos'
                  ? `R$ ${monthExpenses.toFixed(2)}`
                  : card.count}
              </Text>
              <Text style={styles.gridLabel}>{card.label}</Text>
              <Text style={styles.gridSub}>{card.subtitle}</Text>
              {card.label === 'Gastos' && totalGoalSaved > 0 && (
                <Text style={styles.gridSub}>
                  {`R$ ${totalGoalSaved.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} em metas`}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {todoLists.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Listas recentes</Text>
            {todoLists.slice(0, 3).map((list) => {
              const done = list.items.filter((i) => i.done).length;
              const total = list.items.length;
              return (
                <TouchableOpacity
                  key={list.id}
                  style={styles.listPreview}
                  onPress={() => router.push(`/todos/${list.id}` as any)}
                >
                  <View style={[styles.listPreviewIcon, { backgroundColor: list.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{list.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listPreviewTitle}>{list.title}</Text>
                    <Text style={styles.listPreviewSub}>{done}/{total} concluídos</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {featuredGoals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Metas em destaque</Text>
            {featuredGoals.map((goal) => {
              const progress =
                goal.targetAmount > 0
                  ? Math.min(goal.currentAmount / goal.targetAmount, 1)
                  : 0;
              const remaining = goal.deadline
                ? Math.ceil(
                    (new Date(goal.deadline + 'T00:00:00').getTime() - now.getTime()) / 86400000
                  )
                : null;
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalPreview}
                  onPress={() => router.push('/(tabs)/expenses' as any)}
                  activeOpacity={0.85}
                >
                  <View style={styles.goalPreviewHeader}>
                    <View style={[styles.goalPreviewIcon, { backgroundColor: goal.color + '20' }]}>
                      <Text style={{ fontSize: 20 }}>{goal.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalPreviewName} numberOfLines={1}>{goal.name}</Text>
                      <Text style={styles.goalPreviewAmounts}>
                        {`R$ ${goal.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / R$ ${goal.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </Text>
                    </View>
                    {remaining !== null && (
                      <Text style={[styles.goalPreviewDeadline, remaining < 0 && { color: Colors.danger }]}>
                        {remaining < 0 ? 'Prazo vencido' : remaining === 0 ? 'Vence hoje' : `${remaining}d`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.goalPreviewTrack}>
                    <View
                      style={[
                        styles.goalPreviewFill,
                        { width: `${Math.round(progress * 100)}%` as any, backgroundColor: goal.color },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.text },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  routinesCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  routinesCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  routinesCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  routinesCardBadge: {
    backgroundColor: Colors.primaryLighter,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  routinesCardBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  routineDot: { width: 6, height: 6, borderRadius: 3 },
  routineEmoji: { fontSize: 16 },
  routineName: { flex: 1, fontSize: 14, fontWeight: '500', color: Colors.text },
  routineTime: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  routinesMore: { fontSize: 13, color: Colors.textTertiary, marginTop: 6, textAlign: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  gridCount: { fontSize: 22, fontWeight: '800' },
  gridLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  gridSub: { fontSize: 12, color: Colors.textSecondary },
  listPreview: {
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
  listPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPreviewTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  listPreviewSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  goalPreview: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  goalPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPreviewName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  goalPreviewAmounts: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  goalPreviewDeadline: { fontSize: 12, fontWeight: '600', color: Colors.warning },
  goalPreviewTrack: {
    height: 5,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  goalPreviewFill: { height: '100%', borderRadius: 3 },
});
