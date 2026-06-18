import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAB } from '../../components/FAB';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { KanbanBoard, KanbanColumn, KanbanCard, KanbanTag } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const BOARD_COLORS = Colors.listColors;
const BOARD_ICONS = ['📋', '🎯', '💼', '🚀', '🏗️', '🎨', '📦', '🔧', '⚡', '🌟', '🏆', '📊'];

export default function KanbanScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [boards, setBoards] = useState<KanbanBoard[]>([]);
  const [allColumns, setAllColumns] = useState<KanbanColumn[]>([]);
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
    const [bds, cols] = await Promise.all([
      getItem<KanbanBoard[]>(KEYS.KANBAN_BOARDS),
      getItem<KanbanColumn[]>(KEYS.KANBAN_COLUMNS),
    ]);
    setBoards(bds ?? []);
    setAllColumns(cols ?? []);
  }

  async function createBoard() {
    if (!name.trim()) {
      Alert.alert('Erro', 'Informe um nome para o quadro.');
      return;
    }
    const now = Date.now();
    const iso = new Date().toISOString();
    const board: KanbanBoard = {
      id: now.toString(),
      title: name.trim(),
      icon: BOARD_ICONS[selectedIcon],
      color: BOARD_COLORS[selectedColor],
      createdAt: iso,
    };
    const defaultCols: KanbanColumn[] = [
      { id: `${now}c1`, boardId: board.id, name: 'Backlog', order: 0, createdAt: iso },
      { id: `${now}c2`, boardId: board.id, name: 'Em Progresso', order: 1, createdAt: iso },
      { id: `${now}c3`, boardId: board.id, name: 'Concluído', order: 2, createdAt: iso },
    ];
    const [existingBoards, existingCols] = await Promise.all([
      getItem<KanbanBoard[]>(KEYS.KANBAN_BOARDS),
      getItem<KanbanColumn[]>(KEYS.KANBAN_COLUMNS),
    ]);
    await Promise.all([
      setItem(KEYS.KANBAN_BOARDS, [board, ...(existingBoards ?? [])]),
      setItem(KEYS.KANBAN_COLUMNS, [...(existingCols ?? []), ...defaultCols]),
    ]);
    setBoards(prev => [board, ...prev]);
    setAllColumns(prev => [...prev, ...defaultCols]);
    setName('');
    setSelectedColor(0);
    setSelectedIcon(0);
    setShowAdd(false);
  }

  function deleteBoard(boardId: string) {
    Alert.alert('Excluir quadro', 'Remove o quadro, colunas, cards e tags.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive', onPress: async () => {
          const [bds, cols, cards, tags] = await Promise.all([
            getItem<KanbanBoard[]>(KEYS.KANBAN_BOARDS),
            getItem<KanbanColumn[]>(KEYS.KANBAN_COLUMNS),
            getItem<KanbanCard[]>(KEYS.KANBAN_CARDS),
            getItem<KanbanTag[]>(KEYS.KANBAN_TAGS),
          ]);
          await Promise.all([
            setItem(KEYS.KANBAN_BOARDS, (bds ?? []).filter(b => b.id !== boardId)),
            setItem(KEYS.KANBAN_COLUMNS, (cols ?? []).filter(c => c.boardId !== boardId)),
            setItem(KEYS.KANBAN_CARDS, (cards ?? []).filter(c => c.boardId !== boardId)),
            setItem(KEYS.KANBAN_TAGS, (tags ?? []).filter(t => t.boardId !== boardId)),
          ]);
          setBoards(prev => prev.filter(b => b.id !== boardId));
          setAllColumns(prev => prev.filter(c => c.boardId !== boardId));
        }
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate(from === 'menu' ? '/(tabs)/menu' : '/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Quadros</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {boards.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="grid-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhum quadro</Text>
            <Text style={styles.emptySub}>Toque em + para criar seu primeiro quadro Kanban</Text>
          </View>
        )}

        <View style={styles.grid}>
          {boards.map(board => {
            const colCount = allColumns.filter(c => c.boardId === board.id).length;
            return (
              <TouchableOpacity
                key={board.id}
                style={[styles.boardCard, { borderTopColor: board.color, borderTopWidth: 4 }]}
                onPress={() => router.push(`/kanban/${board.id}` as any)}
                onLongPress={() => deleteBoard(board.id)}
                activeOpacity={0.8}
              >
                <View style={styles.boardCardHeader}>
                  <Text style={styles.boardIcon}>{board.icon}</Text>
                  <TouchableOpacity onPress={() => deleteBoard(board.id)} hitSlop={8}>
                    <Ionicons name="ellipsis-vertical" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.boardTitle}>{board.title}</Text>
                <Text style={styles.boardSub}>
                  {colCount === 0 ? 'Sem colunas' : `${colCount} coluna${colCount !== 1 ? 's' : ''}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <FAB onPress={() => setShowAdd(true)} />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo quadro</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); setName(''); setSelectedColor(0); setSelectedIcon(0); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome do quadro *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Projeto App, Sprint 1..."
              placeholderTextColor={Colors.textTertiary}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>Ícone</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconRow}>
                {BOARD_ICONS.map((icon, i) => (
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
              {BOARD_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, selectedColor === i && styles.colorDotSelected]}
                  onPress={() => setSelectedColor(i)}
                >
                  {selectedColor === i && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
              <Text style={styles.hintText}>3 colunas padrão criadas automaticamente (Backlog, Em Progresso, Concluído)</Text>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: BOARD_COLORS[selectedColor] }]} onPress={createBoard}>
              <Text style={styles.saveBtnText}>Criar quadro</Text>
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
    paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '800', color: Colors.text },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  boardCard: {
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
  boardCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  boardIcon: { fontSize: 26 },
  boardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  boardSub: { fontSize: 12, color: Colors.textSecondary },
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
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnSelected: { backgroundColor: Colors.primaryLight },
  iconText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
  hint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    marginTop: 20, padding: 12,
    backgroundColor: Colors.borderLight, borderRadius: 10,
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },
  saveBtn: {
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 20, marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
