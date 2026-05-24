# Firestore Schema — CaseManagement.AI

> All collections use Firebase Firestore. Document IDs are auto-generated unless noted.

---

## Collection: `users`

Document ID: Firebase Auth UID

| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | Firebase Auth UID |
| `email` | string | User email |
| `display_name` | string | Full name |
| `role` | string | `case_manager` \| `supervisor` \| `admin` \| `billing` |
| `program` | string | Program name (for supervisors — scopes their view) |
| `assigned_individuals` | string[] | Array of individual IDs (case managers) |
| `created_at` | timestamp | Account creation |
| `last_login` | timestamp | Last login time |

---

## Collection: `individuals`

Document ID: Auto-generated

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Same as document ID |
| `first_name` | string | Legal first name |
| `last_name` | string | Legal last name |
| `preferred_name` | string? | Preferred/nickname |
| `dob` | string | Date of birth (YYYY-MM-DD) |
| `gender` | string? | Gender identity |
| `medicaid_id` | string? | Medicaid ID number |
| `enrollment_status` | string | `active` \| `inactive` \| `pending` \| `discharged` |
| `program` | string? | Program enrollment |
| `level_of_care` | string? | Level of care designation |
| `county` | string? | County of residence |
| `address` | string? | Full address |
| `phone` | string? | Primary phone |
| `diagnosis` | string? | Primary diagnosis |
| `risk_score` | number? | 0–100 risk score |
| `assigned_case_manager` | string? | Case manager display name |
| `assigned_case_manager_uid` | string? | Case manager Firebase UID |
| `assigned_supervisor` | string? | Supervisor display name |
| `assigned_supervisor_uid` | string? | Supervisor Firebase UID |
| `open_tasks` | number? | Count of open tasks |
| `open_incidents` | number? | Count of open incidents |
| `last_visit_date` | string? | Date of last visit (YYYY-MM-DD) |
| `monitoring_compliance_pct` | number? | % monitoring compliance |
| `isp_due_date` | string? | ISP renewal due date |
| `created_at` | timestamp | Record creation |
| `updated_at` | timestamp | Last update |

### Indexes Required
```
individuals: assigned_case_manager_uid ASC, enrollment_status ASC
individuals: program ASC, enrollment_status ASC
individuals: risk_score DESC
```

---

## Collection: `progress_notes`

Document ID: Auto-generated

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Same as document ID |
| `individual_id` | string | Reference to `individuals/{id}` |
| `author_uid` | string | Firebase UID of note author |
| `author_name` | string | Display name of author |
| `progressDate` | string | Note date (YYYY-MM-DD) |
| `activityType` | string | e.g. "Face-to-face Visit" |
| `contactType` | string | "In-person" \| "Phone" \| "Video" |
| `billable` | boolean | Is this billable? |
| `nonBillableReason` | string? | Reason if not billable |
| `purposeOfActivity` | string? | Purpose field content |
| `background` | string? | Background/circumstances |
| `whoWasPresent` | string? | People present |
| `detailsOfActivity` | string? | Main narrative |
| `issuesConcerns` | string? | Issues raised |
| `nextSteps` | string? | Follow-up actions |
| `status` | string | `draft` \| `pending_signature` \| `signed` |
| `ai_generated` | boolean | Was content AI-prefilled? |
| `signed_at` | timestamp? | When signed |
| `signed_by` | string? | Who signed |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update |

### Indexes Required
```
progress_notes: individual_id ASC, progressDate DESC
progress_notes: author_uid ASC, progressDate DESC
progress_notes: status ASC, progressDate DESC
```

---

## Collection: `contact_notes`

Document ID: Auto-generated

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Same as document ID |
| `individual_id` | string | Reference to `individuals/{id}` |
| `individual_name` | string | Denormalized full name |
| `author_uid` | string | Firebase UID |
| `author_name` | string | Display name |
| `date` | string | Note date (YYYY-MM-DD) |
| `activityType` | string | Activity type |
| `contactType` | string | Contact method |
| `billable` | boolean | Is billable? |
| `nonBillableReason` | string? | Non-billable reason |
| `startTime` | string? | HH:MM |
| `endTime` | string? | HH:MM |
| `purpose` | string? | Purpose of contact |
| `background` | string? | Relevant background |
| `present` | string? | Who was present |
| `details` | string? | Details of contact |
| `issues` | string? | Issues/concerns |
| `nextSteps` | string? | Follow-up plans |
| `status` | string | `draft` \| `submitted` \| `signed` |
| `created_at` | timestamp | Creation time |
| `updated_at` | timestamp | Last update |

---

## Collection: `audit_log`

Document ID: Auto-generated (append-only)

| Field | Type | Description |
|-------|------|-------------|
| `action` | string | e.g. `note_signed`, `individual_viewed` |
| `actor_uid` | string | Firebase UID of who performed the action |
| `actor_name` | string | Display name |
| `resource_type` | string | `individual` \| `progress_note` \| etc. |
| `resource_id` | string | Document ID of affected resource |
| `timestamp` | timestamp | When the action occurred |
| `ip_address` | string? | Client IP (if available) |
| `metadata` | map? | Additional context |

---

## Firestore Security Rules (Summary)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can only read their own profile
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId
                   || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Individuals: scoped by role
    match /individuals/{individualId} {
      allow read: if request.auth != null && (
        resource.data.assigned_case_manager_uid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['supervisor', 'admin']
      );
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['case_manager', 'supervisor', 'admin'];
    }

    // Progress notes: author or supervisor/admin
    match /progress_notes/{noteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.author_uid == request.auth.uid;
      allow update: if request.auth != null && (
        resource.data.author_uid == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['supervisor', 'admin']
      );
    }

    // Audit log: append-only
    match /audit_log/{logId} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth != null;
      allow update, delete: if false; // immutable
    }
  }
}
```
