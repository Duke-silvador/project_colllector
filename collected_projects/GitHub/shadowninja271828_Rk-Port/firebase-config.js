import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlbcdM5h90JinVc6sexENjT9IVIxXuTrE",
  authDomain: "portfolioone-e11d5.firebaseapp.com",
  projectId: "portfolioone-e11d5",
  messagingSenderId: "36710974604",
  appId: "1:36710974604:web:8ad7c431a0c59febd227a9",
  measurementId: "G-LGHDX8ZQCR",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
