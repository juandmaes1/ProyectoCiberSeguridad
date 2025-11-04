import { createContext, useContext, useEffect, useReducer } from "react";
import { dataReducer } from "./dataReducer";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { DefaultResponse, PostProps } from "@/interfaces/postinterfaces";
import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { db, storage } from "@/utils/firebaseConfig";
import { AuthContext } from "../context/AuthContext";

export interface DataState {

}

const dataStateDefault = {

}

interface DataContextProps {
    state: DataState,
    newPost: (newPost: PostProps) => Promise<DefaultResponse>
}

export const DataContext = createContext({} as DataContextProps);

export function DataProvider({ children }: any) {

    const [state, dispatch] = useReducer(dataReducer, dataStateDefault);
    const { state: { user } } = useContext(AuthContext)

    useEffect(() => {

    }, []);


    const uploadImage = async (uri: string): Promise<string> => {
        const path = `posts/${(user?.uid ?? 'anon')}-${Date.now()}`;
        const storageRef = ref(storage, path);

        const response = await fetch(uri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        return url;
    }

    const getPosts = async () => {

    }


    const newPost = async (newPost: PostProps): Promise<DefaultResponse> => {
        try {
            const urlImage = await uploadImage(newPost.image);
            
            console.log({
                urlImage
            })
            const docRef = await addDoc(collection(db, "books"), {
                ...newPost,
                image: urlImage,
                date: new Date(),
                username: user.email,
                postedBy: user.uid,
                likes: 0,
            });
            console.log("Document written with ID: ", docRef.id);
            return {
                isSuccess: true,
                message: "Creado con exito"
            }
        } catch (error) {
            console.log(error);
            return {
                isSuccess: false,
                message: "Hubo un error: " + error
            }
        }
    }

    const updatePost = async () => {
    }

    const deletePost = async () => {
    }


    return <DataContext.Provider
        value={{
            state,
            newPost
        }}
    >
        {children}
    </DataContext.Provider>
}


