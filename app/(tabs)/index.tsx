import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { DraggableWidgetList } from '../../components/home/DraggableWidgetList';
import { WidgetPickerModal } from '../../components/home/WidgetPickerModal';
import { getItem, setItem, KEYS } from '../../lib/storage';
import {
  Routine, RoutineLog, TodoList, Note, Expense, Goal,
  HomeWidget,
} from '../../lib/types';

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const DEFAULT_WIDGETS: HomeWidget[] = [
  { id: 'default-1', type: 'routines_today', size: 'medium', order: 0 },
  { id: 'default-2', type: 'expense_summary', size: 'medium', order: 1 },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  const [widgets, setWidgets] = useState<HomeWidget[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
        const [saved, rts, logs, todos, nts, exps, day, gls] = await Promise.all([
          getItem<HomeWidget[]>(KEYS.HOME_WIDGETS),
          getItem<Routine[]>(KEYS.ROUTINES),
          getItem<RoutineLog[]>(KEYS.ROUTINE_LOGS),
          getItem<TodoList[]>(KEYS.TODO_LISTS),
          getItem<Note[]>(KEYS.NOTES),
          getItem<Expense[]>(KEYS.EXPENSES),
          getItem<number>(KEYS.BILLING_CYCLE_DAY),
          getItem<Goal[]>(KEYS.GOALS),
        ]);
        setWidgets(saved ?? DEFAULT_WIDGETS);
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

  async function saveWidgets(updated: HomeWidget[]) {
    setWidgets(updated);
    await setItem(KEYS.HOME_WIDGETS, updated);
  }

  function handleReorder(newWidgets: HomeWidget[]) {
    saveWidgets(newWidgets);
  }

  function handleDelete(id: string) {
    const updated = widgets
      .filter((w) => w.id !== id)
      .map((w, i) => ({ ...w, order: i }));
    saveWidgets(updated);
  }

  function handleAddWidget(partial: Omit<HomeWidget, 'id' | 'order'>) {
    const newWidget: HomeWidget = {
      ...partial,
      id: makeId(),
      order: widgets.length,
    };
    saveWidgets([...widgets, newWidget]);
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 20 }]}
        scrollEnabled={!isDragging}
      >
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
          <TouchableOpacity
            style={[styles.editBtn, isEditMode && styles.editBtnActive]}
            onPress={() => setIsEditMode((v) => !v)}
          >
            <Ionicons
              name={isEditMode ? 'checkmark' : 'pencil'}
              size={18}
              color={isEditMode ? '#fff' : Colors.primary}
            />
            <Text style={[styles.editBtnText, isEditMode && styles.editBtnTextActive]}>
              {isEditMode ? 'Concluir' : 'Editar'}
            </Text>
          </TouchableOpacity>
        </View>

        {widgets.length === 0 && !isEditMode ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🏠</Text>
            <Text style={styles.emptyTitle}>Sua home está vazia</Text>
            <Text style={styles.emptyText}>Toque em Editar para adicionar widgets personalizados.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setIsEditMode(true)}>
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Personalizar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <DraggableWidgetList
            widgets={widgets}
            isEditMode={isEditMode}
            onReorder={handleReorder}
            onDelete={handleDelete}
            onDragStateChange={setIsDragging}
            routines={routines}
            routineLogs={routineLogs}
            todoLists={todoLists}
            notes={notes}
            goals={goals}
            expenses={expenses}
            cycleDay={cycleDay}
          />
        )}

        {isEditMode && (
          <TouchableOpacity
            style={styles.addWidgetBtn}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={22} color={Colors.primary} />
            <Text style={styles.addWidgetText}>Adicionar widget</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <WidgetPickerModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onAdd={handleAddWidget}
        routines={routines}
        todoLists={todoLists}
        notes={notes}
        goals={goals}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.text },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLighter,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  editBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  editBtnTextActive: { color: '#fff' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textSecondary },
  emptyText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addWidgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: Colors.primaryLighter,
  },
  addWidgetText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
});
