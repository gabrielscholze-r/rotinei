import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Note, PrivateNote, NoteGroup } from '../../lib/types';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { stripHtml } from '../../lib/textFormatting';

const GROUP_EMOJIS = ['📁', '📂', '🗂️', '📋', '📌', '📎', '🏷️', '⭐', '🎯', '💡', '🔑', '💎', '🎨', '🎵', '📚', '💼', '🏆', '🌟', '🔥', '❤️'];

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
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.primary, backgroundColor: 'transparent',
  },
  dotFilled: { backgroundColor: Colors.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, alignSelf: 'center', gap: 12 },
  key: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  keyEmpty: { width: 68, height: 68 },
  keyDel: { backgroundColor: Colors.borderLight },
  keyText: { fontSize: 24, fontWeight: '600', color: Colors.text },
  keyDelText: { fontSize: 20, color: Colors.textSecondary },
});

const EDITOR_THEME = {
  toolbar: {
    toolbarBody: {
      flex: 0, height: 44,
      borderTopColor: Colors.border, borderBottomColor: Colors.border,
      backgroundColor: Colors.card,
    },
    toolbarButton: { backgroundColor: Colors.card },
    iconWrapper: { backgroundColor: Colors.card },
    icon: { tintColor: Colors.textSecondary },
    iconActive: { tintColor: Colors.primary },
    iconWrapperActive: { backgroundColor: Colors.primaryLighter },
    hidden: { display: 'none' as const },
  },
};

