let db = null;
let firebaseInitFailed = false;
let firestoreModule = null;

// Lazy load Firebase Firestore
const getFirestoreModule = () => {
  if (firestoreModule) return firestoreModule;
  try {
    const { getFirestore, collection, addDoc, doc, updateDoc, getDoc } = require('@react-native-firebase/firestore');
    firestoreModule = { getFirestore, collection, addDoc, doc, updateDoc, getDoc };
    return firestoreModule;
  } catch (error) {
    console.warn('[Firebase Firestore] Module not found:', error.message);
    firebaseInitFailed = true;
    return null;
  }
};

const getDb = () => {
  if (db) return db;
  const modules = getFirestoreModule();
  if (!modules) {
    firebaseInitFailed = true;
    return null;
  }
  try {
    db = modules.getFirestore();
    return db;
  } catch (error) {
    console.warn('[Firebase Firestore] Not initialized:', error.message);
    firebaseInitFailed = true;
    return null;
  }
};

const getCollectionRef = (name) => {
  const database = getDb();
  if (!database) throw new Error('Firestore not initialized');
  const modules = getFirestoreModule();
  if (!modules) throw new Error('Firestore module not available');
  return modules.collection(database, name);
};

const addDocument = (collectionName, data) => {
  if (firebaseInitFailed || !getDb()) {
    console.warn('[Firestore] addDocument skipped - Firestore not initialized');
    return Promise.reject(new Error('Firestore not initialized'));
  }
  const modules = getFirestoreModule();
  if (!modules) return Promise.reject(new Error('Firestore module not available'));
  return modules.addDoc(getCollectionRef(collectionName), data);
};

const updateDocument = (collectionName, id, data) => {
  const database = getDb();
  if (!database) {
    console.warn('[Firestore] updateDocument skipped - Firestore not initialized');
    return Promise.reject(new Error('Firestore not initialized'));
  }
  const modules = getFirestoreModule();
  if (!modules) return Promise.reject(new Error('Firestore module not available'));
  const docRef = modules.doc(database, collectionName, id);
  return modules.updateDoc(docRef, data);
};

const getDocument = async (collectionName, id) => {
  const database = getDb();
  if (!database) {
    console.warn('[Firestore] getDocument skipped - Firestore not initialized');
    return null;
  }
  const modules = getFirestoreModule();
  if (!modules) return null;
  const docRef = modules.doc(database, collectionName, id);
  const snap = await modules.getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
};

export { getCollectionRef, addDocument, updateDocument, getDocument };
