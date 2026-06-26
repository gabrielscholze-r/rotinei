import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ColorPalette } from '../../constants/colors';
import { useTheme } from '../../contexts/ThemeContext';
import { FeedbackModal } from '../../components/feedback/FeedbackModal';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, colors: Colors, setMode } = useTheme();
  const styles = createStyles(Colors);
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Configurações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Aparência</Text>
        <View style={styles.card}>
          <View style={styles.themeRow}>
            <TouchableOpacity
              style={[styles.themeOption, mode === 'light' && styles.themeOptionActive]}
              onPress={() => setMode('light')}
              activeOpacity={0.85}
            >
              <Ionicons name="sunny" size={20} color={mode === 'light' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.themeOptionText, mode === 'light' && styles.themeOptionTextActive]}>
                Claro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.themeOption, mode === 'dark' && styles.themeOptionActive]}
              onPress={() => setMode('dark')}
              activeOpacity={0.85}
            >
              <Ionicons name="moon" size={20} color={mode === 'dark' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.themeOptionText, mode === 'dark' && styles.themeOptionTextActive]}>
                Escuro
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Suporte</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => setShowFeedback(true)}
            activeOpacity={0.85}
          >
            <View style={styles.reportIconWrap}>
              <Ionicons name="warning-outline" size={20} color={Colors.warning} />
            </View>
            <View style={styles.reportContent}>
              <Text style={styles.reportTitle}>Reportar problema</Text>
              <Text style={styles.reportSub}>Encontrou algo errado? Nos avise.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </SafeAreaView>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '800', color: Colors.text },
    scroll: { padding: 20 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: Colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 8,
    },
    card: {
      backgroundColor: Colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: 24,
      overflow: 'hidden',
    },
    themeRow: { flexDirection: 'row', padding: 12, gap: 10 },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.background,
    },
    themeOptionActive: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryLighter,
    },
    themeOptionText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
    themeOptionTextActive: { color: Colors.primary },
    reportBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    reportIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 10,
      backgroundColor: Colors.warningLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportContent: { flex: 1 },
    reportTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
    reportSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  });
}
