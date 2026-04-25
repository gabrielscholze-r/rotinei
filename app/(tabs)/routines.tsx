import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FAB } from '../../components/FAB';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Routine, RoutineLog } from '../../lib/types';
import {
  getTodayKey, isRoutineForToday, isRoutineCompletedToday,
  formatRoutineDays, DAY_LABELS,
} from '../../lib/routines';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const ROUTINE_COLORS = Colors.medColors;

const ROUTINE_EMOJIS = [
  '💧','🏋️','🧘','💊','☕','📚','🏃','😴','🥗','🎯',
  '🚶','🚴','🧹','🌅','🎵','💻','🥤','📝','🌿','🍎',
  '🐕','🧴','🪥','💤','🎨','📖','🧠','🫀','🧘‍♂️','🌙',
];

const pad = (n: number) => n.toString().padStart(2, '0');

interface AddForm {
  name: string;
  icon: string;
  description: string;
  hour: string;
  minute: string;
  days: number[];
  colorIndex: number;
}

const DEFAULT_FORM: AddForm = {
  name: '',
  icon: '💧',
  description: '',
  hour: '',
  minute: '',
  days: [],
  colorIndex: 0,
};


async function setupNotifications() {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('routines', {
        name: 'Rotinas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
        sound: 'default',
      });
    }
  } catch {}
}

async function scheduleRoutineNotifications(
  routine: Pick<Routine, 'name' | 'icon' | 'description' | 'time' | 'days'>
): Promise<string[]> {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return [];
    const [h, m] = routine.time.split(':');
    const hour = parseInt(h);
    const minute = parseInt(m);
    const content = {
      title: `${routine.icon} ${routine.name}`,
      body: routine.description || 'Hora da sua rotina!',
      sound: 'default' as const,
      ...(Platform.OS === 'android' && { channelId: 'routines' }),
    };
    const ids: string[] = [];
    if (routine.days.length === 0) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        } as Notifications.DailyTriggerInput,
      });
      ids.push(id);
    } else {
      for (const day of routine.days) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: day + 1,
            hour,
            minute,
          } as Notifications.WeeklyTriggerInput,
        });
        ids.push(id);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

async function cancelRoutineNotifications(ids: string[]) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
  }
}

