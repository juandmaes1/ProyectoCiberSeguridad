import { auth, db } from '@/utils/firebaseConfig';
import { useLocalSearchParams } from 'expo-router';
import { addDoc, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, FlatList, Text, TextInput, View } from 'react-native';

type MessageType = {
  id: string;
  text: string;
  senderId: string;
  recipientId: string;
  createdAt: { toDate: () => Date };
};

export default function Message() {
  const params = useLocalSearchParams();
  const recipientId = params.recipientId as string;
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [user] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !recipientId) return;

    const unsubscribe = openListener(recipientId);
    return () => unsubscribe && unsubscribe();
  }, [user, recipientId]);

  const openListener = (recipientId: string) => {
    const messagesRef = collection(db, 'messages');

    const q = query(
      messagesRef,
      where('senderId', 'in', [user?.uid as string, recipientId]),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<MessageType, 'id'>),
        })) as MessageType[];
        const newMessages = allMessages.filter(
          (m) =>
            (m.senderId === user?.uid && m.recipientId === recipientId) ||
            (m.senderId === recipientId && m.recipientId === (user?.uid as string))
        );
        setMessages(newMessages);
        setLoading(false);
      },
      (error) => {
        console.error('Error al recibir mensajes:', error);
      }
    );

    return unsubscribe;
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !recipientId) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderId: user?.uid,
        recipientId,
        createdAt: new Date(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    }
  };

  const renderMessage = ({ item }: { item: MessageType }) => (
    <View
      style={{
        padding: 10,
        backgroundColor: item.senderId === user?.uid ? '#DCF8C6' : '#FFF',
        marginVertical: 5,
        borderRadius: 10,
      }}
    >
      <Text>{item.text}</Text>
      <Text style={{ fontSize: 10, color: '#999', textAlign: 'right' }}>
        {item.createdAt.toDate().toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10 }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, padding: 10 }}
        />
        <Button title="Enviar" onPress={handleSendMessage} />
      </View>
    </View>
  );
}
