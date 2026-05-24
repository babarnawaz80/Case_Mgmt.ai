# Cloud Functions & API Reference — CaseManagement.AI

> **Document type:** Serverless API Specifications & Integration Manual  
> **Version:** 0.6.x &nbsp;|&nbsp; **Updated:** May 2026  
> **Audience:** Backend Engineers, Integration Developers, External Health System Engineers  

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Global Standards & Security Policies](#2-global-standards--security-policies)
3. [AI & Note Generation Services](#3-ai--note-generation-services)
4. [Ambient listening & Transcription Services](#4-ambient-listening--transcription-services)
5. [Clinical Packet Export Services](#5-clinical-packet-export-services)
6. [Relational Integrations & Sync Services](#6-relational-integrations--sync-services)
7. [Staging & Production Endpoints Matrix](#7-staging-production-endpoints-matrix)
8. [Error Handling & Code Guide](#8-error-handling--code-guide)

---

## 1. Architectural Overview

CaseManagement.AI's backend architecture is designed as a secure, distributed, serverless model utilizing **Cloud Functions for Firebase (v2)**. All business logic that requires high computational load, external system integrations, or secure administrative scopes (such as interacting with the Gemini API or generating encrypted signatures) is decoupled from the client React application and encapsulated in isolated serverless runners.

```
+─────────────────────────────────────────────────────────────+
|                     Client React Application                 |
+──────────────────────────────┬──────────────────────────────+
                               │
                       HTTPS REST Calls
                               │
                               ▼
+─────────────────────────────────────────────────────────────+
|               Cloud Functions for Firebase (v2)             |
|   - Node.js 18 LTS Runtime                                  |
|   - Express-based HTTP Routers                              |
|   - Automatic scaling with zero cold-start configurations   |
+──────────────┬──────────────────────────────┬───────────────+
               │                              │
         Gemini Pro API               Firestore Admin SDK
               │                              │
               ▼                              ▼
    [ Vertex AI Service ]           [ Cloud Firestore DB ]
```

---

## 2. Global Standards & Security Policies

All Cloud Functions conform to strict HIPAA Security Rule criteria and SOC 2 Type II audit policies.

### Core Policies
1. **JWT-Based Authentication:** All non-public endpoints require an `Authorization` header bearing a valid Firebase Auth ID Token (`Bearer <JWT>`).
2. **Strict PHI Anonymization:** Raw PHI (e.g., Social Security Numbers, exact home addresses) must never be passed within request bodies unless absolutely necessary. Error logging frameworks automatically intercept and sanitize potential PHI signatures.
3. **Audit Log Generation:** Every invocation that alters document states, retrieves clinical payloads, or issues external exports writes a tamper-proof audit event directly to the Firestore `/audit_log` collection.
4. **CORS Restrictions:** Express routers explicitly enforce whitelist filters:
   - Staging: `https://casemanagement-ai-staging.web.app`
   - Production: `https://app.casemanagement.ai`

---

## 3. AI & Note Generation Services

These services manage communications with the Gemini API to extract entities and generate structured case management documents.

### 3.1 `fetchAIPrefill` Endpoint

Extracts critical clinical structures and drafts progress notes from ambient transcripts or client profiles.

- **HTTP Method:** `POST`
- **URL Endpoint:** `/fetchAIPrefill`
- **Access Control:** Authenticated Case Managers & Supervisors

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjFh...
```

#### Request Payload
```json
{
  "individualName": "Marcus Williams",
  "diagnosis": "Intellectual Disability, Moderate; Autism Spectrum Disorder",
  "lastVisitDate": "2026-05-15",
  "riskScore": 72,
  "county": "Miami-Dade"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "purposeOfActivity": "Supported Marcus Williams during a structured community navigation exercise focused on utilizing paratransit systems. Marcus practiced purchasing transit fare and locating route maps.",
    "additionalObservations": "Marcus appeared highly engaged, showing only mild sensory sensitivity when boarding. He cooperative followed safety rules and successfully verified boarding gates with minimal staff intervention.",
    "nextSteps": "Schedule a follow-up community transit practice session next Tuesday. Review route map schedules in the upcoming home visit.",
    "activityType": "Community Integration",
    "isBillable": true
  }
}
```

---

## 4. Ambient Listening & Transcription Services

Manages audio transcription workflows using high-accuracy speech-to-text models.

### 4.1 `transcribeAudio` Endpoint

Receives compressed audio chunks and returns highly accurate, context-aware text transcripts.

- **HTTP Method:** `POST`
- **URL Endpoint:** `/transcribeAudio`
- **Access Control:** Authenticated Case Managers & Supervisors

#### Request Payload (Multipart Form Data)
| Parameter | Type | Required | Description |
|---|---|---|---|
| `audio` | File (Binary) | Yes | WebM or OGG audio file containing recorded session |
| `individualId` | String | Yes | Firestore ID of the individual being recorded |
| `vocabularyHints` | Array | No | Specific medication or behavioral terms to boost accuracy |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "transcript": "We went to the grocery store today and Marcus did a great job paying for the apples. He had some trouble with change, but we worked through it.",
  "duration_seconds": 45.2,
  "confidence": 0.94
}
```

---

## 5. Clinical Packet Export Services

Handles compilation of clinical packets and Person-Centered Plans for state HCBS audits.

### 5.1 `exportSCPacket` Endpoint

Compiles demographic, medical, progress note, and compliance history records into a single, signable PDF document.

- **HTTP Method:** `POST`
- **URL Endpoint:** `/exportSCPacket`
- **Access Control:** Supervisors & Admins only

#### Request Payload
```json
{
  "individualId": "ind_marcus_001",
  "quarter": "2026-Q1",
  "includeAuditTrail": true
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "downloadUrl": "https://storage.googleapis.com/casemanagement-ai.appspot.com/exports/packets/SC_Packet_ind_marcus_001_2026-Q1.pdf?GoogleAccessId=...",
  "expiresAt": "2026-05-24T00:37:45Z",
  "auditRef": "AUD-EXP-98A72F"
}
```

---

## 6. Relational Integrations & Sync Services

Provides bidirectional data synchronization with state-mandated electronic health registries (e.g., iCareManager).

### 6.1 `syncWithICM` Endpoint

Pushes signed progress notes and verified incident reports to the state-mandated iCareManager portal.

- **HTTP Method:** `POST`
- **URL Endpoint:** `/syncWithICM`
- **Access Control:** System administrators & Scheduled Crons

#### Request Payload
```json
{
  "recordType": "progress_note",
  "recordId": "note_098a72f",
  "forceUpdate": false
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "iCMAcknowledgment": {
    "status": "Accepted",
    "icm_record_id": "icm_pnote_99218",
    "timestamp": "2026-05-23T04:37:45Z"
  }
}
```

---

## 7. Staging & Production Endpoints Matrix

Developers must direct their API requests to the matching host depending on the runtime context.

| Environment | Base API Host URL | Auth Mode |
|---|---|---|
| **Local Emulator** | `http://localhost:5001/casemanagement-ai/us-central1` | Mock Auth / Standard Token |
| **Staging Environment** | `https://us-central1-casemanagement-ai-staging.cloudfunctions.net` | Valid JWT (Staging DB) |
| **Production Environment** | `https://us-central1-casemanagement-ai.cloudfunctions.net` | Valid JWT (Production DB) |

---

## 8. Error Handling & Code Guide

All endpoints communicate errors using a unified, clean JSON format.

```json
{
  "success": false,
  "error": {
    "code": "auth/invalid-token",
    "message": "The provided Firebase ID Token is expired or malformed.",
    "requestId": "req-98f2-8821"
  }
}
```

### Common Error Reference Table

| HTTP Status | Error Code | Description | Mitigation Steps |
|---|---|---|---|
| **400 Bad Request** | `validation/missing-params` | A required parameter was omitted from the request body | Verify request payload schema matching |
| **401 Unauthorized** | `auth/expired-token` | The JWT bearer token has expired | Call `currentUser.getIdToken(true)` in client to refresh |
| **403 Forbidden** | `auth/insufficient-permissions` | The active user role does not possess permissions for this action | Escalation required (e.g. Supervisor role approval) |
| **429 Too Many Requests** | `rate/credit-limit-exceeded` | The organization has exhausted its active Vertex AI credit balance | Purchase additional credit packages via Billing Hub |
| **500 Internal Server Error** | `api/gemini-unavailable` | Google Vertex AI Gemini service was unreachable or timed out | Retry transaction using exponential backoff |

---

*End of Serverless API & Integration Documentation Manual — CaseManagement.AI.*
