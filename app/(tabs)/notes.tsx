import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAB } from '../../components/FAB';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Note, PrivateNote } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

function PinDots({ entered, total = 4 }: { entered: number; total?: number }) {
  return (
    <View style={pinStyles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[pinStyles.dot, i < entered && pinStyles.dotFilled]} />
      ))}
    </View>
  );
}

function PinPad({ onPress }: { onPress: (key: string) => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <View style={pinStyles.pad}>
      {keys.map((key, idx) => (
        key === '' ? (
          <View key={idx} style={pinStyles.keyEmpty} />
        ) : (
          <TouchableOpacity
            key={idx}
            style={[pinStyles.key, key === '⌫' && pinStyles.keyDel]}
            onPress={() => onPress(key)}
            activeOpacity={0.7}
          >
            <Text style={[pinStyles.keyText, key === '⌫' && pinStyles.keyDelText]}>{key}</Text>
          </TouchableOpacity>
        )
      ))}
    </View>
  );
}

const pinStyles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 32 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.primary },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    alignSelf: 'center',
    gap: 12,
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  keyEmpty: { width: 68, height: 68 },
  keyDel: { backgroundColor: Colors.borderLight },
  keyText: { fontSize: 24, fontWeight: '600', color: Colors.text },
  keyDelText: { fontSize: 20, color: Colors.textSecondary },
});



