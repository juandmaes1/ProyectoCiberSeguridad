import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useContext, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';

interface Arepa {
  id: string;
  title: string;
  price: string;
  image: string;
  description?: string;
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

const CART_ITEM_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1604908178395-1766428ff5d8?auto=format&fit=crop&w=400&q=60';

const formatCardNumber = (raw: string): string => {
  const digits = sanitizeCardNumber(raw).slice(0, 16);
  const chunks = digits.match(/.{1,4}/g);
  return chunks ? chunks.join(' ') : '';
};

const formatExpiryDate = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const formatCVC = (raw: string): string => raw.replace(/\D/g, '').slice(0, 3);

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
  if (year < 2026) {
    return false;
  }
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

  const welcomeBonus = user?.welcomeBonus;
  const isApproved = Boolean(user && (user.role === 'admin' || user.approved));
  const bonusAvailable = Boolean(welcomeBonus && !welcomeBonus.used && isApproved);

  useEffect(() => {
    if (!userId) {
      setCartItems([]);
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
            items.map((item, index) => {
              const rawId = (item as any).id;
              const id =
                typeof rawId === 'string' && rawId.length > 0 ? rawId : `cart-${index}`;

              const rawTitle = (item as any).title;
              const rawPrice = (item as any).price;
              const rawImage = (item as any).image;
              const rawDescription = (item as any).description;

              const title =
                typeof rawTitle === 'string'
                  ? rawTitle
                  : rawTitle != null
                    ? String(rawTitle)
                    : '';
              const price =
                typeof rawPrice === 'number'
                  ? String(rawPrice)
                  : typeof rawPrice === 'string'
                    ? rawPrice
                    : '';
              const image =
                typeof rawImage === 'string'
                  ? rawImage
                  : rawImage != null
                    ? String(rawImage)
                    : '';
              const description =
                typeof rawDescription === 'string'
                  ? rawDescription
                  : rawDescription != null
                    ? String(rawDescription)
                    : '';

              return {
                id,
                title,
                price,
                image,
                description,
                quantity: Math.max(1, Number((item as any).quantity ?? 1)),
              };
            }),
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

    return () => unsubscribe();
  }, [userId]);

  const removeFromCart = async (itemId: string) => {
    if (!userId) return;
    const updatedCart = cartItems.filter((item) => item.id !== itemId);

    try {
      await setDoc(doc(db, 'carts', userId), { items: updatedCart }, { merge: true });
      setCartItems(updatedCart);
      Alert.alert('Exito', 'Arepa eliminada del carrito.');
    } catch (error) {
      console.error('Error eliminando item del carrito:', error);
      Alert.alert('Error', 'No se pudo eliminar la arepa del carrito.');
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
      Alert.alert('Error', 'Debes iniciar sesion para realizar un pedido.');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Tu carrito esta vacio.');
      return;
    }

    if (!address.trim() || !cardNumber.trim() || !expiryDate.trim() || !cvc.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos de pago y entrega.');
      return;
    }

    if (!isValidCardNumber(cardNumber)) {
      Alert.alert('Error', 'El numero de tarjeta debe tener 16 digitos (puedes incluir espacios).');
      return;
    }

    if (!isExpiryValidAndUpcoming(expiryDate)) {
      Alert.alert('Error', 'La fecha de vencimiento debe tener formato MM/AA y ser posterior al mes actual.');
      return;
    }

    if (!isValidCVC(cvc)) {
      Alert.alert('Error', 'El CVC debe tener exactamente 3 digitos.');
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
        description: item.description ?? '',
        quantity: Number(item.quantity ?? 1),
      }));

