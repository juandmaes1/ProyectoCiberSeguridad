import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, TextInput } from 'react-native-paper';
import ModalCamera from '@/components/ModalCamera';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';

export default function NewBookPost() {
  const authCtx = useContext(AuthContext);
  const me = authCtx?.state.user;

  const [isVisible, setIsVisible] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<{ uri: string } | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [price, setPrice] = useState('');

  const handleSavePost = async () => {
    if (me?.role !== 'admin') {
      Alert.alert('No autorizado', 'Solo un administrador puede crear publicaciones.');
      return;
    }
    if (!title || !ingredients || !price) {
      Alert.alert('Campos incompletos', 'Completa título, ingredientes y precio.');
      return;
    }
    if (!currentPhoto?.uri) {
      Alert.alert('Advertencia', 'Por favor, sube una foto antes de publicar la arepa.');
      return;
    }

    try {
      const storageRef = ref(storage, `images/${currentPhoto.uri.split('/').pop()}`);
      const response = await fetch(currentPhoto.uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'arepas'), {
        userId: auth.currentUser?.uid,
        title,
        price,
        ingredients,
        description: ingredients,
        image: downloadURL,
        date: new Date(),
      });

      Alert.alert('Éxito', 'La arepa se ha publicado correctamente.');
      setCurrentPhoto(undefined);
      setTitle('');
      setIngredients('');
      setPrice('');
    } catch (error) {
      console.error('Error al guardar la arepa:', error);
      Alert.alert('Error', 'Hubo un problema al publicar la arepa. Inténtalo de nuevo.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, paddingHorizontal: 20, paddingVertical: 10 }}
      contentContainerStyle={{ gap: 20 }}
    >
      <TouchableOpacity onPress={() => setIsVisible(true)}>
        {currentPhoto?.uri ? (
          <Image
            style={{ width: '100%', height: 200, borderRadius: 10 }}
            source={{ uri: currentPhoto.uri }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              backgroundColor: 'grey',
              paddingHorizontal: 20,
              aspectRatio: 1 / 0.8,
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <FontAwesome5 name="camera" size={30} color="white" />
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Título"
        mode="outlined"
        onChangeText={setTitle}
        value={title}
        style={{ borderRadius: 10 }}
      />

      <TextInput
        label="Ingredientes"
        mode="outlined"
        multiline
        onChangeText={setIngredients}
        value={ingredients}
        numberOfLines={3}
        style={{ borderRadius: 10 }}
      />

      <TextInput
        label="Precio"
        mode="outlined"
        keyboardType="numeric"
        onChangeText={setPrice}
        value={price}
        style={{ borderRadius: 10 }}
      />

      <Button icon="camera" mode="contained" onPress={() => setIsVisible(true)} style={{ borderRadius: 10 }}>
        Tomar foto
      </Button>

      <Button icon="check" mode="contained" onPress={handleSavePost} style={{ borderRadius: 10 }}>
        Publicar arepa
      </Button>

      <ModalCamera
        isVisible={isVisible}
        onClose={() => setIsVisible(false)}
        onSave={(photo) => {
          setCurrentPhoto(photo);
          setIsVisible(false);
        }}
      />
    </ScrollView>
  );
}
