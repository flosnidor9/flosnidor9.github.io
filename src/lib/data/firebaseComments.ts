import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COMMENTS_ROOT = 'logPostComments';
const COMMENTS_CHILD = 'comments';

export type FirebaseLogComment = {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp | null;
};

export type LogCommentInput = {
  author?: string;
  content: string;
};

function commentsCollection(postSlug: string) {
  return collection(db, COMMENTS_ROOT, postSlug, COMMENTS_CHILD);
}

export function subscribeToLogComments(
  postSlug: string,
  callback: (comments: FirebaseLogComment[]) => void
): Unsubscribe {
  const q = query(commentsCollection(postSlug), orderBy('createdAt', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const comments: FirebaseLogComment[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        author: typeof data.author === 'string' ? data.author : '익명',
        content: typeof data.content === 'string' ? data.content : '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : null,
      };
    });
    callback(comments);
  });
}

export async function addLogComment(postSlug: string, input: LogCommentInput): Promise<string> {
  const author = (input.author || '').trim() || '익명';
  const content = input.content.trim();

  const docRef = await addDoc(commentsCollection(postSlug), {
    author,
    content,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}
