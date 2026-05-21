import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { TodoList, TodoItem, TodoGroup } from '../../lib/types';

export default function TodoListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState<TodoList | null>(null);
  const [allLists, setAllLists] = useState<TodoList[]>([]);

  // Group state
  const [todoGroups, setTodoGroups] = useState<TodoGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<TodoGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TodoGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  // Item state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [itemText, setItemText] = useState('');

  // Speed dial
  const [showFabMenu, setShowFabMenu] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [lists, groups] = await Promise.all([
      getItem<TodoList[]>(KEYS.TODO_LISTS),
      getItem<TodoGroup[]>(KEYS.TODO_GROUPS),
    ]);
    const all = lists ?? [];
    setAllLists(all);
    setList(all.find((l) => l.id === id) ?? null);
    setTodoGroups((groups ?? []).filter(g => g.listId === id));
  }

  async function persist(updated: TodoList) {
    const updatedAll = allLists.map((l) => (l.id === id ? updated : l));
    await setItem(KEYS.TODO_LISTS, updatedAll);
    setAllLists(updatedAll);
    setList(updated);
  }

  // ── Group navigation ──────────────────────────────────────────

  function enterGroup(group: TodoGroup) {
    setBreadcrumb(prev => [...prev, group]);
    setCurrentGroupId(group.id);
  }

  function navigateBack() {
    const newCrumb = breadcrumb.slice(0, -1);
    setBreadcrumb(newCrumb);
    setCurrentGroupId(newCrumb.length > 0 ? newCrumb[newCrumb.length - 1].id : null);
  }

  function navigateToCrumb(index: number) {
    if (index < 0) { setBreadcrumb([]); setCurrentGroupId(null); return; }
    const newCrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newCrumb);
    setCurrentGroupId(newCrumb[newCrumb.length - 1].id);
  }

  function openCreateGroupModal() {
    setEditingGroup(null);
    setGroupName('');
    setShowGroupModal(true);
    setShowFabMenu(false);
  }

  function openEditGroupModal(group: TodoGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setShowGroupModal(true);
  }

  async function saveGroup() {
    if (!groupName.trim()) { Alert.alert('Erro', 'Informe um nome para o subgrupo.'); return; }
    const allGroups = await getItem<TodoGroup[]>(KEYS.TODO_GROUPS) ?? [];
    let updatedAll: TodoGroup[];
    if (editingGroup) {
      updatedAll = allGroups.map(g =>
        g.id === editingGroup.id ? { ...g, name: groupName.trim() } : g
      );
      setTodoGroups(updatedAll.filter(g => g.listId === id));
    } else {
      const group: TodoGroup = {
        id: Date.now().toString(),
        name: groupName.trim(),
        listId: id as string,
        parentId: currentGroupId,
        createdAt: new Date().toISOString(),
      };
      updatedAll = [...allGroups, group];
      setTodoGroups(prev => [...prev, group]);
    }
    await setItem(KEYS.TODO_GROUPS, updatedAll);
    setShowGroupModal(false);
    setEditingGroup(null);
    setGroupName('');
  }

  function showGroupActions(group: TodoGroup) {
    Alert.alert(group.name, undefined, [
      { text: 'Editar', onPress: () => openEditGroupModal(group) },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteGroup(group) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function deleteGroup(group: TodoGroup) {
    Alert.alert(`Excluir "${group.name}"`, 'Remove o subgrupo e todos os itens/subgrupos dentro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const allGroups = await getItem<TodoGroup[]>(KEYS.TODO_GROUPS) ?? [];
          const getAllDescendants = (pid: string): string[] => {
            const children = allGroups.filter(g => g.parentId === pid && g.listId === id);
            return [pid, ...children.flatMap(c => getAllDescendants(c.id))];
          };
          const idsToDelete = new Set(getAllDescendants(group.id));
          const updatedAllGroups = allGroups.filter(g => !idsToDelete.has(g.id));
          await setItem(KEYS.TODO_GROUPS, updatedAllGroups);
          setTodoGroups(updatedAllGroups.filter(g => g.listId === id));
          if (list) {
            const updatedItems = list.items.filter(i => !idsToDelete.has(i.groupId ?? ''));
            await persist({ ...list, items: updatedItems });
          }
        },
      },
    ]);
  }

  // ── Item CRUD ─────────────────────────────────────────────────

  function openAddItem() {
    setEditingItem(null);
    setItemText('');
    setShowItemModal(true);
    setShowFabMenu(false);
  }

  function openEditItem(item: TodoItem) {
    setEditingItem(item);
    setItemText(item.text);
    setShowItemModal(true);
  }

  function showItemActions(item: TodoItem) {
    Alert.alert(item.text, undefined, [
      { text: 'Editar', onPress: () => openEditItem(item) },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteItem(item.id) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  function saveItemModal() {
    if (!itemText.trim() || !list) return;
    if (editingItem) {
      persist({
        ...list,
        items: list.items.map(i =>
          i.id === editingItem.id ? { ...i, text: itemText.trim() } : i
        ),
      });
    } else {
      const item: TodoItem = {
        id: Date.now().toString(),
        text: itemText.trim(),
        done: false,
        groupId: currentGroupId,
        createdAt: new Date().toISOString(),
      };
      persist({ ...list, items: [...list.items, item] });
    }
    setShowItemModal(false);
    setItemText('');
    setEditingItem(null);
  }

  function toggleItem(itemId: string) {
    if (!list) return;
    persist({
      ...list,
      items: list.items.map((i) => i.id === itemId ? { ...i, done: !i.done } : i),
    });
  }

  function deleteItem(itemId: string) {
    if (!list) return;
    persist({ ...list, items: list.items.filter((i) => i.id !== itemId) });
  }

  function clearDone() {
    if (!list) return;
    const doneInGroup = list.items.filter(
      i => i.done && (i.groupId ?? null) === currentGroupId
    );
    if (doneInGroup.length === 0) return;
    Alert.alert('Limpar concluídos', 'Remover todos os itens marcados nesta seção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        onPress: () => {
          const idsToRemove = new Set(doneInGroup.map(i => i.id));
          persist({ ...list, items: list.items.filter(i => !idsToRemove.has(i.id)) });
        },
      },
    ]);
  }

  if (!list) return null;

  // ── Derived ───────────────────────────────────────────────────

  const childGroups = todoGroups.filter(g => g.parentId === currentGroupId);
  const currentItems = list.items.filter(i => (i.groupId ?? null) === currentGroupId);
  const pending = currentItems.filter(i => !i.done);
  const done = currentItems.filter(i => i.done);

  function countGroupContent(groupId: string) {
    const itemCount = list!.items.filter(i => i.groupId === groupId).length;
    const subCount = todoGroups.filter(g => g.parentId === groupId).length;
    const parts: string[] = [];
    if (itemCount > 0) parts.push(`${itemCount} item${itemCount !== 1 ? 'ns' : ''}`);
    if (subCount > 0) parts.push(`${subCount} subgrupo${subCount !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' • ') : 'Vazio';
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: list.color }]}>
        <TouchableOpacity
          onPress={() => {
            if (currentGroupId !== null) { navigateBack(); }
            else { router.back(); }
          }}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.icon}>{list.icon}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].name : list.title}
          </Text>
        </View>
        {done.length > 0 && (
          <TouchableOpacity onPress={clearDone} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
        {done.length === 0 && <View style={{ width: 24 }} />}
      </View>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbScroll}
          contentContainerStyle={styles.breadcrumbContent}
        >
          <TouchableOpacity onPress={() => navigateToCrumb(-1)}>
            <Text style={styles.breadcrumbItem}>{list.title}</Text>
          </TouchableOpacity>
          {breadcrumb.map((g, i) => (
            <View key={g.id} style={styles.breadcrumbRow}>
              <Ionicons name="chevron-forward" size={13} color={Colors.textTertiary} />
              <TouchableOpacity onPress={() => navigateToCrumb(i)}>
                <Text style={[
                  styles.breadcrumbItem,
                  i === breadcrumb.length - 1 && { color: list.color, fontWeight: '700' as const },
                ]}>
                  {g.name}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {childGroups.length === 0 && currentItems.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {currentGroupId
                ? 'Subgrupo vazio. Toque em + para adicionar.'
                : 'Lista vazia. Adicione o primeiro item!'}
            </Text>
          </View>
        )}

        {/* Subgroup cards */}
        {childGroups.map(group => (
          <TouchableOpacity
            key={group.id}
            style={[styles.groupCard, { borderLeftColor: list.color }]}
            onPress={() => enterGroup(group)}
            onLongPress={() => showGroupActions(group)}
            activeOpacity={0.8}
          >
            <View style={styles.groupCardLeft}>
              <View style={[styles.groupIcon, { backgroundColor: list.color + '22' }]}>
                <Ionicons name="folder" size={18} color={list.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>{countGroupContent(group.id)}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ))}

        {/* Pending items */}
        {pending.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => toggleItem(item.id)}
            onLongPress={() => showItemActions(item)}
            activeOpacity={0.7}
          >
            <TouchableOpacity
              style={[styles.checkbox, { borderColor: list.color }]}
              onPress={() => toggleItem(item.id)}
            />
            <Text style={styles.itemText}>{item.text}</Text>
            <TouchableOpacity onPress={() => showItemActions(item)} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Done items */}
        {done.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Concluídos ({done.length})</Text>
            {done.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, styles.itemDone]}
                onPress={() => toggleItem(item.id)}
                onLongPress={() => showItemActions(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, styles.checkboxDone, { backgroundColor: list.color, borderColor: list.color }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={styles.itemTextDone}>{item.text}</Text>
                <TouchableOpacity onPress={() => showItemActions(item)} hitSlop={8}>
                  <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Speed dial FAB */}
      {showFabMenu && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        />
      )}
      {showFabMenu && (
        <View style={[styles.fabMenu, { bottom: insets.bottom + 88 }]}>
          <TouchableOpacity style={styles.fabMenuRow} onPress={openCreateGroupModal}>
            <Text style={styles.fabMenuLabel}>Novo subgrupo</Text>
            <View style={[styles.fabMini, { backgroundColor: Colors.textSecondary }]}>
              <Ionicons name="folder" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabMenuRow} onPress={openAddItem}>
            <Text style={styles.fabMenuLabel}>Novo item</Text>
            <View style={[styles.fabMini, { backgroundColor: list.color }]}>
              <Ionicons name="add-circle" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: showFabMenu ? Colors.danger : list.color, bottom: insets.bottom + 24 },
        ]}
        onPress={() => setShowFabMenu(v => !v)}
      >
        <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#fff" />
      </TouchableOpacity>

      {/* Item add/edit modal */}
      <Modal visible={showItemModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? 'Editar item' : 'Novo item'}</Text>
            <TouchableOpacity onPress={() => { setShowItemModal(false); setItemText(''); setEditingItem(null); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Nome do item..."
              placeholderTextColor={Colors.textTertiary}
              value={itemText}
              onChangeText={setItemText}
              onSubmitEditing={saveItemModal}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: list.color }]}
              onPress={saveItemModal}
            >
              <Text style={styles.saveBtnText}>{editingItem ? 'Salvar' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Group create/edit modal */}
      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingGroup ? 'Editar subgrupo' : 'Novo subgrupo'}</Text>
            <TouchableOpacity onPress={() => { setShowGroupModal(false); setEditingGroup(null); setGroupName(''); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Nome do subgrupo..."
              placeholderTextColor={Colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              onSubmitEditing={saveGroup}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: list.color }]}
              onPress={saveGroup}
            >
              <Text style={styles.saveBtnText}>{editingGroup ? 'Salvar' : 'Criar subgrupo'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
    borderBottomWidth: 3, gap: 12,
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 22 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text },

  // Breadcrumb
  breadcrumbScroll: {
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  breadcrumbContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 4, paddingRight: 32,
  },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbItem: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  scroll: { padding: 20, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textTertiary,
    marginTop: 20, marginBottom: 8,
  },

  // Group card
  groupCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  groupCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  groupName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  groupMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },

  // Items
  item: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 14, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  itemDone: { opacity: 0.6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { borderWidth: 0 },
  itemText: { flex: 1, fontSize: 15, color: Colors.text },
  itemTextDone: {
    flex: 1, fontSize: 15, color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },

  // Speed dial FAB
  fabBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 9,
  },
  fabMenu: { position: 'absolute', right: 24, zIndex: 10, gap: 14 },
  fabMenuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  fabMenuLabel: {
    backgroundColor: Colors.card, color: Colors.text, fontSize: 14, fontWeight: '600',
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
  },
  fabMini: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  fab: {
    position: 'absolute', right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 10,
  },

  // Modals
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalInput: {
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 14, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
