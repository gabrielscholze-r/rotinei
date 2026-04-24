import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import {
  Expense, ExpenseCategory, CustomCategory, Goal, GoalTransaction,
  CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS,
} from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import {
  currentPeriodKey, periodLabel, prevPeriodKey, nextPeriodKey, isInPeriod,
} from '../../lib/billing';
import { useRouter } from 'expo-router';

const BUILT_IN_CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

const EMOJI_LIST = [
  '🍕','🍔','🍜','🍣','🍱','☕','🧃','🥤','🍺','🥩',
  '🥗','🍰','🍦','🌮','🥐','🛒','🛍️','🧴','💊','🏥',
  '💉','🩺','🏋️','🧘','🚗','🚌','🚇','✈️','🛵','🚲',
  '⛽','🅿️','🎬','🎮','🎵','📺','🎭','🎲','⚽','🏀',
  '🏠','💡','🔧','🛋️','🧹','📦','👕','👟','👜','💄',
  '📚','🖊️','🎓','💻','📱','💰','💳','💸','🏦','📊',
  '🎁','🔑','🐾','🌿','🌎','🚿','🛁','🪴','🧸','🎀',
  '🏖️','🚀','🎯','🏆','🌟','🎉','🏡','🛺','💎','🛻',
];

const CUSTOM_COLORS = [
  '#F97316','#EF4444','#EC4899','#8B5CF6',
  '#3B82F6','#14B8A6','#10B981','#F59E0B',
  '#6B7280','#0EA5E9',
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatAmountInput(text: string): string {
  const digits = text.replace(/\D/g, '');
  if (!digits) return '';
  const number = parseInt(digits, 10);
  return (number / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseAmountInput(text: string): number {
  return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0;
}

const MONTH_ABBRS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00Z');
  const day = d.getUTCDate().toString().padStart(2, '0');
  const month = MONTH_ABBRS[d.getUTCMonth()];
  const year = d.getUTCFullYear().toString().slice(-2);
  return `${day}/${month} ${year}`;
}

function formatDateInput(d: Date): string {
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

interface AddForm {
  description: string;
  amount: string;
  category: string;
  date: Date;
}

const DEFAULT_FORM: AddForm = {
  description: '',
  amount: '',
  category: 'food',
  date: new Date(),
};

interface NewCatForm {
  name: string;
  emoji: string;
  color: string;
}

const DEFAULT_NEW_CAT: NewCatForm = {
  name: '',
  emoji: '🏷️',
  color: CUSTOM_COLORS[0],
};

interface GoalForm {
  name: string;
  emoji: string;
  targetAmount: string;
  deadline: string; // "YYYY-MM-DD" or ""
  color: string;
}

const DEFAULT_GOAL_FORM: GoalForm = {
  name: '',
  emoji: '🎯',
  targetAmount: '',
  deadline: '',
  color: CUSTOM_COLORS[0],
};

interface TransactionForm {
  amount: string;
  note: string;
  type: 'add' | 'withdraw';
}

const DEFAULT_TX_FORM: TransactionForm = {
  amount: '',
  note: '',
  type: 'add',
};

export default function ExpensesScreen() {
  const router = useRouter();
  // Main tab
  const [mainTab, setMainTab] = useState<'gastos' | 'metas'>('gastos');

  // Expenses state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM);
  const [newCatForm, setNewCatForm] = useState<NewCatForm>(DEFAULT_NEW_CAT);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodKey(1));
  const [viewMode, setViewMode] = useState<'list' | 'categories'>('list');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showGoalEmoji, setShowGoalEmoji] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalForm>(DEFAULT_GOAL_FORM);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [txForm, setTxForm] = useState<TransactionForm>(DEFAULT_TX_FORM);
  const [showTxModal, setShowTxModal] = useState(false);
  const [showGoalDeadline, setShowGoalDeadline] = useState(false);
  const [goalDeadlineDate, setGoalDeadlineDate] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const [data, day, cats, goalsData] = await Promise.all([
      getItem<Expense[]>(KEYS.EXPENSES),
      getItem<number>(KEYS.BILLING_CYCLE_DAY),
      getItem<CustomCategory[]>(KEYS.CUSTOM_CATEGORIES),
      getItem<Goal[]>(KEYS.GOALS),
    ]);
    const resolvedDay = day ?? 1;
    setCycleDay(resolvedDay);
    setExpenses(data ?? []);
    setCustomCategories(cats ?? []);
    setSelectedPeriod(currentPeriodKey(resolvedDay));
    setGoals(goalsData ?? []);
  }

  async function saveExpenses(updated: Expense[]) {
    await setItem(KEYS.EXPENSES, updated);
    setExpenses(updated);
  }

  async function saveGoals(updated: Goal[]) {
    await setItem(KEYS.GOALS, updated);
    setGoals(updated);
  }

  async function saveCycleDay(day: number) {
    await setItem(KEYS.BILLING_CYCLE_DAY, day);
    setCycleDay(day);
    setSelectedPeriod(currentPeriodKey(day));
    setShowSettings(false);
  }

  async function createCategory() {
    if (!newCatForm.name.trim()) {
      Alert.alert('Erro', 'Informe um nome para a categoria.');
      return;
    }
    const newCat: CustomCategory = {
      id: `custom_${Date.now()}`,
      name: newCatForm.name.trim(),
      emoji: newCatForm.emoji,
      color: newCatForm.color,
    };
    const updated = [...customCategories, newCat];
    await setItem(KEYS.CUSTOM_CATEGORIES, updated);
    setCustomCategories(updated);
    setForm({ ...form, category: newCat.id });
    setNewCatForm(DEFAULT_NEW_CAT);
    setShowNewCategory(false);
  }

  function getCategoryIcon(cat: string): string {
    if (cat in CATEGORY_ICONS) return CATEGORY_ICONS[cat as ExpenseCategory];
    return customCategories.find((c) => c.id === cat)?.emoji ?? '🏷️';
  }

  function getCategoryLabel(cat: string): string {
    if (cat in CATEGORY_LABELS) return CATEGORY_LABELS[cat as ExpenseCategory];
    return customCategories.find((c) => c.id === cat)?.name ?? cat;
  }

  function getCategoryColor(cat: string): string {
    if (cat in CATEGORY_COLORS) return CATEGORY_COLORS[cat as ExpenseCategory];
    return customCategories.find((c) => c.id === cat)?.color ?? '#6B7280';
  }

  function addExpense() {
    const amount = parseAmountInput(form.amount);
    if (!form.description.trim()) {
      Alert.alert('Erro', 'Informe uma descrição.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Valor inválido.');
      return;
    }
    const expense: Expense = {
      id: Date.now().toString(),
      description: form.description.trim(),
      amount,
      category: form.category,
      date: new Date(Date.UTC(form.date.getFullYear(), form.date.getMonth(), form.date.getDate(), 12, 0, 0)).toISOString(),
      createdAt: new Date().toISOString(),
    };
    saveExpenses([expense, ...expenses]);
    setForm({ ...DEFAULT_FORM, date: new Date() });
    setShowAdd(false);
  }

  function deleteExpense(id: string) {
    Alert.alert('Excluir gasto', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveExpenses(expenses.filter((e) => e.id !== id)) },
    ]);
  }

  // ── Goals ────────────────────────────────────────────────────────────────

  function addGoal() {
    if (!goalForm.name.trim()) {
      Alert.alert('Erro', 'Informe o nome da meta.');
      return;
    }
    const target = parseAmountInput(goalForm.targetAmount);
    if (isNaN(target) || target <= 0) {
      Alert.alert('Erro', 'Informe um valor alvo válido.');
      return;
    }
    const goal: Goal = {
      id: Date.now().toString(),
      name: goalForm.name.trim(),
      emoji: goalForm.emoji,
      targetAmount: target,
      currentAmount: 0,
      deadline: goalForm.deadline || undefined,
      color: goalForm.color,
      transactions: [],
      createdAt: new Date().toISOString(),
    };
    saveGoals([goal, ...goals]);
    setGoalForm(DEFAULT_GOAL_FORM);
    setShowAddGoal(false);
  }

  function deleteGoal(id: string) {
    Alert.alert('Excluir meta', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveGoals(goals.filter((g) => g.id !== id)) },
    ]);
  }

  function openTransaction(goal: Goal, type: 'add' | 'withdraw') {
    setSelectedGoal(goal);
    setTxForm({ amount: '', note: '', type });
    setShowTxModal(true);
  }

  function addTransaction() {
    if (!selectedGoal) return;
    const amount = parseAmountInput(txForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erro', 'Informe um valor válido.');
      return;
    }
    if (txForm.type === 'withdraw' && amount > selectedGoal.currentAmount) {
      Alert.alert('Erro', 'Saldo insuficiente na meta.');
      return;
    }
    const delta = txForm.type === 'add' ? amount : -amount;
    const tx: GoalTransaction = {
      id: Date.now().toString(),
      amount: delta,
      note: txForm.note.trim() || undefined,
      date: new Date().toISOString(),
    };
    const updated = goals.map((g) => {
      if (g.id !== selectedGoal.id) return g;
      return {
        ...g,
        currentAmount: g.currentAmount + delta,
        transactions: [tx, ...g.transactions],
      };
    });
    saveGoals(updated);
    setShowTxModal(false);
    setSelectedGoal(null);
  }

  const periodExpenses = expenses.filter((e) => isInPeriod(e.date, selectedPeriod, cycleDay));
  const total = periodExpenses.reduce((s, e) => s + e.amount, 0);

  const allCategoryKeys = [
    ...BUILT_IN_CATEGORIES,
    ...customCategories.map((c) => c.id),
  ];

  const byCategory = allCategoryKeys.map((cat) => {
    const items = periodExpenses.filter((e) => e.category === cat);
    return { cat, total: items.reduce((s, e) => s + e.amount, 0), count: items.length };
  }).filter((c) => c.count > 0).sort((a, b) => b.total - a.total);

  const filteredExpenses = categoryFilter
    ? periodExpenses.filter((e) => e.category === categoryFilter)
    : periodExpenses;

  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    const diff = sortBy === 'date'
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : b.amount - a.amount;
    return sortOrder === 'desc' ? diff : -diff;
  });

  const isCurrentPeriod = selectedPeriod === currentPeriodKey(cycleDay);

  const totalGoalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{mainTab === 'gastos' ? 'Gastos' : 'Metas'}</Text>
        {mainTab === 'gastos' ? (
          <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Main tab toggle */}
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'gastos' && styles.mainTabActive]}
          onPress={() => setMainTab('gastos')}
        >
          <Ionicons name="wallet-outline" size={15} color={mainTab === 'gastos' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.mainTabText, mainTab === 'gastos' && styles.mainTabTextActive]}>Gastos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'metas' && styles.mainTabActive]}
          onPress={() => setMainTab('metas')}
        >
          <Ionicons name="trophy-outline" size={15} color={mainTab === 'metas' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.mainTabText, mainTab === 'metas' && styles.mainTabTextActive]}>Metas</Text>
        </TouchableOpacity>
      </View>

      {mainTab === 'gastos' ? (
        <>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => { setSelectedPeriod(prevPeriodKey(selectedPeriod, cycleDay)); setCategoryFilter(null); }} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{periodLabel(selectedPeriod, cycleDay)}</Text>
            <TouchableOpacity onPress={() => { setSelectedPeriod(nextPeriodKey(selectedPeriod, cycleDay)); setCategoryFilter(null); }} hitSlop={8} disabled={isCurrentPeriod}>
              <Ionicons name="chevron-forward" size={22} color={isCurrentPeriod ? Colors.textTertiary : Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total do período</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            <Text style={styles.totalCount}>{periodExpenses.length} lançamentos</Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, viewMode === 'list' && styles.tabActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[styles.tabText, viewMode === 'list' && styles.tabTextActive]}>Lista</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === 'categories' && styles.tabActive]}
              onPress={() => { setViewMode('categories'); setCategoryFilter(null); }}
            >
              <Text style={[styles.tabText, viewMode === 'categories' && styles.tabTextActive]}>Categorias</Text>
            </TouchableOpacity>
          </View>

          {viewMode === 'list' && (
            <View style={styles.sortRow}>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'date' && styles.sortBtnActive]}
                onPress={() => {
                  if (sortBy === 'date') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  else { setSortBy('date'); setSortOrder('desc'); }
                }}
              >
                <Text style={[styles.sortBtnText, sortBy === 'date' && styles.sortBtnTextActive]}>Data</Text>
                {sortBy === 'date' && (
                  <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} color={Colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortBtn, sortBy === 'amount' && styles.sortBtnActive]}
                onPress={() => {
                  if (sortBy === 'amount') setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  else { setSortBy('amount'); setSortOrder('desc'); }
                }}
              >
                <Text style={[styles.sortBtnText, sortBy === 'amount' && styles.sortBtnTextActive]}>Valor</Text>
                {sortBy === 'amount' && (
                  <Ionicons name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'} size={12} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {viewMode === 'list' && categoryFilter && (
              <TouchableOpacity style={styles.filterChip} onPress={() => setCategoryFilter(null)}>
                <Text style={styles.filterChipText}>
                  {getCategoryIcon(categoryFilter)} {getCategoryLabel(categoryFilter)}
                </Text>
                <Ionicons name="close-circle" size={16} color={Colors.primary} />
              </TouchableOpacity>
            )}

            {viewMode === 'list' && filteredExpenses.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhum gasto</Text>
                <Text style={styles.emptySub}>{categoryFilter ? 'Sem gastos nesta categoria' : 'Toque em + para registrar'}</Text>
              </View>
            )}
            {viewMode === 'categories' && byCategory.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="wallet-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhum gasto</Text>
                <Text style={styles.emptySub}>Toque em + para registrar</Text>
              </View>
            )}

            {viewMode === 'list' &&
              sortedExpenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseRow}>
                    <View style={[styles.expenseIcon, { backgroundColor: getCategoryColor(expense.category) + '20' }]}>
                      <Text style={{ fontSize: 20 }}>{getCategoryIcon(expense.category)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseDesc}>{expense.description}</Text>
                      <Text style={styles.expenseCat}>
                        {getCategoryLabel(expense.category)} · {formatDate(expense.date)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                      <TouchableOpacity onPress={() => deleteExpense(expense.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={14} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

            {viewMode === 'categories' && byCategory.map(({ cat, total: catTotal, count }) => {
              const pct = total > 0 ? catTotal / total : 0;
              return (
                <TouchableOpacity
                  key={cat}
                  style={styles.categoryRow}
                  onPress={() => { setCategoryFilter(cat); setViewMode('list'); }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(cat) + '20' }]}>
                    <Text style={{ fontSize: 20 }}>{getCategoryIcon(cat)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{getCategoryLabel(cat)}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.categoryValue, { color: getCategoryColor(cat) }]}>{formatCurrency(catTotal)}</Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
                      </View>
                    </View>
                    <Text style={styles.categorySub}>{count} lançamentos · {(pct * 100).toFixed(0)}%</Text>
                    <View style={styles.catBar}>
                      <View style={[styles.catBarFill, { width: `${pct * 100}%`, backgroundColor: getCategoryColor(cat) }]} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      ) : (
        /* ── Goals section ── */
        <>
          <View style={styles.goalsSummaryCard}>
            <Text style={styles.goalsSummaryLabel}>Total economizado</Text>
            <Text style={styles.goalsSummaryValue}>{formatCurrency(totalGoalSaved)}</Text>
            <Text style={styles.goalsSummaryCount}>{goals.length} {goals.length === 1 ? 'meta' : 'metas'}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {goals.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="trophy-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhuma meta</Text>
                <Text style={styles.emptySub}>Toque em + para criar sua primeira meta</Text>
              </View>
            )}
            {goals.map((goal) => {
              const progress = goal.targetAmount > 0 ? Math.min(goal.currentAmount / goal.targetAmount, 1) : 0;
              const pct = Math.round(progress * 100);
              const finished = pct >= 100;
              const remaining = goal.deadline ? daysUntil(goal.deadline) : null;
              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalCardHeader}>
                    <View style={[styles.goalEmojiCircle, { backgroundColor: goal.color + '20' }]}>
                      <Text style={{ fontSize: 26 }}>{goal.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalAmounts}>
                        {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                      </Text>
                      {goal.deadline && remaining !== null && (
                        <Text style={[styles.goalDeadline, remaining < 0 && { color: Colors.danger }]}>
                          {remaining < 0
                            ? 'Prazo vencido'
                            : remaining === 0
                            ? 'Vence hoje'
                            : `${remaining} dias restantes`}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => deleteGoal(goal.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.goalBarTrack}>
                    <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: finished ? Colors.success : goal.color }]} />
                  </View>
                  <View style={styles.goalPctRow}>
                    {finished ? (
                      <Text style={styles.goalFinished}>🎉 Meta concluída!</Text>
                    ) : (
                      <Text style={styles.goalPct}>{pct}% concluído</Text>
                    )}
                  </View>

                  {/* Action buttons */}
                  {!finished && (
                    <View style={styles.goalActions}>
                      <TouchableOpacity
                        style={[styles.goalActionBtn, { backgroundColor: goal.color }]}
                        onPress={() => openTransaction(goal, 'add')}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.goalActionBtnText}>Adicionar</Text>
                      </TouchableOpacity>
                      {goal.currentAmount > 0 && (
                        <TouchableOpacity
                          style={[styles.goalActionBtn, styles.goalActionBtnOutline, { borderColor: goal.color }]}
                          onPress={() => openTransaction(goal, 'withdraw')}
                        >
                          <Ionicons name="remove" size={16} color={goal.color} />
                          <Text style={[styles.goalActionBtnText, { color: goal.color }]}>Retirar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Last transactions */}
                  {goal.transactions.length > 0 && (
                    <View style={styles.txList}>
                      {goal.transactions.slice(0, 3).map((tx) => (
                        <View key={tx.id} style={styles.txRow}>
                          <Ionicons
                            name={tx.amount > 0 ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={16}
                            color={tx.amount > 0 ? Colors.success : Colors.danger}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.txNote}>{tx.note || (tx.amount > 0 ? 'Depósito' : 'Retirada')}</Text>
                            <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                          </View>
                          <Text style={[styles.txAmount, { color: tx.amount > 0 ? Colors.success : Colors.danger }]}>
                            {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => mainTab === 'metas' ? setShowAddGoal(true) : setShowAdd(true)}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Modal: Novo gasto */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo gasto</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Descrição *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Almoço no restaurante"
              placeholderTextColor={Colors.textTertiary}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />

            <Text style={styles.label}>Valor (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: formatAmountInput(v) })}
            />

            <Text style={styles.label}>Data</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: Colors.text, fontSize: 16 }}>{formatDateInput(form.date)}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.date}
                mode="date"
                display="default"
                onChange={(_, selected) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selected) setForm({ ...form, date: selected });
                }}
              />
            )}

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {BUILT_IN_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catBtn, form.category === cat && { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[styles.catBtnText, form.category === cat && { color: '#fff' }]}>{CATEGORY_LABELS[cat]}</Text>
                </TouchableOpacity>
              ))}
              {customCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catBtn, form.category === cat.id && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setForm({ ...form, category: cat.id })}
                >
                  <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                  <Text style={[styles.catBtnText, form.category === cat.id && { color: '#fff' }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.catBtnNew} onPress={() => setShowNewCategory(true)}>
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.catBtnNewText}>Nova</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={addExpense}>
              <Text style={styles.saveBtnText}>Adicionar gasto</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal: Nova categoria */}
      <Modal visible={showNewCategory} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova categoria</Text>
            <TouchableOpacity onPress={() => setShowNewCategory(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Pets, Academia..."
              placeholderTextColor={Colors.textTertiary}
              value={newCatForm.name}
              onChangeText={(v) => setNewCatForm({ ...newCatForm, name: v })}
            />

            <Text style={styles.label}>Emoji</Text>
            <View style={styles.emojiPreviewRow}>
              <View style={[styles.emojiPreviewCircle, { backgroundColor: newCatForm.color + '30' }]}>
                <Text style={styles.emojiPreviewText}>{newCatForm.emoji}</Text>
              </View>
              <Text style={styles.emojiPreviewName}>{newCatForm.name || 'Nova categoria'}</Text>
            </View>
            <View style={styles.emojiGrid}>
              {EMOJI_LIST.map((emoji, idx) => (
                <TouchableOpacity
                  key={`${emoji}-${idx}`}
                  style={[styles.emojiBtn, newCatForm.emoji === emoji && { backgroundColor: newCatForm.color + '30', borderColor: newCatForm.color }]}
                  onPress={() => setNewCatForm({ ...newCatForm, emoji })}
                >
                  <Text style={styles.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {CUSTOM_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, newCatForm.color === color && styles.colorBtnActive]}
                  onPress={() => setNewCatForm({ ...newCatForm, color })}
                >
                  {newCatForm.color === color && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={createCategory}>
              <Text style={styles.saveBtnText}>Criar categoria</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal: Configurações */}
      <Modal visible={showSettings} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ciclo de cobrança</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Dia de início do ciclo</Text>
            <Text style={styles.settingsHint}>
              Dia 1 usa o mês calendário. Outro dia cria um período personalizado (ex: dia 6 = "6 abr – 5 mai").
            </Text>
            <View style={styles.dayGrid}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[styles.dayBtn, cycleDay === day && styles.dayBtnActive]}
                  onPress={() => saveCycleDay(day)}
                >
                  <Text style={[styles.dayBtnText, cycleDay === day && styles.dayBtnTextActive]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal: Nova meta */}
      <Modal visible={showAddGoal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova meta</Text>
            <TouchableOpacity onPress={() => { setShowAddGoal(false); setGoalForm(DEFAULT_GOAL_FORM); setShowGoalEmoji(false); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

            <Text style={styles.label}>Ícone</Text>
            <TouchableOpacity style={styles.emojiPickerBtn} onPress={() => setShowGoalEmoji(!showGoalEmoji)}>
              <Text style={{ fontSize: 26 }}>{goalForm.emoji}</Text>
              <Text style={styles.emojiPickerHint}>Toque para escolher</Text>
              <Ionicons name={showGoalEmoji ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            {showGoalEmoji && (
              <View style={styles.emojiGrid}>
                {EMOJI_LIST.map((emoji, idx) => (
                  <TouchableOpacity
                    key={`${emoji}-${idx}`}
                    style={[styles.emojiBtn, goalForm.emoji === emoji && { backgroundColor: goalForm.color + '30', borderColor: goalForm.color }]}
                    onPress={() => { setGoalForm({ ...goalForm, emoji }); setShowGoalEmoji(false); }}
                  >
                    <Text style={styles.emojiBtnText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Viagem, Notebook, Reserva..."
              placeholderTextColor={Colors.textTertiary}
              value={goalForm.name}
              onChangeText={(v) => setGoalForm({ ...goalForm, name: v })}
            />

            <Text style={styles.label}>Valor alvo (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={goalForm.targetAmount}
              onChangeText={(v) => setGoalForm({ ...goalForm, targetAmount: formatAmountInput(v) })}
            />

            <Text style={styles.label}>Prazo (opcional)</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowGoalDeadline(true)}>
              <Text style={{ color: goalForm.deadline ? Colors.text : Colors.textTertiary, fontSize: 16 }}>
                {goalForm.deadline ? formatDate(goalForm.deadline + 'T12:00:00Z') : 'Sem prazo definido'}
              </Text>
            </TouchableOpacity>
            {showGoalDeadline && (
              <DateTimePicker
                value={goalDeadlineDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowGoalDeadline(Platform.OS === 'ios');
                  if (selected) {
                    setGoalDeadlineDate(selected);
                    const y = selected.getFullYear();
                    const m = (selected.getMonth() + 1).toString().padStart(2, '0');
                    const d = selected.getDate().toString().padStart(2, '0');
                    setGoalForm({ ...goalForm, deadline: `${y}-${m}-${d}` });
                  }
                }}
              />
            )}
            {goalForm.deadline && (
              <TouchableOpacity onPress={() => setGoalForm({ ...goalForm, deadline: '' })} style={{ marginTop: 6 }}>
                <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover prazo</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {CUSTOM_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, goalForm.color === color && styles.colorBtnActive]}
                  onPress={() => setGoalForm({ ...goalForm, color })}
                >
                  {goalForm.color === color && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={addGoal}>
              <Text style={styles.saveBtnText}>Criar meta</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Modal: Transação de meta */}
      <Modal visible={showTxModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {txForm.type === 'add' ? 'Adicionar dinheiro' : 'Retirar dinheiro'}
            </Text>
            <TouchableOpacity onPress={() => setShowTxModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            {selectedGoal && (
              <View style={styles.txGoalInfo}>
                <Text style={{ fontSize: 22 }}>{selectedGoal.emoji}</Text>
                <View>
                  <Text style={styles.txGoalName}>{selectedGoal.name}</Text>
                  <Text style={styles.txGoalBalance}>Saldo: {formatCurrency(selectedGoal.currentAmount)}</Text>
                </View>
              </View>
            )}

            <Text style={styles.label}>Valor (R$) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              value={txForm.amount}
              onChangeText={(v) => setTxForm({ ...txForm, amount: formatAmountInput(v) })}
            />

            <Text style={styles.label}>Observação (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário, freela..."
              placeholderTextColor={Colors.textTertiary}
              value={txForm.note}
              onChangeText={(v) => setTxForm({ ...txForm, note: v })}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: txForm.type === 'add' ? Colors.success : Colors.danger }]}
              onPress={addTransaction}
            >
              <Text style={styles.saveBtnText}>
                {txForm.type === 'add' ? 'Confirmar depósito' : 'Confirmar retirada'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '800', color: Colors.text },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.borderLight,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  mainTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  mainTabActive: { backgroundColor: Colors.card },
  mainTabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  mainTabTextActive: { color: Colors.primary },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  monthLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  totalCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: { fontSize: 13, color: '#BFDBFE', fontWeight: '500' },
  totalValue: { fontSize: 36, fontWeight: '800', color: '#fff', marginTop: 4 },
  totalCount: { fontSize: 12, color: '#93C5FD', marginTop: 4 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.card },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.primary },
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseDesc: { fontSize: 15, fontWeight: '600', color: Colors.text },
  expenseCat: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: Colors.text },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  categoryName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  categoryValue: { fontSize: 15, fontWeight: '700' },
  categorySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  catBar: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
  },
  catBarFill: { height: '100%', borderRadius: 2 },
  sortRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  sortBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  sortBtnTextActive: { color: Colors.primary },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLighter,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  // Goals
  goalsSummaryCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  goalsSummaryLabel: { fontSize: 13, color: '#BFDBFE', fontWeight: '500' },
  goalsSummaryValue: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 4 },
  goalsSummaryCount: { fontSize: 12, color: '#93C5FD', marginTop: 4 },
  goalCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  goalEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  goalAmounts: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  goalDeadline: { fontSize: 12, color: Colors.warning, marginTop: 2, fontWeight: '500' },
  goalBarTrack: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  goalBarFill: { height: '100%', borderRadius: 4 },
  goalPctRow: { marginBottom: 12 },
  goalPct: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  goalFinished: { fontSize: 13, fontWeight: '700', color: Colors.success },
  goalActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  goalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
  },
  goalActionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  goalActionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  txList: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    gap: 8,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txNote: { fontSize: 13, fontWeight: '500', color: Colors.text },
  txDate: { fontSize: 11, color: Colors.textTertiary },
  txAmount: { fontSize: 13, fontWeight: '700' },
  txGoalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 4,
  },
  txGoalName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  txGoalBalance: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  // Modals
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalScroll: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  catBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  catBtnNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  catBtnNewText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  settingsHint: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    width: 56,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  dayBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  dayBtnTextActive: { color: '#fff' },
  emojiPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiPreviewCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: 26 },
  emojiPreviewName: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  emojiBtnText: { fontSize: 22 },
  emojiPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  emojiPickerHint: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBtnActive: { borderWidth: 3, borderColor: Colors.text },
});