export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');

  
  const [notesTab, setNotesTab] = useState<'notas' | 'privado'>('notas');

  
  const [pin, setPin] = useState<string | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinStep, setPinStep] = useState<'enter' | 'setup_first' | 'setup_confirm'>('enter');
  const [firstPinValue, setFirstPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [privateNotes, setPrivateNotes] = useState<PrivateNote[]>([]);
  const [showAddPrivate, setShowAddPrivate] = useState(false);
  const [editingPrivate, setEditingPrivate] = useState<PrivateNote | null>(null);
  const [privateTitle, setPrivateTitle] = useState('');
  const [privateContent, setPrivateContent] = useState('');

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        
        setPinUnlocked(false);
        setEnteredPin('');
        setPinError('');
        setNotesTab('notas');
      };
    }, [])
  );

  async function load() {
    const [data, savedPin, privData] = await Promise.all([
      getItem<Note[]>(KEYS.NOTES),
      getItem<string>(KEYS.PRIVATE_PIN),
      getItem<PrivateNote[]>(KEYS.PRIVATE_NOTES),
    ]);
    setNotes(data ?? []);
    setPin(savedPin);
    setPrivateNotes(privData ?? []);
  }

  async function saveNotes(updated: Note[]) {
    await setItem(KEYS.NOTES, updated);
    setNotes(updated);
  }

  async function savePrivateNotes(updated: PrivateNote[]) {
    await setItem(KEYS.PRIVATE_NOTES, updated);
    setPrivateNotes(updated);
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
      color: '',
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
  }

  function deleteNote(id: string) {
    Alert.alert('Excluir nota', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => saveNotes(notes.filter((n) => n.id !== id)) },
    ]);
  }

  function deletePrivateNote(id: string) {
    Alert.alert('Excluir nota privada', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => savePrivateNotes(privateNotes.filter((n) => n.id !== id)) },
    ]);
  }

  function openEditPrivate(note: PrivateNote) {
    setEditingPrivate(note);
    setPrivateTitle(note.title);
    setPrivateContent(note.content);
    setShowAddPrivate(true);
  }

  function openNewPrivate() {
    setEditingPrivate(null);
    setPrivateTitle('');
    setPrivateContent('');
    setShowAddPrivate(true);
  }

  function savePrivateNote() {
    if (!privateTitle.trim() && !privateContent.trim()) {
      Alert.alert('Erro', 'Adicione um título ou conteúdo.');
      return;
    }
    if (editingPrivate) {
      const updated = privateNotes.map((n) =>
        n.id === editingPrivate.id
          ? { ...n, title: privateTitle.trim(), content: privateContent.trim(), updatedAt: new Date().toISOString() }
          : n
      );
      savePrivateNotes(updated);
    } else {
      const note: PrivateNote = {
        id: Date.now().toString(),
        title: privateTitle.trim(),
        content: privateContent.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePrivateNotes([note, ...privateNotes]);
    }
    setShowAddPrivate(false);
  }

  function handleSwitchToPrivado() {
    setNotesTab('privado');
    setEnteredPin('');
    setPinError('');
    setPinStep(pin === null ? 'setup_first' : 'enter');
    setFirstPinValue('');
  }

  function handlePinKey(key: string) {
    if (key === '⌫') {
      setEnteredPin((p) => p.slice(0, -1));
      setPinError('');
      return;
    }
    const next = enteredPin + key;
    if (next.length > 4) return;
    setEnteredPin(next);

    if (next.length === 4) {
      setTimeout(() => processPinComplete(next), 100);
    }
  }

  async function processPinComplete(entered: string) {
    if (pinStep === 'enter') {
      if (entered === pin) {
        setPinUnlocked(true);
        setEnteredPin('');
        setPinError('');
      } else {
        setEnteredPin('');
        setPinError('PIN incorreto. Tente novamente.');
      }
    } else if (pinStep === 'setup_first') {
      setFirstPinValue(entered);
      setPinStep('setup_confirm');
      setEnteredPin('');
    } else if (pinStep === 'setup_confirm') {
      if (entered === firstPinValue) {
        await setItem(KEYS.PRIVATE_PIN, entered);
        setPin(entered);
        setPinUnlocked(true);
        setEnteredPin('');
        setPinError('');
      } else {
        setEnteredPin('');
        setFirstPinValue('');
        setPinStep('setup_first');
        setPinError('PINs não coincidem. Tente novamente.');
      }
    }
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

  const pinTitle =
    pinStep === 'setup_first'
      ? 'Crie seu PIN'
      : pinStep === 'setup_confirm'
      ? 'Confirme seu PIN'
      : 'Digite seu PIN';

  const pinSubtitle =
    pinStep === 'setup_first'
      ? 'Este PIN protege suas notas privadas'
      : pinStep === 'setup_confirm'
      ? 'Digite novamente para confirmar'
      : 'Área protegida por PIN';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notas</Text>
        <View style={{ width: 40 }} />
      </View>

      
      <View style={styles.tabToggle}>
        <TouchableOpacity
          style={[styles.tabToggleBtn, notesTab === 'notas' && styles.tabToggleBtnActive]}
          onPress={() => setNotesTab('notas')}
        >
          <Text style={[styles.tabToggleText, notesTab === 'notas' && styles.tabToggleTextActive]}>Notas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabToggleBtn, notesTab === 'privado' && styles.tabToggleBtnActive]}
          onPress={handleSwitchToPrivado}
        >
          <Ionicons
            name="lock-closed"
            size={13}
            color={notesTab === 'privado' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabToggleText, notesTab === 'privado' && styles.tabToggleTextActive]}>Privado</Text>
        </TouchableOpacity>
      </View>

      {notesTab === 'notas' ? (
        <>
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
                  style={styles.noteCard}
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

          <FAB onPress={() => setShowAdd(true)} />
        </>
      ) : !pinUnlocked ? (
        /* ── PIN gate ── */
        <View style={styles.pinGate}>
          <View style={styles.pinLockIcon}>
            <Ionicons name="lock-closed" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.pinTitle}>{pinTitle}</Text>
          <Text style={styles.pinSubtitle}>{pinSubtitle}</Text>
          {pinError ? <Text style={styles.pinError}>{pinError}</Text> : null}
          <PinDots entered={enteredPin.length} />
          <PinPad onPress={handlePinKey} />
          {pin !== null && (
            <TouchableOpacity
              style={styles.forgotPinBtn}
              onPress={() => {
                Alert.alert(
                  'Redefinir PIN',
                  'Isso apagará todas as notas privadas. Continuar?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Redefinir',
                      style: 'destructive',
                      onPress: async () => {
                        await setItem(KEYS.PRIVATE_PIN, null as any);
                        await setItem(KEYS.PRIVATE_NOTES, []);
                        setPin(null);
                        setPrivateNotes([]);
                        setPinStep('setup_first');
                        setEnteredPin('');
                        setPinError('');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.forgotPinText}>Esqueci meu PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* ── Private notes (unlocked) ── */
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {privateNotes.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="lock-closed-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhuma nota privada</Text>
                <Text style={styles.emptySub}>Toque em + para adicionar senhas e anotações privadas</Text>
              </View>
            )}
            <View style={styles.privateGrid}>
              {privateNotes.map((note) => (
                <TouchableOpacity
                  key={note.id}
                  style={styles.privateCard}
                  onPress={() => openEditPrivate(note)}
                  activeOpacity={0.8}
                >
                  <View style={styles.noteCardHeader}>
                    <Ionicons name="lock-closed" size={13} color={Colors.textTertiary} style={{ marginTop: 1 }} />
                    {note.title ? (
                      <Text style={styles.privateTitle} numberOfLines={2}>{note.title}</Text>
                    ) : null}
                    <TouchableOpacity onPress={() => deletePrivateNote(note.id)} hitSlop={8}>
                      <Ionicons name="close" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  {note.content ? (
                    <Text style={styles.privateContent} numberOfLines={4}>{note.content}</Text>
                  ) : null}
                  <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <FAB onPress={openNewPrivate} />
        </>
      )}

      
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
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.noteEditor, { backgroundColor: Colors.background }]}>
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      
      <Modal visible={showAddPrivate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddPrivate(false)}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="lock-closed" size={14} color={Colors.textSecondary} />
              <Text style={styles.modalTitle}>{editingPrivate ? 'Editar nota' : 'Nova nota privada'}</Text>
            </View>
            <TouchableOpacity onPress={savePrivateNote}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[styles.noteEditor, { backgroundColor: '#F8FAFC' }]}>
              <TextInput
                style={styles.editorTitle}
                placeholder="Título (ex: Gmail, Banco...)"
                placeholderTextColor={Colors.textSecondary}
                value={privateTitle}
                onChangeText={setPrivateTitle}
                multiline
              />
              <TextInput
                style={styles.editorContent}
                placeholder="Anote aqui seus dados, senhas..."
                placeholderTextColor={Colors.textSecondary}
                value={privateContent}
                onChangeText={setPrivateContent}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>
          </KeyboardAvoidingView>
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
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '800', color: Colors.text },
  tabToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  tabToggleBtnActive: { backgroundColor: Colors.card },
  tabToggleText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabToggleTextActive: { color: Colors.primary },
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
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  noteCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  noteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  noteTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  noteContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  noteDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },
  
  privateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  privateCard: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    minHeight: 120,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  privateTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  privateContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  
  pinGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pinLockIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pinTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  pinSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28, textAlign: 'center' },
  pinError: { fontSize: 13, color: Colors.danger, marginBottom: 12, textAlign: 'center', fontWeight: '600' },
  forgotPinBtn: { marginTop: 28 },
  forgotPinText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  
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
});
