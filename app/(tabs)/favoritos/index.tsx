import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/utils/firebaseConfig';
import { useEffect, useState } from 'react';

interface Arepa {
    id: string;
    title: string;
    price: string;
    image: string;
    likedBy: string[];
}

export default function Favorites() {
    const [favorites, setFavorites] = useState<Arepa[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const arepaQuery = query(collection(db, 'arepas'));
        const unsubscribe = onSnapshot(arepaQuery, (snapshot) => {
            const fetchedFavorites = snapshot.docs
                .map((docSnapshot) => ({
                    id: docSnapshot.id,
                    title: docSnapshot.data().title,
                    price: docSnapshot.data().price,
                    image: docSnapshot.data().image,
                    likedBy: docSnapshot.data().likedBy || [],
                }))
                .filter((arepa) => arepa.likedBy.includes(currentUser.uid));

            setFavorites(fetchedFavorites);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderFavorite = ({ item }: { item: Arepa }) => (
        <View style={styles.favoriteCard}>
            <Image source={{ uri: item.image }} style={styles.favoriteImage} />
            <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteTitle}>{item.title}</Text>
                <Text style={styles.favoritePrice}></Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Tus arepas favoritas</Text>
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
                <Text style={styles.emptyMessage}>No tienes arepas favoritas aún.</Text>
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
