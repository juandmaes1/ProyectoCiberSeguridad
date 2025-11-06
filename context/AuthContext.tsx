import { authReducer } from "./authReducer";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from "firebase/auth";
import { auth, db } from "@/utils/firebaseConfig";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";
import { createContext, ReactNode, useEffect, useReducer, useRef } from "react";
import { registerUser } from "@/services/auth/registerUser";

export interface AuthState {
  user?: any;
  isLogged: boolean;
}

export type SignUpResult =
  | { success: true }
  | { success: false; errorCode: string; errorMessage: string };

const authStateDefault: AuthState = {
  user: undefined,
  isLogged: false,
};

interface AuthContextProps {
  state: AuthState;
  signUp: (firstname: string, lastname: string, email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<boolean>;
  approveUser: (uid: string) => Promise<void>;
  setRole: (uid: string, role: "admin" | "user") => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, authStateDefault);
  const userDocUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (userDocUnsubscribe.current) {
          userDocUnsubscribe.current();
          userDocUnsubscribe.current = null;
        }

        const ref = doc(db, "Users", firebaseUser.uid);
        userDocUnsubscribe.current = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            dispatch({ type: "LOGIN", payload: { ...snap.data(), uid: firebaseUser.uid } });
          } else {
            dispatch({ type: "LOGIN", payload: firebaseUser });
          }
        });
      } else {
        if (userDocUnsubscribe.current) {
          userDocUnsubscribe.current();
          userDocUnsubscribe.current = null;
        }
        dispatch({ type: "LOGOUT" });
      }
    });

    return () => {
      unsubscribeAuth();
      if (userDocUnsubscribe.current) {
        userDocUnsubscribe.current();
        userDocUnsubscribe.current = null;
      }
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
  ): Promise<SignUpResult> => {
    const result = await registerUser({ firstname, lastname, email, password });

    if (!result.success) {
      console.log("Error en signUp:", result.errorCode, result.errorMessage);
      return {
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    return { success: true };
  };

  const approveUser = async (uid: string) => {
    await updateDoc(doc(db, "Users", uid), {
      approved: true,
      welcomeBonus: {
        code: "WELCOME40",
        used: false,
        grantedAt: new Date().toISOString(),
      },
    });
  };

  const setRole = async (uid: string, role: "admin" | "user") => {
    await updateDoc(doc(db, "Users", uid), { role });
  };

  const signOut = async () => {
    if (userDocUnsubscribe.current) {
      userDocUnsubscribe.current();
      userDocUnsubscribe.current = null;
    }
    await fbSignOut(auth);
    dispatch({ type: "LOGOUT" });
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signUp, approveUser, setRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
