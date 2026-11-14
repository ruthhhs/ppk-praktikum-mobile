import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

// Konfigurasi dibaca otomatis dari google-services.json (native),
// jadi tidak ada initializeApp dan tidak ada API key di kode.
export const auth = getAuth();
export const db = getFirestore();
