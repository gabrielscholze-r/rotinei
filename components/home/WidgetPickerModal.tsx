import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Goal, HomeWidget, Note, Routine, TodoList, WidgetSize, WidgetType } from '../../lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TypeOption {
  type: WidgetType;
  label: string;
  description: string;
  icon: string;
  hasEntity: boolean;
  allowedSizes: WidgetSize[];
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'routines_today',
    label: 'Rotinas de Hoje',
    description: 'Suas rotinas do dia com status',
    icon: '⏰',
    hasEntity: false,
    allowedSizes: ['medium', 'large'],
  },
  {
    type: 'routine',
    label: 'Rotina Específica',
    description: 'Uma rotina com horário e status',
    icon: '🔔',
    hasEntity: true,
    allowedSizes: ['small', 'medium'],
  },
  {
    type: 'todo_list',
    label: 'Lista de Tarefas',
    description: 'Progresso de uma lista',
    icon: '✅',
    hasEntity: true,
    allowedSizes: ['small', 'medium', 'large'],
  },
  {
    type: 'note',
    label: 'Nota',
    description: 'Prévia de uma nota',
    icon: '📝',
    hasEntity: true,
    allowedSizes: ['small', 'medium'],
  },
  {
    type: 'goal',
    label: 'Meta',
    description: 'Progresso de uma meta financeira',
    icon: '🎯',
    hasEntity: true,
    allowedSizes: ['medium', 'large'],
  },
  {
    type: 'expense_summary',
    label: 'Resumo de Gastos',
    description: 'Total de gastos do período',
    icon: '💰',
    hasEntity: false,
    allowedSizes: ['medium', 'large'],
  },
];

const SIZE_LABELS: Record<WidgetSize, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (widget: Omit<HomeWidget, 'id' | 'order'>) => void;
  routines: Routine[];
  todoLists: TodoList[];
  notes: Note[];
  goals: Goal[];
}

