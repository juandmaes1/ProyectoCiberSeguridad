import { AuthProvider } from "@/context/AuthContext";
import { Stack } from "expo-router";
import "../utils/firebaseConfig";
import * as React from "react";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "Ingresa" }} />
        <Stack.Screen name="signup" options={{ title: "Registrate" }} />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
