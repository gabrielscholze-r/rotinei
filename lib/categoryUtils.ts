import {
  CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_COLORS,
  ExpenseCategory, CustomCategory,
} from './types';

export function getCategoryIcon(cat: string, customCategories: CustomCategory[]): string {
  if (cat in CATEGORY_ICONS) return CATEGORY_ICONS[cat as ExpenseCategory];
  return customCategories.find((c) => c.id === cat)?.emoji ?? '🏷️';
}

export function getCategoryLabel(cat: string, customCategories: CustomCategory[]): string {
  if (cat in CATEGORY_LABELS) return CATEGORY_LABELS[cat as ExpenseCategory];
  return customCategories.find((c) => c.id === cat)?.name ?? cat;
}

export function getCategoryColor(cat: string, customCategories: CustomCategory[]): string {
  if (cat in CATEGORY_COLORS) return CATEGORY_COLORS[cat as ExpenseCategory];
  return customCategories.find((c) => c.id === cat)?.color ?? '#6B7280';
}
