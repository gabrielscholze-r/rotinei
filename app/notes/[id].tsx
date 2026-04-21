import {
  View, StyleSheet, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Note } from '../../lib/types';

const NOTE_COLORS = Colors.noteColors;

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const notes = await getItem<Note[]>(KEYS.NOTES);
    const all = notes ?? [];
    setAllNotes(all);
    const n = all.find((n) => n.id === id);
    if (n) {
      setNote(n);
      setTitle(n.title);
      setContent(n.content);
      setColorIndex(NOTE_COLORS.indexOf(n.color));
    }
  }

  async function save() {
    if (!note) return;
    const updated: Note = {
      ...note,
      title,
      content,
      color: NOTE_COLORS[Math.max(0, colorIndex)],
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = allNotes.map((n) => (n.id === id ? updated : n));
    await setItem(KEYS.NOTES, updatedAll);
    setChanged(false);
    router.back();
  }

  function deleteNote() {
    Alert.alert('Excluir nota', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await setItem(KEYS.NOTES, allNotes.filter((n) => n.id !== id));
          router.back();
        },
      },
    ]);
  }

  if (!note) return null;

  const bgColor = NOTE_COLORS[Math.max(0, colorIndex)] ?? note.color;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={deleteNote} hitSlop={8}>
            <Ionicons name="trash-outline" size={22} color={Colors.text} />
          </TouchableOpacity>
          {changed && (
            <TouchableOpacity style={styles.saveBtn} onPress={save}>
              <Ionicons name="checkmark" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TextInput
        style={styles.titleInput}
        placeholder="Título"
        placeholderTextColor={Colors.textSecondary}
        value={title}
        onChangeText={(v) => { setTitle(v); setChanged(true); }}
        multiline
      />
      <TextInput
        style={styles.contentInput}
        placeholder="Escreva aqui..."
        placeholderTextColor={Colors.textSecondary}
        value={content}
        onChangeText={(v) => { setContent(v); setChanged(true); }}
        multiline
        textAlignVertical="top"
        autoFocus={!content}
      />

      <View style={styles.colorBar}>
        {NOTE_COLORS.map((c, i) => (
          <TouchableOpacity
            key={c}
            style={[styles.colorDot, { backgroundColor: c }, colorIndex === i && styles.colorDotSelected]}
            onPress={() => { setColorIndex(i); setChanged(true); }}
          >
            {colorIndex === i && <Ionicons name="checkmark" size={14} color={Colors.textSecondary} />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  saveBtn: {
    backgroundColor: Colors.primary,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  colorBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#00000010',
    backgroundColor: '#00000008',
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
