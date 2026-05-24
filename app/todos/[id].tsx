import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { TodoList, TodoItem, TodoGroup } from '../../lib/types';
import { CustomTabBar } from '../../components/CustomTabBar';

const ITEM_GAP = 8;
const TOPIC_GAP = 10;

export default function TodoListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState<TodoList | null>(null);
  const [allLists, setAllLists] = useState<TodoList[]>([]);
  const listRef = useRef<TodoList | null>(null);

  const [topics, setTopics] = useState<TodoGroup[]>([]);
  const [localTopics, setLocalTopics] = useState<TodoGroup[]>([]);
  const localTopicsRef = useRef<TodoGroup[]>([]);
  const topicHeights = useRef<Record<string, number>>({});
  const itemHeights = useRef<Record<string, number>>({});

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TodoGroup | null>(null);
  const [topicName, setTopicName] = useState('');

  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [itemText, setItemText] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  const [showFabMenu, setShowFabMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draggingTopicId, setDraggingTopicId] = useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const [lists, groups] = await Promise.all([
      getItem<TodoList[]>(KEYS.TODO_LISTS),
      getItem<TodoGroup[]>(KEYS.TODO_GROUPS),
    ]);
    const all = lists ?? [];
    setAllLists(all);
    const found = all.find((l) => l.id === id) ?? null;
    setList(found);
    listRef.current = found;
    const myTopics = (groups ?? []).filter(g => g.listId === id);
    setTopics(myTopics);
  }

  useEffect(() => {
    const sorted = [...topics].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setLocalTopics(sorted);
    localTopicsRef.current = sorted;
  }, [topics]);

  useEffect(() => {
    listRef.current = list;
  }, [list]);

  async function persist(updated: TodoList) {
    const updatedAll = allLists.map((l) => (l.id === id ? updated : l));
    await setItem(KEYS.TODO_LISTS, updatedAll);
    setAllLists(updatedAll);
    setList(updated);
  }

  function visualUpdateList(updated: TodoList) {
    setList(updated);
    listRef.current = updated;
  }

  async function persistItemsAfterDrag(updatedItems: TodoItem[]) {
    const lists = await getItem<TodoList[]>(KEYS.TODO_LISTS) ?? [];
    const currentList = lists.find(l => l.id === id);
    if (!currentList) return;
    const newList = { ...currentList, items: updatedItems };
    const updatedAll = lists.map(l => l.id === id ? newList : l);
    await setItem(KEYS.TODO_LISTS, updatedAll);
    setAllLists(updatedAll);
  }

  // ── Topic drag ─────────────────────────────────────────────────

  function makeTopicPanResponder(topicId: string) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => editMode,
      onMoveShouldSetPanResponder: () => editMode,
      onPanResponderGrant: () => {
        setDraggingTopicId(topicId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, gs) => {
        const current = [...localTopicsRef.current].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const fromIndex = current.findIndex(t => t.id === topicId);
        if (fromIndex === -1) return;

        const ys: number[] = [];
        let acc = 0;
        current.forEach(t => {
          ys.push(acc);
          acc += (topicHeights.current[t.id] ?? 60) + TOPIC_GAP;
        });

        const draggedY = ys[fromIndex] + gs.dy;
        const draggedCenter = draggedY + (topicHeights.current[topicId] ?? 60) / 2;

        let toIndex = fromIndex;
        for (let i = 0; i < current.length; i++) {
          if (i === fromIndex) continue;
          const center = ys[i] + (topicHeights.current[current[i].id] ?? 60) / 2;
          if ((i < fromIndex && draggedCenter < center) || (i > fromIndex && draggedCenter > center)) {
            toIndex = i;
          }
        }

        if (toIndex !== fromIndex) {
          const reordered = [...current];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          const updated = reordered.map((t, i) => ({ ...t, order: i }));
          localTopicsRef.current = updated;
          setLocalTopics(updated);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: async () => {
        setDraggingTopicId(null);
        const final = localTopicsRef.current.map((t, i) => ({ ...t, order: i }));
        await persistTopicsOrder(final);
      },
      onPanResponderTerminate: () => setDraggingTopicId(null),
    });
  }

  async function persistTopicsOrder(updatedTopics: TodoGroup[]) {
    const allGroups = await getItem<TodoGroup[]>(KEYS.TODO_GROUPS) ?? [];
    const updatedAll = allGroups.map(g => updatedTopics.find(t => t.id === g.id) ?? g);
    await setItem(KEYS.TODO_GROUPS, updatedAll);
    setTopics(updatedTopics);
  }

  // ── Item drag ──────────────────────────────────────────────────

  function makeItemPanResponder(itemId: string, groupId: string | null | undefined) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => editMode,
      onMoveShouldSetPanResponder: () => editMode,
      onPanResponderGrant: () => {
        setDraggingItemId(itemId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, gs) => {
        const currentList = listRef.current;
        if (!currentList) return;

        const isUngrouped = !groupId;
        const groupItems = currentList.items
          .filter(i => (isUngrouped ? !i.groupId : i.groupId === groupId) && !i.done)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        const fromIndex = groupItems.findIndex(i => i.id === itemId);
        if (fromIndex === -1) return;

        const ys: number[] = [];
        let acc = 0;
        groupItems.forEach(item => {
          ys.push(acc);
          acc += (itemHeights.current[item.id] ?? 52) + ITEM_GAP;
        });

        const draggedY = ys[fromIndex] + gs.dy;
        const draggedCenter = draggedY + (itemHeights.current[itemId] ?? 52) / 2;

        let toIndex = fromIndex;
        for (let i = 0; i < groupItems.length; i++) {
          if (i === fromIndex) continue;
          const center = ys[i] + (itemHeights.current[groupItems[i].id] ?? 52) / 2;
          if ((i < fromIndex && draggedCenter < center) || (i > fromIndex && draggedCenter > center)) {
            toIndex = i;
          }
        }

        if (toIndex !== fromIndex) {
          const reordered = [...groupItems];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          const orderMap = new Map(reordered.map((item, i) => [item.id, i]));
          const updatedItems = currentList.items.map(i =>
            orderMap.has(i.id) ? { ...i, order: orderMap.get(i.id)! } : i
          );
          visualUpdateList({ ...currentList, items: updatedItems });
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: async () => {
        setDraggingItemId(null);
        const currentList = listRef.current;
        if (currentList) {
          await persistItemsAfterDrag(currentList.items);
        }
      },
      onPanResponderTerminate: () => setDraggingItemId(null),
    });
  }

  // ── Topic actions ──────────────────────────────────────────────

  function toggleExpanded(topicId: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  function checkAllInTopic(topicId: string) {
    if (!list) return;
    const topicItems = list.items.filter(i => i.groupId === topicId);
    const allDone = topicItems.length > 0 && topicItems.every(i => i.done);
    persist({
      ...list,
      items: list.items.map(i =>
        i.groupId === topicId ? { ...i, done: !allDone } : i
      ),
    });
  }

  function openCreateTopicModal() {
    setEditingTopic(null);
    setTopicName('');
    setShowTopicModal(true);
    setShowFabMenu(false);
  }

  function openEditTopicModal(topic: TodoGroup) {
    setEditingTopic(topic);
    setTopicName(topic.name);
    setShowTopicModal(true);
  }

  async function saveTopic() {
    if (!topicName.trim()) { Alert.alert('Erro', 'Informe um nome para o tópico.'); return; }
    const allGroups = await getItem<TodoGroup[]>(KEYS.TODO_GROUPS) ?? [];
    let updatedAll: TodoGroup[];
    if (editingTopic) {
      updatedAll = allGroups.map(g =>
        g.id === editingTopic.id ? { ...g, name: topicName.trim() } : g
      );
      setTopics(updatedAll.filter(g => g.listId === id));
    } else {
      const topic: TodoGroup = {
        id: Date.now().toString(),
        name: topicName.trim(),
        listId: id as string,
        parentId: null,
        order: localTopics.length,
        createdAt: new Date().toISOString(),
      };
      updatedAll = [...allGroups, topic];
      setTopics(prev => [...prev, topic]);
      setExpandedTopics(prev => new Set([...prev, topic.id]));
    }
    await setItem(KEYS.TODO_GROUPS, updatedAll);
    setShowTopicModal(false);
    setEditingTopic(null);
    setTopicName('');
  }

  function showTopicActions(topic: TodoGroup) {
    Alert.alert(topic.name, undefined, [
      { text: 'Editar', onPress: () => openEditTopicModal(topic) },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTopic(topic) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function deleteTopic(topic: TodoGroup) {
    Alert.alert(`Excluir "${topic.name}"`, 'Remove o tópico e todos os itens dentro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const allGroups = await getItem<TodoGroup[]>(KEYS.TODO_GROUPS) ?? [];
          const updatedAllGroups = allGroups.filter(g => g.id !== topic.id);
          await setItem(KEYS.TODO_GROUPS, updatedAllGroups);
          setTopics(updatedAllGroups.filter(g => g.listId === id));
          if (list) {
            await persist({ ...list, items: list.items.filter(i => i.groupId !== topic.id) });
          }
        },
      },
    ]);
  }

  // ── Item CRUD ─────────────────────────────────────────────────

  function openAddItem(groupId: string | null = null) {
    setEditingItem(null);
    setItemText('');
    setAddingToGroupId(groupId);
    setShowItemModal(true);
    setShowFabMenu(false);
  }

  function openEditItem(item: TodoItem) {
    setEditingItem(item);
    setItemText(item.text);
    setAddingToGroupId(null);
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
      const sameGroupPending = list.items.filter(
        i => (addingToGroupId ? i.groupId === addingToGroupId : !i.groupId) && !i.done
      );
      const item: TodoItem = {
        id: Date.now().toString(),
        text: itemText.trim(),
        done: false,
        groupId: addingToGroupId,
        order: sameGroupPending.length,
        createdAt: new Date().toISOString(),
      };
      persist({ ...list, items: [...list.items, item] });
    }
    setShowItemModal(false);
    setItemText('');
    setEditingItem(null);
    setAddingToGroupId(null);
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
    const doneItems = list.items.filter(i => i.done);
    if (doneItems.length === 0) return;
    Alert.alert('Limpar concluídos', 'Remover todos os itens marcados?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', onPress: () => persist({ ...list, items: list!.items.filter(i => !i.done) }) },
    ]);
  }

  if (!list) return null;

  const ungroupedPending = list.items
    .filter(i => !i.groupId && !i.done)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const ungroupedDone = list.items.filter(i => !i.groupId && i.done);
  const hasDone = list.items.some(i => i.done);

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: list.color }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.icon}>{list.icon}</Text>
          <Text style={styles.title} numberOfLines={1}>{list.title}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setEditMode(v => !v)} hitSlop={8}>
            <Ionicons
              name={editMode ? 'checkmark-circle' : 'swap-vertical-outline'}
              size={22}
              color={editMode ? list.color : Colors.textTertiary}
            />
          </TouchableOpacity>
          {!editMode && hasDone && (
            <TouchableOpacity onPress={clearDone} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {topics.length === 0 && list.items.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Lista vazia. Adicione o primeiro item!</Text>
          </View>
        )}

        {/* Topic accordion sections */}
        {localTopics.map(topic => {
          const topicItems = list.items.filter(i => i.groupId === topic.id);
          const topicPending = topicItems
            .filter(i => !i.done)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const topicDone = topicItems.filter(i => i.done);
          const allDone = topicItems.length > 0 && topicItems.every(i => i.done);
          const isExpanded = expandedTopics.has(topic.id);
          const isDraggingThis = draggingTopicId === topic.id;
          const topicPanHandlers = makeTopicPanResponder(topic.id).panHandlers;

          return (
            <View
              key={topic.id}
              style={[styles.topicBlock, isDraggingThis && styles.draggingBlock]}
              onLayout={(e) => { topicHeights.current[topic.id] = e.nativeEvent.layout.height; }}
            >
              <View style={[styles.topicHeader, { borderLeftColor: list.color }]}>
                {!editMode && (
                  <TouchableOpacity
                    style={[
                      styles.topicCheckBtn,
                      { borderColor: list.color },
                      allDone && { backgroundColor: list.color },
                    ]}
                    onPress={() => checkAllInTopic(topic.id)}
                    hitSlop={6}
                  >
                    {allDone && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.topicHeaderContent}
                  onPress={() => toggleExpanded(topic.id)}
                  onLongPress={() => !editMode && showTopicActions(topic)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.topicName, allDone && !editMode && styles.topicNameDone]} numberOfLines={1}>
                    {topic.name}
                  </Text>
                  {!editMode && topicItems.length > 0 && (
                    <Text style={styles.topicCount}>{topicDone.length}/{topicItems.length}</Text>
                  )}
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textTertiary}
                  />
                </TouchableOpacity>

                {editMode && (
                  <View style={styles.dragHandle} {...topicPanHandlers}>
                    <Ionicons name="reorder-three-outline" size={24} color={Colors.textTertiary} />
                  </View>
                )}
              </View>

              {isExpanded && !editMode && (
                <View style={[styles.topicItems, { borderLeftColor: list.color + '40' }]}>
                  {topicPending.map(item => (
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
                  {topicDone.map(item => (
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
                  <TouchableOpacity
                    style={styles.addInsideTopic}
                    onPress={() => openAddItem(topic.id)}
                  >
                    <Ionicons name="add" size={15} color={list.color} />
                    <Text style={[styles.addInsideTopicText, { color: list.color }]}>Adicionar item</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isExpanded && editMode && topicPending.length > 0 && (
                <View style={[styles.topicItems, { borderLeftColor: list.color + '40' }]}>
                  {topicPending.map(item => {
                    const itemPanHandlers = makeItemPanResponder(item.id, topic.id).panHandlers;
                    return (
                      <View
                        key={item.id}
                        style={[styles.item, draggingItemId === item.id && styles.draggingBlock]}
                        onLayout={(e) => { itemHeights.current[item.id] = e.nativeEvent.layout.height; }}
                      >
                        <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
                        <View style={styles.dragHandle} {...itemPanHandlers}>
                          <Ionicons name="reorder-three-outline" size={20} color={Colors.textTertiary} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Ungrouped items */}
        {ungroupedPending.map((item) => {
          if (editMode) {
            const itemPanHandlers = makeItemPanResponder(item.id, null).panHandlers;
            return (
              <View
                key={item.id}
                style={[styles.item, draggingItemId === item.id && styles.draggingBlock]}
                onLayout={(e) => { itemHeights.current[item.id] = e.nativeEvent.layout.height; }}
              >
                <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
                <View style={styles.dragHandle} {...itemPanHandlers}>
                  <Ionicons name="reorder-three-outline" size={20} color={Colors.textTertiary} />
                </View>
              </View>
            );
          }
          return (
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
          );
        })}

        {!editMode && ungroupedDone.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Concluídos ({ungroupedDone.length})</Text>
            {ungroupedDone.map((item) => (
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

      {/* Speed dial FAB — hidden in edit mode */}
      {!editMode && showFabMenu && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        />
      )}
      {!editMode && showFabMenu && (
        <View style={[styles.fabMenu, { bottom: insets.bottom + 88 }]}>
          <TouchableOpacity style={styles.fabMenuRow} onPress={openCreateTopicModal}>
            <Text style={styles.fabMenuLabel}>Novo tópico</Text>
            <View style={[styles.fabMini, { backgroundColor: Colors.textSecondary }]}>
              <Ionicons name="list" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabMenuRow} onPress={() => openAddItem(null)}>
            <Text style={styles.fabMenuLabel}>Novo item</Text>
            <View style={[styles.fabMini, { backgroundColor: list.color }]}>
              <Ionicons name="add-circle" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      {!editMode && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: showFabMenu ? Colors.danger : list.color, bottom: insets.bottom + 24 + 72 },
          ]}
          onPress={() => setShowFabMenu(v => !v)}
        >
          <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Item modal */}
      <Modal visible={showItemModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingItem ? 'Editar item' : 'Novo item'}</Text>
            <TouchableOpacity
              onPress={() => { setShowItemModal(false); setItemText(''); setEditingItem(null); setAddingToGroupId(null); }}
              hitSlop={8}
            >
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
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: list.color }]} onPress={saveItemModal}>
              <Text style={styles.saveBtnText}>{editingItem ? 'Salvar' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Topic modal */}
      <Modal visible={showTopicModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTopic ? 'Editar tópico' : 'Novo tópico'}</Text>
            <TouchableOpacity
              onPress={() => { setShowTopicModal(false); setEditingTopic(null); setTopicName(''); }}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Ex: Mercado, Farmácia, Limpeza..."
              placeholderTextColor={Colors.textTertiary}
              value={topicName}
              onChangeText={setTopicName}
              onSubmitEditing={saveTopic}
              returnKeyType="done"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: list.color }]} onPress={saveTopic}>
              <Text style={styles.saveBtnText}>{editingTopic ? 'Salvar' : 'Criar tópico'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <CustomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
    borderBottomWidth: 3,
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 22 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text },

  scroll: { padding: 20, paddingBottom: 192 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: Colors.textTertiary,
    marginTop: 20, marginBottom: 8,
  },

  // Topic accordion
  topicBlock: { marginBottom: 10 },
  topicHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.card, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  topicHeaderContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  topicCheckBtn: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  topicName: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  topicNameDone: { color: Colors.textTertiary, textDecorationLine: 'line-through' },
  topicCount: { fontSize: 12, color: Colors.textTertiary, fontWeight: '600' },
  topicItems: {
    marginTop: 2, marginLeft: 8,
    borderLeftWidth: 2, paddingLeft: 10,
    paddingTop: 4,
  },
  addInsideTopic: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 2,
  },
  addInsideTopicText: { fontSize: 13, fontWeight: '600' },

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

  // Drag
  draggingBlock: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 12,
  },
  dragHandle: {
    padding: 4, alignItems: 'center', justifyContent: 'center',
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
