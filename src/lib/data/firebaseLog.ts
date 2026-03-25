import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type FirebaseLogEntry = {
  id: string;
  title?: string;
  content: string;
  timestamp: Timestamp;
  year: number;
  tags: string[];
  images: string[];
};

export type LogEntryInput = {
  title?: string;
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

  const data: any = {
    content: entry.content,
    tags: entry.tags,
    images: entry.images,
    timestamp: serverTimestamp(),
    year,
  };

  if (entry.title) {
    data.title = entry.title;
  }

  const docRef = await addDoc(collection(db, LOGS_COLLECTION), data);

  return docRef.id;
}
