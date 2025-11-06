import { DataProvider } from '@/dataContext/DataContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export default function _layout() {
    const authCtx = useContext(AuthContext);
    const role = authCtx?.state.user?.role;
    const isAdmin = role === 'admin';
    return (
        <DataProvider>
            <Tabs
                screenOptions={{
                    tabBarActiveTintColor: "blue",
                    headerShown: false,
                }}
            >
                <Tabs.Screen
                    name="home"
                    options={{
                        title: "Inicio",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="home" size={size} color={color} />
                        ),
                    }}
                />
                {isAdmin && (
                  <Tabs.Screen
                      name="newPost"
                      options={{
                          title: "Nuevo Post",
                          tabBarIcon: ({ color, size }) => (
                              <FontAwesome5 name="edit" size={size} color={color} />
                          ),
                      }}
                  />
                )}
                {isAdmin && (
                  <Tabs.Screen
                      name="admin"
                      options={{
                          title: "Admin",
                          tabBarIcon: ({ color, size }) => (
                              <FontAwesome5 name="user-shield" size={size} color={color} />
                          ),
                      }}
                  />
                )}
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "perfil",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="user-circle" size={size} color={color} />
                        ),
                    }}
                />
                {!isAdmin && (
                  <Tabs.Screen
                      name="favoritos"
                      options={{
                          title: "Favoritos",
                          tabBarIcon: ({ color, size }) => (
                              <FontAwesome5 name="heart" size={size} color={color} />
                          ),
                      }}
                  />
                )}
                {!isAdmin && (
                  <Tabs.Screen
                      name="bonos"
                      options={{
                          title: "Bonos",
                          tabBarIcon: ({ color, size }) => (
                              <FontAwesome5 name="gift" size={size} color={color} />
                          ),
                      }}
                  />
                )}
            </Tabs>
        </DataProvider>
    );
}
