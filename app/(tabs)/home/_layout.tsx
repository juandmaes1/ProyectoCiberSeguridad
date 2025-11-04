import { Stack } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Libreria Virtual</Text>
              
              
            </View>
          ),
        }}
      />
      <Stack.Screen name="notifications"
        options={{
          title: "Notificaciones",
        }}
      />
    </Stack>
  );
}


