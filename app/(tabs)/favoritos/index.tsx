
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/utils/firebaseConfig';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

interface Book {
    id: string;
    title: string;
    price: string;
    image: string;
    likedBy: string[];
}

export default function Favorites() {
    const [favorites, setFavorites] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // Obtener ID del usuario autenticado
        const currentUser = auth.currentUser;
        if (currentUser) {
            setUserId(currentUser.uid);
        }

        if (!currentUser) return;

        // Suscribirse a los cambios en los libros y filtrar los favoritos
        const q = query(collection(db, 'books'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedFavorites = snapshot.docs
                .map((doc) => ({
                    id: doc.id,
                    title: doc.data().title,
                    price: doc.data().price,
                    image: doc.data().image,
                    likedBy: doc.data().likedBy || [],
                }))
                .filter((book) => book.likedBy.includes(currentUser.uid)); // Filtrar por favoritos del usuario
            setFavorites(fetchedFavorites);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderFavorite = ({ item }: { item: Book }) => (
        <View style={styles.favoriteCard}>
            <Image source={{ uri: item.image }} style={styles.favoriteImage} />
            <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteTitle}>{item.title}</Text>
                <Text style={styles.favoritePrice}>${item.price}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Tus Favorito</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : favorites.length > 0 ? (
                <FlatList
                    data={favorites}
                    renderItem={renderFavorite}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.favoritesList}
                />
            ) : (
                <Text style={styles.emptyMessage}>No tienes libros favoritos aún.</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    favoritesList: {
        paddingBottom: 16,
    },
    favoriteCard: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        alignItems: 'center',
    },
    favoriteImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    favoriteInfo: {
        flex: 1,
    },
    favoriteTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    favoritePrice: {
        fontSize: 16,
        color: '#666',
    },
    emptyMessage: {
        fontSize: 16,
        textAlign: 'center',
        color: '#888',
        marginTop: 32,
    },
});
