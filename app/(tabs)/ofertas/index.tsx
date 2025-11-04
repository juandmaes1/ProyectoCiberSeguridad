import { db } from '@/utils/firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

type Book = {
  id: string;
  title: string;
  price: string;
  discountedPrice: string; // Precio con descuento
  discountPercentage: number; // Porcentaje de descuento
  image: string;
  description: string;
  category: string;
  address: string;
};

export default function RandomOffers() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    const fetchRandomBooks = async () => {
      try {
        // Obtener todos los libros de Firestore
        const querySnapshot = await getDocs(collection(db, 'books'));
        const allBooks = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const originalPrice = parseFloat(data.price);

          // Generar un descuento aleatorio entre 20% y 50%
          const discountPercentage = Math.floor(Math.random() * (50 - 20 + 1)) + 20;
          const discountedPrice = (originalPrice * (1 - discountPercentage / 100)).toFixed(2);

          return {
            id: doc.id,
            title: data.title,
            price: data.price,
            discountedPrice,
            discountPercentage,
            image: data.image,
            description: data.description,
            category: data.category,
            address: data.address,
          };
        }) as Book[];

        if (allBooks.length === 0) {
          console.warn('No se encontraron libros en la base de datos.');
          return;
        }

        // Barajar los libros y seleccionar hasta 10
        const shuffled = allBooks.sort(() => 0.5 - Math.random());
        const selectedBooks = shuffled.slice(0, 10);

        // Actualizar el estado
        setBooks(selectedBooks);
      } catch (error) {
        console.error('Error al obtener libros desde Firebase:', error);
      }
    };

    fetchRandomBooks();
  }, []);

  const renderBook = ({ item }: { item: Book }) => (
    <View style={styles.bookContainer}>
      <Image source={{ uri: item.image }} style={styles.bookImage} />
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookCategory}>Categoría: {item.category}</Text>
      <Text style={styles.bookDescription}>{item.description}</Text>
      <Text style={styles.bookPrice}>
        Precio original: ${item.price} | <Text style={styles.discountedPrice}>${item.discountedPrice}</Text>
      </Text>
      <Text style={styles.bookDiscount}>Descuento: {item.discountPercentage}%</Text>
      <Text style={styles.bookAddress}>Ubicación: {item.address}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Ofertas del Día</Text>
      {books.length > 0 ? (
        <FlatList
          data={books}
          renderItem={renderBook}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <Text style={styles.emptyMessage}>No hay ofertas disponibles.</Text>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 16,
  },
  bookContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  bookImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookCategory: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  bookDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  bookPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  discountedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  bookDiscount: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 4,
  },
  bookAddress: {
    fontSize: 12,
    color: '#777',
  },
  emptyMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 20,
  },
});
