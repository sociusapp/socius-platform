import { getFirestore, collection, addDoc, doc, updateDoc, getDoc } from '@react-native-firebase/firestore';

const db = getFirestore();

const getCollectionRef = (name) => {
  return collection(db, name);
};

const addDocument = (collectionName, data) => {
  return addDoc(getCollectionRef(collectionName), data);
};

const updateDocument = (collectionName, id, data) => {
  const docRef = doc(db, collectionName, id);
  return updateDoc(docRef, data);
};

const getDocument = async (collectionName, id) => {
  const docRef = doc(db, collectionName, id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...snap.data() };
};

export { getCollectionRef, addDocument, updateDocument, getDocument };
