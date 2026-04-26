import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabItem {
  label: string;
  icon: IoniconName;
  iconFocused: IoniconName;
  route: string;
  match: string;
}

const TABS: TabItem[] = [
  {
    label: 'Home',
    icon: 'home-outline',
    iconFocused: 'home',
    route: '/(tabs)',
    match: '/(tabs)',
  },
  {
    label: 'Menu',
    icon: 'apps-outline',
    iconFocused: 'apps',
    route: '/(tabs)/menu',
    match: '/menu',
  },
];

export function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (match: string) => {
    if (match === '/(tabs)') {
      return pathname === '/' || pathname === '' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    return pathname === match || pathname.endsWith(match) || pathname.includes(match.replace('/(tabs)', ''));
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8, height: 64 + insets.bottom }]}>
      {TABS.map((tab) => {
        const active = isActive(tab.match);
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.navigate(tab.route as any)}
            activeOpacity={0.7}
          >
            {active && <View style={styles.activeIndicator} />}
            <Ionicons
              name={active ? tab.iconFocused : tab.icon}
              size={26}
              color={active ? Colors.primary : Colors.textTertiary}
            />
            <Text style={[styles.label, { color: active ? Colors.primary : Colors.textTertiary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
