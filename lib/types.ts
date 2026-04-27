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

export type RoutineRepeatMode = 'repeat' | 'once';

export interface Routine {
  id: string;
  name: string;
  icon: string;
  description?: string;
  time: string; // "HH:MM"
  days: number[]; // [] = every day; 0=Sun..6=Sat
  repeat: RoutineRepeatMode;
  color: string;
  active: boolean;
  notificationIds: string[];
  createdAt: string;
}

export interface RoutineLog {
  id: string;
  routineId: string;
  date: string; // "YYYY-MM-DD"
  completedAt: string; // ISO
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // "YYYY-MM-DD"
  color: string;
  transactions: GoalTransaction[];
  createdAt: string;
}

export interface GoalTransaction {
  id: string;
  amount: number; // positive = deposit, negative = withdrawal
  note?: string;
  date: string; // ISO
}

export interface PrivateNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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

export interface ExpenseSection {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO
  createdAt: string;
  sectionId?: string;
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

export type ChartPeriodType = 'billing_period' | 'calendar_month' | 'custom_range';

export interface ExpenseChart {
  id: string;
  name: string;
  periodType: ChartPeriodType;
  billingPeriodKey?: string;
  calendarMonth?: string;
  rangeStart?: string;
  rangeEnd?: string;
  sectionIds: string[] | null;
  createdAt: string;
}

export type WidgetType =
  | 'routines_today'
  | 'expense_summary'
  | 'routine'
  | 'todo_list'
  | 'note'
  | 'goal';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface HomeWidget {
  id: string;
  type: WidgetType;
  entityId?: string;
  size: WidgetSize;
  order: number;
}
