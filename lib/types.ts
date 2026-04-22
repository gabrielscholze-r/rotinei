export interface MedicationDose {
  id: string;
  scheduledAt: string; // ISO
  takenAt?: string;
  skipped?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  intervalHours: number;
  durationDays: number;
  startTime: string; // ISO
  doses: MedicationDose[];
  color: string;
  createdAt: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface TodoList {
  id: string;
  title: string;
  icon: string;
  color: string;
  items: TodoItem[];
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'health'
  | 'entertainment'
  | 'housing'
  | 'clothing'
  | 'education'
  | 'other';

export interface CustomCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO
  createdAt: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Alimentação',
  transport: 'Transporte',
  health: 'Saúde',
  entertainment: 'Lazer',
  housing: 'Moradia',
  clothing: 'Vestuário',
  education: 'Educação',
  other: 'Outros',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: '🍽️',
  transport: '🚗',
  health: '💊',
  entertainment: '🎬',
  housing: '🏠',
  clothing: '👕',
  education: '📚',
  other: '📦',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#F97316',
  transport: '#8B5CF6',
  health: '#EF4444',
  entertainment: '#EC4899',
  housing: '#14B8A6',
  clothing: '#F59E0B',
  education: '#3B82F6',
  other: '#6B7280',
};
