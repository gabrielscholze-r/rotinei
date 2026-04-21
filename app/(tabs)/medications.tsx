import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import { Colors } from '../../constants/colors';
import { getItem, setItem, KEYS } from '../../lib/storage';
import { Medication, MedicationDose } from '../../lib/types';
import {
  generateDoses, getNextDose, getOverdueDoses,
  getMedicationProgress, formatDateTime, formatTime,
} from '../../lib/medications';
import { useFocusEffect } from '@react-navigation/native';

const MED_COLORS = Colors.medColors;

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: { height: '100%', borderRadius: 3 },
});

interface AddMedForm {
  name: string;
  dosage: string;
  intervalHours: string;
  durationDays: string;
  startHour: string;
  startMinute: string;
  colorIndex: number;
}

const DEFAULT_FORM: AddMedForm = {
  name: '',
  dosage: '',
  intervalHours: '6',
  durationDays: '3',
  startHour: '',
  startMinute: '',
  colorIndex: 0,
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function MedicationsScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddMedForm>(DEFAULT_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadMeds();
    }, [])
  );

  async function loadMeds() {
    const meds = await getItem<Medication[]>(KEYS.MEDICATIONS);
    setMedications(meds ?? []);
  }

  async function saveMeds(meds: Medication[]) {
    await setItem(KEYS.MEDICATIONS, meds);
    setMedications(meds);
  }

  function openAdd() {
    const now = new Date();
    setForm({
      ...DEFAULT_FORM,
      startHour: pad(now.getHours()),
      startMinute: pad(now.getMinutes()),
    });
    setShowAdd(true);
  }

  function addMedication() {
    if (!form.name.trim()) {
      Alert.alert('Erro', 'Informe o nome do remédio.');
      return;
    }
    const interval = parseInt(form.intervalHours);
    const duration = parseInt(form.durationDays);
    const hour = parseInt(form.startHour);
    const minute = parseInt(form.startMinute);
    if (isNaN(interval) || interval < 1 || isNaN(duration) || duration < 1) {
      Alert.alert('Erro', 'Intervalo e duração devem ser números válidos.');
      return;
    }
    if (isNaN(hour) || hour < 0 || hour > 23 || isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert('Erro', 'Horário inicial inválido.');
      return;
    }
    const startTime = new Date();
    startTime.setHours(hour, minute, 0, 0);
    const doses = generateDoses(startTime, interval, duration);
    const med: Medication = {
      id: Date.now().toString(),
      name: form.name.trim(),
      dosage: form.dosage.trim(),
      intervalHours: interval,
      durationDays: duration,
      startTime: startTime.toISOString(),
      doses,
      color: MED_COLORS[form.colorIndex],
      createdAt: new Date().toISOString(),
    };
    const updated = [med, ...medications];
    saveMeds(updated);
    setShowAdd(false);
  }

  async function markTaken(medId: string, doseId: string) {
    const updated = medications.map((m) => {
      if (m.id !== medId) return m;
      return {
        ...m,
        doses: m.doses.map((d) =>
          d.id === doseId ? { ...d, takenAt: new Date().toISOString() } : d
        ),
      };
    });
    await saveMeds(updated);
  }

  async function deleteMedication(medId: string) {
    Alert.alert('Remover remédio', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          await saveMeds(medications.filter((m) => m.id !== medId));
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Remédios</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {medications.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="medical-outline" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nenhum remédio</Text>
            <Text style={styles.emptySub}>Toque em + para adicionar uma rotina</Text>
          </View>
        )}

        {medications.map((med) => {
          const overdue = getOverdueDoses(med);
          const next = getNextDose(med);
          const progress = getMedicationProgress(med);
          const isExpanded = expandedId === med.id;
          const taken = med.doses.filter((d) => d.takenAt).length;
          const total = med.doses.length;
          const isFinished = taken === total;

          return (
            <View key={med.id} style={[styles.medCard, isFinished && styles.medCardDone]}>
              <TouchableOpacity
                onPress={() => setExpandedId(isExpanded ? null : med.id)}
                activeOpacity={0.8}
              >
                <View style={styles.medHeader}>
                  <View style={[styles.medDot, { backgroundColor: med.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.dosage ? (
                      <Text style={styles.medDosage}>{med.dosage}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity onPress={() => deleteMedication(med.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                  </TouchableOpacity>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={Colors.textTertiary}
                    style={{ marginLeft: 8 }}
                  />
                </View>

                <View style={styles.medInfo}>
                  <View style={styles.medPill}>
                    <Ionicons name="time-outline" size={13} color={Colors.primary} />
                    <Text style={styles.medPillText}>
                      A cada {med.intervalHours}h
                    </Text>
                  </View>
                  <View style={styles.medPill}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
                    <Text style={styles.medPillText}>
                      {med.durationDays} dias
                    </Text>
                  </View>
                  <View style={[styles.medPill, { backgroundColor: isFinished ? Colors.successLight : Colors.primaryLighter }]}>
                    <Text style={[styles.medPillText, { color: isFinished ? Colors.success : Colors.primary }]}>
                      {taken}/{total} doses
                    </Text>
                  </View>
                </View>

                <ProgressBar progress={progress} color={med.color} />

                {overdue.length > 0 && (
                  <View style={styles.overdueTag}>
                    <Ionicons name="alert-circle" size={14} color={Colors.danger} />
                    <Text style={styles.overdueText}>
                      {overdue.length} dose{overdue.length > 1 ? 's' : ''} em atraso
                    </Text>
                  </View>
                )}

                {next && !isFinished && (
                  <Text style={styles.nextDoseText}>
                    Próxima: {formatDateTime(next.scheduledAt)}
                  </Text>
                )}

                {isFinished && (
                  <Text style={styles.finishedText}>✓ Tratamento concluído</Text>
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.doseList}>
                  <Text style={styles.doseListTitle}>Todas as doses</Text>
                  {med.doses.map((dose, idx) => {
                    const isPast = new Date(dose.scheduledAt) < new Date();
                    const isOverdue = isPast && !dose.takenAt && !dose.skipped;
                    return (
                      <View key={dose.id} style={styles.doseRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.doseIndex}>Dose {idx + 1}</Text>
                          <Text style={[
                            styles.doseTime,
                            isOverdue && { color: Colors.danger },
                            dose.takenAt && { color: Colors.success },
                          ]}>
                            {formatDateTime(dose.scheduledAt)}
                          </Text>
                          {dose.takenAt && (
                            <Text style={styles.doseTaken}>
                              Tomado às {formatTime(dose.takenAt)}
                            </Text>
                          )}
                        </View>
                        {!dose.takenAt && !dose.skipped && (
                          <TouchableOpacity
                            style={[
                              styles.takeBtn,
                              { backgroundColor: isOverdue ? Colors.danger : med.color },
                            ]}
                            onPress={() => markTaken(med.id, dose.id)}
                          >
                            <Text style={styles.takeBtnText}>Tomar</Text>
                          </TouchableOpacity>
                        )}
                        {dose.takenAt && (
                          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo remédio</Text>
            <TouchableOpacity onPress={() => setShowAdd(false)}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Nome do remédio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Amoxicilina"
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <Text style={styles.label}>Dosagem</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 500mg, 1 comprimido"
              placeholderTextColor={Colors.textTertiary}
              value={form.dosage}
              onChangeText={(v) => setForm({ ...form, dosage: v })}
            />

            <Text style={styles.label}>Intervalo entre doses (horas)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="6"
              placeholderTextColor={Colors.textTertiary}
              value={form.intervalHours}
              onChangeText={(v) => setForm({ ...form, intervalHours: v })}
            />

            <Text style={styles.label}>Duração do tratamento (dias)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="3"
              placeholderTextColor={Colors.textTertiary}
              value={form.durationDays}
              onChangeText={(v) => setForm({ ...form, durationDays: v })}
            />

            <Text style={styles.label}>Horário da primeira dose</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="numeric"
                placeholder="11"
                placeholderTextColor={Colors.textTertiary}
                maxLength={2}
                value={form.startHour}
                onChangeText={(v) => setForm({ ...form, startHour: v })}
              />
              <Text style={styles.timeSep}>:</Text>
              <TextInput
                style={[styles.input, styles.timeInput]}
                keyboardType="numeric"
                placeholder="00"
                placeholderTextColor={Colors.textTertiary}
                maxLength={2}
                value={form.startMinute}
                onChangeText={(v) => setForm({ ...form, startMinute: v })}
              />
            </View>

            <Text style={styles.label}>Cor</Text>
            <View style={styles.colorRow}>
              {MED_COLORS.map((c, i) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    form.colorIndex === i && styles.colorDotSelected,
                  ]}
                  onPress={() => setForm({ ...form, colorIndex: i })}
                >
                  {form.colorIndex === i && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {form.intervalHours && form.durationDays && form.startHour && form.startMinute && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>Prévia das doses</Text>
                <Text style={styles.previewText}>
                  {Math.ceil(
                    (parseInt(form.durationDays) * 24) / parseInt(form.intervalHours || '1')
                  )}{' '}
                  doses no total
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={addMedication}>
              <Text style={styles.saveBtnText}>Adicionar remédio</Text>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  addBtn: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: 20, paddingTop: 4, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: 14, color: Colors.textTertiary, textAlign: 'center' },
  medCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medCardDone: { opacity: 0.7 },
  medHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  medDot: { width: 12, height: 12, borderRadius: 6 },
  medName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  medDosage: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  medInfo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  medPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryLighter,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  medPillText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  overdueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 8,
    padding: 6,
    alignSelf: 'flex-start',
  },
  overdueText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  nextDoseText: { fontSize: 13, color: Colors.textSecondary, marginTop: 8 },
  finishedText: { fontSize: 13, color: Colors.success, marginTop: 8, fontWeight: '600' },
  doseList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  doseListTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8 },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  doseIndex: { fontSize: 12, color: Colors.textTertiary },
  doseTime: { fontSize: 14, fontWeight: '600', color: Colors.text },
  doseTaken: { fontSize: 12, color: Colors.success },
  takeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  takeBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1, textAlign: 'center' },
  timeSep: { fontSize: 22, fontWeight: '700', color: Colors.text },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: Colors.text,
  },
  previewBox: {
    backgroundColor: Colors.primaryLighter,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  previewTitle: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  previewText: { fontSize: 15, color: Colors.primary, marginTop: 4 },
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
