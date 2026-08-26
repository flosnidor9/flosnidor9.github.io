import {
  addDoc,
  collection,
  type DocumentData,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  type QuerySnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type PromiseTicket = {
  id: string;
  scenarioName: string;
  rule: string;
  role: 'GM' | 'PL';
  participants: string[];
  note: string;
  scenarioUrl: string;
  isCompleted: boolean;
  isPrivate: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type PromiseTicketInput = Omit<PromiseTicket, 'id' | 'createdAt' | 'updatedAt'>;

const PUBLIC_COLLECTION = 'promise_tickets';
const PRIVATE_COLLECTION = 'private_promise_tickets';

function collectionName(isPrivate: boolean) {
  return isPrivate ? PRIVATE_COLLECTION : PUBLIC_COLLECTION;
}

function toEntries(snapshot: QuerySnapshot<DocumentData>, isPrivate: boolean) {
  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      ...data,
      isCompleted: Boolean(data.isCompleted),
      isPrivate,
    };
  }) as PromiseTicket[];
}

export function subscribeToPromiseTickets(
  isPrivate: boolean,
  callback: (entries: PromiseTicket[]) => void,
): Unsubscribe {
  const entriesQuery = query(
    collection(db, collectionName(isPrivate)),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(entriesQuery, (snapshot) => callback(toEntries(snapshot, isPrivate)));
}

export async function addPromiseTicket(entry: PromiseTicketInput): Promise<string> {
  const { isPrivate, ...data } = entry;
  const ref = await addDoc(collection(db, collectionName(isPrivate)), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePromiseTicket(
  previous: PromiseTicket,
  entry: PromiseTicketInput,
): Promise<void> {
  const { isPrivate, ...data } = entry;
  if (previous.isPrivate === isPrivate) {
    await updateDoc(doc(db, collectionName(isPrivate), previous.id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  await addPromiseTicket(entry);
  await deleteDoc(doc(db, collectionName(previous.isPrivate), previous.id));
}

export async function deletePromiseTicket(entry: PromiseTicket): Promise<void> {
  await deleteDoc(doc(db, collectionName(entry.isPrivate), entry.id));
}
