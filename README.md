# CaseManagement.AI

> **AI-powered clinical case management platform for Home and Community-Based Services (HCBS) providers.**

[![Firebase Hosting](https://img.shields.io/badge/Firebase-Hosting-orange)](https://casemanagement-ai.web.app)
[![React 18](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

---

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Roles & Access Control](#roles--access-control)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## Overview

CaseManagement.AI is a HIPAA-conscious web application for Developmental Disabilities and Behavioral Health case management agencies. It provides:

- **Role-based dashboards** (Case Manager, Supervisor, Admin, Billing)
- **Individual eChart hub** — a single-record view with 20+ clinical modules
- **AI-assisted documentation** — progress notes, contact notes, visit summaries pre-filled by Gemini
- **Real-time Firestore data** — all caseload data synced live, no page refreshes needed
- **Billing integration** — claims management, eligibility verification, revenue cycle

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + custom design tokens |
| Routing | React Router v6 |
| State / Data | Firebase Firestore (real-time) + TanStack Query |
| Authentication | Firebase Auth (email/password) |
| AI | Google Gemini 2.0 Flash via Firebase AI Logic |
| Hosting | Firebase Hosting |
| UI Components | shadcn/ui + Lucide icons |
| Animations | Framer Motion |

---

## Prerequisites

- Node.js 18+ (`node --version`)
- npm 9+ (`npm --version`)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore + Auth + Hosting enabled

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd CaseManagement.ai/repo

# 2. Install dependencies
npm install

# 3. Set up environment variables (see below)
cp .env.example .env.local

# 4. Start dev server
npm run dev
# → http://localhost:5173
```

---

## Environment Variables

Create `.env.local` in the `/repo` directory:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GEMINI_API_KEY=your_gemini_api_key
```

> ⚠️ **Never commit `.env.local` to version control.** It contains secrets.

---

## Project Structure

```
repo/
├── src/
│   ├── components/
│   │   ├── icm/              # Design system components (ICMShell, Breadcrumbs, etc.)
│   │   ├── billing/          # Billing module components
│   │   ├── ui/               # shadcn/ui base components
│   │   └── ErrorBoundary.tsx # Global error boundary
│   ├── contexts/
│   │   ├── AuthContext.tsx   # Firebase Auth state
│   │   └── RoleContext.tsx   # Role-based access (case_manager, supervisor, admin)
│   ├── hooks/
│   │   ├── useIndividuals.ts # Firestore: individuals collection
│   │   └── useProgressNotes.ts # Firestore: progress_notes collection
│   ├── pages/
│   │   ├── Dashboard.tsx     # Role-aware KPI dashboard
│   │   ├── PeopleSupported.tsx # Caseload list (role-scoped)
│   │   ├── EChart.tsx        # Individual eChart hub
│   │   ├── PersonFaceSheet.tsx # Comprehensive face sheet
│   │   ├── PersonProgressNote.tsx # Progress note list
│   │   ├── ProgressNoteNew.tsx    # New progress note + AI prefill
│   │   ├── ContactNote.tsx   # Contact note list + form
│   │   └── PersonPlaceholders.tsx # Stub pages for future modules
│   ├── lib/
│   │   ├── firebase.ts       # Firebase app initialization
│   │   └── demoToast.ts      # Toast helpers
│   └── App.tsx               # Router + providers
├── public/
├── firebase.json             # Firebase config
├── firestore.rules           # Firestore security rules
└── vite.config.ts
```

---

## Roles & Access Control

| Role | Access |
|------|--------|
| `case_manager` | Own caseload only, all clinical modules |
| `supervisor` | All caseloads in their program, read/review |
| `admin` | Full access, settings, billing, user management |
| `billing` | Billing module only |

Role is stored in Firestore under `users/{uid}/role` and read at login.

---

## Deployment

### Staging / Production Deploy

```bash
# Build production bundle
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting --project casemanagement-ai
```

### Firestore Rules Deploy

```bash
firebase deploy --only firestore:rules --project casemanagement-ai
```

### Full Deploy (Hosting + Rules + Indexes)

```bash
firebase deploy --project casemanagement-ai
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, data model, auth flow |
| [FIRESTORE_SCHEMA.md](./FIRESTORE_SCHEMA.md) | All Firestore collections and fields |
| [USER_GUIDE.md](./USER_GUIDE.md) | Role-based user guide |
| [SECURITY.md](./SECURITY.md) | HIPAA controls, security rules rationale |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | CI/CD, rollback, environment management |
| [CHANGELOG.md](./CHANGELOG.md) | Version history |

---

## Demo Credentials

> For development/staging only — remove before production

| Role | Email | Password |
|------|-------|----------|
| Case Manager | kathy@demo.casemanagement.ai | Demo1234! |
| Supervisor | jennie@demo.casemanagement.ai | Demo1234! |
| Admin | admin@demo.casemanagement.ai | Demo1234! |

---

*Built by iCareManager · Powered by Google Firebase + Gemini AI*
