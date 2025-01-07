const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const createAdminUser = async () => {
  try {
    const adminUser = {
      email: 'dtan42@gmail.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'users'), adminUser);
    console.log('Admin user created with ID:', docRef.id);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