export function WidgetPickerModal({ visible, onClose, onAdd, routines, todoLists, notes, goals }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<TypeOption | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | undefined>(undefined);
  const [selectedSize, setSelectedSize] = useState<WidgetSize>('medium');

  function reset() {
    setStep(1);
    setSelectedType(null);
    setSelectedEntityId(undefined);
    setSelectedSize('medium');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelectType(option: TypeOption) {
    setSelectedType(option);
    setSelectedSize(option.allowedSizes.includes('medium') ? 'medium' : option.allowedSizes[0]);
    if (option.hasEntity) {
      setStep(2);
    } else {
      setStep(3);
    }
  }

  function handleSelectEntity(entityId: string) {
    setSelectedEntityId(entityId);
    setStep(3);
  }

  function handleAdd() {
    if (!selectedType) return;
    onAdd({
      type: selectedType.type,
      entityId: selectedEntityId,
      size: selectedSize,
    });
    handleClose();
  }

  function renderEntities() {
    if (!selectedType) return null;

    if (selectedType.type === 'routine') {
      return routines.map((r) => (
        <TouchableOpacity
          key={r.id}
          style={[styles.entityRow, selectedEntityId === r.id && styles.entityRowSelected]}
          onPress={() => handleSelectEntity(r.id)}
        >
          <Text style={{ fontSize: 22 }}>{r.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.entityName}>{r.name}</Text>
            <Text style={styles.entitySub}>{r.time}</Text>
          </View>
          {selectedEntityId === r.id && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      ));
    }

    if (selectedType.type === 'todo_list') {
      return todoLists.map((l) => {
        const done = l.items.filter((i) => i.done).length;
        return (
          <TouchableOpacity
            key={l.id}
            style={[styles.entityRow, selectedEntityId === l.id && styles.entityRowSelected]}
            onPress={() => handleSelectEntity(l.id)}
          >
            <View style={[styles.entityIcon, { backgroundColor: l.color + '20' }]}>
              <Text style={{ fontSize: 18 }}>{l.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.entityName}>{l.title}</Text>
              <Text style={styles.entitySub}>{done}/{l.items.length} concluídos</Text>
            </View>
            {selectedEntityId === l.id && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        );
      });
    }

    if (selectedType.type === 'note') {
      return notes.map((n) => (
        <TouchableOpacity
          key={n.id}
          style={[styles.entityRow, selectedEntityId === n.id && styles.entityRowSelected]}
          onPress={() => handleSelectEntity(n.id)}
        >
          <View style={[styles.colorDot, { backgroundColor: n.color }]} />
          <Text style={[styles.entityName, { flex: 1 }]} numberOfLines={1}>
            {n.title || 'Sem título'}
          </Text>
          {selectedEntityId === n.id && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      ));
    }

    if (selectedType.type === 'goal') {
      return goals.map((g) => (
        <TouchableOpacity
          key={g.id}
          style={[styles.entityRow, selectedEntityId === g.id && styles.entityRowSelected]}
          onPress={() => handleSelectEntity(g.id)}
        >
          <Text style={{ fontSize: 22 }}>{g.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.entityName}>{g.name}</Text>
            <Text style={styles.entitySub}>
              {`R$ ${g.currentAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${g.targetAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </Text>
          </View>
          {selectedEntityId === g.id && (
            <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
          )}
        </TouchableOpacity>
      ));
    }

    return null;
  }

  function getStepTitle() {
    if (step === 1) return 'Escolher tipo de widget';
    if (step === 2) return `Escolher ${selectedType?.label.toLowerCase()}`;
    return 'Escolher tamanho';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            {step > 1 && (
              <TouchableOpacity onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3)} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={Colors.primary} />
              </TouchableOpacity>
            )}
            <Text style={styles.sheetTitle}>{getStepTitle()}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {step === 1 && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.typeGrid}>
                {TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.type}
                    style={styles.typeCard}
                    onPress={() => handleSelectType(option)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.typeEmoji}>{option.icon}</Text>
                    <Text style={styles.typeLabel}>{option.label}</Text>
                    <Text style={styles.typeDesc}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {step === 2 && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.entityList}>
              {renderEntities()}
              {selectedEntityId && (
                <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(3)}>
                  <Text style={styles.nextBtnText}>Próximo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}

          {step === 3 && selectedType && (
            <View style={styles.sizeSection}>
              <View style={styles.sizeRow}>
                {selectedType.allowedSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeBtn, selectedSize === size && styles.sizeBtnActive]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.sizeBtnText, selectedSize === size && styles.sizeBtnTextActive]}>
                      {SIZE_LABELS[size]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.sizePreview}>
                <Text style={styles.sizePreviewLabel}>
                  {selectedSize === 'small'
                    ? 'Metade da largura'
                    : selectedSize === 'medium'
                    ? 'Largura total'
                    : 'Largura total, maior altura'}
                </Text>
                <View style={[
                  styles.sizePreviewBox,
                  selectedSize === 'small' && { width: '50%' },
                  selectedSize === 'large' && { height: 80 },
                ]}>
                  <Text style={styles.sizePreviewText}>{selectedType.icon}</Text>
                  <Text style={styles.sizePreviewLabel}>{selectedType.label}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={handleAdd}>
                <Text style={styles.addBtnText}>Adicionar widget</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '85%',
  },
  sheetHandle: {
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
    marginBottom: 20,
  },
  backBtn: { marginRight: 8 },
  closeBtn: { marginLeft: 'auto' },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 20,
  },
  typeCard: {
    width: (SCREEN_WIDTH - 40 - 12) / 2,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeEmoji: { fontSize: 28 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: Colors.text },
  typeDesc: { fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  entityList: { maxHeight: 360 },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.background,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entityRowSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  entityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entityName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  entitySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  nextBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sizeSection: { gap: 20, paddingBottom: 8 },
  sizeRow: { flexDirection: 'row', gap: 10 },
  sizeBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sizeBtnActive: {
    backgroundColor: Colors.primaryLighter,
    borderColor: Colors.primary,
  },
  sizeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  sizeBtnTextActive: { color: Colors.primary },
  sizePreview: { alignItems: 'center', gap: 10 },
  sizePreviewLabel: { fontSize: 13, color: Colors.textSecondary },
  sizePreviewBox: {
    width: '100%',
    height: 56,
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexDirection: 'row',
  },
  sizePreviewText: { fontSize: 22 },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
