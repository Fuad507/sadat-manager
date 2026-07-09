# Sadat Manager

A simple, private web app for tracking personal expenses, daily notes/tasks,
family members and money given to them, and office income/expenses — with
live updates between devices.

- **Two accounts**: Nazmus Sadat (full control) and a dashboard-only viewer account.
- **Data**: stored in Firebase (Firestore), synced in real time.
- **Hosting**: plain HTML/CSS/JS — no build step — deployable on GitHub Pages.

No coding is required to set this up, just some copy-pasting. It takes about 15 minutes.

---

## 1. Create your Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account.
2. Click **Add project**, give it any name (e.g. "sadat-manager"), and finish the wizard.
3. On the project's home page, click the **`</>`** (web) icon to register a web app. Give it a nickname and click **Register app**. You do *not* need Firebase Hosting for this step.
4. Firebase will show you a `firebaseConfig` object that looks like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "sadat-manager.firebaseapp.com",
     projectId: "sadat-manager",
     storageBucket: "sadat-manager.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

   Copy these values into **`js/firebase-config.js`** in this project, replacing the placeholder values.

## 2. Turn on sign-in

1. In the Firebase console, open **Authentication** → **Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user**, and create these two accounts exactly:

   | Who | Email to enter | Password to enter |
   |---|---|---|
   | Nazmus Sadat (admin) | `01670479817@sadatmanager.app` | `Sadat12345@` |
   | Viewer account | `01408027735@sadatmanager.app` | `fuad12345@#` |

   > The app converts a phone number typed on the login screen into this
   > email format automatically, so both of you will just type your phone
   > number and password to sign in — never the "@sadatmanager.app" part.
   > If you'd rather use a different domain, change `AUTH_EMAIL_DOMAIN` in
   > `js/firebase-config.js` and use that instead in step 3.

4. After creating both users, copy each one's **User UID** (shown in the Users table) into `js/firebase-config.js`:

   ```js
   export const ADMIN_UID  = "paste Sadat's UID here";
   export const VIEWER_UID = "paste the viewer's UID here";
   ```

## 3. Turn on the database

1. In the Firebase console, open **Firestore Database** → **Create database** → start in **production mode** → pick a region close to you.
2. Open the **Rules** tab and replace the contents with what's in **`firestore.rules`** in this project — but first, edit that file (or the Rules editor directly) to swap in the same two UIDs you used in step 2:

   ```
   function isAdmin() {
     return isSignedIn() && request.auth.uid == "PASTE_ADMIN_UID_HERE";
   }
   function isKnownUser() {
     return isSignedIn() && (request.auth.uid == "PASTE_ADMIN_UID_HERE" || request.auth.uid == "PASTE_VIEWER_UID_HERE");
   }
   ```

3. Click **Publish**.

This is what actually enforces the two roles — Sadat's account can read and write everything, the viewer account can only read. That's true no matter what happens in the browser, so it's safe even if the GitHub repo is public.

## 4. Put it on GitHub

From this project folder:

```bash
git init
git add .
git commit -m "Initial version of Sadat Manager"
git branch -M main
git remote add origin https://github.com/<your-username>/sadat-manager.git
git push -u origin main
```

To make it live on the web for free:

1. On GitHub, go to the repo's **Settings** → **Pages**.
2. Under **Source**, choose the `main` branch and `/ (root)` folder, then **Save**.
3. After a minute, GitHub will give you a URL like `https://<your-username>.github.io/sadat-manager/` — that's the app.

To test locally before pushing, don't just double-click `index.html` (browsers block Firebase sign-in on `file://` pages). Instead, run a tiny local server from the project folder, e.g. `python3 -m http.server 8080`, then visit `http://localhost:8080`.

## 5. Sign in

- **Nazmus Sadat**: phone `01670479817`, password `Sadat12345@` → full access, can add/edit/delete everything.
- **Viewer account**: phone `01408027735`, password `fuad12345@#` → dashboard-only, everything is visible but add/edit/delete buttons are hidden, and blocked at the database level too.

---

## What's included

- **Overview** — this month's totals, a spending pulse strip (day-by-day), a category chart, and budget progress bars.
- **Expenses** — personal spending by date/category/note, monthly totals, top category.
- **Notebook & Tasks** — quick notes and to-dos with due dates, overdue highlighting.
- **Members** — add family/team members, log money given to each, see a running total per person (a simple ledger).
- **Office Management** — income and expenses by category with a running balance, separate from personal spending.
- **Budgets** — set a monthly limit for personal or office spending; the Overview bar turns amber near the limit and red over it.

Everything updates live: if Sadat adds an expense on his phone, it appears instantly on the viewer's screen too, without refreshing.

## Customizing

- **Colors**: all in `css/style.css` under `:root` at the top — change the `--green-*` values.
- **Expense/office categories**: edit the `EXPENSE_CATEGORIES` and `OFFICE_CATEGORIES` lists in `js/firebase-config.js`.
- **Currency symbol**: it's ৳ (Taka) by default — change it in `js/utils.js`, in the `money()` function.

## Troubleshooting

- **"Phone number or password is incorrect"** — double check the user was created in Authentication with the exact email format from step 2, and that `AUTH_EMAIL_DOMAIN` in `firebase-config.js` matches what you used there.
- **Page loads but nothing shows / permission errors in the browser console** — check that the UIDs in `firestore.rules` (published in the Firebase console) exactly match the ones in `js/firebase-config.js`.
- **"Missing or insufficient permissions"** — same as above, or the Rules haven't been published yet.
- If you ever see a Firestore error mentioning **"requires an index"** after you customize a query, click the link included in that error — it opens the Firebase console with the index pre-filled so you can create it in one click.
