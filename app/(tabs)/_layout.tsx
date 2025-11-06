import { DataProvider } from '@/dataContext/DataContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export default function _layout() {
  const authCtx = useContext(AuthContext);
  const role = authCtx?.state?.user?.role;
  const isAdmin = role === 'admin';

  return (
    <DataProvider>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: 'blue',
          headerShown: false,
        }}
      >
        {/* 🏠 Inicio */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="home" size={size} color={color} />
            ),
          }}
        />

        {/* ✏️ Nuevo Post (solo admin) */}
        <Tabs.Screen
          name="newPost"
          options={{
            href: isAdmin ? undefined : null, // ✅ oculto si no es admin
            title: 'Nuevo Post',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="edit" size={size} color={color} />
            ),
          }}
        />

        {/* 🛡️ Admin (solo admin) */}
        <Tabs.Screen
          name="admin/index"
          options={{
            href: isAdmin ? undefined : null, // ✅ oculta admin/index para no-admins
            title: 'Admin',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="user-shield" size={size} color={color} />
            ),
          }}
        />

        {/* 👤 Perfil */}
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="user-circle" size={size} color={color} />
            ),
          }}
        />

        {/* ❤️ Favoritos (solo usuarios normales) */}
        <Tabs.Screen
          name="favoritos"
          options={{
            href: isAdmin ? null : undefined,
            title: '❤️ Favoritos',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="heart" size={size} color={color} />
            ),
          }}
        />

        {/* 🎁 Bonos (solo usuarios normales) */}
        <Tabs.Screen
          name="bonos"
          options={{
            href: isAdmin ? null : undefined,
            title: '🎁 Bonos',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="gift" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </DataProvider>
  );
}
