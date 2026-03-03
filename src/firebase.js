import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCZY42lnregEXRxIAhxxDpUrHkYfmSHqzs",
  authDomain: "presence-tracker-60408.firebaseapp.com",
  projectId: "presence-tracker-60408",
  storageBucket: "presence-tracker-60408.firebasestorage.app",
  messagingSenderId: "221480619262",
  appId: "1:221480619262:web:f6327f0e39394897c869af"

};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);