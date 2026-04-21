import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { TodoList, TodoItem } from '../../lib/types';

export default function TodoListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<TodoList | null>(null);
  const [allLists, setAllLists] = useState<TodoList[]>([]);
  const [newItem, setNewItem] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const lists = await getItem<TodoList[]>(KEYS.TODO_LISTS);
    const all = lists ?? [];
    setAllLists(all);
    setList(all.find((l) => l.id === id) ?? null);
  }

  async function persist(updated: TodoList) {
    const updatedAll = allLists.map((l) => (l.id === id ? updated : l));
    await setItem(KEYS.TODO_LISTS, updatedAll);
    setAllLists(updatedAll);
    setList(updated);
  }

  function addItem() {
    if (!newItem.trim() || !list) return;
    const item: TodoItem = {
      id: Date.now().toString(),
      text: newItem.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    persist({ ...list, items: [...list.items, item] });
    setNewItem('');
  }

  function toggleItem(itemId: string) {
    if (!list) return;
    persist({
      ...list,
      items: list.items.map((i) =>
        i.id === itemId ? { ...i, done: !i.done } : i
      ),
    });
  }

  function deleteItem(itemId: string) {
    if (!list) return;
    persist({ ...list, items: list.items.filter((i) => i.id !== itemId) });
  }

  function clearDone() {
    if (!list) return;
    Alert.alert('Limpar concluídos', 'Remover todos os itens marcados?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        onPress: () => persist({ ...list, items: list.items.filter((i) => !i.done) }),
      },
    ]);
  }

  if (!list) return null;

  const pending = list.items.filter((i) => !i.done);
  const done = list.items.filter((i) => i.done);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: list.color }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.icon}>{list.icon}</Text>
          <Text style={styles.title}>{list.title}</Text>
        </View>
        {done.length > 0 && (
          <TouchableOpacity onPress={clearDone} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {list.items.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Lista vazia. Adicione o primeiro item!</Text>
            </View>
          )}

          {pending.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              onPress={() => toggleItem(item.id)}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={[styles.checkbox, { borderColor: list.color }]}
                onPress={() => toggleItem(item.id)}
              >
              </TouchableOpacity>
              <Text style={styles.itemText}>{item.text}</Text>
              <TouchableOpacity onPress={() => deleteItem(item.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {done.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Concluídos ({done.length})</Text>
              {done.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.item, styles.itemDone]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, styles.checkboxDone, { backgroundColor: list.color, borderColor: list.color }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                  <Text style={styles.itemTextDone}>{item.text}</Text>
                  <TouchableOpacity onPress={() => deleteItem(item.id)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Adicionar item..."
            placeholderTextColor={Colors.textTertiary}
            value={newItem}
            onChangeText={setNewItem}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: list.color }]}
            onPress={addItem}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 3,
    gap: 12,
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 22 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  scroll: { padding: 20, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, textAlign: 'center' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginTop: 20,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemDone: { opacity: 0.6 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { borderWidth: 0 },
  itemText: { flex: 1, fontSize: 15, color: Colors.text },
  itemTextDone: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addItemBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
