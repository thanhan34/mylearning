import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// WFD Firebase configuration (pteshadowing project)
const wfdFirebaseConfig = {
  apiKey: "AIzaSyBdDDNRvAwiOz9gjQtyv5yGdjUKQ8cd7bs",
  authDomain: "pteshadowing.firebaseapp.com",
  projectId: "pteshadowing",
  storageBucket: "pteshadowing.appspot.com",
  messagingSenderId: "1030709369202",
  appId: "1:1030709369202:web:f5c029e87f836c013ba5eb"
};

// Initialize WFD Firebase app with a unique name
const wfdAppName = 'wfd-app';
const wfdApp = getApps().find(app => app.name === wfdAppName) 
  ? getApp(wfdAppName) 
  : initializeApp(wfdFirebaseConfig, wfdAppName);

// Initialize Firestore for WFD with optimized settings
const wfdDb = typeof window !== 'undefined' 
  ? initializeFirestore(wfdApp, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
    })
  : getFirestore(wfdApp);

// Enable offline persistence for WFD database
if (typeof window !== 'undefined') {
  try {
    const { enableIndexedDbPersistence } = require('firebase/firestore');
    enableIndexedDbPersistence(wfdDb)
      .then(() => {
        console.log('WFD Firestore persistence enabled successfully');
      })
      .catch((err: { code: string; message: string; name: string; stack?: string }) => {
        console.error('WFD Persistence error:', {
          code: err.code,
          message: err.message,
          name: err.name,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        
        if (err.code === 'failed-precondition') {
          console.warn('WFD: Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
          console.warn('WFD: The current browser does not support persistence.');
        }
      });
  } catch (error) {
    console.error('Error enabling WFD persistence:', {
      error,
      timestamp: new Date().toISOString()
    });
  }
}

// Log WFD Firestore initialization
console.log('WFD Firestore initialized with config:', {
  projectId: wfdFirebaseConfig.projectId,
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  timestamp: new Date().toISOString()
});

const wfdStorage = getStorage(wfdApp);

export { wfdDb, wfdStorage, wfdApp };
