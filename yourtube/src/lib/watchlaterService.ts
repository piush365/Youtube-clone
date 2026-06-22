import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export const toggleWatchLater = async (
  videoId: string,
  userId: string
): Promise<boolean> => {
  const q = query(
    collection(db, "watchlater"),
    where("viewer", "==", userId),
    where("videoid", "==", videoId)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    await addDoc(collection(db, "watchlater"), {
      viewer: userId,
      videoid: videoId,
      timestamp: new Date().toISOString(),
    });
    return true;
  } else {
    await deleteDoc(snap.docs[0].ref);
    return false;
  }
};

export const getWatchLater = async (userId: string) => {
  const q = query(
    collection(db, "watchlater"),
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
      createdAt: r.timestamp,
    }))
    .filter((r) => r.videoid !== null);
};

export const removeFromWatchLater = async (watchLaterId: string) => {
  await deleteDoc(doc(db, "watchlater", watchLaterId));
};
