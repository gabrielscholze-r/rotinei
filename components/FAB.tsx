import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={onPress}>
      <Ionicons name="add" size={38} color={Colors.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
