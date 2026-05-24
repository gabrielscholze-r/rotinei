import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { formatFeedbackDescription, submitFeedback } from '../../lib/feedbackService';
import { FeedbackScreen, FEEDBACK_SCREENS } from '../../lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface FormErrors {
  title?: string;
  screen?: string;
  description?: string;
}

export function FeedbackModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [screen, setScreen] = useState<FeedbackScreen | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showScreenPicker, setShowScreenPicker] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function clearError(field: keyof FormErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function reset() {
    setTitle('');
    setScreen(null);
    setDescription('');
    setLoading(false);
    setStatus('idle');
    setErrorMessage('');
    setErrors({});
    setShowScreenPicker(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = 'Título é obrigatório';
    if (!screen) next.screen = 'Selecione a tela';
    if (!description.trim()) next.description = 'Descrição é obrigatória';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setStatus('idle');
    try {
      await submitFeedback({
        title: title.trim(),
        description: formatFeedbackDescription(screen!, description.trim()),
      });
      setTitle('');
      setScreen(null);
      setDescription('');
      setErrors({});
      setStatus('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <View style={styles.sheetIconWrap}>
                  <Ionicons name="warning" size={18} color={Colors.warning} />
                </View>
                <Text style={styles.sheetTitle}>Reportar problema</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {status === 'success' ? (
              <View style={styles.successState}>
                <View style={styles.successIconWrap}>
                  <Ionicons name="checkmark-circle" size={52} color={Colors.success} />
                </View>
                <Text style={styles.successTitle}>Enviado com sucesso!</Text>
                <Text style={styles.successText}>
                  Sua reclamação foi registrada e será analisada em breve.
                </Text>
                <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                  <Text style={styles.doneBtnText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.field}>
                  <Text style={styles.label}>Título</Text>
                  <TextInput
                    style={[styles.input, errors.title ? styles.inputError : null]}
                    placeholder="Ex: App trava ao finalizar compra"
                    placeholderTextColor={Colors.textTertiary}
                    value={title}
                    onChangeText={(v) => { setTitle(v); clearError('title'); }}
                    maxLength={100}
                    returnKeyType="next"
                  />
                  {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Tela onde ocorreu</Text>
                  <TouchableOpacity
                    style={[styles.pickerBtn, errors.screen ? styles.inputError : null]}
                    onPress={() => setShowScreenPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={screen ? styles.pickerValue : styles.pickerPlaceholder}
                    >
                      {screen ?? 'Selecione a tela'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  {errors.screen ? <Text style={styles.errorText}>{errors.screen}</Text> : null}
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Descrição</Text>
                  <TextInput
                    style={[styles.textarea, errors.description ? styles.inputError : null]}
                    placeholder="Descreva o problema com o máximo de detalhes..."
                    placeholderTextColor={Colors.textTertiary}
                    value={description}
                    onChangeText={(v) => { setDescription(v); clearError('description'); }}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <View style={styles.textareaFooter}>
                    {errors.description ? (
                      <Text style={styles.errorText}>{errors.description}</Text>
                    ) : (
                      <View />
                    )}
                    <Text style={styles.charCount}>{description.length}/500</Text>
                  </View>
                </View>

                {status === 'error' ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.errorBannerText}>
                      {errorMessage || 'Falha ao enviar. Verifique sua conexão e tente novamente.'}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitBtn, loading ? styles.submitBtnDisabled : null]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={17} color="#fff" />
                      <Text style={styles.submitBtnText}>Enviar reclamação</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showScreenPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScreenPicker(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setShowScreenPicker(false)}
          />
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.handle} />
            <Text style={styles.pickerSheetTitle}>Selecionar tela</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {FEEDBACK_SCREENS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.screenOption, screen === s ? styles.screenOptionActive : null]}
                  onPress={() => {
                    setScreen(s);
                    clearError('screen');
                    setShowScreenPicker(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.screenOptionText,
                      screen === s ? styles.screenOptionTextActive : null,
                    ]}
                  >
                    {s}
                  </Text>
                  {screen === s ? (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  closeBtn: { padding: 2 },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textarea: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 110,
  },
  textareaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  inputError: { borderColor: Colors.danger },
  errorText: { fontSize: 12, color: Colors.danger, marginTop: 4 },
  charCount: { fontSize: 12, color: Colors.textTertiary, textAlign: 'right' },
  pickerBtn: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  pickerPlaceholder: { fontSize: 15, color: Colors.textTertiary },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorBannerText: { flex: 1, fontSize: 13, color: Colors.danger, fontWeight: '500' },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  successState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  successText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  doneBtn: {
    backgroundColor: Colors.success,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  pickerSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '60%',
  },
  pickerSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  screenOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  screenOptionActive: {
    backgroundColor: Colors.primaryLighter,
    borderColor: Colors.primary,
  },
  screenOptionText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  screenOptionTextActive: { color: Colors.primary, fontWeight: '600' },
});
