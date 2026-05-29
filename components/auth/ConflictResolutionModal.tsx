import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ConflictItem } from '../../lib/sync';

interface Props {
  visible: boolean;
  conflicts: ConflictItem[];
  onResolve: (resolutions: Record<string, 'local' | 'remote'>) => Promise<void>;
}

function itemSummary(item: unknown): string {
  if (item === null || item === undefined) return '—';
  if (typeof item !== 'object') return String(item);
  const o = item as Record<string, unknown>;
  const parts: string[] = [];
  if (o.name) parts.push(String(o.name));
  else if (o.title) parts.push(String(o.title));
  else if (o.description) parts.push(String(o.description));
  if (o.amount != null) parts.push(`R$ ${Number(o.amount).toFixed(2)}`);
  if (o.time) parts.push(String(o.time));
  if (o.targetAmount != null) parts.push(`Meta: R$ ${Number(o.targetAmount).toFixed(2)}`);
  if (o.done !== undefined) parts.push(o.done ? '✓ Feito' : '○ Pendente');
  return parts.slice(0, 3).join(' · ') || JSON.stringify(item).slice(0, 80);
}

export default function ConflictResolutionModal({ visible, conflicts, onResolve }: Props) {
  const [resolutions, setResolutions] = useState<Record<string, 'local' | 'remote'>>({});
  const [applying, setApplying] = useState(false);

  function resKey(c: ConflictItem) {
    return c.type === 'array_item' ? `${c.key}:${c.itemId}` : c.key;
  }

  function pick(c: ConflictItem, side: 'local' | 'remote') {
    setResolutions((prev) => ({ ...prev, [resKey(c)]: side }));
  }

  function currentPick(c: ConflictItem): 'local' | 'remote' {
    return resolutions[resKey(c)] ?? 'local';
  }

  async function handleConfirm() {
    // Default unresolved to 'local'
    const final: Record<string, 'local' | 'remote'> = {};
    for (const c of conflicts) {
      final[resKey(c)] = resolutions[resKey(c)] ?? 'local';
    }
    setApplying(true);
    await onResolve(final);
    setApplying(false);
    setResolutions({});
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="git-merge-outline" size={22} color={Colors.warning} />
          <Text style={styles.title}>Conflito de sincronização</Text>
        </View>
        <Text style={styles.subtitle}>
          {conflicts.length} {conflicts.length === 1 ? 'item difere' : 'itens diferem'} entre
          este celular e a nuvem. Escolha qual versão manter.
        </Text>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {conflicts.map((c) => (
            <View key={resKey(c)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardGroup}>{c.keyLabel}</Text>
                <Text style={styles.cardItem}>{c.itemLabel}</Text>
              </View>

              <View style={styles.options}>
                <TouchableOpacity
                  style={[
                    styles.option,
                    currentPick(c) === 'local' && styles.optionActive,
                  ]}
                  onPress={() => pick(c, 'local')}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons
                      name="phone-portrait-outline"
                      size={14}
                      color={currentPick(c) === 'local' ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        currentPick(c) === 'local' && { color: Colors.primary },
                      ]}
                    >
                      Este celular
                    </Text>
                    {currentPick(c) === 'local' && (
                      <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                    )}
                  </View>
                  <Text style={styles.optionValue} numberOfLines={3}>
                    {itemSummary(c.local)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.option,
                    currentPick(c) === 'remote' && styles.optionActiveCloud,
                  ]}
                  onPress={() => pick(c, 'remote')}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionHeader}>
                    <Ionicons
                      name="cloud-outline"
                      size={14}
                      color={currentPick(c) === 'remote' ? '#7C3AED' : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        currentPick(c) === 'remote' && { color: '#7C3AED' },
                      ]}
                    >
                      Nuvem
                    </Text>
                    {currentPick(c) === 'remote' && (
                      <Ionicons name="checkmark-circle" size={16} color="#7C3AED" />
                    )}
                  </View>
                  <Text style={styles.optionValue} numberOfLines={3}>
                    {itemSummary(c.remote)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.confirmBtn, applying && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={applying}
          activeOpacity={0.85}
        >
          {applying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.confirmText}>Confirmar escolhas</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  list: { flex: 1 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { marginBottom: 10, gap: 2 },
  cardGroup: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardItem: { fontSize: 15, fontWeight: '700', color: Colors.text },
  options: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 10,
    backgroundColor: Colors.background,
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLighter,
  },
  optionActiveCloud: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    flex: 1,
  },
  optionValue: { fontSize: 12, color: Colors.text, lineHeight: 17 },
  confirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
