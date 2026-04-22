import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Note } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const NOTE_COLORS = Colors.noteColors;

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const data = await getItem<Note[]>(KEYS.NOTES);
    setNotes(data ?? []);
  }

  async function saveNotes(updated: Note[]) {
    await setItem(KEYS.NOTES, updated);
    setNotes(updated);
  }

  function createNote() {
    if (!title.trim() && !content.trim()) {
      Alert.alert('Erro', 'Adicione um título ou conteúdo.');
      return;
    }
    const note: Note = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      color: NOTE_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    resetForm();
    setShowAdd(false);
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setColorIndex(0);
  }

  function deleteNote(id: string) {
    Alert.alert('Excluir nota', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveNotes(notes.filter((n) => n.id !== id)) },
    ]);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notas</Text>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar notas..."
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>
              {search ? 'Nenhum resultado' : 'Nenhuma nota'}
            </Text>
            <Text style={styles.emptySub}>
              {search ? 'Tente outra busca' : 'Toque em + para criar sua primeira nota'}
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {filtered.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={[styles.noteCard, { backgroundColor: note.color }]}
              onPress={() => router.push(`/notes/${note.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.noteCardHeader}>
                {note.title ? (
                  <Text style={styles.noteTitle} numberOfLines={2}>{note.title}</Text>
                ) : null}
                <TouchableOpacity onPress={() => deleteNote(note.id)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {note.content ? (
                <Text style={styles.noteContent} numberOfLines={6}>{note.content}</Text>
              ) : null}
              <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nova nota</Text>
            <TouchableOpacity onPress={createNote}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.noteEditor, { backgroundColor: NOTE_COLORS[colorIndex] }]}>
            <TextInput
              style={styles.editorTitle}
              placeholder="Título"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              multiline
            />
            <TextInput
              style={styles.editorContent}
              placeholder="Escreva aqui..."
              placeholderTextColor={Colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>

          <View style={styles.colorBar}>
            {NOTE_COLORS.map((c, i) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, colorIndex === i && styles.colorDotSelected]}
                onPress={() => setColorIndex(i)}
              >
                {colorIndex === i && <Ionicons name="checkmark" size={14} color={Colors.textSecondary} />}
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 12,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  noteCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
  },
  noteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  noteTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  noteContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  noteDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  noteEditor: { flex: 1, padding: 20 },
  editorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  editorContent: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    flex: 1,
  },
  colorBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.card,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotSelected: { borderColor: Colors.textSecondary },
});
