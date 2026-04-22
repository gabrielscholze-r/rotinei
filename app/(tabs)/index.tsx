import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getItem, KEYS } from '../../lib/storage';
import { Medication, TodoList, Note, Expense } from '../../lib/types';
import { getOverdueDoses, getNextDose, formatDateTime } from '../../lib/medications';
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
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cycleDay, setCycleDay] = useState<number>(1);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [meds, todos, nts, exps, day] = await Promise.all([
          getItem<Medication[]>(KEYS.MEDICATIONS),
          getItem<TodoList[]>(KEYS.TODO_LISTS),
          getItem<Note[]>(KEYS.NOTES),
          getItem<Expense[]>(KEYS.EXPENSES),
          getItem<number>(KEYS.BILLING_CYCLE_DAY),
        ]);
        setMedications(meds ?? []);
        setTodoLists(todos ?? []);
        setNotes(nts ?? []);
        setExpenses(exps ?? []);
        setCycleDay(day ?? 1);
      }
      load();
    }, [])
  );

  const now = new Date();
  const activePeriodKey = currentPeriodKey(cycleDay);
  const monthExpenses = expenses
    .filter((e) => isInPeriod(e.date, activePeriodKey, cycleDay))
    .reduce((sum, e) => sum + e.amount, 0);

  const overdueMeds = medications.flatMap((m) => getOverdueDoses(m));
  const pendingTodos = todoLists.reduce(
    (sum, l) => sum + l.items.filter((i) => !i.done).length,
    0
  );

  const activeMeds = medications.filter(
    (m) => m.doses.some((d) => !d.takenAt && !d.skipped)
  );

  const nextDoseMed = activeMeds.length > 0 ? activeMeds[0] : null;
  const nextDose = nextDoseMed ? getNextDose(nextDoseMed) : null;

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView style={styles.container}>
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

        {overdueMeds.length > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/medications')}
          >
            <Ionicons name="alert-circle" size={20} color={Colors.danger} />
            <Text style={styles.alertText}>
              {overdueMeds.length} dose{overdueMeds.length > 1 ? 's' : ''} em atraso
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.danger} />
          </TouchableOpacity>
        )}

        {nextDoseMed && nextDose && (
          <View style={styles.nextDoseCard}>
            <View style={styles.nextDoseLeft}>
              <Text style={styles.nextDoseLabel}>Próxima dose</Text>
              <Text style={styles.nextDoseName}>{nextDoseMed.name}</Text>
              <Text style={styles.nextDoseTime}>{formatDateTime(nextDose.scheduledAt)}</Text>
            </View>
            <View style={[styles.nextDoseIcon, { backgroundColor: nextDoseMed.color }]}>
              <Ionicons name="medical" size={24} color="#fff" />
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>Atalhos</Text>

        <View style={styles.grid}>
          {([
            {
              label: 'Remédios',
              icon: 'medical' as IoniconName,
              color: Colors.primary,
              bg: Colors.primaryLighter,
              route: '/(tabs)/medications',
              count: activeMeds.length,
              subtitle: 'ativos',
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
                    <Text style={styles.listPreviewSub}>
                      {done}/{total} concluídos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  alertText: { flex: 1, color: Colors.danger, fontWeight: '600', fontSize: 14 },
  nextDoseCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  nextDoseLeft: { flex: 1 },
  nextDoseLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  nextDoseName: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: 2 },
  nextDoseTime: { fontSize: 14, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  nextDoseIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
});
