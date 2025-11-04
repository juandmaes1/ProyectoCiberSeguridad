import { Link, router } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Button, TextInput } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthContext } from "@/context/AuthContext";
import { useContext, useState } from "react";

export default function Signin() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const authContext = useContext(AuthContext);

  const handleLogin = async () => {
    if (!authContext) {
      console.log("AuthContext no disponible");
      return;
    }

    const { signIn } = authContext;
    const success = await signIn(email, password);

    if (success) {
      router.replace("/(tabs)/home");
    } else {
      console.log("Hubo un error ingresando");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: insets.bottom,
          paddingHorizontal: 30,
        }}
      >
        <Image
          style={{
            width: "100%",
            height: 120,
          }}
          source={require("../assets/resources/Logo-Instagram.png")}
          resizeMode="contain"
        />

        <TextInput
          label="Correo electrónico"
          mode="outlined"
          onChangeText={setEmail}
          value={email}
          style={styles.input}
          placeholder="Ingresa tu email..."
        />

        <TextInput
          label="Contraseña"
          mode="outlined"
          secureTextEntry
          onChangeText={setPassword}
          value={password}
          style={styles.input}
          placeholder="Ingresa tu contraseña..."
        />

        <Button mode="contained" onPress={handleLogin} style={{ marginVertical: 10 }}>
          Entrar
        </Button>

        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 10,
            borderTopWidth: 1,
            borderTopColor: "grey",
            width: "100%",
            paddingTop: 10,
          }}
        >
          <Text style={{ textAlign: "center" }}>
            ¿No tienes una cuenta?{" "}
            <Link href="/signup" style={{ color: "blue" }}>
  Regístrate
</Link>
            .
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingHorizontal: 10,
    marginVertical: 10,
    backgroundColor: "white",
    width: "100%",
  },
});
