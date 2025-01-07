import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { config } from '../app/firebase/config';

// Initialize Firebase
const app = initializeApp(config);
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
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

createAdminUser();
