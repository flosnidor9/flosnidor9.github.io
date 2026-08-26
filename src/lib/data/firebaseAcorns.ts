import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type AcornCategory = 'official' | 'fanmade';
export type AcornRole = 'GM' | 'PL' | 'BOTH';

export type AcornEntry = {
  id: string;
  title: string;
  rule: string;
  category: AcornCategory;
  role: AcornRole;
  playerCount: string;
  link?: string;
  imageUrl?: string;
  participants: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type AcornEntryInput = Omit<AcornEntry, 'id' | 'createdAt' | 'updatedAt'>;

const ACORNS_COLLECTION = 'acorns';
const ACORNS_CONFIG_COLLECTION = 'acorns_config';
const ACORNS_CONFIG_ID = 'state';

export function subscribeToAcorns(callback: (entries: AcornEntry[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, ACORNS_COLLECTION), orderBy('createdAt', 'asc')), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as AcornEntry[]);
  });
}

export async function addAcorn(entry: AcornEntryInput): Promise<void> {
  await addDoc(collection(db, ACORNS_COLLECTION), {
    ...entry,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateAcorn(id: string, entry: Partial<AcornEntryInput>): Promise<void> {
  await updateDoc(doc(db, ACORNS_COLLECTION, id), { ...entry, updatedAt: serverTimestamp() });
}

export async function deleteAcorn(id: string): Promise<void> {
  await deleteDoc(doc(db, ACORNS_COLLECTION, id));
}

export function subscribeToAcornInitialization(callback: (initialized: boolean) => void): Unsubscribe {
  return onSnapshot(doc(db, ACORNS_CONFIG_COLLECTION, ACORNS_CONFIG_ID), (snapshot) => {
    callback(snapshot.data()?.initialized === true);
  });
}

export async function initializeAcorns(entries: Array<AcornEntryInput & { id: string }>): Promise<void> {
  const batch = writeBatch(db);
  entries.forEach(({ id, ...entry }) => {
    batch.set(doc(db, ACORNS_COLLECTION, id), {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  batch.set(doc(db, ACORNS_CONFIG_COLLECTION, ACORNS_CONFIG_ID), {
    initialized: true,
    initializedAt: serverTimestamp(),
  });
  await batch.commit();
}
