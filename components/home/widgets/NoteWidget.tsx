import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../../constants/colors';
import { Note, WidgetSize } from '../../../lib/types';
import { stripHtml } from '../../../lib/textFormatting';

interface Props {
  note: Note;
  size: WidgetSize;
}

export function NoteWidget({ note, size }: Props) {
  const router = useRouter();
  const isSmall = size === 'small';
  const preview = stripHtml(note.content);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: note.color }, isSmall && styles.smallCard]}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    minHeight: 100,
  },
  smallCard: {
    padding: 14,
    minHeight: 90,
  },
  title: { fontSize: 14, fontWeight: '700', color: Colors.text },
  preview: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
