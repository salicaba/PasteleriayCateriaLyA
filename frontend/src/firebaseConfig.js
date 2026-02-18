// Este archivo actúa como el "puente" hacia tu carpeta Backend (Nube)
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Aquí irán tus credenciales reales luego
  apiKey: "API_KEY_TEMPORAL",
  authDomain: "lya-pos.firebaseapp.com",
  projectId: "lya-pos",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);