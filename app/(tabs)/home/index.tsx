import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Link } from 'expo-router';
import {
    collection,
    addDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    FlatList,
    Image,
    Modal,
    ScrollView,
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

interface ArepaComment {
    id: string;
    text: string;
    userName: string;
    createdAt: string;
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
    const [quantityInput, setQuantityInput] = useState('1');
    const [searchText, setSearchText] = useState('');
    const [comments, setComments] = useState<ArepaComment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [postingComment, setPostingComment] = useState(false);
    const commentsUnsubscribe = useRef<(() => void) | null>(null);

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

    useEffect(() => {
        if (commentsUnsubscribe.current) {
            commentsUnsubscribe.current();
            commentsUnsubscribe.current = null;
        }

        setComments([]);
        setCommentText('');
        setCommentsLoading(false);

        if (!selectedArepa) {
            return;
        }

        setCommentsLoading(true);

        const commentsRef = collection(db, 'arepas', selectedArepa.id, 'comments');
        const commentsQuery = query(commentsRef, orderBy('createdAt', 'desc'));

        commentsUnsubscribe.current = onSnapshot(
            commentsQuery,
            (snapshot) => {
                const nextComments: ArepaComment[] = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data() as any;
                    const createdAt =
                        data.createdAt && typeof data.createdAt.toDate === 'function'
                            ? data.createdAt.toDate()
                            : data.createdAt && !Number.isNaN(Date.parse(data.createdAt))
                                ? new Date(data.createdAt)
                                : null;

                    return {
                        id: docSnap.id,
                        text: String(data.text ?? ''),
                        userName: String(data.userName ?? 'Anonimo'),
                        createdAt: createdAt ? createdAt.toLocaleString() : 'Sin fecha',
                    };
                });

                setComments(nextComments);
                setCommentsLoading(false);
            },
            (error) => {
                console.error('Error cargando comentarios:', error);
                setComments([]);
                setCommentsLoading(false);
            },
        );

        return () => {
            if (commentsUnsubscribe.current) {
                commentsUnsubscribe.current();
                commentsUnsubscribe.current = null;
            }
        };
    }, [selectedArepa?.id]);

    const loadCart = async (uid: string) => {
        try {
            const cartRef = doc(db, 'carts', uid);
            const cartDoc = await getDoc(cartRef);

            if (cartDoc.exists()) {
                const items = (cartDoc.data().items || []) as Arepa[];
                setCartItems(
                    items.map((item) => ({
                        ...item,
                        quantity: Math.max(1, Number(item.quantity ?? 1)),
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
            description: String(item.description ?? ''),
            quantity: Math.max(1, Number(item.quantity ?? 1)),
        }));

        const cartRef = doc(db, 'carts', uid);
        await setDoc(cartRef, { items: safeItems }, { merge: true });
    };

    const addToCart = async (arepa: Arepa, arepaQuantity: number) => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesion para agregar al carrito.');
            return;
        }

        if (!isApproved) {
            Alert.alert(
                'Cuenta no aprobada',
                'Tu cuenta aun no ha sido aprobada por un administrador, por lo que no puedes comprar de momento.',
            );
            return;
        }

        const updatedCart = [...cartItems];
        const existingIndex = updatedCart.findIndex((item) => item.id === arepa.id);

        if (existingIndex !== -1) {
            updatedCart[existingIndex].quantity =
                Math.max(
                    1,
                    Number(updatedCart[existingIndex].quantity ?? 0) + Number(arepaQuantity || 1),
                );
        } else {
            updatedCart.push({
                id: arepa.id,
                title: arepa.title ?? '',
                price: String(arepa.price ?? ''),
                image: arepa.image ?? '',
                description: arepa.description ?? '',
                quantity: Math.max(1, Number(arepaQuantity || 1)),
            });
        }

        setCartItems(updatedCart);
        await saveCart(userId, updatedCart);
        Alert.alert('Exito', 'Arepa agregada al carrito.');
    };

    const toggleLike = async (arepa: Arepa) => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesion para dar "me gusta".');
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

    const handleAddComment = async () => {
        if (!selectedArepa) {
            return;
        }

        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesion para comentar.');
            return;
        }

        const text = commentText.trim();
        if (!text) {
            return;
        }

        const profile = authCtx?.state.user;
        const displayName = [profile?.firstname, profile?.lastname]
            .filter(Boolean)
            .join(' ')
            .trim() || profile?.email || 'Anonimo';

        try {
            setPostingComment(true);
            await addDoc(collection(db, 'arepas', selectedArepa.id, 'comments'), {
                text,
                uid: userId,
                userName: displayName,
                createdAt: serverTimestamp(),
            });
            setCommentText('');
        } catch (error) {
            console.error('Error agregando comentario:', error);
            Alert.alert('Error', 'No se pudo publicar el comentario.');
        } finally {
            setPostingComment(false);
        }
    };

    const openModal = (arepa: Arepa) => {
        setSelectedArepa(arepa);
        setQuantityInput('1');
        setIsModalVisible(true);
    };

    const closeModal = () => {
        if (commentsUnsubscribe.current) {
            commentsUnsubscribe.current();
            commentsUnsubscribe.current = null;
        }
        setSelectedArepa(null);
        setIsModalVisible(false);
        setQuantityInput('1');
        setCommentText('');
        setComments([]);
        setCommentsLoading(false);
        setPostingComment(false);
    };

    const renderArepa = ({ item }: { item: Arepa }) => {
        const likedBy = item.likedBy ?? [];
        const isLiked = likedBy.includes(userId ?? '');

        return (
            <View style={styles.arepaCard}>
                <TouchableOpacity onPress={() => openModal(item)}>
                    <View style={styles.arepaImageWrapper}>
                        <Image source={{ uri: item.image }} style={styles.arepaImage} />
                    </View>
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
                    columnWrapperStyle={styles.arepaColumn}
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
                                        value={quantityInput}
                                        onChangeText={(value) => {
                                            const digits = value.replace(/\D/g, '').slice(0, 3);
                                            setQuantityInput(digits);
                                        }}
                                        onBlur={() =>
                                            setQuantityInput((prev) => {
                                                const parsed = parseInt(prev, 10);
                                                if (!prev || Number.isNaN(parsed) || parsed < 1) {
                                                    return '1';
                                                }
                                                return String(parsed);
                                            })
                                        }
                                    />
                                </View>
                                <View style={styles.commentsSection}>
                                    <Text style={styles.commentsTitle}>Comentarios</Text>
                                    {commentsLoading ? (
                                        <ActivityIndicator size="small" color="#0000ff" />
                                    ) : comments.length === 0 ? (
                                        <Text style={styles.commentsEmpty}>
                                            Aun no hay comentarios. Se el primero en comentar.
                                        </Text>
                                    ) : (
                                        <ScrollView style={styles.commentsList}>
                                            {comments.map((comment) => (
                                                <View key={comment.id} style={styles.commentItem}>
                                                    <View style={styles.commentHeader}>
                                                        <Text style={styles.commentAuthor}>{comment.userName}</Text>
                                                        <Text style={styles.commentDate}>{comment.createdAt}</Text>
                                                    </View>
                                                    <Text style={styles.commentText}>{comment.text}</Text>
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                                    <TextInput
                                        placeholder="Escribe tu comentario"
                                        value={commentText}
                                        onChangeText={setCommentText}
                                        style={styles.commentInput}
                                        multiline
                                    />
                                    <Button
                                        title="Publicar comentario"
                                        onPress={handleAddComment}
                                        disabled={postingComment || commentText.trim().length === 0}
                                    />
                                </View>
                                <Button
                                    title="Agregar al carrito"
                                    onPress={() => {
                                        if (selectedArepa) {
                                            const quantityNumber = Math.max(
                                                1,
                                                parseInt(quantityInput, 10) || 1,
                                            );
                                            addToCart(selectedArepa, quantityNumber);
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
        paddingHorizontal: 12,
        paddingBottom: 24,
    },
    arepaColumn: {
        justifyContent: 'space-between',
    },
    arepaCard: {
        flexGrow: 1,
        width: '48%',
        marginVertical: 8,
        marginHorizontal: 6,
        backgroundColor: '#fff',
        borderRadius: 10,
        overflow: 'hidden',
        elevation: 3,
    },
    arepaImageWrapper: {
        width: '100%',
        aspectRatio: 3 / 2,
        backgroundColor: '#f0f0f0',
        overflow: 'hidden',
    },
    arepaImage: {
        width: '100%',
        height: '100%',
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
    commentsSection: {
        width: '100%',
        marginTop: 16,
    },
    commentsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    commentsList: {
        maxHeight: 180,
        marginBottom: 12,
    },
    commentItem: {
        backgroundColor: '#f5f5f5',
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    commentAuthor: {
        fontWeight: 'bold',
        fontSize: 13,
        color: '#333',
    },
    commentDate: {
        fontSize: 11,
        color: '#777',
    },
    commentText: {
        fontSize: 13,
        color: '#333',
    },
    commentsEmpty: {
        color: '#777',
        marginBottom: 12,
        fontSize: 13,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 10,
        minHeight: 60,
        marginBottom: 12,
        textAlignVertical: 'top',
    },
});







