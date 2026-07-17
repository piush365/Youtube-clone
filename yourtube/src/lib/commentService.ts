import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";

// Allow letters (any language), numbers, whitespace and common punctuation.
// Anything else (e.g. @#$%^*<>{}~`) counts as a special character and the
// comment is blocked.
export const hasSpecialCharacters = (text: string): boolean => {
  const allowed = /^[\p{L}\p{N}\p{M}\s.,!?'"()\-:;]*$/u;
  return !allowed.test(text);
};

export const getComments = async (videoid: string) => {
  const q = query(
    collection(db, "comments"),
    where("videoid", "==", videoid),
    orderBy("commentedon", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const postComment = async (data: {
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  city: string;
}) => {
  if (hasSpecialCharacters(data.commentbody)) {
    throw new Error("SPECIAL_CHARACTERS");
  }
  const ref = await addDoc(collection(db, "comments"), {
    ...data,
    likes: 0,
    dislikes: 0,
    likedBy: [],
    dislikedBy: [],
    commentedon: serverTimestamp(),
  });
  return ref.id;
};

export const editComment = async (commentId: string, commentbody: string) => {
  if (hasSpecialCharacters(commentbody)) {
    throw new Error("SPECIAL_CHARACTERS");
  }
  await updateDoc(doc(db, "comments", commentId), { commentbody });
};

export const deleteComment = async (commentId: string) => {
  await deleteDoc(doc(db, "comments", commentId));
};

// Toggles a like; removes any existing dislike from the same user.
export const likeComment = async (commentId: string, userId: string) => {
  const ref = doc(db, "comments", commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  const likedBy: string[] = data.likedBy || [];
  const dislikedBy: string[] = data.dislikedBy || [];

  if (likedBy.includes(userId)) {
    await updateDoc(ref, { likedBy: arrayRemove(userId) });
  } else {
    await updateDoc(ref, {
      likedBy: arrayUnion(userId),
      dislikedBy: arrayRemove(userId),
    });
  }
  const updated = await getDoc(ref);
  return { id: updated.id, ...updated.data() };
};

// Toggles a dislike. If the comment reaches 2 dislikes it is removed
// automatically and { deleted: true } is returned.
export const dislikeComment = async (commentId: string, userId: string) => {
  const ref = doc(db, "comments", commentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { deleted: true };
  const data = snap.data();
  const dislikedBy: string[] = data.dislikedBy || [];

  if (dislikedBy.includes(userId)) {
    await updateDoc(ref, { dislikedBy: arrayRemove(userId) });
    const updated = await getDoc(ref);
    return { deleted: false, comment: { id: updated.id, ...updated.data() } };
  }

  const newDislikes = dislikedBy.filter((u) => u !== userId).length + 1;
  if (newDislikes >= 2) {
    await deleteDoc(ref);
    return { deleted: true };
  }

  await updateDoc(ref, {
    dislikedBy: arrayUnion(userId),
    likedBy: arrayRemove(userId),
  });
  const updated = await getDoc(ref);
  return { deleted: false, comment: { id: updated.id, ...updated.data() } };
};