export default function NotesScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
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

  // Group state
  const [groups, setGroups] = useState<NoteGroup[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<NoteGroup[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<NoteGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('📁');
  const [groupColor, setGroupColor] = useState(Colors.listColors[0]);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const noteEditor = useEditorBridge({ autofocus: true, avoidIosKeyboard: true, theme: EDITOR_THEME });
  const privateEditor = useEditorBridge({ autofocus: true, avoidIosKeyboard: true, theme: EDITOR_THEME });

  useEffect(() => {
    if (!showAddPrivate || !editingPrivate?.content) return;
    const content = editingPrivate.content;
    let applied = false;
    const unsub = privateEditor._subscribeToEditorStateUpdate(() => {
      if (!applied) { applied = true; privateEditor.setContent(content); }
    });
    return unsub;
  }, [showAddPrivate, editingPrivate?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        setPinUnlocked(false);
        setEnteredPin('');
        setPinError('');
        setNotesTab('notas');
        setCurrentGroupId(null);
        setBreadcrumb([]);
        setShowFabMenu(false);
      };
    }, [])
  );

  async function load() {
    const [data, savedPin, privData, groupData] = await Promise.all([
      getItem<Note[]>(KEYS.NOTES),
      getItem<string>(KEYS.PRIVATE_PIN),
      getItem<PrivateNote[]>(KEYS.PRIVATE_NOTES),
      getItem<NoteGroup[]>(KEYS.NOTE_GROUPS),
    ]);
    setNotes(data ?? []);
    setPin(savedPin);
    setPrivateNotes(privData ?? []);
    setGroups(groupData ?? []);
  }

  async function saveNotes(updated: Note[]) {
    await setItem(KEYS.NOTES, updated);
    setNotes(updated);
  }

  async function savePrivateNotes(updated: PrivateNote[]) {
    await setItem(KEYS.PRIVATE_NOTES, updated);
    setPrivateNotes(updated);
  }

  async function createNote() {
    const html = await noteEditor.getHTML();
    const isEmpty = !title.trim() && stripHtml(html).length === 0;
    if (isEmpty) { Alert.alert('Erro', 'Adicione um título ou conteúdo.'); return; }
    const note: Note = {
      id: Date.now().toString(),
      title: title.trim(),
      content: html,
      color: Colors.noteColors[Math.floor(Math.random() * Colors.noteColors.length)],
      groupId: currentGroupId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setTitle('');
    noteEditor.setContent('');
    setShowAdd(false);
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
    setShowAddPrivate(true);
  }

  function openNewPrivate() {
    setEditingPrivate(null);
    setPrivateTitle('');
    setShowAddPrivate(true);
  }

  async function savePrivateNote() {
    const html = await privateEditor.getHTML();
    const isEmpty = !privateTitle.trim() && stripHtml(html).length === 0;
    if (isEmpty) { Alert.alert('Erro', 'Adicione um título ou conteúdo.'); return; }
    if (editingPrivate) {
      const updated = privateNotes.map((n) =>
        n.id === editingPrivate.id
          ? { ...n, title: privateTitle.trim(), content: html, updatedAt: new Date().toISOString() }
          : n
      );
      savePrivateNotes(updated);
    } else {
      const note: PrivateNote = {
        id: Date.now().toString(),
        title: privateTitle.trim(),
        content: html,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      savePrivateNotes([note, ...privateNotes]);
    }
    setShowAddPrivate(false);
  }

  // ── Group navigation ──────────────────────────────────────────

  function enterGroup(group: NoteGroup) {
    setBreadcrumb(prev => [...prev, group]);
    setCurrentGroupId(group.id);
    setSearch('');
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
    setGroupEmoji('📁');
    setGroupColor(Colors.listColors[0]);
    setShowGroupModal(true);
    setShowFabMenu(false);
  }

  function openEditGroupModal(group: NoteGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupEmoji(group.emoji);
    setGroupColor(group.color);
    setShowGroupModal(true);
  }

  async function saveGroup() {
    if (!groupName.trim()) { Alert.alert('Erro', 'Informe um nome para o grupo.'); return; }
    if (editingGroup) {
      const updated = groups.map(g =>
        g.id === editingGroup.id
          ? { ...g, name: groupName.trim(), emoji: groupEmoji, color: groupColor }
          : g
      );
      await setItem(KEYS.NOTE_GROUPS, updated);
      setGroups(updated);
    } else {
      const group: NoteGroup = {
        id: Date.now().toString(),
        name: groupName.trim(),
        emoji: groupEmoji,
        color: groupColor,
        parentId: currentGroupId,
        createdAt: new Date().toISOString(),
      };
      const updated = [...groups, group];
      await setItem(KEYS.NOTE_GROUPS, updated);
      setGroups(updated);
    }
    setShowGroupModal(false);
    setEditingGroup(null);
  }

  function deleteGroup(group: NoteGroup) {
    Alert.alert(`Excluir "${group.name}"`, 'Remove o grupo e todo o conteúdo dentro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const getAllDescendantIds = (pid: string): string[] => {
            const children = groups.filter(g => g.parentId === pid);
            return [pid, ...children.flatMap(c => getAllDescendantIds(c.id))];
          };
          const idsToDelete = new Set(getAllDescendantIds(group.id));
          const updatedNotes = notes.filter(n => !idsToDelete.has(n.groupId ?? ''));
          const updatedGroups = groups.filter(g => !idsToDelete.has(g.id));
          await Promise.all([
            setItem(KEYS.NOTES, updatedNotes),
            setItem(KEYS.NOTE_GROUPS, updatedGroups),
          ]);
          setNotes(updatedNotes);
          setGroups(updatedGroups);
        },
      },
    ]);
  }

  function showGroupActions(group: NoteGroup) {
    Alert.alert(group.name, undefined, [
      { text: 'Editar', onPress: () => openEditGroupModal(group) },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteGroup(group) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }

  // ── PIN ───────────────────────────────────────────────────────

  function handleSwitchToPrivado() {
    setNotesTab('privado');
    setEnteredPin('');
    setPinError('');
    setPinStep(pin === null ? 'setup_first' : 'enter');
    setFirstPinValue('');
  }

  function handlePinKey(key: string) {
    if (key === '⌫') { setEnteredPin((p) => p.slice(0, -1)); setPinError(''); return; }
    const next = enteredPin + key;
    if (next.length > 4) return;
    setEnteredPin(next);
    if (next.length === 4) setTimeout(() => processPinComplete(next), 100);
  }

  async function processPinComplete(entered: string) {
    if (pinStep === 'enter') {
      if (entered === pin) { setPinUnlocked(true); setEnteredPin(''); setPinError(''); }
      else { setEnteredPin(''); setPinError('PIN incorreto. Tente novamente.'); }
    } else if (pinStep === 'setup_first') {
      setFirstPinValue(entered); setPinStep('setup_confirm'); setEnteredPin('');
    } else if (pinStep === 'setup_confirm') {
      if (entered === firstPinValue) {
        await setItem(KEYS.PRIVATE_PIN, entered);
        setPin(entered); setPinUnlocked(true); setEnteredPin(''); setPinError('');
      } else {
        setEnteredPin(''); setFirstPinValue(''); setPinStep('setup_first');
        setPinError('PINs não coincidem. Tente novamente.');
      }
    }
  }

  // ── Derived ───────────────────────────────────────────────────

  const childGroups = groups.filter(g => g.parentId === currentGroupId);

  const visibleNotes = search
    ? notes.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
      )
    : notes.filter(n => (n.groupId ?? null) === currentGroupId);

  function countGroupContent(groupId: string) {
    const noteCount = notes.filter(n => n.groupId === groupId).length;
    const subCount = groups.filter(g => g.parentId === groupId).length;
    const parts: string[] = [];
    if (noteCount > 0) parts.push(`${noteCount} nota${noteCount !== 1 ? 's' : ''}`);
    if (subCount > 0) parts.push(`${subCount} grupo${subCount !== 1 ? 's' : ''}`);
    return parts.length > 0 ? parts.join(' • ') : 'Vazio';
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const pinTitle = pinStep === 'setup_first' ? 'Crie seu PIN' : pinStep === 'setup_confirm' ? 'Confirme seu PIN' : 'Digite seu PIN';
  const pinSubtitle = pinStep === 'setup_first' ? 'Este PIN protege suas notas privadas' : pinStep === 'setup_confirm' ? 'Digite novamente para confirmar' : 'Área protegida por PIN';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (notesTab === 'notas' && currentGroupId !== null) { navigateBack(); }
            else { router.navigate(from === 'menu' ? '/(tabs)/menu' : '/(tabs)' as any); }
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {notesTab === 'notas' && breadcrumb.length > 0
            ? breadcrumb[breadcrumb.length - 1].name
            : 'Notas'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab toggle */}
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
          <Ionicons name="lock-closed" size={13} color={notesTab === 'privado' ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.tabToggleText, notesTab === 'privado' && styles.tabToggleTextActive]}>Privado</Text>
        </TouchableOpacity>
      </View>

      {/* ── NOTAS TAB ── */}
      {notesTab === 'notas' && (
        <>
          {/* Search */}
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

          {/* Breadcrumb */}
          {!search && breadcrumb.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.breadcrumbScroll}
              contentContainerStyle={styles.breadcrumbContent}
            >
              <TouchableOpacity onPress={() => navigateToCrumb(-1)}>
                <Text style={styles.breadcrumbItem}>Raiz</Text>
              </TouchableOpacity>
              {breadcrumb.map((g, i) => (
                <View key={g.id} style={styles.breadcrumbRow}>
                  <Ionicons name="chevron-forward" size={13} color={Colors.textTertiary} />
                  <TouchableOpacity onPress={() => navigateToCrumb(i)}>
                    <Text style={[
                      styles.breadcrumbItem,
                      i === breadcrumb.length - 1 && styles.breadcrumbActive,
                    ]}>
                      {g.emoji} {g.name}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Group cards */}
            {!search && childGroups.map(group => (
              <TouchableOpacity
                key={group.id}
                style={[styles.groupCard, { borderLeftColor: group.color }]}
                onPress={() => enterGroup(group)}
                onLongPress={() => showGroupActions(group)}
                activeOpacity={0.8}
              >
                <View style={styles.groupCardLeft}>
                  <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>{countGroupContent(group.id)}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            ))}

            {/* Empty state */}
            {!search && childGroups.length === 0 && visibleNotes.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="document-text-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>
                  {currentGroupId ? 'Grupo vazio' : 'Nenhuma nota'}
                </Text>
                <Text style={styles.emptySub}>
                  {currentGroupId
                    ? 'Toque em + para criar uma nota ou grupo'
                    : 'Toque em + para criar sua primeira nota'}
                </Text>
              </View>
            )}
            {search && visibleNotes.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhum resultado</Text>
                <Text style={styles.emptySub}>Tente outra busca</Text>
              </View>
            )}

            {/* Note cards */}
            {visibleNotes.length > 0 && (
              <View style={styles.grid}>
                {visibleNotes.map((note) => (
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
                      <Text style={styles.noteContent} numberOfLines={6}>{stripHtml(note.content)}</Text>
                    ) : null}
                    <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
                <Text style={styles.fabMenuLabel}>Novo grupo</Text>
                <View style={[styles.fabMini, { backgroundColor: Colors.listColors[1] }]}>
                  <Ionicons name="folder" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fabMenuRow}
                onPress={() => { setShowFabMenu(false); setShowAdd(true); }}
              >
                <Text style={styles.fabMenuLabel}>Nova nota</Text>
                <View style={[styles.fabMini, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="create" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.fabMain, showFabMenu && styles.fabMainActive, { bottom: insets.bottom + 24 }]}
            onPress={() => setShowFabMenu(v => !v)}
          >
            <Ionicons name={showFabMenu ? 'close' : 'add'} size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* ── PRIVADO: PIN gate ── */}
      {notesTab === 'privado' && !pinUnlocked && (
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
                Alert.alert('Redefinir PIN', 'Isso apagará todas as notas privadas. Continuar?', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Redefinir',
                    style: 'destructive',
                    onPress: async () => {
                      await setItem(KEYS.PRIVATE_PIN, null as any);
                      await setItem(KEYS.PRIVATE_NOTES, []);
                      setPin(null); setPrivateNotes([]); setPinStep('setup_first');
                      setEnteredPin(''); setPinError('');
                    },
                  },
                ]);
              }}
            >
              <Text style={styles.forgotPinText}>Esqueci meu PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── PRIVADO: unlocked ── */}
      {notesTab === 'privado' && pinUnlocked && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {privateNotes.length === 0 && (
              <View style={styles.empty}>
                <Ionicons name="lock-closed-outline" size={56} color={Colors.textTertiary} />
                <Text style={styles.emptyTitle}>Nenhuma nota privada</Text>
                <Text style={styles.emptySub}>Toque em + para adicionar</Text>
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
                    <Text style={styles.privateContent} numberOfLines={4}>{stripHtml(note.content)}</Text>
                  ) : null}
                  <Text style={styles.noteDate}>{formatDate(note.updatedAt)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity
            style={[styles.fabMain, { bottom: insets.bottom + 24 }]}
            onPress={openNewPrivate}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        </>
      )}

      {/* ── Note creation modal ── */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowAdd(false); setTitle(''); noteEditor.setContent(''); }}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Nova nota</Text>
            <TouchableOpacity onPress={createNote}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.editorTitle}
            placeholder="Título"
            placeholderTextColor={Colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            multiline
          />
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            {showAdd && (
              <RichText
                editor={noteEditor}
                style={{ flex: 1, backgroundColor: Colors.background }}
                onLoadEnd={() => noteEditor.injectCSS('.ProseMirror { padding: 12px 20px; }', 'prosemirror-padding')}
              />
            )}
            <View style={{ height: 44 }}>
              <Toolbar editor={noteEditor} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Private note modal ── */}
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
          <TextInput
            style={styles.editorTitle}
            placeholder="Título (ex: Gmail, Banco...)"
            placeholderTextColor={Colors.textSecondary}
            value={privateTitle}
            onChangeText={setPrivateTitle}
            multiline
          />
          <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            {showAddPrivate && (
              <RichText
                editor={privateEditor}
                style={{ flex: 1, backgroundColor: '#F8FAFC' }}
                onLoadEnd={() => privateEditor.injectCSS('.ProseMirror { padding: 12px 20px; }', 'prosemirror-padding')}
              />
            )}
            <View style={{ height: 44 }}>
              <Toolbar editor={privateEditor} />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ── Group modal ── */}
      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowGroupModal(false); setEditingGroup(null); }}>
              <Text style={styles.cancelBtn}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingGroup ? 'Editar grupo' : 'Novo grupo'}</Text>
            <TouchableOpacity onPress={saveGroup}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Nome</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Trabalho, Pessoal, Receitas..."
              placeholderTextColor={Colors.textTertiary}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus={!editingGroup}
            />
            <Text style={styles.modalLabel}>Emoji</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiRow}>
                {GROUP_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, groupEmoji === e && styles.emojiBtnSelected]}
                    onPress={() => setGroupEmoji(e)}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.modalLabel}>Cor</Text>
            <View style={styles.colorRow}>
              {Colors.listColors.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, groupColor === c && styles.colorDotSelected]}
                  onPress={() => setGroupColor(c)}
                >
                  {groupColor === c && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 28, fontWeight: '800', color: Colors.text },
  tabToggle: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: Colors.borderLight, borderRadius: 12, padding: 4, marginBottom: 12,
  },
  tabToggleBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  tabToggleBtnActive: { backgroundColor: Colors.card },
  tabToggleText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  tabToggleTextActive: { color: Colors.primary },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card,
    borderRadius: 12, marginHorizontal: 20, marginBottom: 16,
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },

  // Breadcrumb
  breadcrumbScroll: { marginHorizontal: 20, marginBottom: 12 },
  breadcrumbContent: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 20 },
  breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breadcrumbItem: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  breadcrumbActive: { color: Colors.primary, fontWeight: '700' },

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
  groupEmoji: { fontSize: 24 },
  groupName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  groupMeta: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center', paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  noteCard: {
    width: '47%', borderRadius: 16, padding: 14, minHeight: 120,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  noteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  noteTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  noteContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  noteDate: { fontSize: 11, color: Colors.textTertiary, marginTop: 8 },

  privateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  privateCard: {
    width: '47%', borderRadius: 16, padding: 14, minHeight: 120,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  privateTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text },
  privateContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  // PIN
  pinGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  pinLockIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: Colors.primaryLighter, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  pinTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6, textAlign: 'center' },
  pinSubtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28, textAlign: 'center' },
  pinError: { fontSize: 13, color: Colors.danger, marginBottom: 12, textAlign: 'center', fontWeight: '600' },
  forgotPinBtn: { marginTop: 28 },
  forgotPinText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },

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
  fabMain: {
    position: 'absolute', right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 6, zIndex: 10,
  },
  fabMainActive: { backgroundColor: Colors.danger },

  // Modals
  modal: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cancelBtn: { fontSize: 16, color: Colors.textSecondary },
  saveText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  editorTitle: {
    fontSize: 22, fontWeight: '700', color: Colors.text,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  modalLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 10, marginTop: 16 },
  modalInput: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, fontSize: 16, color: Colors.text,
  },
  emojiRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  emojiBtn: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: Colors.borderLight, alignItems: 'center', justifyContent: 'center',
  },
  emojiBtnSelected: { backgroundColor: Colors.primaryLight, borderWidth: 2, borderColor: Colors.primary },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  colorDot: {
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
});
