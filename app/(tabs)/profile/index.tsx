import { auth, db } from '@/utils/firebaseConfig';
import { Link, router } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthContext } from '@/context/AuthContext';

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

interface OrderSummary {
  id: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  total: number;
  items: number;
  usedWelcomeBonus: boolean;
}

export default function Profile() {
  const authCtx = useContext(AuthContext);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;
    const load = async () => {
      const unsub = await fetchUserData();
      unsubscribeOrders = unsub;
    };
    load();
    return () => {
      if (unsubscribeOrders) {
        unsubscribeOrders();
      }
    };
  }, []);

  const fetchUserData = async (): Promise<(() => void) | undefined> => {
    if (!auth.currentUser) {
      console.log('No hay usuario autenticado');
      return undefined;
    }

    const userId = auth.currentUser.uid;
    const userRef = doc(db, 'Users', userId);

    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUser(docSnap.data() as User);
        fetchUserPosts(userId);
        return subscribeToOrders(userId);
      } else {
        console.log('No existe el documento de usuario');
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
    return undefined;
  };

  const fetchUserPosts = async (userId: string) => {
    setPostsLoading(true);
    try {
      const postsRef = collection(db, 'arepas');
      const q = query(postsRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(q);

      const userPosts: Post[] = [];
      querySnapshot.forEach((postDoc) => {
        const data = postDoc.data();
        const dateObj = data.date?.seconds ? new Date(data.date.seconds * 1000) : null;

        userPosts.push({
          id: postDoc.id,
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
    setPostsLoading(false);
  };

  const subscribeToOrders = (userId: string) => {
    setOrdersLoading(true);
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const nextOrders = snapshot.docs.map((orderDoc) => {
          const data = orderDoc.data() as any;
          const totals = data.totals || {};
          const createdAt =
            data.createdAt && !Number.isNaN(Date.parse(data.createdAt))
              ? new Date(data.createdAt).toLocaleString()
              : 'Sin registro';
          const itemsCount = Array.isArray(data.items)
            ? data.items.reduce(
                (acc: number, item: any) => acc + Number(item.quantity ?? 1),
                0,
              )
            : 0;

          return {
            id: orderDoc.id,
            createdAt,
            subtotal: Number(totals.subtotal ?? 0),
            discount: Number(totals.discount ?? 0),
            total: Number(totals.total ?? 0),
            items: itemsCount,
            usedWelcomeBonus: Boolean(data.usedWelcomeBonus),
          };
        });

        setOrders(nextOrders);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Error al escuchar órdenes:', error);
        setOrdersLoading(false);
      },
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>Precio: {item.price}</Text>
      <Text style={styles.date}>Fecha: {item.date}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderOrder = ({ item }: { item: OrderSummary }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderId}>Pedido #{item.id}</Text>
      <Text style={styles.orderLine}>Fecha: {item.createdAt}</Text>
      <Text style={styles.orderLine}>Artículos: {item.items}</Text>
      <Text style={styles.orderLine}>Subtotal: ${item.subtotal.toFixed(2)}</Text>
      {item.discount > 0 && (
        <Text style={[styles.orderLine, styles.discount]}>
          Descuento: -${item.discount.toFixed(2)} (40% bono bienvenida)
        </Text>
      )}
      <Text style={styles.orderTotal}>Total pagado: ${item.total.toFixed(2)}</Text>
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <View style={styles.initialsContainer}>
          <Text style={styles.initials}>
            {user.firstname.charAt(0)}
            {user.lastname.charAt(0)}
          </Text>
        </View>
        <Text style={styles.username}>{`${user.firstname} ${user.lastname}`}</Text>
      </View>

      <Text style={styles.sectionTitle}>Tus publicaciones</Text>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListEmptyComponent={
          postsLoading ? (
            <Text style={styles.subtext}>Cargando publicaciones…</Text>
          ) : (
            <Text style={styles.subtext}>No hay publicaciones para este usuario.</Text>
          )
        }
        refreshing={postsLoading}
        onRefresh={() => {
          if (auth.currentUser?.uid) {
            fetchUserPosts(auth.currentUser.uid);
          }
        }}
      />

      <View style={styles.ordersHeader}>
        <Text style={styles.sectionTitle}>Historial de pedidos</Text>
        {ordersLoading && <Text style={styles.subtext}>Cargando…</Text>}
      </View>

      {orders.length === 0 && !ordersLoading ? (
        <Text style={styles.subtext}>Aún no tienes pedidos registrados.</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
        />
      )}

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Link href="/(tabs)/profile/editProfile" asChild>
            <Button title="Editar perfil" />
          </Link>
        </View>
        <View style={styles.actionButton}>
          <Button
            title="Cerrar sesión"
            onPress={async () => {
              await authCtx?.signOut();
              router.replace('/');
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: 'gray',
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
  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  orderCard: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  orderId: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  orderLine: {
    fontSize: 14,
  },
  discount: {
    color: '#d62828',
  },
  orderTotal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    marginVertical: 6,
  },
});
