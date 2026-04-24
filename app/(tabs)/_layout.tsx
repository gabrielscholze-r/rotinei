import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size, focused }: { name: IoniconName; color: string; size: number; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {focused && (
        <View style={{
          position: 'absolute',
          width: 52,
          height: 28,
          borderRadius: 14,
          backgroundColor: Colors.primary + '1A',
        }} />
      )}
      <Ionicons name={name} size={26} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 80 + insets.bottom + 28;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          display: 'none',
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 28,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rotinas',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="alarm" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          title: 'Listas',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="checkbox" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notas',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="document-text" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Gastos',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="wallet" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
