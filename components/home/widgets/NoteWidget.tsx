import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Note, WidgetSize } from '../../../lib/types';
import { stripHtml } from '../../../lib/textFormatting';

interface Props {
  note: Note;
  size: WidgetSize;
}

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `${diff}d atrás`;
  if (diff < 30) return `${Math.floor(diff / 7)}sem atrás`;
  return `${Math.floor(diff / 30)}m atrás`;
}

export function NoteWidget({ note, size }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const isSmall = size === 'small';
  const preview = stripHtml(note.content);
  const hasCustomColor = !!note.color;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        hasCustomColor ? { backgroundColor: note.color } : styles.cardBorder,
        isSmall && styles.smallCard,
      ]}
      onPress={() => router.push(`/notes/${note.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={isSmall ? 2 : 1}>
          {note.title || 'Sem título'}
        </Text>
        {!isSmall && (
          <Text style={styles.date}>{relativeTime(note.updatedAt)}</Text>
        )}
      </View>
      {preview.length > 0 && (
        <Text style={styles.preview} numberOfLines={isSmall ? 2 : 3}>
          {preview}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: 16,
      gap: 6,
      minHeight: 100,
    },
    cardBorder: {
      backgroundColor: Colors.card,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    smallCard: {
      padding: 14,
      minHeight: 90,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    title: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
    date: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
    preview: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  });
}
