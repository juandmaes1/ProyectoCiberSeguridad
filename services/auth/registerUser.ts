import { FirebaseError } from 'firebase/app';
import { createUserWithEmailAndPassword, User, UserCredential } from 'firebase/auth';
import { doc, FieldValue, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '@/utils/firebaseConfig';

export interface RegisterUserParams {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'admin' | 'user';
  approved: boolean;
  welcomeBonus: null | {
    code: string;
    used: boolean;
    grantedAt: string;
  };
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

export type RegisterUserResult =
  | {
      success: true;
      credential: UserCredential;
      profile: UserProfile;
    }
  | {
      success: false;
      errorCode: string;
      errorMessage: string;
    };

export const registerUser = async ({
  firstname,
  lastname,
  email,
  password,
}: RegisterUserParams): Promise<RegisterUserResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedFirstname = firstname.trim();
  const trimmedLastname = lastname.trim();

  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const user: User = credential.user;

    const profile: UserProfile = {
      uid: user.uid,
      firstname: trimmedFirstname,
      lastname: trimmedLastname,
      email: normalizedEmail,
      role: 'user',
      approved: false,
      welcomeBonus: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(
      doc(db, 'Users', user.uid),
      {
        ...profile,
      },
      { merge: true },
    );

    return {
      success: true,
      credential,
      profile,
    };
  } catch (error) {
    const firebaseError = error as FirebaseError;

    return {
      success: false,
      errorCode: firebaseError?.code ?? 'auth/unknown-error',
      errorMessage: firebaseError?.message ?? 'No se pudo registrar al usuario.',
    };
  }
};
