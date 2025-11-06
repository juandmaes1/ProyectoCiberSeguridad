import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';

import ModalCamera from '@/components/ModalCamera';
import { db, auth, storage } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';

interface CameraPhoto {
  uri: string;
}

export default function NewBookPost() {
  const authCtx = useContext(AuthContext);
  const me = authCtx?.state.user;
  const router = useRouter();

  const [isVisible, setIsVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<CameraPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (me && me.role !== 'admin') {
      router.replace('/(tabs)/home');
    }
  }, [me, router]);

  const isAdmin = me?.role === 'admin';

  if (!isAdmin) {
    return <View />;
  }

  const handleOpenCamera = () => setIsVisible(true);

  const handleCloseCamera = () => setIsVisible(false);

  const handleSavePhoto = (photo: CameraPhoto) => {
    setCurrentPhoto(photo);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrice('');
    setCurrentPhoto(null);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !price.trim()) {
      Alert.alert('Validación', 'Ingresa al menos título y precio.');
      return;
    }

    try {
      setUploading(true);
      let downloadURL = '';

      if (currentPhoto?.uri) {
        const response = await fetch(currentPhoto.uri);
        const blob = await response.blob();
        const photoRef = ref(storage, `arepas/${Date.now()}.jpg`);
        await uploadBytes(photoRef, blob);
        downloadURL = await getDownloadURL(photoRef);
      }

      const ownerId = me?.uid ?? auth.currentUser?.uid ?? '';

      await addDoc(collection(db, 'arepas'), {
        title: title.trim(),
        description: description.trim(),
        price: price.trim(),
        image: downloadURL,
        userId: ownerId,
        date: new Date(),
        likedBy: [],
      });

      Alert.alert('Éxito', 'Publicación creada correctamente.');
      resetForm();
    } catch (error) {
      console.error('Error creando publicación:', error);
      Alert.alert('Error', 'No se pudo crear la publicación.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Crear nueva arepa</Text>

      <TouchableOpacity style={styles.imagePicker} onPress={handleOpenCamera}>
        {currentPhoto?.uri ? (
          <Image source={{ uri: currentPhoto.uri }} style={styles.imagePreview} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <FontAwesome5 name="camera" size={32} color="#999" />
            <Text style={styles.imagePlaceholderText}>Agregar foto</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Título"
        mode="outlined"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        label="Descripción"
        mode="outlined"
        value={description}
        onChangeText={setDescription}
        multiline
        style={styles.input}
      />

      <TextInput
        label="Precio"
        mode="outlined"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={styles.input}
      />

      <Button
        mode="contained"
        icon="content-save"
        onPress={handleSubmit}
        loading={uploading}
        disabled={uploading}
      >
        Guardar publicación
      </Button>

      <ModalCamera
        isVisible={isVisible}
        onClose={handleCloseCamera}
        onSave={(photo) => {
          if (photo?.uri) {
            handleSavePhoto(photo as CameraPhoto);
          }
          handleCloseCamera();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  imagePicker: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 12,
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
  },
  input: {
    marginBottom: 16,
  },
});
