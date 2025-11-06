import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PROJECT_ID = 'embarcadero-ba3cc';
const STORAGE_BUCKET = 'embarcadero-ba3cc.firebasestorage.app';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = '081305028';
const STORAGE_EMULATOR_ORIGIN =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST?.startsWith('http')
    ? process.env.FIREBASE_STORAGE_EMULATOR_HOST
    : `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199'}`;

process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';

initializeApp({
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
});

const auth = getAuth();
const db = getFirestore();
const storage = getStorage().bucket();

const sampleProducts: Array<{
  id: string;
  title: string;
  price: string;
  description: string;
  imageSource: string;
}> = [
  {
    id: 'arepa-seleccion',
    title: 'La Seleccion',
    price: '28000',
    description: 'Arepa con pollo, chicharron, quesito y tajadas de maduro.',
    imageSource:
      'https://images.unsplash.com/photo-1580442404071-991baff76548?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'arepa-chorizo',
    title: 'Chorizo con arepa',
    price: '17500',
    description:
      'Delicioso chorizo con blend de carne de cerdo y arepa con mantequilla para acompañar.',
    imageSource:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'arepa-queso',
    title: 'Arepa con queso sencilla',
    price: '12000',
    description: 'Arepa tradicional con queso campesino fundido.',
    imageSource:
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'arepa-carne',
    title: 'Arepa con carne desmechada',
    price: '25000',
    description: 'Carne desmechada sazonada a la criolla sobre arepa blanca.',
    imageSource:
      'https://images.unsplash.com/photo-1601925260353-2977f49d06f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'arepa-vegetariana',
    title: 'Arepa vegetariana',
    price: '21000',
    description: 'Arepa con guacamole, queso fresco y vegetales salteados.',
    imageSource:
      'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80',
  },
];

async function ensureAdminUser(): Promise<string> {
  try {
    const record = await auth.getUserByEmail(ADMIN_EMAIL);
    return record.uid;
  } catch {
    const created = await auth.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: 'Admin Seed',
      emailVerified: true,
    });
    return created.uid;
  }
}

async function seedAdminProfile(uid: string) {
  await db
    .collection('Users')
    .doc(uid)
    .set(
      {
        firstname: 'Admin',
        lastname: 'Seed',
        email: ADMIN_EMAIL,
        role: 'admin',
        approved: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

async function seedProducts(adminUid: string) {
  await Promise.all(
    sampleProducts.map(async (product) => {
      const docRef = db.collection('arepas').doc(product.id);
      const existing = await docRef.get();
      if (existing.exists) {
        return;
      }

      const storagePath = `seed/${product.id}.jpg`;
      const file = storage.file(storagePath);

      const response = await fetch(product.imageSource);
      if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen para ${product.id}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await file.save(buffer, {
        metadata: { contentType: 'image/jpeg' },
      });

      const downloadUrl = `${STORAGE_EMULATOR_ORIGIN}/v0/b/${storage.name}/o/${encodeURIComponent(
        storagePath,
      )}?alt=media`;

      await docRef.set({
        title: product.title,
        price: product.price,
        description: product.description,
        image: downloadUrl,
        userId: adminUid,
        likedBy: [],
        date: FieldValue.serverTimestamp(),
        address: '',
        bookState: 'disponible',
      });
    }),
  );
}

async function main() {
  const adminUid = await ensureAdminUser();
  await seedAdminProfile(adminUid);
  await seedProducts(adminUid);
  console.log('Emulador seed completado.');
}

main().catch((error) => {
  console.error('Error ejecutando seed:', error);
  process.exit(1);
});
