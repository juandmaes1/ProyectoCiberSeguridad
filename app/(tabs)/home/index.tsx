import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Link } from 'expo-router';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface Arepa {
    id: string;
    title: string;
    price: string;
    image: string;
    address?: string;
    bookState?: string;
    date?: string;
    description?: string;
    likedBy?: string[];
    quantity?: number;
}

export default function BookList() {
    const [arepas, setArepas] = useState<Arepa[]>([]);
    const [filteredArepas, setFilteredArepas] = useState<Arepa[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedArepa, setSelectedArepa] = useState<Arepa | null>(null);
    const authCtx = useContext(AuthContext);
    const role = authCtx?.state.user?.role;
    const isAdmin = role === 'admin';
    const userId = authCtx?.state.user?.uid ?? null;
    const isApproved = isAdmin || Boolean(authCtx?.state.user?.approved);
    const [cartItems, setCartItems] = useState<Arepa[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        const arepasQuery = query(collection(db, 'arepas'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(arepasQuery, (snapshot) => {
            const fetchedArepas: Arepa[] = snapshot.docs.map((docSnapshot) => {
                const data = docSnapshot.data() as any;

                return {
                    id: docSnapshot.id,
                    title: data.title ?? '',
                    price: data.price ?? '',
                    image: data.image ?? '',
                    address: data.address ?? '',
                    bookState: data.bookState ?? '',
                    date: data.date?.toDate ? data.date.toDate().toString() : '',
                    description: data.description ?? '',
                    likedBy: Array.isArray(data.likedBy) ? data.likedBy : [],
                };
            });

            setArepas(fetchedArepas);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredArepas(arepas);
            return;
        }

        const normalized = searchText.toLowerCase();
        setFilteredArepas(
            arepas.filter((arepa) => {
                const title = (arepa.title ?? '').toLowerCase();
                const description = (arepa.description ?? '').toLowerCase();
                return title.includes(normalized) || description.includes(normalized);
            }),
        );
    }, [arepas, searchText]);

    useEffect(() => {
        if (userId) {
            loadCart(userId);
        } else {
            setCartItems([]);
        }
    }, [userId]);

    const loadCart = async (uid: string) => {
        try {
            const cartRef = doc(db, 'carts', uid);
            const cartDoc = await getDoc(cartRef);

            if (cartDoc.exists()) {
                const items = (cartDoc.data().items || []) as Arepa[];
                setCartItems(
                    items.map((item) => ({
                        ...item,
                        quantity: Number(item.quantity ?? 1),
                    })),
                );
            } else {
                setCartItems([]);
            }
        } catch (error) {
            console.error('Error al cargar el carrito: ', error);
            Alert.alert('Error', 'No se pudo cargar el carrito.');
        }
    };

    const saveCart = async (uid: string, updatedCart: Arepa[]) => {
        const safeItems = updatedCart.map((item) => ({
            id: String(item.id ?? ''),
            title: String(item.title ?? ''),
            price: String(item.price ?? ''),
            image: String(item.image ?? ''),
            quantity: Number(item.quantity ?? 1),
        }));

        const cartRef = doc(db, 'carts', uid);
        await setDoc(cartRef, { items: safeItems }, { merge: true });
    };

    const addToCart = async (arepa: Arepa, arepaQuantity: number) => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesión para agregar al carrito.');
            return;
        }

        if (!isApproved) {
            Alert.alert(
                'Cuenta no aprobada',
                'Tu cuenta aún no ha sido aprobada por un administrador, por lo que no puedes comprar de momento.',
            );
            return;
        }

        const updatedCart = [...cartItems];
        const existingIndex = updatedCart.findIndex((item) => item.id === arepa.id);

        if (existingIndex !== -1) {
            updatedCart[existingIndex].quantity =
                Number(updatedCart[existingIndex].quantity ?? 0) + Number(arepaQuantity || 1);
        } else {
            updatedCart.push({
                id: arepa.id,
                title: arepa.title ?? '',
                price: String(arepa.price ?? ''),
                image: arepa.image ?? '',
                quantity: Number(arepaQuantity || 1),
            });
        }

        setCartItems(updatedCart);
        await saveCart(userId, updatedCart);
        Alert.alert('Éxito', 'Arepa agregada al carrito.');
    };

    const toggleLike = async (arepa: Arepa) => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesión para dar "me gusta".');
            return;
        }

        const currentLikes = arepa.likedBy ?? [];
        const isLiked = currentLikes.includes(userId);
        const updatedLikedBy = isLiked
            ? currentLikes.filter((id) => id !== userId)
            : [...currentLikes, userId];

        setArepas((prev) =>
            prev.map((item) =>
                item.id === arepa.id ? { ...item, likedBy: updatedLikedBy } : item,
            ),
        );

        await updateDoc(doc(db, 'arepas', arepa.id), { likedBy: updatedLikedBy });
    };

    const openModal = (arepa: Arepa) => {
        setSelectedArepa(arepa);
        setQuantity(1);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setSelectedArepa(null);
        setIsModalVisible(false);
    };

    const renderArepa = ({ item }: { item: Arepa }) => {
        const likedBy = item.likedBy ?? [];
        const isLiked = likedBy.includes(userId ?? '');

        return (
            <View style={styles.arepaCard}>
                <TouchableOpacity onPress={() => openModal(item)}>
                    <Image source={{ uri: item.image }} style={styles.arepaImage} />
                    <Text style={styles.arepaTitle}>{item.title}</Text>
                    <Text style={styles.arepaPrice}>${item.price}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.favoriteIcon} onPress={() => toggleLike(item)}>
                    <FontAwesome name="heart" size={24} color={isLiked ? 'red' : 'gray'} />
                </TouchableOpacity>
            </View>
        );
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <TextInput
                    placeholder="Buscar arepas"
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={handleSearch}
                />
                <FontAwesome5 name="search" size={20} color="black" style={styles.searchIcon} />
                <Link href="/(tabs)/home/carrito">
                    <FontAwesome5 name="shopping-cart" size={20} color="black" style={styles.cartIcon} />
                </Link>
            </View>

            <Text style={styles.sectionTitle}>Para ti</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={filteredArepas}
                    renderItem={renderArepa}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.arepaList}
                />
            )}

            <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedArepa && (
                            <>
                                <Image source={{ uri: selectedArepa.image }} style={styles.modalImage} />
                                <Text style={styles.modalTitle}>{selectedArepa.title}</Text>
                                <Text style={styles.modalPrice}>${selectedArepa.price}</Text>
                                <Text style={styles.modalDescription}>{selectedArepa.description ?? ''}</Text>
                                <View style={styles.quantityContainer}>
                                    <Text>Cantidad:</Text>
                                    <TextInput
                                        style={styles.quantityInput}
                                        keyboardType="number-pad"
                                        value={quantity.toString()}
                                        onChangeText={(value) =>
                                            setQuantity(Math.max(1, parseInt(value, 10) || 1))
                                        }
                                    />
                                </View>
                                <Button
                                    title="Agregar al carrito"
                                    onPress={() => {
                                        if (selectedArepa) {
                                            addToCart(selectedArepa, quantity);
                                            closeModal();
                                        }
                                    }}
                                />
                                <Button title="Cerrar" onPress={closeModal} />
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#f1f1f1',
        borderRadius: 10,
        padding: 10,
        marginRight: 10,
    },
    searchIcon: {
        marginRight: 15,
    },
    cartIcon: {
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    arepaList: {
        paddingHorizontal: 10,
    },
    arepaCard: {
        flex: 1,
        margin: 5,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    arepaImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    arepaTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        padding: 10,
        color: '#333',
    },
    arepaPrice: {
        fontSize: 14,
        color: '#2a9d8f',
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    favoriteIcon: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    modalImage: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalPrice: {
        fontSize: 18,
        color: '#2a9d8f',
        marginBottom: 10,
    },
    modalDescription: {
        fontSize: 14,
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    quantityContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    quantityInput: {
        fontSize: 24,
        color: '#2a9d8f',
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
});




