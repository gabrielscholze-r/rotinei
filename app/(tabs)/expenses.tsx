import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import {
  Expense, ExpenseCategory,
  CATEGORY_LABELS, CATEGORY_ICONS, CATEGORY_COLORS,
} from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface AddForm {
  description: string;
  amount: string;
  category: ExpenseCategory;
  date: string;
}

const DEFAULT_FORM: AddForm = {
  description: '',
  amount: '',
  category: 'food',
  date: new Date().toISOString().split('T')[0],
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [viewMode, setViewMode] = useState<'list' | 'categories'>('list');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const data = await getItem<Expense[]>(KEYS.EXPENSES);
    setExpenses(data ?? []);
  }

  async function saveExpenses(updated: Expense[]) {
    await setItem(KEYS.EXPENSES, updated);
    setExpenses(updated);
  }

  function addExpense() {
    const amount = parseFloat(form.amount.replace(',', '.'));
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
      date: new Date(form.date + 'T12:00:00').toISOString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [expense, ...expenses];
    saveExpenses(updated);
    setForm({ ...DEFAULT_FORM, date: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
  }

  function deleteExpense(id: string) {
    Alert.alert('Excluir gasto', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveExpenses(expenses.filter((e) => e.id !== id)) },
    ]);
  }

  const allMonths = Array.from(new Set(expenses.map((e) => monthKey(new Date(e.date))))).sort().reverse();
  if (!allMonths.includes(selectedMonth)) {
    allMonths.unshift(selectedMonth);
  }

  const monthExpenses = expenses.filter((e) => monthKey(new Date(e.date)) === selectedMonth);
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = CATEGORIES.map((cat) => {
    const items = monthExpenses.filter((e) => e.category === cat);
    return { cat, total: items.reduce((s, e) => s + e.amount, 0), count: items.length };
  }).filter((c) => c.count > 0).sort((a, b) => b.total - a.total);

  function prevMonth() {
    const idx = allMonths.indexOf(selectedMonth);
    if (idx < allMonths.length - 1) setSelectedMonth(allMonths[idx + 1]);
  }

  function nextMonth() {
    const idx = allMonths.indexOf(selectedMonth);
    if (idx > 0) setSelectedMonth(allMonths[idx - 1]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gastos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel(selectedMonth)}</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total do mês</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        <Text style={styles.totalCount}>{monthExpenses.length} lançamentos</Text>
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
          onPress={() => setViewMode('categories')}
        >
          <Text style={[styles.tabText, viewMode === 'categories' && styles.tabTextActive]}>Categorias</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {monthExpenses.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhum gasto</Text>
            <Text style={styles.emptySub}>Toque em + para registrar</Text>
          </View>
        )}

        {viewMode === 'list' &&
          monthExpenses
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={[styles.expenseIcon, { backgroundColor: CATEGORY_COLORS[expense.category] + '20' }]}>
                  <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[expense.category]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseDesc}>{expense.description}</Text>
                  <Text style={styles.expenseCat}>
                    {CATEGORY_LABELS[expense.category]} · {new Date(expense.date).toLocaleDateString('pt-BR')}
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

        {viewMode === 'categories' && (
          <>
            {byCategory.map(({ cat, total: catTotal, count }) => {
              const pct = total > 0 ? catTotal / total : 0;
              return (
                <View key={cat} style={styles.categoryRow}>
                  <View style={[styles.categoryIcon, { backgroundColor: CATEGORY_COLORS[cat] + '20' }]}>
                    <Text style={{ fontSize: 20 }}>{CATEGORY_ICONS[cat]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{CATEGORY_LABELS[cat]}</Text>
                      <Text style={[styles.categoryValue, { color: CATEGORY_COLORS[cat] }]}>
                        {formatCurrency(catTotal)}
                      </Text>
                    </View>
                    <Text style={styles.categorySub}>{count} lançamentos · {(pct * 100).toFixed(0)}%</Text>
                    <View style={styles.catBar}>
                      <View style={[styles.catBarFill, { width: `${pct * 100}%`, backgroundColor: CATEGORY_COLORS[cat] }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

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
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(v) => setForm({ ...form, amount: v })}
            />

            <Text style={styles.label}>Data</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={Colors.textTertiary}
              value={form.date}
              onChangeText={(v) => setForm({ ...form, date: v })}
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catBtn,
                    form.category === cat && {
                      backgroundColor: CATEGORY_COLORS[cat],
                      borderColor: CATEGORY_COLORS[cat],
                    },
                  ]}
                  onPress={() => setForm({ ...form, category: cat })}
                >
                  <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[cat]}</Text>
                  <Text style={[
                    styles.catBtnText,
                    form.category === cat && { color: '#fff' },
                  ]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={addExpense}>
              <Text style={styles.saveBtnText}>Adicionar gasto</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
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
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
