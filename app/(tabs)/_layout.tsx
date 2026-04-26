import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
        <Tabs.Screen name="routines" options={{ title: 'Rotinas' }} />
        <Tabs.Screen name="todos" options={{ title: 'Listas' }} />
        <Tabs.Screen name="notes" options={{ title: 'Notas' }} />
        <Tabs.Screen name="expenses" options={{ title: 'Gastos' }} />
      </Tabs>
      <CustomTabBar />
    </View>
  );
}
