import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type PlayStatus = 'completed' | 'ongoing' | 'dropped';
export type PlayType = 'GM' | 'PL';

export type PlayEntry = {
  id: string;
  title: string;
  rule: string;
  playerCount: string;
  type: PlayType;
  participants: string[];
  status: PlayStatus;
  startDate: string;
  endDate: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PlayEntryInput = Omit<PlayEntry, 'id' | 'createdAt' | 'updatedAt'>;

export type PlaysOptions = {
  rules: string[];
  playerCounts: string[];
  participants: string[];
};

const PLAYS_COLLECTION = 'plays';

export function subscribeToPlays(callback: (entries: PlayEntry[]) => void): Unsubscribe {
  const q = query(collection(db, PLAYS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as PlayEntry[]);
  });
}

export async function addPlay(entry: PlayEntryInput): Promise<string> {
  const ref = await addDoc(collection(db, PLAYS_COLLECTION), {
    ...entry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlay(id: string, entry: Partial<PlayEntryInput>): Promise<void> {
  await updateDoc(doc(db, PLAYS_COLLECTION, id), {
    ...entry,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlay(id: string): Promise<void> {
  await deleteDoc(doc(db, PLAYS_COLLECTION, id));
}

export function subscribeToPlaysOptions(callback: (opts: PlaysOptions) => void): Unsubscribe {
  return onSnapshot(doc(db, 'plays_config', 'options'), (snap) => {
    callback(
      snap.exists()
        ? (snap.data() as PlaysOptions)
        : { rules: [], playerCounts: [], participants: [] }
    );
  });
}

export async function updatePlaysOptions(opts: PlaysOptions): Promise<void> {
  await setDoc(doc(db, 'plays_config', 'options'), opts);
}
