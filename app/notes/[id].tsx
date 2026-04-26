import {
  View, StyleSheet, TextInput, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Note } from '../../lib/types';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [allNotes, setAllNotes] = useState<Note[]>([]);

  useEffect(() => {
    getItem<Note[]>(KEYS.NOTES).then((notes) => {
      const all = notes ?? [];
      setAllNotes(all);
      setNote(all.find((n) => n.id === id) ?? null);
    });
  }, [id]);

  if (!note) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }
  return <NoteEditorView note={note} allNotes={allNotes} />;
}

function NoteEditorView({ note, allNotes }: { note: Note; allNotes: Note[] }) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [changed, setChanged] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(allNotes);

  const editor = useEditorBridge({
    avoidIosKeyboard: true,
    initialContent: note.content || '',
    onChange: () => setChanged(true),
    theme: {
      toolbar: {
        toolbarBody: {
          borderTopColor: Colors.border,
          borderBottomColor: Colors.border,
          backgroundColor: Colors.card,
        },
        toolbarButton: { backgroundColor: Colors.card },
        iconWrapper: { backgroundColor: Colors.card },
        icon: { tintColor: Colors.textSecondary },
        iconActive: { tintColor: Colors.primary },
        iconWrapperActive: { backgroundColor: Colors.primaryLighter },
        hidden: { display: 'none' },
      },
    },
  });


  async function save() {
    const html = await editor.getHTML();
    const updated: Note = {
      ...note,
      title,
      content: html,
      updatedAt: new Date().toISOString(),
    };
    const updatedAll = currentNotes.map((n) => (n.id === note.id ? updated : n));
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
          await setItem(KEYS.NOTES, currentNotes.filter((n) => n.id !== note.id));
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background }]}>
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

      <RichText
        editor={editor}
        style={{ flex: 1, backgroundColor: Colors.background }}
        onLoadEnd={() => editor.injectCSS('.ProseMirror { padding: 12px 20px 80px; }', 'prosemirror-padding')}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.toolbarKAV}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
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
    paddingTop: 8,
    paddingBottom: 14,
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
    marginBottom: 8,
  },
  toolbarKAV: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
  },
});
