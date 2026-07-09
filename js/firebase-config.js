// =====================================================================
// FIREBASE CONFIG — fill this in with YOUR project's values.
// Full step-by-step instructions are in README.md.
//
// 1. Create a project at https://console.firebase.google.com
// 2. Add a "Web app" to the project, copy the config it gives you below
// 3. Enable Authentication -> Sign-in method -> Email/Password
// 4. Enable Firestore Database (production mode)
// 5. Create the two users described in README.md, then paste their
//    User UIDs into ADMIN_UID / VIEWER_UID below
// =====================================================================

export const firebaseConfig = {
  apiKey: "AIzaSyAbCfek_IS6R7QehfobKDf8SWGz0vAYC7U",
  authDomain: "sadat-manager.firebaseapp.com",
  projectId: "sadat-manager",
  storageBucket: "sadat-manager.firebasestorage.app",
  messagingSenderId: "567734275334",
  appId: "1:567734275334:web:994e99b6f969d0227c2287",
  measurementId: "G-29M1XGZ1LE"
};

// Paste the Firebase Authentication UIDs here after creating the two users
// (Firebase Console -> Authentication -> Users -> copy the "User UID" column)
export const ADMIN_UID  = "mcguVAjfDfTOvmZyeZjHxYOfm2F2";   // Nazmus Sadat's account
export const VIEWER_UID = "goRGm9LafAb9plG8nInUlBxtiWh1";  // Dashboard-only account

// Firebase Auth needs an email, not a phone number. We turn the phone
// number typed at login into "<phone>@<this domain>" automatically, so
// the two of you can still just type your phone numbers on the login screen.
// It doesn't need to be a real domain — leave it as is or change it.
export const AUTH_EMAIL_DOMAIN = "sadatmanager.app";

// Expense / office categories shown as quick-pick tags in the app.
// Feel free to edit these lists.
export const EXPENSE_CATEGORIES = [
  "Food", "Transport", "Utilities", "Health", "Education",
  "Household", "Shopping", "Rent", "Other"
];

export const OFFICE_CATEGORIES = [
  "Salary", "Rent", "Utilities", "Supplies", "Maintenance",
  "Marketing", "Transport", "Other"
];
