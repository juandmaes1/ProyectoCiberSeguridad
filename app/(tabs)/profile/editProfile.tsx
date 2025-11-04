// EditProfile.js

import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { auth, db } from '@/utils/firebaseConfig';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { useEffect, useState } from 'react';

export default function EditProfile() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;

      if (user) {
        const userRef = doc(db, 'Users', user.uid);
        try {
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setFirstname(data.firstname);
            setLastname(data.lastname);
          }
        } catch (error) {
          console.error('Error al cargar el perfil del usuario:', error);
          Alert.alert('Error', 'No se pudo cargar la información del perfil');
        }
      } else {
        Alert.alert('Error', 'No hay un usuario autenticado');
      }
    };

    fetchUserData();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert('Error', 'No hay un usuario autenticado');
      return;
    }

    if (!firstname || !lastname) {
      Alert.alert('Error', 'Nombre y apellido son requeridos');
      return;
    }

    try {
      const userRef = doc(db, 'Users', user.uid);
      await updateDoc(userRef, {
        firstname,
        lastname,
      });

      if (password) {
        await updatePassword(user, password);
        Alert.alert('Éxito', 'Perfil y contraseña actualizados');
      } else {
        Alert.alert('Éxito', 'Perfil actualizado');
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Editar Perfil</Text>
      <TextInput
        placeholder="Nombre"
        value={firstname}
        onChangeText={setFirstname}
        style={styles.input}
      />
      <TextInput
        placeholder="Apellido"
        value={lastname}
        onChangeText={setLastname}
        style={styles.input}
      />
      <TextInput
        placeholder="Nueva Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Button title="Guardar Cambios" onPress={handleSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    padding: 10,
    marginVertical: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    width: '100%',
  },
});
