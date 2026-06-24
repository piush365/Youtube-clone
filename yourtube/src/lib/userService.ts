import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const getOrCreateUser = async (
  uid: string,
  data: { email: string; name: string | null; image: string }
) => {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const newUser = {
      email: data.email,
      name: data.name || "",
      channelname: data.name || "",
      description: "",
      image: data.image,
      joinedon: serverTimestamp(),
    };
    await setDoc(userRef, newUser);
    return { uid, ...newUser };
  }

  return { uid, ...userSnap.data() };
};

export const updateUser = async (
  uid: string,
  data: { channelname: string; description: string }
) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
  const updated = await getDoc(userRef);
  return { uid, ...updated.data() };
};

export const getUserById = async (uid: string) => {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
};
