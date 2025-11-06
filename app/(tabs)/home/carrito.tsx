import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';

interface Arepa {
  id: string;
  title: string;
  price: string;
  image: string;
  quantity?: number;
}

const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

const parseNumber = (value: string | number | undefined): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const sanitizeCardNumber = (raw: string): string => raw.replace(/\s|-/g, '');

const isValidCardNumber = (raw: string): boolean => /^\d{16}$/.test(sanitizeCardNumber(raw));

const parseExpiry = (expiry: string): { month: number; year: number } | null => {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12) {
    return null;
  }
  return { month, year: 2000 + year };
};

const isExpiryValidAndUpcoming = (expiry: string): boolean => {
  const parsed = parseExpiry(expiry);
  if (!parsed) return false;
  const { month, year } = parsed;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // months are 0-based in JS
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
};

const isValidCVC = (cvc: string): boolean => /^\d{3}$/.test(cvc.trim());

export default function CartView() {
  const authCtx = useContext(AuthContext);
  const user = authCtx?.state.user;
  const userId = user?.uid ?? null;

  const [cartItems, setCartItems] = useState<Arepa[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCVC] = useState('');
  const [savedData, setSavedData] = useState<{
    address: string;
    cardNumber: string;
    expiryDate: string;
    cvc: string;
  } | null>(null);

  const welcomeBonus = user?.welcomeBonus;
  const isApproved = Boolean(user && (user.role === 'admin' || user.approved));
  const bonusAvailable = Boolean(welcomeBonus && !welcomeBonus.used && isApproved);

  useEffect(() => {
    if (!userId) {
      setCartItems([]);
      setSavedData(null);
      setLoading(false);
      return;
    }

    const cartRef = doc(db, 'carts', userId);
    const unsubscribe = onSnapshot(
      cartRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const items = (snapshot.data().items || []) as Arepa[];
          setCartItems(
            items.map((item) => ({
              ...item,
              quantity: Number(item.quantity ?? 1),
            })),
          );
        } else {
          setCartItems([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching cart:', error);
        Alert.alert('Error', 'No se pudo cargar el carrito.');
        setLoading(false);
      },
    );

    const loadSavedData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'Users', userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSavedData({
            address: data.address || '',
            cardNumber: data.cardNumber || '',
            expiryDate: data.expiryDate || '',
            cvc: data.cvc || '',
          });
        }
      } catch (error) {
        console.error('Error cargando datos guardados:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos guardados.');
      }
    };

    loadSavedData();

    return () => unsubscribe();
  }, [userId]);

  const handleUseSavedData = () => {
    if (!savedData) return;
    setAddress(savedData.address);
    setCardNumber(savedData.cardNumber);
    setExpiryDate(savedData.expiryDate);
    setCVC(savedData.cvc);
  };

  const removeFromCart = async (itemId: string) => {
    if (!userId) return;
    const updatedCart = cartItems.filter((item) => item.id !== itemId);

    try {
      await setDoc(doc(db, 'carts', userId), { items: updatedCart }, { merge: true });
      setCartItems(updatedCart);
      Alert.alert('Ã‰xito', 'Arepa eliminada del carrito.');
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      Alert.alert('Error', 'No se pudo eliminar la arepa del carrito.');
    }
  };

  const saveData = async () => {
    if (!userId) return;
    try {
      await setDoc(
        doc(db, 'Users', userId),
        {
          address,
          cardNumber,
          expiryDate,
          cvc,
        },
        { merge: true },
      );
      Alert.alert('Ã‰xito', 'Datos guardados correctamente.');
    } catch (error) {
      console.error('Error guardando datos:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos.');
    }
  };

  const subtotal = useMemo(
    () =>
      cartItems.reduce((acc, item) => {
        const line = parseNumber(item.price) * Number(item.quantity ?? 1);
        return acc + line;
      }, 0),
    [cartItems],
  );

  const discount = bonusAvailable ? subtotal * 0.4 : 0;
  const total = Math.max(subtotal - discount, 0);

  const resetForm = () => {
    setAddress('');
    setCardNumber('');
    setExpiryDate('');
    setCVC('');
  };

  const handlePlaceOrder = async () => {
    if (!userId) {
      Alert.alert('Error', 'Debes iniciar sesiÃ³n para realizar un pedido.');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Tu carrito estÃ¡ vacÃ­o.');
      return;
    }

    if (!address.trim() || !cardNumber.trim() || !expiryDate.trim() || !cvc.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos de pago y entrega.');
      return;
    }

    if (!isValidCardNumber(cardNumber)) {
      Alert.alert('Error', 'El nÃºmero de tarjeta debe tener 16 dÃ­gitos (puedes incluir espacios).');
      return;
    }

    if (!isExpiryValidAndUpcoming(expiryDate)) {
      Alert.alert('Error', 'La fecha de vencimiento debe tener formato MM/AA y ser posterior al mes actual.');
      return;
    }

    if (!isValidCVC(cvc)) {
      Alert.alert('Error', 'El CVC debe tener exactamente 3 dÃ­gitos.');
      return;
    }

    try {
      const orderTotals = {
        subtotal,
        discount,
        total,
      };

      const safeItems = cartItems.map((item) => ({
        id: item.id,
        title: item.title,
        price: String(item.price ?? ''),
        image: item.image,
        quantity: Number(item.quantity ?? 1),
      }));

      const orderId = `${userId}_${Date.now()}`;
      const orderData = {
        userId,
        items: safeItems,
        address: address.trim(),
        totals: orderTotals,
        payment: {
          cardNumberMasked: `**** **** **** ${sanitizeCardNumber(cardNumber).slice(-4)}`,
          expiryDate,
        },
        usedWelcomeBonus: bonusAvailable,
        status: 'registrado',
        createdAt: new Date().toISOString(),
      };

      const globalOrderRef = doc(collection(db, 'orders'), orderId);
      await setDoc(globalOrderRef, orderData);

      const userOrdersRef = doc(collection(doc(db, 'Users', userId), 'orders'), orderId);
      await setDoc(userOrdersRef, orderData);

      await setDoc(doc(db, 'carts', userId), { items: [] });

      if (bonusAvailable) {
        await updateDoc(doc(db, 'Users', userId), {
          'welcomeBonus.used': true,
          'welcomeBonus.usedAt': new Date().toISOString(),
        });
      }

      setCartItems([]);
      resetForm();

      Alert.alert(
        'Pedido realizado',
        bonusAvailable
          ? `Tu pedido se registrÃ³ correctamente. Se aplicÃ³ un descuento de ${formatCurrency(
              discount,
            )} (40%) gracias a tu bono de bienvenida.`
          : 'Tu pedido se registrÃ³ correctamente.',
      );
    } catch (error) {
      console.error('Error creando pedido:', error);
      Alert.alert('Error', 'No se pudo registrar el pedido.');
    }
  };

  const renderCartItem = ({ item }: { item: Arepa }) => (
    <View style={styles.cartItem}>
      <Image source={{ uri: item.image }} style={styles.cartItemImage} />
      <View style={styles.cartItemDetails}>
        <Text style={styles.cartItemTitle}>{item.title}</Text>
        <Text style={styles.cartItemPrice}>{formatCurrency(parseNumber(item.price))}</Text>
        {item.quantity ? <Text style={styles.cartItemQuantity}>Cantidad: {item.quantity}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeButton}>
        <FontAwesome name="trash" size={24} color="#ff6347" />
      </TouchableOpacity>
    </View>
  );

  if (!userId) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.infoText}>Por favor inicia sesiÃ³n para consultar tu carrito.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu carrito</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : cartItems.length === 0 ? (
        <Text style={styles.emptyCartText}>Tu carrito estÃ¡ vacÃ­o.</Text>
      ) : (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.cartList}
          />

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Subtotal: {formatCurrency(subtotal)}</Text>
            {bonusAvailable && (
              <Text style={[styles.summaryText, styles.discountText]}>
                Bono aplicado (40%): -{formatCurrency(discount)}
              </Text>
            )}
            <Text style={styles.summaryTotal}>Total a pagar: {formatCurrency(total)}</Text>
          </View>

          {savedData && <Button title="Usar datos guardados" onPress={handleUseSavedData} />}
          <TextInput
            placeholder="DirecciÃ³n de entrega"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
          />
          <TextInput
            placeholder="NÃºmero de tarjeta (ejemplo: 4111 1111 1111 1111)"
            value={cardNumber}
            onChangeText={setCardNumber}
            style={styles.input}
            keyboardType="number-pad"
          />
          <TextInput
            placeholder="Fecha de vencimiento (MM/AA)"
            value={expiryDate}
            onChangeText={setExpiryDate}
            style={styles.input}
            keyboardType="number-pad"
          />
          <TextInput
            placeholder="CVC"
            value={cvc}
            onChangeText={setCVC}
            style={styles.input}
            keyboardType="number-pad"
          />
          <Button title="Guardar datos para la prÃ³xima vez" onPress={saveData} />
          <Button title="Realizar pedido" onPress={handlePlaceOrder} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 15,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 16,
    color: '#555',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  cartList: {
    paddingBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    padding: 15,
  },
  cartItemImage: {
    width: 70,
    height: 70,
    borderRadius: 5,
    marginRight: 15,
  },
  cartItemDetails: {
    flex: 1,
  },
  cartItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemPrice: {
    color: '#888',
  },
  cartItemQuantity: {
    color: '#333',
    marginTop: 4,
  },
  removeButton: {
    marginLeft: 10,
  },
  summary: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 6,
  },
  discountText: {
    color: '#d62828',
  },
  summaryTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  emptyCartText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});

