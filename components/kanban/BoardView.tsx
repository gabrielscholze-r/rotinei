import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { KanbanBoard, KanbanColumn, KanbanCard, KanbanTag } from '../../lib/types';
import { CustomTabBar } from '../CustomTabBar';

const COLUMN_WIDTH = 230;
const TAG_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
  '#6B7280', '#84CC16',
];

interface Props {
  board: KanbanBoard;
  columns: KanbanColumn[];
}

export function BoardView({ board, columns: initialColumns }: Props) {
  const router = useRouter();

  const [columns, setColumns] = useState<KanbanColumn[]>(
    [...initialColumns].sort((a, b) => a.order - b.order)
  );
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [tags, setTags] = useState<KanbanTag[]>([]);

  // Tags
  const [showTagManager, setShowTagManager] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [editingTag, setEditingTag] = useState<KanbanTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  // Card modal (new + edit)
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [cardText, setCardText] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [cardTagIds, setCardTagIds] = useState<string[]>([]);
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);

  // Column modals
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [columnName, setColumnName] = useState('');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamingColumn, setRenamingColumn] = useState<KanbanColumn | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    (async () => {
      const [allCards, allTags] = await Promise.all([
        getItem<KanbanCard[]>(KEYS.KANBAN_CARDS),
        getItem<KanbanTag[]>(KEYS.KANBAN_TAGS),
      ]);
      setCards((allCards ?? []).filter(c => c.boardId === board.id));
      setTags((allTags ?? []).filter(t => t.boardId === board.id));
    })();
  }, []);

  // ── Persistence ────────────────────────────────────────────────

  async function persistCards(updated: KanbanCard[]) {
    const all = await getItem<KanbanCard[]>(KEYS.KANBAN_CARDS) ?? [];
    const others = all.filter(c => c.boardId !== board.id);
    await setItem(KEYS.KANBAN_CARDS, [...others, ...updated]);
    setCards(updated);
  }

  async function persistColumns(updatedCols: KanbanColumn[]) {
    const all = await getItem<KanbanColumn[]>(KEYS.KANBAN_COLUMNS) ?? [];
    const others = all.filter(c => c.boardId !== board.id);
    await setItem(KEYS.KANBAN_COLUMNS, [...others, ...updatedCols]);
    setColumns([...updatedCols].sort((a, b) => a.order - b.order));
  }

  async function persistTags(updatedTags: KanbanTag[]) {
    const all = await getItem<KanbanTag[]>(KEYS.KANBAN_TAGS) ?? [];
    const others = all.filter(t => t.boardId !== board.id);
    await setItem(KEYS.KANBAN_TAGS, [...others, ...updatedTags]);
    setTags(updatedTags);
  }

  // ── Tags ───────────────────────────────────────────────────────

  function openCreateTag() {
    setEditingTag(null);
    setTagName('');
    setTagColor(TAG_COLORS[0]);
    setShowTagEditor(true);
  }

  function openEditTag(tag: KanbanTag) {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setShowTagEditor(true);
  }

  async function saveTag() {
    if (!tagName.trim()) return;
    if (editingTag) {
      await persistTags(
        tags.map(t => t.id === editingTag.id ? { ...t, name: tagName.trim(), color: tagColor } : t)
      );
    } else {
      const newTag: KanbanTag = {
        id: Date.now().toString(),
        boardId: board.id,
        name: tagName.trim(),
        color: tagColor,
      };
      await persistTags([...tags, newTag]);
    }
    setShowTagEditor(false);
    setEditingTag(null);
    setTagName('');
  }

  function showTagActions(tag: KanbanTag) {
    Alert.alert(tag.name, undefined, [
      { text: 'Editar', onPress: () => openEditTag(tag) },
      {
        text: 'Excluir', style: 'destructive', onPress: () =>
          Alert.alert(`Excluir "${tag.name}"?`, 'Será removida de todos os cards.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Excluir', style: 'destructive', onPress: () => deleteTag(tag.id) },
          ])
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function deleteTag(tagId: string) {
    await persistTags(tags.filter(t => t.id !== tagId));
    await persistCards(cards.map(c => ({ ...c, tagIds: c.tagIds.filter(id => id !== tagId) })));
  }

  function toggleCardTag(tagId: string) {
    setCardTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }

  // ── Cards ──────────────────────────────────────────────────────

  function closeCardModal() {
    setShowCardModal(false);
    setEditingCard(null);
    setCardText('');
    setCardDescription('');
    setCardTagIds([]);
    setTargetColumnId(null);
  }

  function openAddCard(columnId: string) {
    setEditingCard(null);
    setTargetColumnId(columnId);
    setCardText('');
    setCardDescription('');
    setCardTagIds([]);
    setShowCardModal(true);
  }

  function openEditCard(card: KanbanCard) {
    setEditingCard(card);
    setCardText(card.text);
    setCardDescription(card.description);
    setCardTagIds(card.tagIds);
    setTargetColumnId(card.columnId);
    setShowCardModal(true);
  }

  async function saveCard() {
    if (!cardText.trim()) return;
    if (editingCard) {
      const colChanged = targetColumnId !== editingCard.columnId;
      await persistCards(
        cards.map(c => c.id !== editingCard.id ? c : {
          ...c,
          text: cardText.trim(),
          description: cardDescription,
          tagIds: cardTagIds,
          columnId: targetColumnId!,
          order: colChanged ? cards.filter(x => x.columnId === targetColumnId).length : c.order,
        })
      );
    } else {
      const colCards = cards.filter(c => c.columnId === targetColumnId);
      const card: KanbanCard = {
        id: Date.now().toString(),
        boardId: board.id,
        columnId: targetColumnId!,
        text: cardText.trim(),
        tagIds: cardTagIds,
        description: cardDescription,
        order: colCards.length,
        createdAt: new Date().toISOString(),
      };
      await persistCards([...cards, card]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    closeCardModal();
  }

  async function deleteCard(cardId: string) {
    await persistCards(cards.filter(c => c.id !== cardId));
    closeCardModal();
  }

  // ── Columns ────────────────────────────────────────────────────

  async function saveColumn() {
    if (!columnName.trim()) return;
    const newCol: KanbanColumn = {
      id: Date.now().toString(),
      boardId: board.id,
      name: columnName.trim(),
      order: columns.length,
      createdAt: new Date().toISOString(),
    };
    await persistColumns([...columns, newCol]);
    setShowColumnModal(false);
    setColumnName('');
  }

  function showColumnActions(col: KanbanColumn) {
    Alert.alert(col.name, undefined, [
      {
        text: 'Renomear', onPress: () => {
          setRenamingColumn(col);
          setRenameText(col.name);
          setShowRenameModal(true);
        }
      },
      {
        text: 'Excluir coluna', style: 'destructive', onPress: () =>
          Alert.alert(`Excluir "${col.name}"`, 'Remove a coluna e todos os cards.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir', style: 'destructive', onPress: async () => {
                await persistColumns(columns.filter(c => c.id !== col.id));
                await persistCards(cards.filter(c => c.columnId !== col.id));
              }
            },
          ])
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  async function renameColumn() {
    if (!renameText.trim() || !renamingColumn) return;
    await persistColumns(
      columns.map(c => c.id === renamingColumn.id ? { ...c, name: renameText.trim() } : c)
    );
    setShowRenameModal(false);
    setRenamingColumn(null);
    setRenameText('');
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { borderBottomColor: board.color }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.icon}>{board.icon}</Text>
          <Text style={styles.title} numberOfLines={1}>{board.title}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowTagManager(true)} hitSlop={8}>
          <Ionicons name="pricetag-outline" size={22} color={Colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.board}
      >
        {columns.map(col => {
          const colCards = cards
            .filter(c => c.columnId === col.id)
            .sort((a, b) => a.order - b.order);

          return (
            <View key={col.id} style={styles.column}>
              <TouchableOpacity
                style={[styles.columnHeader, { borderTopColor: board.color }]}
                onLongPress={() => showColumnActions(col)}
                activeOpacity={0.85}
              >
                <Text style={styles.columnName} numberOfLines={1}>{col.name}</Text>
                <View style={[styles.columnBadge, { backgroundColor: board.color + '20' }]}>
                  <Text style={[styles.columnBadgeText, { color: board.color }]}>{colCards.length}</Text>
                </View>
              </TouchableOpacity>

              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                style={styles.columnScroll}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {colCards.map(card => {
                  const cardTags = tags.filter(t => card.tagIds.includes(t.id));
                  return (
                    <TouchableOpacity
                      key={card.id}
                      style={styles.card}
                      onPress={() => openEditCard(card)}
                      activeOpacity={0.8}
                    >
                      {cardTags.length > 0 && (
                        <View style={styles.cardTags}>
                          {cardTags.map(tag => (
                            <View key={tag.id} style={[styles.cardTag, { backgroundColor: tag.color }]}>
                              <Text style={styles.cardTagText}>{tag.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      <Text style={styles.cardText}>{card.text}</Text>
                      {!!card.description && (
                        <Text style={styles.cardDescription} numberOfLines={2}>{card.description}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.addCardBtn, { borderColor: board.color + '50' }]}
                  onPress={() => openAddCard(col.id)}
                >
                  <Ionicons name="add" size={15} color={board.color} />
                  <Text style={[styles.addCardText, { color: board.color }]}>Adicionar card</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addColumnBtn}
          onPress={() => setShowColumnModal(true)}
        >
          <Ionicons name="add-circle-outline" size={22} color={Colors.textSecondary} />
          <Text style={styles.addColumnText}>Nova coluna</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Card modal ─────────────────────────────────────────── */}
      <Modal visible={showCardModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeCardModal} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingCard ? 'Editar card' : 'Novo card'}</Text>
            {editingCard ? (
              <TouchableOpacity
                onPress={() => Alert.alert('Excluir card?', undefined, [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => deleteCard(editingCard.id) },
                ])}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Título</Text>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Título do card..."
              placeholderTextColor={Colors.textTertiary}
              value={cardText}
              onChangeText={setCardText}
              returnKeyType="next"
            />

            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputDescription]}
              placeholder="Adicione detalhes (opcional)..."
              placeholderTextColor={Colors.textTertiary}
              value={cardDescription}
              onChangeText={setCardDescription}
              multiline
              textAlignVertical="top"
            />

            {tags.length > 0 && (
              <>
                <Text style={styles.label}>Tags</Text>
                <View style={styles.tagPickerRow}>
                  {tags.map(tag => {
                    const selected = cardTagIds.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        style={[styles.tagPill, { borderColor: tag.color, backgroundColor: selected ? tag.color : 'transparent' }]}
                        onPress={() => toggleCardTag(tag.id)}
                      >
                        <Text style={[styles.tagPillText, { color: selected ? '#fff' : tag.color }]}>{tag.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {tags.length === 0 && (
              <TouchableOpacity
                style={styles.createTagHint}
                onPress={() => { closeCardModal(); setShowTagManager(true); }}
              >
                <Ionicons name="pricetag-outline" size={14} color={Colors.textTertiary} />
                <Text style={styles.createTagHintText}>Criar tags para este quadro</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.label}>Coluna</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {columns.map(col => {
                  const sel = targetColumnId === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      style={[styles.colChip, sel && { backgroundColor: board.color, borderColor: board.color }]}
                      onPress={() => setTargetColumnId(col.id)}
                    >
                      {sel && <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 3 }} />}
                      <Text style={[styles.colChipText, sel && { color: '#fff' }]}>{col.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: board.color }]} onPress={saveCard}>
              <Text style={styles.saveBtnText}>{editingCard ? 'Salvar' : 'Adicionar'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Tag manager ────────────────────────────────────────── */}
      <Modal visible={showTagManager} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tags</Text>
            <View style={styles.modalHeaderRight}>
              <TouchableOpacity onPress={openCreateTag} hitSlop={8}>
                <Ionicons name="add" size={26} color={board.color} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowTagManager(false)} hitSlop={8}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {tags.length === 0 && (
              <View style={styles.emptyTags}>
                <Ionicons name="pricetag-outline" size={44} color={Colors.textTertiary} />
                <Text style={styles.emptyTagsTitle}>Nenhuma tag</Text>
                <Text style={styles.emptyTagsSub}>Toque em + para criar a primeira</Text>
              </View>
            )}
            {tags.map(tag => (
              <TouchableOpacity
                key={tag.id}
                style={styles.tagRow}
                onLongPress={() => showTagActions(tag)}
                activeOpacity={0.8}
              >
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={styles.tagRowName}>{tag.name}</Text>
                <TouchableOpacity onPress={() => showTagActions(tag)} hitSlop={8}>
                  <Ionicons name="ellipsis-vertical" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Tag editor ─────────────────────────────────────────── */}
      <Modal visible={showTagEditor} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingTag ? 'Editar tag' : 'Nova tag'}</Text>
            <TouchableOpacity
              onPress={() => { setShowTagEditor(false); setTagName(''); setEditingTag(null); }}
              hitSlop={8}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome</Text>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Ex: Urgente, Feature, Bug..."
              placeholderTextColor={Colors.textTertiary}
              value={tagName}
              onChangeText={setTagName}
              returnKeyType="done"
            />
            <Text style={styles.label}>Cor</Text>
            <View style={styles.tagColorGrid}>
              {TAG_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.tagColorDot, { backgroundColor: c }, tagColor === c && styles.tagColorDotSelected]}
                  onPress={() => setTagColor(c)}
                >
                  {tagColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.tagPreviewRow, { backgroundColor: tagColor + '18', borderColor: tagColor }]}>
              <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
              <Text style={[styles.tagPreviewText, { color: tagColor }]}>
                {tagName.trim() || 'Prévia da tag'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: board.color, marginTop: 8 }]} onPress={saveTag}>
              <Text style={styles.saveBtnText}>{editingTag ? 'Salvar' : 'Criar tag'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Column modals ──────────────────────────────────────── */}
      <Modal visible={showColumnModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova coluna</Text>
            <TouchableOpacity onPress={() => { setShowColumnModal(false); setColumnName(''); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Ex: Em revisão, Aprovado..."
              placeholderTextColor={Colors.textTertiary}
              value={columnName}
              onChangeText={setColumnName}
              onSubmitEditing={saveColumn}
              returnKeyType="done"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: board.color }]} onPress={saveColumn}>
              <Text style={styles.saveBtnText}>Criar coluna</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={showRenameModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Renomear coluna</Text>
            <TouchableOpacity onPress={() => { setShowRenameModal(false); setRenameText(''); setRenamingColumn(null); }} hitSlop={8}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <TextInput
              autoFocus
              style={styles.modalInput}
              placeholder="Nome da coluna..."
              placeholderTextColor={Colors.textTertiary}
              value={renameText}
              onChangeText={setRenameText}
              onSubmitEditing={renameColumn}
              returnKeyType="done"
            />
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: board.color }]} onPress={renameColumn}>
              <Text style={styles.saveBtnText}>Salvar</Text>
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
  icon: { fontSize: 22 },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: Colors.text },

  board: { padding: 16, gap: 12, alignItems: 'flex-start' },

  column: {
    width: COLUMN_WIDTH,
    backgroundColor: Colors.borderLight,
    borderRadius: 16,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  columnName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  columnBadge: {
    minWidth: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  columnBadgeText: { fontSize: 12, fontWeight: '700' },
  columnScroll: { maxHeight: 480, padding: 10 },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 6 },
  cardTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  cardTagText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  cardDescription: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 4 },
  colChip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.borderLight, borderWidth: 1.5, borderColor: Colors.border,
  },
  colChipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  addCardBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderStyle: 'dashed',
    borderRadius: 10, padding: 10, marginTop: 2,
  },
  addCardText: { fontSize: 13, fontWeight: '600' },

  addColumnBtn: {
    width: 140,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16, gap: 8, padding: 20,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  addColumnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  modalInput: {
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 14, fontSize: 15, color: Colors.text,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12, minHeight: 52,
  },
  modalInputDescription: { minHeight: 90, fontSize: 14, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10 },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  tagPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagPill: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 5 },
  tagPillText: { fontSize: 13, fontWeight: '600' },
  createTagHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 16 },
  createTagHintText: { fontSize: 13, color: Colors.textTertiary },

  tagRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tagDot: { width: 14, height: 14, borderRadius: 7 },
  tagRowName: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },
  emptyTags: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTagsTitle: { fontSize: 17, fontWeight: '700', color: Colors.textSecondary },
  emptyTagsSub: { fontSize: 14, color: Colors.textTertiary },

  tagColorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  tagColorDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tagColorDotSelected: { borderWidth: 3, borderColor: Colors.text },
  tagPreviewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16,
  },
  tagPreviewText: { fontSize: 14, fontWeight: '700' },
});
