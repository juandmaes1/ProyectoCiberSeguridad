import { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/utils/firebaseConfig';
import { AuthContext } from '@/context/AuthContext';

type UserRow = {
  uid: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: 'admin' | 'user';
  approved?: boolean;
};

export default function AdminPanel() {
  const authCtx = useContext(AuthContext);
  const me = authCtx?.state.user;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'Users'));
        const data: UserRow[] = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) }));
        setUsers(data);
      } catch (e) {
        console.log(e);
        Alert.alert('Error', 'No se pudieron cargar los usuarios');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (me?.role !== 'admin') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>No autorizado</Text>
      </View>
    );
  }

  const approve = async (uid: string) => {
    await updateDoc(doc(db, 'Users', uid), { approved: true });
    setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, approved: true } : u)));
  };

  const makeAdmin = async (uid: string) => {
    await updateDoc(doc(db, 'Users', uid), { role: 'admin' });
    setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, role: 'admin' } : u)));
  };

  const makeUser = async (uid: string) => {
    await updateDoc(doc(db, 'Users', uid), { role: 'user' });
    setUsers(prev => prev.map(u => (u.uid === uid ? { ...u, role: 'user' } : u)));
  };

  const renderItem = ({ item }: { item: UserRow }) => (
    <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}>
      <Text style={{ fontWeight: 'bold' }}>{item.firstname} {item.lastname}</Text>
      <Text>{item.email}</Text>
      <Text>Rol: {item.role ?? 'user'} | Aprobado: {item.approved ? 'sÃ­' : 'no'}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
        {!item.approved && (
          <Button title="Aprobar" onPress={() => approve(item.uid)} />
        )}
        {item.role !== 'admin' ? (
          <Button title="Hacer Admin" onPress={() => makeAdmin(item.uid)} />
        ) : (
          <Button title="Hacer Usuario" onPress={() => makeUser(item.uid)} />
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 12 }}>Panel de administraciÃ³n</Text>
      {loading ? (
        <Text style={{ padding: 12 }}>Cargando...</Text>
      ) : (
        <FlatList data={users} keyExtractor={(u) => u.uid} renderItem={renderItem} />
      )}
    </View>
  );
}


