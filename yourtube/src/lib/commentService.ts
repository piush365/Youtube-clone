import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

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
}) => {
  const ref = await addDoc(collection(db, "comments"), {
    ...data,
    commentedon: serverTimestamp(),
  });
  return ref.id;
};

export const editComment = async (commentId: string, commentbody: string) => {
  await updateDoc(doc(db, "comments", commentId), { commentbody });
};

export const deleteComment = async (commentId: string) => {
  await deleteDoc(doc(db, "comments", commentId));
};
