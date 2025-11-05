import {
    View,
    Text,
    FlatList,
    StyleSheet,
    Image,
    TouchableOpacity,
    Alert,
    TextInput,
    ActivityIndicator,
    Button,
} from 'react-native';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState, useContext } from 'react';

interface Arepa {
    id: string;
    title: string;
    price: string;
    image: string;
    quantity?: number;
}

export default function CartView() {
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
    const authCtx = useContext(AuthContext);
    const userId = authCtx?.state.user?.uid;

    useEffect(() => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesión para ver tu carrito.');
            setLoading(false);
            return;
        }

        const cartRef = doc(db, 'carts', userId);
        const unsubscribe = onSnapshot(
            cartRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const items = (docSnap.data().items || []) as Arepa[];
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

        loadSavedData(userId);

        return () => unsubscribe();
    }, [userId]);

    const loadSavedData = async (uid: string) => {
        try {
            const userRef = doc(db, 'Users', uid);
            const userDoc = await getDoc(userRef);

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
            Alert.alert('Error', 'No se pudieron cargar los datos guardados.');
            console.error(error);
        }
    };

    const removeFromCart = async (itemId: string) => {
        if (!userId) return;

        const updatedCart = cartItems.filter((item) => item.id !== itemId);

        try {
            const cartRef = doc(db, 'carts', userId);
            await setDoc(cartRef, { items: updatedCart }, { merge: true });
            setCartItems(updatedCart);
            Alert.alert('Éxito', 'Arepa eliminada del carrito.');
        } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar la arepa del carrito.');
            console.error(error);
        }
    };

    const saveData = async () => {
        if (!userId) return;

        try {
            const userRef = doc(db, 'Users', userId);
            await setDoc(userRef, { address, cardNumber, expiryDate, cvc }, { merge: true });
            Alert.alert('Éxito', 'Datos guardados correctamente.');
        } catch (error) {
            Alert.alert('Error', 'No se pudieron guardar los datos.');
            console.error(error);
        }
    };

    const handlePlaceOrder = async () => {
        if (!userId) {
            Alert.alert('Error', 'Debes iniciar sesión para realizar un pedido.');
            return;
        }

        if (cartItems.length === 0) {
            Alert.alert('Error', 'Tu carrito está vacío.');
            return;
        }

        if (!address || !cardNumber || !expiryDate || !cvc) {
            Alert.alert('Error', 'Por favor completa todos los campos de pago y dirección.');
            return;
        }

        if (cardNumber !== '4242424242424242') {
            Alert.alert('Error', 'Número de tarjeta inválido. Usa la tarjeta genérica de Stripe.');
            return;
        }

        try {
            const order = {
                userId,
                items: cartItems,
                address,
                paymentStatus: 'Pago simulado',
                date: new Date().toISOString(),
            };

            const orderRef = doc(db, 'orders', `${userId}_${Date.now()}`);
            await setDoc(orderRef, order);

            const cartRef = doc(db, 'carts', userId);
            await setDoc(cartRef, { items: [] });

            setCartItems([]);
            setAddress('');
            setCardNumber('');
            setExpiryDate('');
            setCVC('');

            Alert.alert('Éxito', 'Pedido realizado con éxito. ¿Deseas guardar tus datos para la próxima vez?', [
                { text: 'No', style: 'cancel' },
                { text: 'Sí', onPress: saveData },
            ]);
        } catch (error) {
            Alert.alert('Error', 'No se pudo realizar el pedido.');
            console.error(error);
        }
    };

    const handleUseSavedData = () => {
        if (savedData) {
            setAddress(savedData.address);
            setCardNumber(savedData.cardNumber);
            setExpiryDate(savedData.expiryDate);
            setCVC(savedData.cvc);
        }
    };

    const renderCartItem = ({ item }: { item: Arepa }) => (
        <View style={styles.cartItem}>
            <Image source={{ uri: item.image }} style={styles.cartItemImage} />
            <View style={styles.cartItemDetails}>
                <Text style={styles.cartItemTitle}>{item.title}</Text>
                <Text style={styles.cartItemPrice}>${item.price}</Text>
                {item.quantity ? (
                    <Text style={styles.cartItemQuantity}>Cantidad: {item.quantity}</Text>
                ) : null}
            </View>
            <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeButton}>
                <FontAwesome name="trash" size={24} color="#ff6347" />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Tu carrito</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : cartItems.length === 0 ? (
                <Text style={styles.emptyCartText}>Tu carrito está vacío.</Text>
            ) : (
                <>
                    <FlatList
                        data={cartItems}
                        renderItem={renderCartItem}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.cartList}
                    />
                    {savedData && <Button title="Usar datos guardados" onPress={handleUseSavedData} />}
                    <TextInput
                        placeholder="Dirección de entrega"
                        value={address}
                        onChangeText={setAddress}
                        style={styles.input}
                    />
                    <TextInput
                        placeholder="Número de tarjeta (ejemplo: 4242424242424242)"
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
                    <Button title="Guardar datos para la próxima vez" onPress={saveData} />
                    <Button title="Simular pago y realizar pedido" onPress={handlePlaceOrder} />
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
