import { authReducer } from "./authReducer";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { auth, db } from "@/utils/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { createContext, ReactNode, useEffect, useReducer } from "react";

export interface AuthState {
  user?: any;
  isLogged: boolean;
}

const authStateDefault: AuthState = {
  user: undefined,
  isLogged: false,
};

interface AuthContextProps {
  state: AuthState;
  signUp: (firstname: string, lastname: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  approveUser: (uid: string) => Promise<void>;
  setRole: (uid: string, role: "admin" | "user") => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, authStateDefault);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const ref = doc(db, "Users", firebaseUser.uid);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            dispatch({ type: "LOGIN", payload: { ...snap.data(), uid: firebaseUser.uid } });
            return;
          }
        } catch (error) {
          console.log("Error recuperando perfil Firestore:", error);
        }

        dispatch({ type: "LOGIN", payload: firebaseUser });
      } else {
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const docRef = doc(db, "Users", userCredential.user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        dispatch({ type: "LOGIN", payload: { ...docSnap.data(), uid: userCredential.user.uid } });
      } else {
        dispatch({ type: "LOGIN", payload: userCredential.user });
      }

      return true;
    } catch (error: any) {
      console.log("Error en signIn:", error.code, error.message);
      return false;
    }
  };

  const signUp = async (
    firstname: string,
    lastname: string,
    email: string,
    password: string,
  ): Promise<boolean> => {
    try {
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const user = response.user;

      await setDoc(doc(db, "Users", user.uid), {
        firstname,
        lastname,
        email,
        role: "user",
        approved: false,
      });

      dispatch({ type: "LOGIN", payload: user });
      return true;
    } catch (error: any) {
      console.log("Error en signUp:", error.code, error.message);
      return false;
    }
  };

  const approveUser = async (uid: string) => {
    const ref = doc(db, "Users", uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as any) : {};
    const updates: any = { approved: true };

    if (!data.welcomeBonusGranted) {
      updates.welcomeBonusGranted = true;
      updates.welcomeBonus = {
        code: "WELCOME10",
        used: false,
        grantedAt: new Date().toISOString(),
      };
    }

    await updateDoc(ref, updates);

    if (state.user?.uid === uid) {
      dispatch({ type: "LOGIN", payload: { ...state.user, approved: true, ...updates } });
    }
  };

  const setRole = async (uid: string, role: "admin" | "user") => {
    await updateDoc(doc(db, "Users", uid), { role });

    if (state.user?.uid === uid) {
      dispatch({ type: "LOGIN", payload: { ...state.user, role } });
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    dispatch({ type: "LOGOUT" });
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signUp, approveUser, setRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
