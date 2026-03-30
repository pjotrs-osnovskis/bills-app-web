# Deploy to Google Cloud Run

## Security and repo (do this first)

- **Use a Git repo** (GitHub, GitLab, etc.) for the app. Do not deploy by uploading ZIPs or pasting secrets into chat.
- **Never commit secrets.** All of these stay out of the repo and are set only in the environment where the app runs:
  - `SESSION_SECRET`
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_APPLICATION_CREDENTIALS` or Firebase service account JSON
- **`.gitignore`** already excludes: `.env`, `.env.*`, `*service-account*.json`, `data/`, `public/uploads/`. Copy `.env.example` to `.env` locally and fill in real values only on your machine or in Cloud Run.
- **Production:** `SESSION_SECRET` must be set in production (app exits if `NODE_ENV=production` and it is missing).

## Data and sessions on Cloud Run

- **Data:** The app uses **Firestore** when `GOOGLE_APPLICATION_CREDENTIALS` (or `FIREBASE_SERVICE_ACCOUNT_PATH`) is set. On Cloud Run you should use Firestore so data survives restarts and scales across instances. The file-based store is for local dev only; the filesystem on Cloud Run is ephemeral.
- **Sessions:** The app uses in-memory sessions. On Cloud Run, instances can restart or scale, so users may need to log in again after a cold start or when traffic goes to another instance. For sticky sessions you’d need a store like Firestore or Redis; for many use cases the current setup is acceptable.
- **Uploads (logos):** Logo uploads go to the local filesystem. On Cloud Run that is ephemeral, so uploaded logos will not persist across deploys or restarts. For persistent logos you’d need to use Cloud Storage and change the upload route.

## 1. Google Cloud project and APIs

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable APIs:
   - Cloud Run API
   - Artifact Registry API (or Container Registry)
   - Cloud Build API (if you deploy from source)
3. Billing must be enabled on the project (Cloud Run has a free tier; you are only charged above it).

## 2. OAuth redirect URI

1. In **APIs & Services → Credentials**, open your OAuth 2.0 Client ID (Web application).
2. Under **Authorized redirect URIs**, add your Cloud Run URL:
   - `https://YOUR-SERVICE-URL.run.app/auth/google/callback`
   - You can add this after the first deploy when you know the exact URL.

## 3. Environment variables and secrets (Cloud Run)

Set these in the Cloud Run service (Console → Cloud Run → your service → Edit & deploy new revision → Variables & secrets):

| Variable | Required | Notes |
|----------|----------|--------|
| `NODE_ENV` | Yes (production) | Set to `production`. |
| `SESSION_SECRET` | Yes | Long random string (e.g. `openssl rand -hex 32`). |
| `GOOGLE_CLIENT_ID` | Yes | From Google Cloud OAuth client. |
| `GOOGLE_CLIENT_SECRET` | Yes | Store as a **secret** in Secret Manager and reference it in Cloud Run. |
| `GOOGLE_CALLBACK_URL` | Yes | `https://YOUR-SERVICE-URL.run.app/auth/google/callback` |
| `GOOGLE_APPLICATION_CREDENTIALS` | For Firestore | Use Secret Manager: create a secret with the Firebase service account JSON and mount it (e.g. `/secrets/firebase-sa.json`), then set this variable to that path. Or run the service with a service account that has Firestore access and use Application Default Credentials (no key file). |

Do not put secrets in the Docker image or in the repo.

## 4. Deploy

### Option A: Deploy from source (recommended)

From the project root (where `Dockerfile` and `server.js` are):

```bash
gcloud run deploy bills-app-web \
  --source . \
  --region YOUR_REGION \
  --allow-unauthenticated
```

`--allow-unauthenticated` makes the service publicly reachable (e.g. for the browser). Auth is handled by your app (Google sign-in). Omit it if you want only IAM-invoker access.

After the first deploy, note the service URL and add it to the OAuth redirect URIs and set `GOOGLE_CALLBACK_URL` as above.

### Option B: Build image, then deploy

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/bills-app-web
gcloud run deploy bills-app-web --image gcr.io/YOUR_PROJECT_ID/bills-app-web --region YOUR_REGION --allow-unauthenticated
```

Replace `YOUR_PROJECT_ID` and `YOUR_REGION` (e.g. `europe-west1`).

## 5. After deploy

1. Open the Cloud Run URL (e.g. `https://bills-app-web-xxxxx.run.app`).
2. Add that origin and the callback URL to your OAuth client’s authorized origins and redirect URIs.
3. Set `GOOGLE_CALLBACK_URL` in Cloud Run to the exact callback URL.
4. Test sign-in and that data is stored in Firestore (if configured).

## 6. Custom domain (later)

In Cloud Run → your service → **Manage custom domains**, add your domain and follow the DNS instructions (usually a CNAME to the provided target). TLS is provisioned by Google.

## 7. Git repository (GitHub)

1. Initialize and commit locally (from the project root):

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create an empty repository on GitHub (no README/license if you already have files locally).

3. Add the remote and push:

   ```bash
   git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

4. **Never commit** `.env`, `firebase-service-account.json`, or other secrets. They are listed in `.gitignore`.

## 8. CI/CD with GitHub Actions

The repo includes two workflows:

| Workflow | When it runs | Purpose |
|----------|----------------|--------|
| **CI** (`.github/workflows/ci.yml`) | Every push and pull request to `main` | `npm ci --omit=dev` and a **Docker build** to verify the image builds. |
| **Deploy Cloud Run** (`.github/workflows/deploy-cloud-run.yml`) | Push to `main` and **manual** “Run workflow” | Builds from source and deploys to **Google Cloud Run** (same as `gcloud run deploy --source .`). |

### Deploy workflow: one-time Google Cloud setup

1. In Google Cloud Console, create a **service account** (e.g. `github-deploy`) with roles such as:
   - **Cloud Run Admin**
   - **Service Account User** (on the Cloud Run runtime service account if prompted)
   - **Cloud Build Editor** (or **Cloud Build Service Account** related permissions for source deploys)
   - **Storage Admin** (often needed for Cloud Build source staging)

2. Create a **JSON key** for that service account (IAM → service account → Keys → Add key). Store it securely; do not commit it.

3. In the GitHub repo: **Settings → Secrets and variables → Actions** → **New repository secret**:
   - Name: `GCP_SA_KEY`
   - Value: paste the **entire** JSON key file contents.

4. Optional **Variables** (Settings → Secrets and variables → Actions → Variables):
   - `GCP_REGION` — e.g. `europe-west1` (default in the workflow if unset).
   - `CLOUD_RUN_SERVICE` — service name (default `bills-app-web`).

Until `GCP_SA_KEY` is set, the deploy workflow is **skipped** so pushes to `main` do not fail.

### After the first GitHub deploy

1. Note the Cloud Run URL from the workflow or Cloud Console.
2. Set **environment variables** in Cloud Run for the service (see §3): `NODE_ENV`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, Firestore credentials as needed.
3. Add the OAuth **redirect URI** and **JavaScript origins** for that URL (§2).

For production, prefer **Workload Identity Federation** instead of a long-lived JSON key; see [Google’s guide](https://github.com/google-github-actions/auth#workload-identity-federation) for `google-github-actions/auth`.
