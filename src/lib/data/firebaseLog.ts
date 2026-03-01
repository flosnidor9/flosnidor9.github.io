import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type FirebaseLogEntry = {
  id: string;
  content: string;
  timestamp: Timestamp;
  year: number;
  tags: string[];
  images: string[];
};

export type LogEntryInput = {
  content: string;
  tags: string[];
  images: string[];
};

const LOGS_COLLECTION = 'logs';

export function subscribeToLogs(
  callback: (entries: FirebaseLogEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, LOGS_COLLECTION),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const entries: FirebaseLogEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirebaseLogEntry[];
    callback(entries);
  });
}

export async function addLog(entry: LogEntryInput): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();

  const docRef = await addDoc(collection(db, LOGS_COLLECTION), {
    content: entry.content,
    tags: entry.tags,
    images: entry.images,
    timestamp: Timestamp.now(),
    year,
  });

  return docRef.id;
}
