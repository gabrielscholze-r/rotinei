import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorPalette } from '../constants/colors';
import { useTheme } from '../contexts/ThemeContext';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const insets = useSafeAreaInsets();
  const { colors: Colors } = useTheme();
  const styles = createStyles(Colors);
  return (
    <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={onPress}>
      <Ionicons name="add" size={38} color={Colors.white} />
    </TouchableOpacity>
  );
}

function createStyles(Colors: ColorPalette) {
  return StyleSheet.create({
    fab: {
      position: 'absolute',
      bottom: 24,
      right: 24,
      width: 66,
      height: 66,
      borderRadius: 28,
      backgroundColor: Colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
}
