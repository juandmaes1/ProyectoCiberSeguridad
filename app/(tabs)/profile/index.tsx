import { auth, db } from "@/utils/firebaseConfig";
import { Link } from 'expo-router';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { Button, FlatList, Image, StyleSheet, Text, View } from 'react-native';

interface User {
  firstname: string;
  lastname: string;
}

interface Post {
  id: string;
  image: string;
  description: string;
  title: string;
  price: string;
  date: string;
  likedBy: string[];
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    if (auth.currentUser) {
      const userId = auth.currentUser.uid;
      const userRef = doc(db, 'Users', userId);

      try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setUser(docSnap.data() as User);
          fetchUserPosts(userId);
        } else {
          console.log('No existe el documento de usuario');
        }
      } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
      }
    } else {
      console.log('No hay usuario autenticado');
    }
  };

  const fetchUserPosts = async (userId: string) => {
    setLoading(true);
    try {
      const postsRef = collection(db, 'books'); // Cambiado a la colección correcta
      const q = query(postsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const userPosts: Post[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dateObj = data.date?.seconds
          ? new Date(data.date.seconds * 1000)
          : null;

        userPosts.push({
          id: doc.id,
          image: data.image,
          description: data.description,
          title: data.title,
          price: data.price,
          date: dateObj ? dateObj.toLocaleDateString() : 'Sin fecha',
          likedBy: data.likedBy || [],
        });
      });

      setPosts(userPosts);
    } catch (error) {
      console.error('Error al recuperar publicaciones:', error);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <View style={styles.userInfo}>
            <View style={styles.initialsContainer}>
              <Text style={styles.initials}>
                {user.firstname.charAt(0)}{user.lastname.charAt(0)}
              </Text>
            </View>
            <Text style={styles.username}>{`${user.firstname} ${user.lastname}`}</Text>
          </View>

          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.postContainer}>
                <Image source={{ uri: item.image }} style={styles.image} />
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>Precio: {item.price}</Text>
                <Text style={styles.date}>Fecha: {item.date}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}
            ListEmptyComponent={<Text>No hay publicaciones para este usuario.</Text>}
            refreshing={loading}
            onRefresh={() => fetchUserPosts(auth.currentUser?.uid!)}
          />
        </>
      ) : (
        <Text>Cargando...</Text>
      )}

      {/* Botones adicionales */}
      <View style={{ marginVertical: 10 }}>
        <Link href="/(tabs)/profile/selectChatUser" asChild>
          <Button title="Iniciar un chat" />
        </Link>
      </View>
      <View style={{ marginVertical: 10 }}>
        <Link href="/(tabs)/profile/settings" asChild>
          <Button title="Settings" />
        </Link>
      </View>
      <View style={{ marginVertical: 10 }}>
        <Link href="/(tabs)/profile/editProfile" asChild>
          <Button title="Edit Profile" />
        </Link>
      </View>
      <View style={{ marginVertical: 10 }}>
        <Link href="/(tabs)/profile/notifications" asChild>
          <Button title="Notificaciones" />
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  initialsContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  initials: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    padding: 8,
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  price: {
    fontSize: 16,
  },
  date: {
    fontSize: 14,
    color: 'gray',
  },
  description: {
    fontSize: 16,
    marginTop: 4,
  },
});
