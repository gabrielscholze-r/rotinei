import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './storage';
import { getAllFirestoreData, pushAllToFirestore, setFirestoreKey } from './firestore';

export interface ConflictItem {
  key: string;
  keyLabel: string;
  type: 'scalar' | 'array_item';
  itemId?: string;
  itemLabel: string;
  local: unknown;
  remote: unknown;
}

export interface SyncResult {
  conflicts: ConflictItem[];
  merged: Record<string, unknown>;
  skipped: boolean;
}

const KEY_LABELS: Record<string, string> = {
  [KEYS.ROUTINES]: 'Rotinas',
  [KEYS.ROUTINE_LOGS]: 'Logs de rotinas',
  [KEYS.TODO_LISTS]: 'Listas de tarefas',
  [KEYS.TODO_GROUPS]: 'Grupos de tarefas',
  [KEYS.NOTES]: 'Notas',
  [KEYS.NOTE_GROUPS]: 'Grupos de notas',
  [KEYS.EXPENSES]: 'Gastos',
  [KEYS.BILLING_CYCLE_DAY]: 'Dia do ciclo',
  [KEYS.CUSTOM_CATEGORIES]: 'Categorias',
  [KEYS.GOALS]: 'Metas',
  [KEYS.MEDICATIONS]: 'Medicamentos',
  [KEYS.RECURRING_EXPENSES]: 'Gastos recorrentes',
  [KEYS.HOME_WIDGETS]: 'Widgets da home',
  [KEYS.EXPENSE_SECTIONS]: 'Seções de gastos',
  [KEYS.EXPENSE_CHARTS]: 'Gráficos',
};

// Keys excluded from cloud sync
const SKIP_KEYS = new Set([KEYS.PRIVATE_PIN]);
const SYNC_COOLDOWN_MS = 5 * 60 * 1000;
const META_KEY = '_syncMeta';

function itemLabel(item: unknown): string {
  if (!item || typeof item !== 'object') return String(item);
  const o = item as Record<string, unknown>;
  return String(o.name ?? o.title ?? o.description ?? o.id ?? 'Item');
}

function mergeArrays(
  local: unknown[],
  remote: unknown[],
  key: string
): { merged: unknown[]; conflicts: ConflictItem[] } {
  const conflicts: ConflictItem[] = [];
  const merged: unknown[] = [];

  const localById = new Map<string, unknown>();
  const remoteById = new Map<string, unknown>();

  for (const item of local) {
    if (item && typeof item === 'object' && 'id' in item) {
      localById.set((item as { id: string }).id, item);
    } else {
      merged.push(item);
    }
  }
  for (const item of remote) {
    if (item && typeof item === 'object' && 'id' in item) {
      remoteById.set((item as { id: string }).id, item);
    }
  }

  const allIds = new Set([...localById.keys(), ...remoteById.keys()]);

  for (const id of allIds) {
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);

    if (!localItem) {
      merged.push(remoteItem);
    } else if (!remoteItem) {
      merged.push(localItem);
    } else if (JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
      conflicts.push({
        key,
        keyLabel: KEY_LABELS[key] ?? key,
        type: 'array_item',
        itemId: id,
        itemLabel: itemLabel(localItem),
        local: localItem,
        remote: remoteItem,
      });
    } else {
      merged.push(localItem);
    }
  }

  return { merged, conflicts };
}

export async function performSync(uid: string): Promise<SyncResult> {
  // Cooldown: skip if synced recently
  const metaRaw = await AsyncStorage.getItem(META_KEY);
  const meta = metaRaw ? JSON.parse(metaRaw) : null;
  if (meta?.lastSyncAt && Date.now() - meta.lastSyncAt < SYNC_COOLDOWN_MS) {
    return { conflicts: [], merged: {}, skipped: true };
  }

  const syncableKeys = Object.values(KEYS).filter((k) => !SKIP_KEYS.has(k));

  // Load all local data
  const localEntries = await Promise.all(
    syncableKeys.map(async (k) => {
      const raw = await AsyncStorage.getItem(k);
      return [k, raw ? JSON.parse(raw) : null] as const;
    })
  );
  const localData = Object.fromEntries(localEntries);

  // Load all remote data
  const remoteData = await getAllFirestoreData(uid);
  const hasRemote = Object.keys(remoteData).length > 0;

  if (!hasRemote) {
    // First sync: push all local data to Firestore
    const toSync: Record<string, unknown> = {};
    for (const key of syncableKeys) {
      if (localData[key] !== null && localData[key] !== undefined) {
        toSync[key] = localData[key];
      }
    }
    await pushAllToFirestore(uid, toSync);
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ lastSyncAt: Date.now() }));
    return { conflicts: [], merged: localData, skipped: false };
  }

  // Merge local + remote
  const conflicts: ConflictItem[] = [];
  const merged: Record<string, unknown> = {};

  for (const key of syncableKeys) {
    const local = localData[key];
    const remote = remoteData[key] ?? null;

    if (local === null && remote === null) continue;
    if (local === null) { merged[key] = remote; continue; }
    if (remote === null) { merged[key] = local; continue; }

    if (Array.isArray(local) && Array.isArray(remote)) {
      const { merged: arr, conflicts: arrC } = mergeArrays(local, remote, key);
      merged[key] = arr;
      conflicts.push(...arrC);
    } else {
      if (JSON.stringify(local) !== JSON.stringify(remote)) {
        conflicts.push({
          key,
          keyLabel: KEY_LABELS[key] ?? key,
          type: 'scalar',
          itemLabel: KEY_LABELS[key] ?? key,
          local,
          remote,
        });
      } else {
        merged[key] = local;
      }
    }
  }

  return { conflicts, merged, skipped: false };
}

export async function applyMerged(
  uid: string,
  merged: Record<string, unknown>,
  resolutions: Record<string, 'local' | 'remote'>,
  conflicts: ConflictItem[]
): Promise<void> {
  const final: Record<string, unknown> = { ...merged };

  for (const conflict of conflicts) {
    const resKey =
      conflict.type === 'array_item'
        ? `${conflict.key}:${conflict.itemId}`
        : conflict.key;
    const pick = resolutions[resKey] ?? 'local';
    const chosen = pick === 'local' ? conflict.local : conflict.remote;

    if (conflict.type === 'scalar') {
      final[conflict.key] = chosen;
    } else if (conflict.type === 'array_item' && conflict.itemId) {
      if (!Array.isArray(final[conflict.key])) final[conflict.key] = [];
      (final[conflict.key] as unknown[]).push(chosen);
    }
  }

  // Write to AsyncStorage (direct, bypasses Firestore hook to avoid double writes)
  // Write to Firestore in parallel
  const writes = Object.entries(final)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) =>
      Promise.all([
        AsyncStorage.setItem(key, JSON.stringify(value)),
        setFirestoreKey(uid, key, value),
      ])
    );

  await Promise.all(writes);
  await AsyncStorage.setItem(META_KEY, JSON.stringify({ lastSyncAt: Date.now() }));
}
