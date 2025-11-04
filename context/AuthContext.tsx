
import { authReducer } from "./authReducer";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/utils/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, ReactNode, useEffect, useReducer } from "react";

// 🔹 Estado del usuario
export interface AuthState {
  user?: any;
  isLogged: boolean;
}

const authStateDefault: AuthState = {
  user: undefined,
  isLogged: false,
};

// 🔹 Tipado del contexto
interface AuthContextProps {
  state: AuthState;
  signUp: (firstname: string, lastname: string, email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
}

// 🔹 Crear contexto
export const AuthContext = createContext<AuthContextProps | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, authStateDefault);

  useEffect(() => {
    // Aquí podrías agregar lógica para verificar si ya hay sesión guardada
  }, []);

  // 🔹 Inicio de sesión
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

  // 🔹 Registro de usuario
  const signUp = async (firstname: string, lastname: string, email: string, password: string): Promise<boolean> => {
    try {
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const user = response.user;

      await setDoc(doc(db, "Users", user.uid), {
        firstname,
        lastname,
        email,
      });

      dispatch({ type: "LOGIN", payload: user });
      return true;
    } catch (error: any) {
      console.log("Error en signUp:", error.code, error.message);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ state, signIn, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};
