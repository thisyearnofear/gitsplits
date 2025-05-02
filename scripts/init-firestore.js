/**
 * Initialize Firestore collections
 *
 * This script creates the necessary collections in Firestore.
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc } = require("firebase/firestore");
require("dotenv").config({ path: ".env.local" });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collection names
const VERIFICATIONS_COLLECTION = "verifications";
const VERIFICATION_CODES_COLLECTION = "verification_codes";

async function initializeFirestore() {
  try {
    // Create a sample document in each collection to ensure they exist
    await setDoc(doc(db, VERIFICATIONS_COLLECTION, "sample"), {
      created: new Date(),
      note: "This is a sample document to initialize the collection. You can delete it.",
    });

    await setDoc(doc(db, VERIFICATION_CODES_COLLECTION, "sample"), {
      created: new Date(),
      note: "This is a sample document to initialize the collection. You can delete it.",
    });

    console.log("Firestore collections initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing Firestore collections:", error);
    process.exit(1);
  }
}

initializeFirestore();
