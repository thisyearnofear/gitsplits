/**
 * Firebase initialization for the worker
 *
 * This file initializes Firebase for server-side operations.
 */

const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");
require("dotenv").config({ path: "../worker.env" });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Collections
const VERIFICATIONS_COLLECTION = "verifications";
const VERIFICATION_CODES_COLLECTION = "verification_codes";

module.exports = {
  db,
  VERIFICATIONS_COLLECTION,
  VERIFICATION_CODES_COLLECTION,
};
