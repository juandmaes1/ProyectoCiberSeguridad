import { auth, db } from '@/utils/firebaseConfig';
import { Link, router } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AuthContext } from '@/context/AuthContext';

interface UserProfile {
  firstname: string;
  lastname: string;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const ordersUnsubRef = useRef<() => void>();

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.currentUser) {
        setProfileLoading(false);
        return;
      }

      try {
        const userId = auth.currentUser.uid;
        const userSnap = await getDoc(doc(db, 'Users', userId));

        if (userSnap.exists()) {
          setUser(userSnap.data() as UserProfile);
        }

        subscribeToOrders(userId);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      if (ordersUnsubRef.current) {
        ordersUnsubRef.current();
        ordersUnsubRef.current = undefined;
      }
    };
  }, []);

  const subscribeToOrders = (userId: string) => {
    if (ordersUnsubRef.current) {
      ordersUnsubRef.current();
    }

    setOrdersLoading(true);
    const ordersRef = collection(doc(db, 'Users', userId), 'orders');
    const q = query(ordersRef, orderBy('createdAtTs', 'desc'));

    ordersUnsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        const nextOrders = snapshot.docs.map((orderDoc) => {
          const data = orderDoc.data() as any;
          const totals = data.totals || {};

          const createdAtIso =
            data.createdAt && !Number.isNaN(Date.parse(data.createdAt))
              ? new Date(data.createdAt)
              : null;
          const createdAtTs =
            data.createdAtTs && typeof data.createdAtTs.toDate === 'function'
              ? data.createdAtTs.toDate()
              : null;
          const createdAtDate = createdAtIso ?? createdAtTs;

          const itemCount = Array.isArray(data.items)
            ? data.items.reduce(
                (acc: number, item: any) => acc + Number(item.quantity ?? 1),
                0,
              )
            : 0;

          return {
            id: orderDoc.id,
            createdAt: createdAtDate ? createdAtDate.toLocaleString() : 'Sin registro',
            subtotal: Number(totals.subtotal ?? 0),
            discount: Number(totals.discount ?? 0),
            total: Number(totals.total ?? 0),
            items: itemCount,
            usedWelcomeBonus: Boolean(data.usedWelcomeBonus),
          };
        });

        setOrders(nextOrders);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Error listening orders:', error);
        setOrdersLoading(false);
      },
    );
  };

  const renderOrder = ({ item }: { item: OrderSummary }) => (
    <View style={styles.orderCard}>
      <Text style={styles.orderId}>Pedido #{item.id}</Text>
      <Text style={styles.orderLine}>Fecha: {item.createdAt}</Text>
      <Text style={styles.orderLine}>Articulos: {item.items}</Text>
      <Text style={styles.orderLine}>Subtotal: ${item.subtotal.toFixed(2)}</Text>
      {item.discount > 0 ? (
        <Text style={[styles.orderLine, styles.discount]}>
          Descuento: -${item.discount.toFixed(2)}
        </Text>
      ) : null}
      <Text style={styles.orderTotal}>Total pagado: ${item.total.toFixed(2)}</Text>
      {item.usedWelcomeBonus ? (
        <Text style={styles.orderBadge}>Bono de bienvenida aplicado</Text>
      ) : null}
    </View>
  );

  if (profileLoading || !user) {
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
            {user.firstname?.charAt(0) ?? '?'}
            {user.lastname?.charAt(0) ?? '?'}
          </Text>
        </View>
        <View>
          <Text style={styles.username}>{`${user.firstname} ${user.lastname}`}</Text>
          <Text style={styles.subtext}>Historial de pedidos y configuracion</Text>
        </View>
      </View>

      <View style={styles.ordersHeader}>
        <Text style={styles.sectionTitle}>Historial de pedidos</Text>
        {ordersLoading ? <ActivityIndicator size="small" color="#0000ff" /> : null}
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        ListEmptyComponent={
          <Text style={styles.emptyOrdersText}>
            Aun no has registrado pedidos. Empieza comprando tu primera arepa.
          </Text>
        }
        contentContainerStyle={orders.length === 0 ? styles.emptyOrdersContainer : undefined}
      />

      <View style={styles.actions}>
        <View style={styles.actionButton}>
          <Link href="/(tabs)/profile/editProfile" asChild>
            <Button title="Editar perfil" />
          </Link>
        </View>
        <View style={styles.actionButton}>
          <Button
            title="Cerrar sesion"
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1e88e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  discount: {
    color: '#d62828',
  },
  orderTotal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#1e88e5',
  },
  emptyOrdersContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyOrdersText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 14,
    paddingVertical: 24,
  },
  actions: {
    marginTop: 24,
  },
  actionButton: {
    marginVertical: 6,
  },
});
