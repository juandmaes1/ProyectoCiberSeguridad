import { db } from '@/utils/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

type UserType = {
  id: string;
  firstname: string;
  lastname: string;
};

export default function SelectChatUser() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'Users');
      const querySnapshot = await getDocs(usersRef);
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as UserType[];
      setUsers(userList);
      setLoading(false);
    };

    fetchUsers();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  const handleUserSelect = (userId: string) => {
    router.push({
        pathname: "/(tabs)/profile/message",
        params: { recipientId: userId },
      });
  };

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Selecciona un usuario para chatear:</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleUserSelect(item.id)}
            style={{
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#ccc',
              backgroundColor: '#f9f9f9',
            }}
          >
            <Text style={{ fontSize: 16 }}>{`${item.firstname} ${item.lastname}`}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
