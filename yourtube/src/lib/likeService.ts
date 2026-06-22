import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  doc,
  updateDoc,
  increment,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const toggleLike = async (
  videoId: string,
  userId: string
): Promise<boolean> => {
  const q = query(
    collection(db, "likes"),
    where("viewer", "==", userId),
    where("videoid", "==", videoId)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    await addDoc(collection(db, "likes"), {
      viewer: userId,
      videoid: videoId,
      likedon: new Date().toISOString(),
    });
    await updateDoc(doc(db, "videos", videoId), { likes: increment(1) });
    return true;
  } else {
    await deleteDoc(snap.docs[0].ref);
    await updateDoc(doc(db, "videos", videoId), { likes: increment(-1) });
    return false;
  }
};

export const getLikedVideos = async (userId: string) => {
  const q = query(
    collection(db, "likes"),
    where("viewer", "==", userId)
  );
  const snap = await getDocs(q);
  const records = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const videoDocs = await Promise.all(
    records.map((r) => getDoc(doc(db, "videos", r.videoid)))
  );

  return records
    .map((r, i) => ({
      id: r.id,
      videoid: videoDocs[i].exists()
        ? { id: videoDocs[i].id, ...videoDocs[i].data() }
        : null,
      createdAt: r.likedon,
    }))
    .filter((r) => r.videoid !== null);
};

export const checkLiked = async (
  videoId: string,
  userId: string
): Promise<boolean> => {
  const q = query(
    collection(db, "likes"),
    where("viewer", "==", userId),
    where("videoid", "==", videoId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
};
