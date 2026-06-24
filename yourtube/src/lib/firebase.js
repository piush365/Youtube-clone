import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDOYrFg0hfD9EFuDUVQp-FrqbisDAC_V2I",
  authDomain: "yourtube-6351d.firebaseapp.com",
  projectId: "yourtube-6351d",
  storageBucket: "yourtube-6351d.firebasestorage.app",
  messagingSenderId: "104749851572",
  appId: "1:104749851572:web:4fcafadac855405bf6c8e1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, provider, db, storage };
