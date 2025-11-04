import { DataProvider } from '@/dataContext/DataContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function _layout() {
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
                <Tabs.Screen
                    name="newPost"
                    options={{
                        title: "Nuevo Post",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="edit" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="profile"
                    options={{
                        title: "perfil",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="user-circle" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="favoritos"
                    options={{
                        title: "Favoritos",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="heart" size={size} color={color} />
                        ),
                    }}
                />
                <Tabs.Screen
                    name="ofertas"
                    options={{
                        title: "Ofertas",
                        tabBarIcon: ({ color, size }) => (
                            <FontAwesome5 name="percent" size={size} color={color} />
                        ),
                    }}
                />
            </Tabs>
        </DataProvider>
    );
}
