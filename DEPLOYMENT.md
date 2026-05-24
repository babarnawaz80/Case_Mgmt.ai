# Deployment & DevOps Guide — CaseManagement.AI

> **Document type:** Staging & Production Deployment Manual  
> **Version:** 0.6.x &nbsp;|&nbsp; **Updated:** May 2026  
> **Audience:** DevOps Engineers, System Administrators, Release Managers, Lead Developers  

---

## Table of Contents

1. [System Architecture & Topology](#1-system-architecture--topology)
2. [Prerequisites & Build Environment](#2-prerequisites--build-environment)
3. [Environment Configuration & Variables](#3-environment-configuration--variables)
4. [Local Development & Emulators](#4-local-development--emulators)
5. [Firebase CLI Setup & Project Linkage](#5-firebase-cli-setup--project-linkage)
6. [Staging vs. Production Setup](#6-staging-vs-production-setup)
7. [Step-by-Step Manual Deployment](#7-step-by-step-manual-deployment)
8. [Automated CI/CD Pipeline (GitHub Actions)](#8-automated-cicd-pipeline-github-actions)
9. [Verification & Sanity Checklist](#9-verification--sanity-checklist)
10. [Rollback & Emergency Disaster Recovery](#10-rollback--emergency-disaster-recovery)
11. [Monitoring, Alerting & Observability](#11-monitoring-alerting--observability)

---

## 1. System Architecture & Topology

CaseManagement.AI is built as a single-page application (SPA) running React 18, Vite, Tailwind CSS, and TypeScript. The application is hosted entirely on **Firebase Hosting (Classic)**, with serverless integrations utilizing **Cloud Firestore**, **Firebase Authentication**, **Firebase Cloud Storage**, and **Cloud Functions for Firebase** (when needed for secure administrative/AI workflows).

```
[ Client Browser ]
        |
        +---- HTTPS (TLS 1.3) ----> [ Firebase Hosting ] (React / SPA Assets)
        |
        +---- Firestore SDK ------> [ Cloud Firestore ] (Real-time DB / org-scoped)
        |
        +---- Firebase Auth -------> [ Firebase Auth ] (JWT-based secure sign-in)
        |
        +---- Cloud Functions -----> [ Cloud Functions / Gemini API ] (Entity Extraction)
```

### Infrastructure Components & Providers

| Component | Provider | Role | HIPAA Covered? |
|---|---|---|---|
| **Front-End Hosting** | Firebase Hosting | Hosts static assets with custom domains & TLS termination | ✅ Yes (GCP BAA) |
| **Database** | Cloud Firestore | NoSQL document database with strict Organization Rule-based security | ✅ Yes (GCP BAA) |
| **Authentication** | Firebase Authentication | Identity Provider managing credentials, tokens, and OAuth metadata | ✅ Yes (GCP BAA) |
| **File Storage** | Firebase Cloud Storage | Encrypted storage for client documents, clinical attachments, and uploads | ✅ Yes (GCP BAA) |
| **AI Workflows** | Cloud Functions & Firebase AI Logic | Secure backend runner executing prompts against the Gemini Pro API | ✅ Yes (GCP BAA) |

> [!IMPORTANT]
> The entire stack is hosted in Google Cloud Platform (GCP) and is fully covered under the **Google Cloud HIPAA Business Associate Agreement (BAA)** on the **Blaze (pay-as-you-go) billing plan**. Before deploying real PHI to production, the BAA must be signed in the GCP Console.

---

## 2. Prerequisites & Build Environment

To build and deploy CaseManagement.AI, your local machine or build runner must meet the following technical requirements.

### Machine Requirements

- **Operating System:** macOS (recommended), Linux, or Windows (WSL2 required)
- **Node.js Runtime:** `v18.x.x` (LTS) or `v20.x.x` (LTS). Do not use newer experimental versions.
- **Package Manager:** `npm` (v9.x or later) or `bun` (v1.x or later).
- **Firebase CLI:** Installed globally or run via `npx` (minimum version `13.x`).

### Core Global Installations

Verify and install the required tools using the commands below:

```bash
# Verify Node.js and npm versions
node -v
npm -v

# Install the Firebase Command Line Interface (CLI) globally
npm install -g firebase-tools

# Alternatively, check existing CLI version
firebase --version
```

---

## 3. Environment Configuration & Variables

CaseManagement.AI separates environment configuration using file-based environment profiles loaded during the Vite build process.

### Environment Profiles

| File | Environment | Build Mode | Usage |
|---|---|---|---|
| `.env.example` | Template | N/A | Reference file committed to version control |
| `.env.local` | Local Dev | `development` | Used for local development and Emulator connection |
| `.env.staging` | Staging | `staging` | Staging environment pointing to sandbox Firebase project |
| `.env.production` | Production | `production` | Production environment pointing to high-security live project |

### Environment Variables Matrix

The following environment variables are required in each configuration file:

```ini
# Core Web Frontend Variables (Pre-fixed with VITE_ to expose to client)
VITE_FIREBASE_API_KEY="AIzaSyA1..."
VITE_FIREBASE_AUTH_DOMAIN="casemanagement-ai.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="casemanagement-ai"
VITE_FIREBASE_STORAGE_BUCKET="casemanagement-ai.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="847291..."
VITE_FIREBASE_APP_ID="1:847291:web:2c892..."

# Optional Feature Flags
VITE_ENABLE_MOCK_DATA="false"
VITE_USE_EMULATORS="false"
```

> [!WARNING]
> Environment variables loaded via `.env.production` are compiled directly into the production JS bundle. Never put raw server-side secrets, database credentials, or API keys for non-browser services in this file, as they can be extracted by anyone analyzing the network request bundle.

---

## 4. Local Development & Emulators

Before running full deployments to cloud-based servers, always validate code, firestore security rules, and database indexes locally using the **Firebase Local Emulator Suite**.

### Local Emulator Configuration

The local development stack utilizes Firestore and Auth emulators to prevent writing test records to production.

```bash
# Start Vite development server & Firebase emulators concurrently
npm run dev
```

If you wish to run the Firebase Emulator Suite independently to verify rules:

```bash
# Starts Authentication, Firestore, and Storage Emulators
firebase emulators:start --only auth,firestore,storage
```

### Testing Rules in Local Emulators

Ensure all unit tests pass locally prior to merging pull requests.

```bash
# Run rules unit tests written under /tests
npm run test:rules
```

---

## 5. Firebase CLI Setup & Project Linkage

Deployment requires authentication through the Firebase CLI.

### Step 1: Authenticaton via Web Browser

To authenticate the CLI with the Google account owning the Firebase project:

```bash
firebase login
```

If you are running in a CI environment (such as GitHub Actions) where a browser is not available, you must use a **Firebase CI Token** or a **GCP Service Account Key**.

To generate a CI deployment token:
```bash
firebase login:ci
```
*Note the returned token and store it securely as `FIREBASE_TOKEN` in your repository secrets.*

### Step 2: Project Linkage & Verification

Confirm the directory is linked to the correct target project:

```bash
# List all linked projects and environments
firebase projects:list

# Select the target project for manual deploy (e.g. production)
firebase use production
```

Verify your active project alias in `.firebaserc`:

```json
{
  "projects": {
    "default": "casemanagement-ai-dev",
    "staging": "casemanagement-ai-staging",
    "production": "casemanagement-ai"
  }
}
```

---

## 6. Staging vs. Production Setup

We enforce strict environmental segregation. Developers must never write or deploy directly to production from their local CLI without thorough verification in staging first.

### Environment Segregation Matrix

| Property | Staging Environment | Production Environment |
|---|---|---|
| **Firebase Project ID** | `casemanagement-ai-staging` | `casemanagement-ai` |
| **Hosting Domain** | `casemanagement-ai-staging.web.app` | `app.casemanagement.ai` |
| **Firestore Database Mode** | Test Mode (Permissive sandbox) | Strict Production Mode (Default-deny) |
| **HIPAA BAA Status** | Recommended | **Strictly Mandatory** |
| **Google Cloud Logging** | Detailed Debug level | Info/Warning levels (no PHI allowed) |
| **Backup Cadence** | Weekly exports to Storage | Daily automated backups + point-in-time recovery |
| **IP Whitelisting** | None (public access with test auth) | Enterprise VPN only (Optional) |

---

## 7. Step-by-Step Manual Deployment

In emergency scenarios where CI/CD pipelines are unavailable, the following manual deployment procedure can be executed.

### Step 1: Perform Code Integrity Auditing

Before building, verify zero compilation errors and clean typing rules:

```bash
# Run the local TypeScript compilation check
npm run build
```

This verifies that Vite can assemble the production artifacts into `dist/` without encountering compilation errors.

### Step 2: Deploy Database Infrastructure First

It is critical to deploy Firestore rules and schema indexes before shipping new client-side features that depend on them.

```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules --project production

# Deploy Firestore indexes only
firebase deploy --only firestore:indexes --project production
```

### Step 3: Compile and Deploy Frontend Web Assets

Compile frontend assets using production environment variables, then deploy the bundle:

```bash
# Perform clean production build
npm run build -- --mode production

# Deploy target folder to Firebase Hosting
firebase deploy --only hosting --project production
```

---

## 8. Automated CI/CD Pipeline (GitHub Actions)

We strongly recommend automate deployments using GitHub Actions. This guarantees repeatable builds, enforces security policies, and records a complete audit log of releases.

### Production Deployment Workflow File

Create this workflow at `.github/workflows/deploy.yml` in your repository:

```yaml
name: CaseManagement.AI — Production CI/CD Release

on:
  push:
    branches:
      - main

permissions:
  contents: read
  deployments: write

jobs:
  audit-and-test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install Project Dependencies
        run: npm ci

      - name: Run ESLint Verification
        run: npm run lint

      - name: Run Unit Tests
        run: npm run test

      - name: Execute TypeScript Compilation Check
        run: npm run build

  deploy-production:
    needs: audit-and-test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install Project Dependencies
        run: npm ci

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Inject Production Environment File
        run: |
          echo "VITE_FIREBASE_API_KEY=${{ secrets.PROD_FIREBASE_API_KEY }}" >> .env.production
          echo "VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.PROD_FIREBASE_AUTH_DOMAIN }}" >> .env.production
          echo "VITE_FIREBASE_PROJECT_ID=${{ secrets.PROD_FIREBASE_PROJECT_ID }}" >> .env.production
          echo "VITE_FIREBASE_STORAGE_BUCKET=${{ secrets.PROD_FIREBASE_STORAGE_BUCKET }}" >> .env.production
          echo "VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.PROD_FIREBASE_MESSAGING_SENDER_ID }}" >> .env.production
          echo "VITE_FIREBASE_APP_ID=${{ secrets.PROD_FIREBASE_APP_ID }}" >> .env.production
          echo "VITE_ENABLE_MOCK_DATA=false" >> .env.production
          echo "VITE_USE_EMULATORS=false" >> .env.production

      - name: Compile Production Bundle
        run: npm run build -- --mode production

      - name: Deploy Rules and Indexes
        run: firebase deploy --only firestore --token "${{ secrets.FIREBASE_TOKEN }}" --project production

      - name: Deploy Frontend Assets
        run: firebase deploy --only hosting --token "${{ secrets.FIREBASE_TOKEN }}" --project production
```

---

## 9. Verification & Sanity Checklist

Immediately following any deployment (manual or automated), the Release Manager must execute this manual verification sequence on staging or production.

### Operational Status Sanity Check

- [ ] **Verify SSL/TLS Certificate:** Load the live URL in browser. Check the padlock icon to verify a valid, unexpired certificate running TLS 1.3.
- [ ] **HSTS Verification:** Using curl in local terminal, verify the `Strict-Transport-Security` header is correctly returned.
  ```bash
  curl -s -I https://app.casemanagement.ai | grep Strict-Transport-Security
  ```
- [ ] **XSS/CSRF Prevention Headers:** Verify standard protection headers like `X-Frame-Options: SAMEORIGIN` and `X-Content-Type-Options: nosniff`.
- [ ] **Active Login Flow:** Enter credentials for a verified case manager (`kathy@demo.casemanagement.ai`). The dashboard should load within 3 seconds.
- [ ] **Caseload Hydration (Reactive Querying):** Navigate to `/people`. Ensure the full listing of individuals is dynamically read from Firestore and rendered without spinning indefinitely.
- [ ] **Audit Trail Log Write:** Open the detail eChart of a test individual, go to the "Contact Notes" section, submit a mock interaction, and then verify the write creates a new transaction entry in the `/audit_log` collection.

---

## 10. Rollback & Emergency Disaster Recovery

In the event that a deployment contains a major bug, security flaw, or breaks critical clinical features, follow these procedures to restore the last known stable state.

### Automated Rollback (Vite Assets via Hosting)

Firebase Hosting retains a chronological record of your releases, allowing one-click rollbacks within the web console or CLI.

```bash
# Roll back hosting release to the last deployed version
firebase hosting:clone-release --project production
```

Alternatively, rollback using the **Firebase Web Console**:

1. Open the [Firebase Web Console](https://console.firebase.google.com).
2. Select your project: **CaseManagement.AI**.
3. Under the left navigation pane, choose **Hosting**.
4. In the **Release History** table, identify the last known good build (prior release version).
5. Click the three vertical dots on the right side of the row and select **Rollback**.
6. The rollback takes effect instantly globally (within seconds).

> [!CAUTION]
> Rolling back web assets **does not** automatically roll back database schemas, Firestore rules, or collection index updates. If your database rules were modified, you must manually redeploy the previous ruleset to maintain system integrity.

### Rolling Back Firestore Rules

To revert security rules to a previous version, retrieve the rule content from Git version control and redeploy:

```bash
# Retrieve previous rules from git history
git checkout HEAD~1 -- firestore.rules

# Deploy the previous ruleset to production
firebase deploy --only firestore:rules --project production
```

---

## 11. Monitoring, Alerting & Observability

Observability is essential to satisfying SOC 2 Trust Services Criteria and maintaining HIPAA security posture.

### Setting Up Firebase & GCP Health Alerts

#### Cloud Functions Error Spike Alerts
Set up a warning alert in Google Cloud Logging if the crash rate for functions rises above 2% over a 15-minute sliding window.

#### Firestore Read/Write Thresholds
Enable alert limits inside the Firebase Console to detect anomaly events, such as bulk data reads exceeding 100,000 documents per hour. This often signifies a potential automated exfiltration attempt.

#### Uptime Monitoring
Set up external monitoring (such as Google Cloud Uptime Checks, Pingdom, or BetterUptime) targeting `https://app.casemanagement.ai` to verify continuous service availability.

```
Metric to Monitor: Uptime Check (Status 200 OK)
Frequency: Every 60 seconds
Threshold to Alert: Failures > 2 consecutively
Channels: Email, SMS, Slack integration
```

### HIPAA-Mandated Log Retention & Auditing
- Ensure all Google Cloud Logging and audit records are set to a minimum of **6 years retention** in accordance with HIPAA § 164.312(b).
- Conduct a weekly review of administrative role updates, logins from unrecognized IP addresses, and failures in database read authorizations.

---

*End of Release & Deployment Reference Document — CaseManagement.AI Devops.*
