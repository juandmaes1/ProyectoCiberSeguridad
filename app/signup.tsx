import { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';

import { AuthContext } from '@/context/AuthContext';

export default function Signup() {
  const authContext = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');

  const handleSignUp = async () => {
    if (!firstname.trim() || !lastname.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y apellido.');
      return;
    }

    if (!authContext) {
      Alert.alert('Error', 'Servicio de autenticación no disponible.');
      return;
    }

    const result = await authContext.signUp(
      firstname.trim(),
      lastname.trim(),
      email.trim(),
      password,
    );

    if (result.success) {
      Alert.alert(
        'Registro exitoso',
        'Tu cuenta ha sido creada. Un administrador debe aprobarla antes de que puedas comprar.',
        [
          {
            text: 'Ir al inicio',
            onPress: () => router.push('/(tabs)/home'),
          },
        ],
      );
      setFirstname('');
      setLastname('');
      setEmail('');
      setPassword('');
      return;
    }

    const readableMessage =
      result.errorCode === 'auth/email-already-in-use'
        ? 'Este correo ya está registrado. Intenta iniciar sesión.'
        : result.errorCode === 'auth/invalid-email'
          ? 'El correo ingresado no es válido.'
          : result.errorCode === 'auth/weak-password'
            ? 'La contraseña debe tener al menos 6 caracteres.'
            : result.errorMessage ?? 'No se pudo registrar. Verifica tus datos.';

    Alert.alert('Error', readableMessage);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registro</Text>

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
        placeholder="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />

      <TextInput
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <Button title="Registrar" onPress={handleSignUp} />

      <Link href="/(tabs)/home" asChild>
        <Button title="Ir a Inicio" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    padding: 10,
    paddingHorizontal: 20,
    marginVertical: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    width: '85%',
  },
});
