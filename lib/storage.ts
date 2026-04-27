import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getItem<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const KEYS = {
  MEDICATIONS: 'medications',
  TODO_LISTS: 'todo_lists',
  NOTES: 'notes',
  EXPENSES: 'expenses',
  BILLING_CYCLE_DAY: 'billing_cycle_day',
  CUSTOM_CATEGORIES: 'custom_categories',
  ROUTINES: 'routines',
  ROUTINE_LOGS: 'routine_logs',
  GOALS: 'goals',
  PRIVATE_NOTES: 'private_notes',
  PRIVATE_PIN: 'private_pin',
  HOME_WIDGETS: 'home_widgets',
  EXPENSE_SECTIONS: 'expense_sections',
};
