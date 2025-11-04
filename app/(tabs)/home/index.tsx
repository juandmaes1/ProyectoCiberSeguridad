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
    updateDoc
} from 'firebase/firestore';
import { useEffect, useState, useContext } from 'react';

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
import { Button as PaperButton } from 'react-native-paper';

interface Book {
    id: string;
    title: string;
    price: string;
    image: string;
    address: string;
    bookState: string;
    category: string;
    date: string;
    description: string;
    likedBy: string[];
    quantity?: number; // Cantidad para el carrito
}

export default function BookList() {
    const [books, setBooks] = useState<Book[]>([]);
    const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedBook, setSelectedBook] = useState<Book | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const authCtx = useContext(AuthContext);
    const userId = authCtx?.state.user?.uid ?? null;
    const [cartItems, setCartItems] = useState<Book[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [searchText, setSearchText] = useState('');

    const categories = [
        "Romance",
        "Sci-Fi",
        "Medieval",
        "Manga",
        "Comics",
        "Drama",
        "Terror",
        "Fantasía",
        "Aventura",
        "Histórico",
        "Educativo",
    ];

    useEffect(() => {
        if (userId) {
            loadCart(userId);
        }

        const q = query(collection(db, 'books'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBooks: Book[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                title: doc.data().title,
                price: doc.data().price,
                image: doc.data().image,
                address: doc.data().address,
                bookState: doc.data().bookState,
                category: doc.data().category,
                date: doc.data().date.toDate().toString(),
                description: doc.data().description,
                likedBy: doc.data().likedBy || [],
            }));
            setBooks(fetchedBooks);
            setFilteredBooks(fetchedBooks);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (selectedCategory) {
            setFilteredBooks(books.filter((book) => book.category === selectedCategory));
        } else {
            setFilteredBooks(books);
        }
    }, [selectedCategory, books]);

    const loadCart = async (uid: string) => {
        try {
            const cartRef = doc(db, 'carts', uid);
            const cartDoc = await getDoc(cartRef);

            if (cartDoc.exists()) {
                const itemsFromFirebase = cartDoc.data().items || [];
                setCartItems(itemsFromFirebase.map((item: any) => ({
                    ...item,
                    quantity: item.quantity || 1,
                })));
            } else {
                setCartItems([]);
            }
        } catch (error) {
            console.error("Error al cargar el carrito: ", error);
            Alert.alert("Error", "No se pudo cargar el carrito.");
        }
    };

    const saveCart = async (uid: string, updatedCart: Book[]) => {
        // Firestore no acepta valores undefined. Normalizamos los items.
        const safeItems = updatedCart.map((it) => ({
            id: String(it.id ?? ''),
            title: String(it.title ?? ''),
            price: String(it.price ?? ''),
            image: String(it.image ?? ''),
            quantity: Number(it.quantity ?? 1),
        }));

        const cartRef = doc(db, 'carts', uid);
        await setDoc(cartRef, { items: safeItems }, { merge: true });
    };

    const addToCart = async (book: Book, quantity: number) => {
        if (!userId) {
            Alert.alert("Error", "Por favor inicia sesión para agregar al carrito.");
            return;
        }

        const updatedCart = [...cartItems];
        const existingBookIndex = updatedCart.findIndex((item) => item.id === book.id);

        if (existingBookIndex !== -1) {
            updatedCart[existingBookIndex].quantity =
                Number(updatedCart[existingBookIndex].quantity || 0) + Number(quantity || 1);
        } else {
            // Solo guardar campos necesarios para el carrito para evitar undefined
            updatedCart.push({
                id: book.id,
                title: book.title ?? '',
                price: String(book.price ?? ''),
                image: book.image ?? '',
                quantity: Number(quantity || 1),
                // no incluimos campos potencialmente undefined
            } as Book);
        }

        setCartItems(updatedCart);
        await saveCart(userId, updatedCart);
        Alert.alert("Éxito", "Libro agregado al carrito.");
    };

    const toggleLike = async (book: Book) => {
        if (!userId) {
            Alert.alert('Error', 'Por favor inicia sesión para dar "me gusta".');
            return;
        }

        const isLiked = book.likedBy.includes(userId);
        const updatedLikedBy = isLiked
            ? book.likedBy.filter((id) => id !== userId)
            : [...book.likedBy, userId];

        await updateDoc(doc(db, 'books', book.id), { likedBy: updatedLikedBy });
    };

    const openModal = (book: Book) => {
        setSelectedBook(book);
        setQuantity(1);
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setSelectedBook(null);
        setIsModalVisible(false);
    };

    const renderBook = ({ item }: { item: Book }) => {
        const isLiked = item.likedBy.includes(userId || '');

        return (
            <View style={styles.bookCard}>
                <TouchableOpacity onPress={() => openModal(item)}>
                    <Image source={{ uri: item.image }} style={styles.bookImage} />
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookPrice}>${item.price}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.favoriteIcon}
                    onPress={() => toggleLike(item)}
                >
                    <FontAwesome
                        name="heart"
                        size={24}
                        color={isLiked ? 'red' : 'gray'}
                    />
                </TouchableOpacity>
            </View>
        );
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
        const filtered = books.filter((book) =>
            book.title.toLowerCase().includes(text.toLowerCase()) || 
            book.description.toLowerCase().includes(text.toLowerCase())
        );
        setFilteredBooks(filtered);
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchBar}>
                <TextInput
                    placeholder="Buscar en libreríaVirtual"
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={handleSearch}
                />
                <FontAwesome5 name="search" size={20} color="black" style={styles.searchIcon} />
                <Link href="/(tabs)/home/carrito">
                    <FontAwesome5 name="shopping-cart" size={20} color="black" style={styles.cartIcon} />
                </Link>
            </View>

            {/* Categories */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryCarousel}
            >
                {categories.map((category, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.categoryCircle,
                            selectedCategory === category && styles.categoryCircleSelected,
                        ]}
                        onPress={() =>
                            setSelectedCategory(selectedCategory === category ? null : category)
                        }
                    >
                        <Text style={styles.categoryText}>{category}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>
                {selectedCategory ? `Categoría: ${selectedCategory}` : "Para ti"}
            </Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={filteredBooks}
                    renderItem={renderBook}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={styles.bookList}
                />
            )}
            


            {/* Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeModal}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {selectedBook && (
                            <>
                                <Image source={{ uri: selectedBook.image }} style={styles.modalImage} />
                                <Text style={styles.modalTitle}>{selectedBook.title}</Text>
                                <Text style={styles.modalPrice}>${selectedBook.price}</Text>
                                <Text style={styles.modalDescription}>{selectedBook.description}</Text>
                                <View style={styles.quantityContainer}>
                                    <Text>Cantidad:</Text>
                                    <TextInput
                                        style={styles.quantityInput}
                                        keyboardType="number-pad"
                                        value={quantity.toString()}
                                        onChangeText={(value) => setQuantity(parseInt(value) || 1)}
                                    />
                                </View>
                                <Button
                                    title="Agregar al carrito"
                                    onPress={() => {
                                        if (selectedBook) {
                                            addToCart(selectedBook, quantity);
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
  categoryCarousel: {
      paddingVertical: 10,
      paddingHorizontal: 5,
  },
  categoryCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#dedede',
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 5,
  },
  categoryCircleSelected: {
      backgroundColor: '#2a9d8f',
  },
  categoryText: {
      fontSize: 10,
      textAlign: 'center',
      color: '#333',
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginVertical: 10,
      paddingHorizontal: 10,
  },
  bookList: {
      paddingHorizontal: 10,
  },
  bookCard: {
      flex: 1,
      margin: 5,
      backgroundColor: '#fff',
      borderRadius: 10,
      overflow: 'hidden',
      elevation: 3,
  },
  bookImage: {
      width: '100%',
      height: 150,
      resizeMode: 'cover',
  },
  bookTitle: {
      fontWeight: 'bold',
      fontSize: 14,
      padding: 10,
      color: '#333',
  },
  bookPrice: {
      fontSize: 14,
      color: '#2a9d8f',
      paddingHorizontal: 10,
      paddingBottom: 10,
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
  quantitySelector: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10,
  },
  quantityButton: {
      fontSize: 24,
      color: '#2a9d8f',
      paddingHorizontal: 10,
      paddingVertical: 5,
  },
  quantityText: {
      fontSize: 18,
      color: '#333',
      paddingHorizontal: 10,
  },
  favoriteIcon: {
      position: 'absolute',
      top: 10,
      right: 10,
  },
  cartButton: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      backgroundColor: '#f4f4f4',
      borderRadius: 20,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
  },
  cartButtonText: {
      fontSize: 16,
      color: '#2a9d8f',
  },
  quantityButtonSelected: {
      color: '#fff',
      backgroundColor: '#2a9d8f',
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
  creatorName: {
    fontSize: 12,
    color: '#555',
    paddingHorizontal: 10,
    paddingTop: 5,
},
  
});
