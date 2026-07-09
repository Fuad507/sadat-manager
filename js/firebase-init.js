// Central Firebase initialization. Every other file imports from here
// so there's only ever one connection to your Firebase project.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig, ADMIN_UID, VIEWER_UID, AUTH_EMAIL_DOMAIN,
         EXPENSE_CATEGORIES, OFFICE_CATEGORIES } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  ADMIN_UID, VIEWER_UID, AUTH_EMAIL_DOMAIN,
  EXPENSE_CATEGORIES, OFFICE_CATEGORIES
};

export function phoneToEmail(phone) {
  const cleaned = String(phone).trim().replace(/\s+/g, "");
  return `${cleaned}@${AUTH_EMAIL_DOMAIN}`;
}

export function roleForUid(uid) {
  if (uid === ADMIN_UID) return "admin";
  if (uid === VIEWER_UID) return "viewer";
  return null; // signed in with Firebase but not one of the two known accounts
}
