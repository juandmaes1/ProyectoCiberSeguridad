import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { Link } from 'expo-router';
import { AuthContext } from '@/context/AuthContext';
import { useContext, useState } from 'react';

export default function Signup() {
  const authContext = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');

  const handleSignUp = async () => {
    if (!firstname || !lastname) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y apellido.');
      return;
    }

    if (!authContext) {
      Alert.alert('Error', 'Servicio de autenticación no disponible.');
      return;
    }

    const success = await authContext.signUp(firstname, lastname, email, password);
    if (success) {
      Alert.alert('Registro exitoso', '¡Bienvenido!', [
        { text: 'OK', onPress: () => console.log('User registered') },
      ]);
    } else {
      Alert.alert('Error', 'No se pudo registrar. Por favor verifica tus datos.');
    }
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
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    padding: 10,
    paddingHorizontal: 20,
    margin: 10,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    width: '80%',
  },
});
