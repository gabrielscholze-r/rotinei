import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function setFirestoreKey(uid: string, key: string, value: unknown): Promise<void> {
  const ref = doc(db, 'users', uid, 'data', key);
  await setDoc(ref, { value: JSON.stringify(value), updatedAt: serverTimestamp() });
}

export async function getAllFirestoreData(uid: string): Promise<Record<string, unknown>> {
  const colRef = collection(db, 'users', uid, 'data');
  const snap = await getDocs(colRef);
  const result: Record<string, unknown> = {};
  snap.forEach((d) => {
    try {
      result[d.id] = JSON.parse(d.data().value);
    } catch {
      // skip malformed docs
    }
  });
  return result;
}

export async function pushAllToFirestore(
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  const promises = Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => setFirestoreKey(uid, key, value));
  await Promise.all(promises);
}
