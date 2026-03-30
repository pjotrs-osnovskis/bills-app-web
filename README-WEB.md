# Bills App — Online version

Copy of the desktop app for **web deployment**. Same core (Express, JSON store, vanilla frontend) but intended for:

- **Google auth** — sign-in and user identity
- **Cloud data storage** — per-user data (e.g. Firestore, Supabase, or your own API) instead of local JSON files
- **Web-safe setup** — HTTPS, secure cookies/sessions, CSP, no sensitive data in client, rate limiting, etc.

## Folders

- **`c:\Users\pjotr\bills-app`** — desktop (Electron) version; local data in userData.
- **`c:\Users\pjotr\bills-app-web`** — this copy; evolve for online use.

## Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

### Windows PowerShell

`npm start` works the same as in bash. Use it from the project root after `npm install`.

- **Chaining commands:** In Windows PowerShell 5.x, `&&` is not valid between commands. Run installs and start separately, or use `;` (e.g. `npm install; npm start`).
- **Server already running:** If something is listening on port 3000, you do not need to start the server again to work on the UI — open the app in the browser and refresh after code changes to static files.

## Google sign-in setup

1. **Google Cloud Console** — [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials). Create an **OAuth 2.0 Client ID** (application type: **Web application**).
2. **Authorized redirect URIs** — add:
   - `http://localhost:3000/auth/google/callback` (local)
   - `https://your-domain.com/auth/google/callback` (production)
3. **Environment variables** — copy `.env.example` to `.env` and set:
   - `GOOGLE_CLIENT_ID` — Client ID from the OAuth client
   - `GOOGLE_CLIENT_SECRET` — Client secret
   - `SESSION_SECRET` — long random string (use a strong secret in production)
   - `GOOGLE_CALLBACK_URL` — full callback URL (e.g. `http://localhost:3000/auth/google/callback` for local)
   Run `npm start`; the app loads `.env` automatically. If the Google vars are missing, the app runs but “Sign in with Google” returns 503.

## Firebase (Firestore) for settings and data

When Firestore is configured, all app data (companies, customers, services, bills, settings) is stored **per user** in Firestore. If not configured, data is stored per user in local files under `data/{userId}/`.

1. **Firebase project** — Use the same GCP project as your OAuth client, or create a [Firebase project](https://console.firebase.google.com/) and enable **Firestore Database**.
2. **Service account** — Firebase Console → Project settings → Service accounts → **Generate new private key**. Save the JSON file somewhere safe (e.g. `./firebase-service-account.json`).
3. **Environment** — In `.env` set:
   - `FIREBASE_SERVICE_ACCOUNT_PATH` — path to that JSON file (relative to project root or absolute).
   Or set `GOOGLE_APPLICATION_CREDENTIALS` to the same path.
4. **Firestore structure** — Data is stored under `users/{userId}/data/{name}` where `name` is `companies`, `customers`, `services`, `bills`, or `settings`. You do not need to create collections manually; the app creates them on first write.

## Security (local email/password accounts)

- Passwords are stored with **scrypt** (see `password-utils.js` in the project root), not bcrypt.
- Sessions use an **httpOnly** cookie; local login is rate-limited per email on the server.

## Implemented

- **Google OAuth** — Passport with `passport-google-oauth20`; session with `express-session`. All `/api/*` and `/uploads` require authentication.
- **Login UI** — unauthenticated users see “Sign in with Google”; after sign-in they see the app and their name + Log out in the header.
- **Firestore** — When `FIREBASE_SERVICE_ACCOUNT_PATH` (or `GOOGLE_APPLICATION_CREDENTIALS`) is set, companies, customers, services, bills, and settings are stored in Firestore per user. Otherwise per-user file storage under `data/` is used.

## Next (planned)

- **Security for web** — HTTPS in production, secure session cookies, CSP, input validation, rate limiting, CORS.
