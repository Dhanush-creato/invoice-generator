import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Load from Vite environment variables or fallback to hardcoded configuration
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCwFFXdtYAm84UyiRKS--aj6S70xPAUPus",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "invoice-genarator-1252c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "invoice-genarator-1252c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "invoice-genarator-1252c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "11419425973",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:11419425973:web:e0e0e17ecbd31931fbf2fc",
  measurementId: "G-HSTKLTPHZN"
};

// Check if we have valid environment config or stored config in local storage
const getFirebaseConfig = () => {
  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }
  const localConfigStr = localStorage.getItem("icon_systems_invoice_firebase_config");
  if (localConfigStr) {
    try {
      return JSON.parse(localConfigStr);
    } catch (e) {
      console.error("Error parsing stored firebase config", e);
    }
  }
  return null;
};

const config = getFirebaseConfig();

let app;
let auth;
let db;
let storage;
let isFirebaseInitialized = false;

if (config && config.apiKey && config.projectId) {
  try {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseInitialized = true;

    // Enable offline persistence so invoices are accessible without internet
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === "failed-precondition") {
        // Multiple tabs open — persistence works only in one tab at a time
        console.warn("Firestore offline persistence unavailable: multiple tabs open.");
      } else if (err.code === "unimplemented") {
        // Browser doesn't support offline persistence
        console.warn("Firestore offline persistence not supported in this browser.");
      }
    });
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export { app, auth, db, storage, isFirebaseInitialized, config as activeConfig };

// Save configuration from UI and reload to initialize Firebase
export function saveLocalFirebaseConfig(newConfig) {
  localStorage.setItem("icon_systems_invoice_firebase_config", JSON.stringify(newConfig));
  window.location.reload();
}

// Clear configuration
export function clearLocalFirebaseConfig() {
  localStorage.removeItem("icon_systems_invoice_firebase_config");
  window.location.reload();
}