export default function RoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<RoutineLog[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [form, setForm] = useState<AddForm>(DEFAULT_FORM);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => { setupNotifications(); }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    const [r, l] = await Promise.all([
      getItem<Routine[]>(KEYS.ROUTINES),
      getItem<RoutineLog[]>(KEYS.ROUTINE_LOGS),
    ]);
    setRoutines(r ?? []);
    setLogs(l ?? []);
  }

  async function saveRoutines(updated: Routine[]) {
    await setItem(KEYS.ROUTINES, updated);
    setRoutines(updated);
  }

  async function saveLogs(updated: RoutineLog[]) {
    await setItem(KEYS.ROUTINE_LOGS, updated);
    setLogs(updated);
  }

  function openAdd() {
    const now = new Date();
    setForm({ ...DEFAULT_FORM, hour: pad(now.getHours()), minute: pad(now.getMinutes()) });
    setEditingRoutine(null);
    setShowAdd(true);
  }

  function openEdit(routine: Routine) {
    const [h, m] = routine.time.split(':');
    const colorIndex = ROUTINE_COLORS.indexOf(routine.color);
    setForm({
      name: routine.name,
      icon: routine.icon,
      description: routine.description ?? '',
      hour: h,
      minute: m,
      days: routine.days,
      colorIndex: colorIndex >= 0 ? colorIndex : 0,
    });
    setEditingRoutine(routine);
    setShowAdd(true);
  }

  async function addRoutine() {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome da rotina.');
      return;
    }
    const h = parseInt(form.hour);
    const m = parseInt(form.minute);
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Erro', 'Horário inválido.');
      return;
    }
    const time = `${pad(h)}:${pad(m)}`;
    const partial = { name: form.name.trim(), icon: form.icon, description: form.description.trim(), time, days: form.days };
    const notificationIds = await scheduleRoutineNotifications(partial);
    const routine: Routine = {
      id: Date.now().toString(),
      ...partial,
      color: ROUTINE_COLORS[form.colorIndex],
      active: true,
      notificationIds,
      createdAt: new Date().toISOString(),
    };
    await saveRoutines([routine, ...routines]);
    setShowAdd(false);
  }

  async function updateRoutine() {
    if (!editingRoutine) return;
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome da rotina.');
      return;
    }
    const h = parseInt(form.hour);
    const m = parseInt(form.minute);
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Erro', 'Horário inválido.');
      return;
    }
    const time = `${pad(h)}:${pad(m)}`;
    const partial = { name: form.name.trim(), icon: form.icon, description: form.description.trim(), time, days: form.days };
    await cancelRoutineNotifications(editingRoutine.notificationIds);
    const notificationIds = editingRoutine.active ? await scheduleRoutineNotifications(partial) : [];
    const updated: Routine = {
      ...editingRoutine,
      ...partial,
      color: ROUTINE_COLORS[form.colorIndex],
      notificationIds,
    };
    await saveRoutines(routines.map((r) => r.id === editingRoutine.id ? updated : r));
    setEditingRoutine(null);
    setShowAdd(false);
  }

  async function deleteRoutine(routine: Routine) {
    Alert.alert('Remover rotina', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: async () => {
          await cancelRoutineNotifications(routine.notificationIds);
          await saveRoutines(routines.filter((r) => r.id !== routine.id));
        },
      },
    ]);
  }

  async function toggleActive(routine: Routine) {
    if (routine.active) {
      await cancelRoutineNotifications(routine.notificationIds);
      await saveRoutines(routines.map((r) => r.id === routine.id ? { ...r, active: false, notificationIds: [] } : r));
    } else {
      const notificationIds = await scheduleRoutineNotifications(routine);
      await saveRoutines(routines.map((r) => r.id === routine.id ? { ...r, active: true, notificationIds } : r));
    }
  }

  async function markDone(routineId: string) {
    const today = getTodayKey();
    if (isRoutineCompletedToday(routineId, logs)) return;
    const log: RoutineLog = {
      id: Date.now().toString(),
      routineId,
      date: today,
      completedAt: new Date().toISOString(),
    };
    await saveLogs([log, ...logs]);
  }

  function toggleDay(day: number) {
    const days = form.days.includes(day)
      ? form.days.filter((d) => d !== day)
      : [...form.days, day].sort();
    setForm({ ...form, days });
  }

  const todayRoutines = routines.filter(isRoutineForToday);
  const sortedToday = [...todayRoutines].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.navigate('/(tabs)' as any)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Rotinas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        <Text style={styles.sectionTitle}>Hoje</Text>
        {sortedToday.length === 0 ? (
          <View style={styles.emptyToday}>
            <Text style={styles.emptyTodayText}>Nenhuma rotina para hoje</Text>
          </View>
        ) : (
          sortedToday.map((routine) => {
            const done = isRoutineCompletedToday(routine.id, logs);
            return (
              <View key={routine.id} style={[styles.todayCard, done && styles.todayCardDone]}>
                <View style={[styles.routineDot, { backgroundColor: routine.color }]} />
                <Text style={styles.routineEmoji}>{routine.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routineName, done && styles.routineNameDone]}>{routine.name}</Text>
                  <Text style={styles.routineMeta}>{routine.time} · {formatRoutineDays(routine.days)}</Text>
                </View>
                {done ? (
                  <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
                ) : (
                  <TouchableOpacity
                    style={[styles.doneBtn, { backgroundColor: routine.color }]}
                    onPress={() => markDone(routine.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.doneBtnText}>Feito</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Todas as rotinas</Text>
        {routines.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhuma rotina</Text>
            <Text style={styles.emptySub}>Toque em + para criar sua primeira rotina</Text>
          </View>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={[styles.routineCard, !routine.active && styles.routineCardInactive]}>
              <View style={[styles.routineIconBg, { backgroundColor: routine.color + '20' }]}>
                <Text style={{ fontSize: 22 }}>{routine.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routineName, !routine.active && styles.routineNameDone]}>{routine.name}</Text>
                <Text style={styles.routineMeta}>{routine.time} · {formatRoutineDays(routine.days)}</Text>
                {routine.description ? (
                  <Text style={styles.routineDesc} numberOfLines={1}>{routine.description}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={() => openEdit(routine)} hitSlop={8} style={{ marginRight: 8 }}>
                <Ionicons name="create-outline" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleActive(routine)} hitSlop={8} style={{ marginRight: 8 }}>
                <Ionicons
                  name={routine.active ? 'toggle' : 'toggle-outline'}
                  size={28}
                  color={routine.active ? routine.color : Colors.textTertiary}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteRoutine(routine)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <FAB onPress={openAdd} />

      
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingRoutine ? 'Editar rotina' : 'Nova rotina'}</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); setEditingRoutine(null); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">

            <Text style={styles.label}>Ícone</Text>
            <TouchableOpacity style={styles.emojiPickerBtn} onPress={() => setShowEmojiPicker(!showEmojiPicker)}>
              <Text style={styles.emojiPickerValue}>{form.icon}</Text>
              <Text style={styles.emojiPickerHint}>Toque para escolher</Text>
              <Ionicons name={showEmojiPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            {showEmojiPicker && (
              <View style={styles.emojiGrid}>
                {ROUTINE_EMOJIS.map((emoji, idx) => (
                  <TouchableOpacity
                    key={`${emoji}-${idx}`}
                    style={[styles.emojiBtn, form.icon === emoji && { borderColor: ROUTINE_COLORS[form.colorIndex], borderWidth: 2 }]}
                    onPress={() => { setForm({ ...form, icon: emoji }); setShowEmojiPicker(false); }}
                  >
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.label}>Nome *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Tomar água, Academia..."
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 2 copos de água"
              placeholderTextColor={Colors.textTertiary}
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
            />

            <Text style={styles.label}>Horário do alarme</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="numeric"
                placeholder="08"
                placeholderTextColor={Colors.textTertiary}
                maxLength={2}
                value={form.hour}
                onChangeText={(v) => setForm({ ...form, hour: v })}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="numeric"
                placeholder="00"
                placeholderTextColor={Colors.textTertiary}
                maxLength={2}
                value={form.minute}
                onChangeText={(v) => setForm({ ...form, minute: v })}
              />
            </View>

            <Text style={styles.label}>Dias da semana</Text>
            <Text style={styles.hintText}>Deixe vazio para repetir todo dia</Text>
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dayBtn,
                    form.days.includes(i) && { backgroundColor: ROUTINE_COLORS[form.colorIndex], borderColor: ROUTINE_COLORS[form.colorIndex] },
                  ]}
                  onPress={() => toggleDay(i)}
                >
                  <Text style={[styles.dayBtnText, form.days.includes(i) && { color: '#fff' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {ROUTINE_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c }, form.colorIndex === i && styles.colorDotSelected]}
                  onPress={() => setForm({ ...form, colorIndex: i })}
                >
                  {form.colorIndex === i && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={editingRoutine ? updateRoutine : addRoutine}>
              <Text style={styles.saveBtnText}>{editingRoutine ? 'Salvar alterações' : 'Criar rotina'}</Text>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyToday: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  emptyTodayText: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  todayCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  todayCardDone: { opacity: 0.65 },
  routineDot: { width: 8, height: 8, borderRadius: 4 },
  routineEmoji: { fontSize: 22 },
  routineName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  routineNameDone: { textDecorationLine: 'line-through', color: Colors.textSecondary },
  routineMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  routineDesc: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  routineCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  routineCardInactive: { opacity: 0.55 },
  routineIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  hintText: { fontSize: 12, color: Colors.textTertiary, marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.text,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  timeSep: { fontSize: 22, fontWeight: '700', color: Colors.text },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  dayBtnText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: Colors.text },
  emojiPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  emojiPickerValue: { fontSize: 26 },
  emojiPickerHint: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: Colors.borderLight,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
