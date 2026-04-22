import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { TodoList } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const LIST_COLORS = Colors.listColors;
const LIST_ICONS = ['🛒', '🏠', '💼', '🏃', '📚', '🎯', '🍔', '💊', '🎁', '✈️', '🐾', '🌿'];

export default function TodosScreen() {
  const router = useRouter();
  const [lists, setLists] = useState<TodoList[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedIcon, setSelectedIcon] = useState(0);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const data = await getItem<TodoList[]>(KEYS.TODO_LISTS);
    setLists(data ?? []);
  }

  async function saveLists(updated: TodoList[]) {
    await setItem(KEYS.TODO_LISTS, updated);
    setLists(updated);
  }

  function createList() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe um nome para a lista.');
      return;
    }
    const newList: TodoList = {
      id: Date.now().toString(),
      title: name.trim(),
      icon: LIST_ICONS[selectedIcon],
      color: LIST_COLORS[selectedColor],
      items: [],
      createdAt: new Date().toISOString(),
    };
    saveLists([newList, ...lists]);
    setName('');
    setSelectedColor(0);
    setSelectedIcon(0);
    setShowAdd(false);
  }

  function deleteList(id: string) {
    Alert.alert('Excluir lista', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveLists(lists.filter((l) => l.id !== id)) },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Listas</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {lists.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="list-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhuma lista</Text>
            <Text style={styles.emptySub}>Toque em + para criar sua primeira lista</Text>
          </View>
        )}

        <View style={styles.grid}>
          {lists.map((list) => {
            const done = list.items.filter((i) => i.done).length;
            const total = list.items.length;
            const pct = total > 0 ? done / total : 0;
            return (
              <TouchableOpacity
                key={list.id}
                style={[styles.listCard, { borderTopColor: list.color, borderTopWidth: 4 }]}
                onPress={() => router.push(`/todos/${list.id}` as any)}
                activeOpacity={0.8}
              >
                <View style={styles.listCardHeader}>
                  <Text style={styles.listIcon}>{list.icon}</Text>
                  <TouchableOpacity onPress={() => deleteList(list.id)} hitSlop={8}>
                    <Ionicons name="ellipsis-vertical" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.listTitle}>{list.title}</Text>
                <Text style={styles.listSub}>
                  {total === 0 ? 'Vazia' : `${done}/${total} itens`}
                </Text>
                {total > 0 && (
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pct * 100}%`, backgroundColor: list.color },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova lista</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome da lista *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Compras do mês"
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {LIST_ICONS.map((icon, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.iconBtn, selectedIcon === i && styles.iconBtnSelected]}
                    onPress={() => setSelectedIcon(i)}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {LIST_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === i && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(i)}
                >
                  {selectedColor === i && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={createList}>
              <Text style={styles.saveBtnText}>Criar lista</Text>
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
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
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
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listCard: {
    width: '47%',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  listIcon: { fontSize: 26 },
  listTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  listSub: { fontSize: 12, color: Colors.textSecondary },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', borderRadius: 2 },
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
  iconRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSelected: { backgroundColor: Colors.primaryLight },
  iconText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
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