      const orderId = `${userId}_${Date.now()}`;
      const createdAtIso = new Date().toISOString();
      const orderData = {
        orderId,
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
        createdAt: createdAtIso,
        createdAtTs: serverTimestamp(),
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
          ? `Tu pedido se registro correctamente. Se aplico un descuento de ${formatCurrency(
              discount,
            )} (40%) gracias a tu bono de bienvenida.`
          : 'Tu pedido se registro correctamente.',
      );
    } catch (error) {
      console.error('Error creando pedido:', error);
      Alert.alert('Error', 'No se pudo registrar el pedido.');
    }
  };

  const renderCartItem = (item: Arepa, index: number) => {
    const unitPrice = parseNumber(item.price);
    const quantity = Number(item.quantity ?? 1);
    const lineTotal = unitPrice * quantity;
    const imageFromItem = typeof item.image === 'string' ? item.image.trim() : '';
    const imageUri = imageFromItem.length > 0 ? imageFromItem : CART_ITEM_PLACEHOLDER_IMAGE;

    return (
      <View key={item.id || `${item.title}-${index}`} style={styles.cartItem}>
          <View style={styles.cartItemImageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.cartItemImage} />
          </View>
        <View style={styles.cartItemDetails}>
          <Text style={styles.cartItemTitle}>{item.title}</Text>
          <Text style={styles.cartItemPrice}>
            Precio unitario: {formatCurrency(unitPrice)}
          </Text>
          {item.description ? (
            <Text style={styles.cartItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={styles.cartItemQuantity}>Cantidad: {quantity}</Text>
          <Text style={styles.cartItemSubtotal}>Subtotal: {formatCurrency(lineTotal)}</Text>
        </View>
        <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeButton}>
          <FontAwesome name="trash" size={24} color="#ff6347" />
        </TouchableOpacity>
      </View>
    );
  };

  if (!userId) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollContent, styles.center]}>
        <Text style={styles.infoText}>Por favor inicia sesion para consultar tu carrito.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Tu carrito</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : cartItems.length === 0 ? (
        <Text style={styles.emptyCartText}>Tu carrito esta vacio.</Text>
      ) : (
        <>
          <View style={styles.cartList}>
            {cartItems.map((item, index) => renderCartItem(item, index))}
          </View>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Subtotal: {formatCurrency(subtotal)}</Text>
            {bonusAvailable && (
              <Text style={[styles.summaryText, styles.discountText]}>
                Bono aplicado (40%): -{formatCurrency(discount)}
              </Text>
            )}
            <Text style={styles.summaryTotal}>Total a pagar: {formatCurrency(total)}</Text>
          </View>

          <View style={styles.paymentSection}>
            <TextInput
              placeholder="Direccion de entrega"
              value={address}
              onChangeText={setAddress}
              style={styles.input}
            />
            <TextInput
              placeholder="Numero de tarjeta (ejemplo: 4111 1111 1111 1111)"
              value={cardNumber}
              onChangeText={(value) => setCardNumber(formatCardNumber(value))}
              style={styles.input}
              keyboardType="number-pad"
            />
            <TextInput
              placeholder="Fecha de vencimiento (MM/AA)"
              value={expiryDate}
              onChangeText={(value) => setExpiryDate(formatExpiryDate(value))}
              style={styles.input}
              keyboardType="number-pad"
            />
            <TextInput
              placeholder="CVC"
              value={cvc}
              onChangeText={(value) => setCVC(formatCVC(value))}
              style={styles.input}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.checkoutButton} onPress={handlePlaceOrder}>
              <Text style={styles.checkoutButtonText}>Realizar pedido</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 15,
  },
  scrollContent: {
    paddingBottom: 40,
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
    width: '100%',
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
  cartItemImageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginRight: 15,
    backgroundColor: '#f0f0f0',
  },
  cartItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  cartItemDescription: {
    color: '#555',
    marginTop: 4,
    fontSize: 12,
  },
  cartItemQuantity: {
    color: '#333',
    marginTop: 4,
  },
  cartItemSubtotal: {
    color: '#1e88e5',
    marginTop: 4,
    fontWeight: 'bold',
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
  paymentSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginVertical: 10,
  },
  checkoutButton: {
    backgroundColor: '#1e88e5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  checkoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyCartText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
});








