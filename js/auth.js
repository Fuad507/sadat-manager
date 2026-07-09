import {
  auth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  phoneToEmail, roleForUid
} from "./firebase-init.js";

// ---------- Login form (index.html) ----------
const form = document.getElementById("loginForm");
if (form) {
  const errorMsg = document.getElementById("errorMsg");
  const loginBtn = document.getElementById("loginBtn");

  // If already signed in, skip straight to the dashboard
  onAuthStateChanged(auth, (user) => {
    if (user && roleForUid(user.uid)) {
      window.location.href = "dashboard.html";
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorMsg.style.display = "none";
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Signing in…";

    try {
      const email = phoneToEmail(phone);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!roleForUid(cred.user.uid)) {
        await signOut(auth);
        throw new Error("This account isn't set up for this app yet.");
      }
      window.location.href = "dashboard.html";
    } catch (err) {
      errorMsg.textContent = friendlyError(err);
      errorMsg.style.display = "block";
      loginBtn.disabled = false;
      loginBtn.textContent = "Sign in";
    }
  });
}

function friendlyError(err) {
  const code = err && err.code ? err.code : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "Phone number or password is incorrect.";
  }
  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (code.includes("network")) {
    return "Couldn't reach the server. Check your internet connection.";
  }
  return err.message || "Something went wrong. Please try again.";
}

// ---------- Shared guard used by dashboard.html ----------
// Resolves with { user, role } once we know the person is allowed in,
// or redirects to the login page and never resolves.
export function guardDashboard() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      const role = user ? roleForUid(user.uid) : null;
      if (!user) {
        window.location.href = "index.html";
        return;
      }
      if (!role) {
        // Signed in with Firebase, but not one of the two accounts this
        // app knows about — sign out cleanly instead of leaving them stuck.
        await signOut(auth);
        window.location.href = "index.html";
        return;
      }
      resolve({ user, role });
    });
  });
}

export async function logout() {
  await signOut(auth);
  window.location.href = "index.html";
}
