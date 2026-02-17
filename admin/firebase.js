// js/firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnFVp-uO05Hz8iDI_o3_TfH4cNSkzlcXg",
  authDomain: "stthewedding-27977.firebaseapp.com",
  projectId: "stthewedding-27977",
  storageBucket: "stthewedding-27977.firebasestorage.app",
  messagingSenderId: "521977489180",
  appId: "1:521977489180:web:1988cc06da4d603b997cd9",
  measurementId: "G-CLS5H2TYD8"
};

// Prevent “Firebase App named '[DEFAULT]' already exists”
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
