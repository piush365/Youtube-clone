import {
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from "firebase/auth";
import { useState, useEffect, useContext, createContext } from "react";
import { provider, auth } from "./firebase";
import { getOrCreateUser } from "./userService";

const UserContext = createContext();

const otpKey = (uid) => `otp_verified_${uid}`;

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Signed in with Google but OTP verification still pending
  const [pendingUser, setPendingUser] = useState(null);

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    setPendingUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const handlegooglesignin = async () => {
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  // Region-based OTP: hold the user in "pending" until OTP is verified once
  // per browser session.
  const handleAuthedUser = (userData) => {
    if (sessionStorage.getItem(otpKey(userData.uid))) {
      login(userData);
    } else {
      setPendingUser(userData);
    }
  };

  const completeOtpVerification = () => {
    if (!pendingUser) return;
    sessionStorage.setItem(otpKey(pendingUser.uid), "1");
    login(pendingUser);
    setPendingUser(null);
  };

  const cancelOtpVerification = () => {
    logout();
  };

  useEffect(() => {
    // Handle the result after redirect returns
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const firebaseUser = result.user;
          const userData = await getOrCreateUser(firebaseUser.uid, {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            image: firebaseUser.photoURL || "https://github.com/shadcn.png",
          });
          handleAuthedUser(userData);
        }
      })
      .catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userData = await getOrCreateUser(firebaseUser.uid, {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            image: firebaseUser.photoURL || "https://github.com/shadcn.png",
          });
          handleAuthedUser(userData);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        pendingUser,
        completeOtpVerification,
        cancelOtpVerification,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
