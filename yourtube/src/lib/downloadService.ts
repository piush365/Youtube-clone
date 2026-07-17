import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface DownloadRecord {
  id: string;
  userid: string;
  videoid: string;
  videotitle: string;
  videoUrl: string;
  downloadedon: any;
}

const toDate = (d: any): Date =>
  d?.seconds ? new Date(d.seconds * 1000) : new Date(d);

// Single-field query + client-side sort so no composite Firestore index is
// needed.
export const getDownloads = async (uid: string) => {
  const q = query(collection(db, "downloads"), where("userid", "==", uid));
  const snap = await getDocs(q);
  const records = snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as DownloadRecord[];
  return records.sort(
    (a, b) => toDate(b.downloadedon).getTime() - toDate(a.downloadedon).getTime()
  );
};

// Downloads made today (local midnight onward) — free plan allows 1/day.
export const getTodayDownloadCount = async (uid: string): Promise<number> => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const records = await getDownloads(uid);
  return records.filter((r) => toDate(r.downloadedon) >= start).length;
};

export const recordDownload = async (
  uid: string,
  video: { id: string; videotitle: string; videoUrl: string }
) => {
  await addDoc(collection(db, "downloads"), {
    userid: uid,
    videoid: video.id,
    videotitle: video.videotitle,
    videoUrl: video.videoUrl,
    downloadedon: serverTimestamp(),
  });
};

// Fetch the file as a blob and trigger a browser save dialog.
export const downloadVideoFile = async (url: string, filename: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch video file");
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename.endsWith(".mp4") ? filename : `${filename}.mp4`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
};
