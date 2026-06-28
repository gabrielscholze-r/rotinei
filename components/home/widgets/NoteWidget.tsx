import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { ColorPalette } from '../../../constants/colors';
import { useTheme } from '../../../contexts/ThemeContext';
import { Note, WidgetSize } from '../../../lib/types';
import { stripHtml } from '../../../lib/textFormatting';

interface Props {
  note: Note;
  size: WidgetSize;
}

export function NoteWidget({ note, size }: Props) {
  const router = useRouter();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);

  const isSmall = size === 'small';
  const preview = stripHtml(note.content);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: note.color || Colors.card }, !note.color && styles.cardBorder, isSmall && styles.smallCard]}
      onPress={() => router.push(`/notes/${note.id}` as any)}
      activeOpacity={0.85}
    >
      <Text style={styles.title} numberOfLines={isSmall ? 2 : 1}>{note.title || 'Sem título'}</Text>
      {preview.length > 0 && (
        <Text style={styles.preview} numberOfLines={isSmall ? 2 : 3}>{preview}</Text>
      )}
    </TouchableOpacity>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      padding: 16,
      gap: 8,
      minHeight: 100,
    },
    cardBorder: {
      borderWidth: 1,
      borderColor: Colors.border,
    },
    smallCard: {
      padding: 14,
      minHeight: 90,
    },
    title: { fontSize: 14, fontWeight: '700', color: Colors.text },
    preview: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  });
}
