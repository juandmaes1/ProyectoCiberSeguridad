import { View, Text, StyleSheet } from 'react-native';
import { useContext, useEffect } from 'react';
import { useRouter } from 'expo-router';

import { AuthContext } from '@/context/AuthContext';

export default function Bonuses() {
  const authCtx = useContext(AuthContext);
  const user = authCtx?.state.user;
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'admin') {
      router.replace('/(tabs)/home');
    }
  }, [user, router]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Bonos disponibles</Text>
        <Text style={styles.message}>Inicia sesión para revisar tus bonos.</Text>
      </View>
    );
  }

  if (user.role === 'admin') {
    return <View />;
  }

  const isApproved = Boolean(user.approved);
  const welcomeBonus = user.welcomeBonus;

  if (!welcomeBonus) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Bonos disponibles</Text>
        {!isApproved ? (
          <Text style={styles.message}>
            Tu cuenta aún está pendiente de aprobación. Recibirás un bono de bienvenida cuando sea aprobada.
          </Text>
        ) : (
          <Text style={styles.message}>
            No tienes bonos activos en este momento. ¡Revisa más tarde para nuevas promociones!
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bonos disponibles</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bono de bienvenida</Text>
        <Text style={styles.detail}>
          Código: <Text style={styles.code}>{welcomeBonus.code}</Text>
        </Text>
        <Text style={styles.detail}>Estado: {welcomeBonus.used ? 'Utilizado' : 'Disponible'}</Text>
        <Text style={styles.detail}>
          Otorgado: {new Date(welcomeBonus.grantedAt ?? Date.now()).toLocaleDateString()}
        </Text>
        {!isApproved && (
          <Text style={styles.notice}>Tu cuenta aún requiere aprobación para usar este bono.</Text>
        )}
        {isApproved && !welcomeBonus.used && (
          <Text style={styles.notice}>
            Usa este código en tu primera compra para obtener tu descuento del 40 %.
          </Text>
        )}
        {welcomeBonus.used && (
          <Text style={styles.notice}>Ya disfrutaste tu bono de bienvenida. ¡Gracias por comprar!</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: '#444',
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detail: {
    fontSize: 16,
    marginBottom: 6,
  },
  code: {
    fontWeight: 'bold',
    color: '#2a9d8f',
  },
  notice: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
  },
});
