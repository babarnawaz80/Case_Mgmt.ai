import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import {
  getUser,
  orgUsers,
  roleLabel,
  roleAvatarTone,
  roleBadgeTone,
  statusTone,
  getInitials,
  programs,
  operatingStates,
  permissionsMatrix,
  permTone,
  permLabel,
} from "@/data/settings";
import {
  getStaffProvider,
  daysUntil,
  CREDENTIAL_TYPES,
  type CredentialType,
  type StaffStateEnrollment,
} from "@/data/staffProvider";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Pencil, MoreHorizontal, Shield, Activity, Plus, Trash2, AlertTriangle, Camera, Loader2 } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { demoToast, demoSuccess } from "@/lib/demoToast";

const SettingsUserDetail = () => {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const mockUser = getUser(userId);
  const [tab, setTab] = useState<"profile" | "access" | "activity" | "permissions">(
    "profile"
  );
  const { isAdmin } = useRole();
  const { firebaseUser, currentUser, refreshProfile } = useAuth();
  const initialProvider = useMemo(() => getStaffProvider(userId), [userId]);
  const [provider, setProvider] = useState(initialProvider);
  const [enrollments, setEnrollments] = useState<StaffStateEnrollment[]>(initialProvider.enrollments);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [firestoreUser, setFirestoreUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) { setLoadingUser(false); return; }
      try {
        // 1. Try direct lookup by userId (should be Firebase Auth UID for real users)
        const targetSnap = await getDoc(doc(db, "users", userId));
        if (targetSnap.exists()) {
          setFirestoreUser({ uid: userId, ...targetSnap.data() });
          setLoadingUser(false);
          return;
        }
        // 2. userId may be a legacy mock ID (e.g. "u-002") — look up by the mock user's email
        if (mockUser?.email) {
          const q = query(collection(db, "users"), where("email", "==", mockUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const d = snap.docs[0];
            setFirestoreUser({ uid: d.id, ...d.data() });
            setLoadingUser(false);
            return;
          }
        }
        // 3. Last resort: if this appears to be the logged-in user's own profile, use their doc
        if (firebaseUser?.uid && firebaseUser.uid !== userId) {
          const selfSnap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (selfSnap.exists()) {
            setFirestoreUser({ uid: firebaseUser.uid, ...selfSnap.data() });
          }
        }
      } catch (err) {
        console.error("Error fetching user from Firestore:", err);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, [userId, firebaseUser?.uid, mockUser?.email]);

  const [loadingUser, setLoadingUser] = useState(true);

  const user = useMemo(() => {
    // Build from firestoreUser first (real Firestore data), fall back to static mock
    if (firestoreUser) {
      return {
        id: firestoreUser.uid || userId,
        firstName: firestoreUser.firstName || firestoreUser.first_name || mockUser?.firstName || "",
        lastName: firestoreUser.lastName || firestoreUser.last_name || mockUser?.lastName || "",
        email: firestoreUser.email || mockUser?.email || "",
        title: firestoreUser.title || firestoreUser.credential || mockUser?.title || "",
        role: firestoreUser.role || mockUser?.role || "case_manager",
        status: firestoreUser.isActive === false ? "inactive" : "active",
        photoURL: firestoreUser.photoURL || firestoreUser.photo_url || mockUser?.photoURL || "",
        lastLogin: firestoreUser.lastLogin || mockUser?.lastLogin || "—",
        // Always provide safe array defaults — Firestore docs may not have these fields
        programs: Array.isArray(firestoreUser.programs) ? firestoreUser.programs : (mockUser?.programs ?? []),
        states: Array.isArray(firestoreUser.states) ? firestoreUser.states : (mockUser?.states ?? []),
        department: firestoreUser.department || mockUser?.department || "",
        supervisor: firestoreUser.supervisor || mockUser?.supervisor || "",
        credential: firestoreUser.credential || mockUser?.credential || "",
        phone: firestoreUser.phone || firestoreUser.phoneNumber || mockUser?.phone || "",
        caseload: firestoreUser.caseload ?? mockUser?.caseload ?? 0,
        caseloadCapacity: firestoreUser.caseloadCapacity ?? mockUser?.caseloadCapacity ?? 0,
      };
    }
    if (mockUser) return { ...mockUser, programs: mockUser.programs ?? [], states: mockUser.states ?? [] };
    return null;
  }, [mockUser, firestoreUser, userId]);

  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    if (user) {
      setEditFirst(user.firstName);
      setEditLast(user.lastName);
      setEditEmail(user.email);
      setEditTitle(user.title ?? "");
    }
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Prefer resolved Firestore UID (handles legacy mock IDs like "u-002"), fall back to auth UID
    const realUid: string = firestoreUser?.uid || firebaseUser?.uid || userId;
    if (!file || !realUid) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const storagePath = `profile_photos/${realUid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", null, reject, resolve);
      });
      const downloadUrl = await getDownloadURL(storageRef);
      // Write to Firestore using the real UID
      await updateDoc(doc(db, "users", realUid), { photoURL: downloadUrl, photo_url: downloadUrl });
      toast.success("Profile photo updated");
      if (firestoreUser) setFirestoreUser({ ...firestoreUser, photoURL: downloadUrl });
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error("Failed to upload photo", { description: err?.message || "Check Storage permissions" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const supervisors = useMemo(
    () => orgUsers.filter((u) => u.role === "supervisor" || u.role === "admin"),
    []
  );
  const licenseDays = daysUntil(provider.licenseExpiration);
  const licenseWarning =
    licenseDays === null
      ? null
      : licenseDays < 0
      ? { tone: "red" as const, label: `License expired ${Math.abs(licenseDays)} day${Math.abs(licenseDays) === 1 ? "" : "s"} ago — billing blocked` }
      : licenseDays <= 90
      ? { tone: "amber" as const, label: `License expires in ${licenseDays} day${licenseDays === 1 ? "" : "s"}` }
      : null;

  const addEnrollment = () => {
    const id = `se-${Date.now()}`;
    setEnrollments((rows) => [
      ...rows,
      { id, state: "", providerId: "", status: "Pending", effective: "", expiration: "" },
    ]);
    setEditingId(id);
  };
  const updateEnrollment = (id: string, patch: Partial<StaffStateEnrollment>) =>
    setEnrollments((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeEnrollment = (id: string) => {
    setEnrollments((rows) => rows.filter((r) => r.id !== id));
    toast.success("State enrollment removed");
  };
  const updateProvider = <K extends keyof typeof provider>(key: K, value: (typeof provider)[K]) =>
    setProvider((p) => ({ ...p, [key]: value }));

  if (loadingUser) {
    return (
      <SettingsLayout title="Loading..." subtitle="">
        <div className="flex items-center gap-2 text-[13px] text-icm-text-dim font-geist">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading user profile…
        </div>
      </SettingsLayout>
    );
  }

  if (!user) {
    return (
      <SettingsLayout title="User not found" subtitle="The requested user does not exist.">
        <button
          onClick={() => navigate("/settings/users")}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Back to users
        </button>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout title={`${user.firstName} ${user.lastName}`} subtitle={user.email}>
      {/* Identity card */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-4 flex items-center gap-4">
        <label className="relative group cursor-pointer w-16 h-16 shrink-0 block">
          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} />
          {user.photoURL ? (
            <div className="w-full h-full rounded-lg overflow-hidden border border-icm-border flex items-center justify-center">
              <img src={user.photoURL} alt={`${user.firstName} ${user.lastName}`} className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className={cn("w-full h-full rounded-lg ring-1 flex items-center justify-center text-[18px] font-manrope font-bold", roleAvatarTone(user.role))}>
              {getInitials(user.firstName, user.lastName)}
            </span>
          )}
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploadingAvatar ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
          </div>
        </label>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editMode ? (
              <div className="flex gap-2 flex-wrap">
                <input
                  value={editFirst}
                  onChange={(e) => setEditFirst(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[15px] font-manrope font-bold text-icm-text focus:outline-none focus:border-icm-accent w-36"
                  placeholder="First name"
                />
                <input
                  value={editLast}
                  onChange={(e) => setEditLast(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[15px] font-manrope font-bold text-icm-text focus:outline-none focus:border-icm-accent w-36"
                  placeholder="Last name"
                />
              </div>
            ) : (
              <h2 className="font-manrope font-bold text-[18px] text-icm-text">
                {user.firstName} {user.lastName}
              </h2>
            )}
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                roleBadgeTone(user.role)
              )}
            >
              {roleLabel(user.role)}
            </span>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1 capitalize",
                statusTone(user.status)
              )}
            >
              {user.status}
            </span>
          </div>
          {editMode ? (
            <div className="flex gap-2 mt-2 flex-wrap">
              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="h-8 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent flex-1 min-w-[180px]"
                placeholder="Email"
              />
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="h-8 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-accent flex-1 min-w-[140px]"
                placeholder="Title / Credential"
              />
            </div>
          ) : (
            <p className="text-[12px] font-geist text-icm-text-dim mt-1">
              {user.title ?? "—"} · {user.email}
            </p>
          )}
          <p className="text-[11px] font-mono text-icm-text-faint mt-0.5">
            Last login: {user.lastLogin}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {editMode ? (
            <>
              <button
                onClick={async () => {
                  // Prefer the UID resolved from Firestore (handles legacy mock IDs like "u-002")
                  const realUid = firestoreUser?.uid || userId || firebaseUser?.uid;
                  if (!realUid) { toast.error("Cannot save: user ID not resolved"); return; }
                  try {
                    await setDoc(doc(db, 'users', realUid), {
                      firstName: editFirst,
                      lastName: editLast,
                      displayName: `${editFirst} ${editLast}`,
                      email: editEmail,
                      title: editTitle,
                      updatedAt: new Date().toISOString(),
                    }, { merge: true });
                    setFirestoreUser((prev: any) => ({
                      ...prev,
                      uid: realUid,
                      firstName: editFirst,
                      lastName: editLast,
                      displayName: `${editFirst} ${editLast}`,
                      email: editEmail,
                      title: editTitle,
                    }));
                    // If editing own profile, refresh context so greeting updates immediately
                    if (refreshProfile && (realUid === currentUser?.uid)) {
                      await refreshProfile();
                    }
                    toast.success("Profile saved successfully!");
                    setEditMode(false);
                  } catch (err: any) {
                    console.error(err);
                    toast.error("Failed to save profile changes", { description: err?.message });
                  }
                }}
                className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditFirst(user.firstName);
                  setEditLast(user.lastName);
                  setEditEmail(user.email);
                  setEditTitle(user.title ?? "");
                  setEditMode(false);
                }}
                className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          <button
            onClick={() => demoToast("More user actions")}
            className="h-9 w-9 rounded-xl border border-icm-border bg-icm-panel text-icm-text-dim flex items-center justify-center hover:border-icm-border-strong"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-icm-border">
        {(
          [
            { k: "profile", label: "Profile" },
            { k: "access", label: "Programs & Access" },
            { k: "activity", label: "Activity Log" },
            { k: "permissions", label: "Permissions" },
          ] as const
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "h-9 px-3 text-[12.5px] font-geist font-semibold transition-colors -mb-px border-b-2",
              tab === t.k
                ? "text-icm-accent border-icm-accent"
                : "text-icm-text-dim border-transparent hover:text-icm-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 space-y-3 max-w-[640px]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" defaultValue={user.firstName} />
            <Field label="Last name" defaultValue={user.lastName} />
          </div>
          <Field label="Email" defaultValue={user.email} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" defaultValue={user.phone ?? ""} />
            <Field label="Title / Credential" defaultValue={user.title ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Department" defaultValue={user.department ?? ""} />
            <Field label="Supervisor" defaultValue={user.supervisor ?? ""} />
          </div>
          <div>
            <Label>Role</Label>
            <select
              defaultValue={user.role}
              className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="case_manager">Case Manager</option>
              <option value="billing">Billing</option>
              <option value="read_only">Read Only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-geist text-icm-text">
            <input
              type="checkbox"
              defaultChecked={user.status === "active"}
              className="accent-icm-accent"
            />
            Account active
          </label>
          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                const realUid = firestoreUser?.uid || userId || firebaseUser?.uid;
                if (!realUid) { toast.error("Cannot save: user ID not resolved"); return; }
                try {
                  await setDoc(doc(db, 'users', realUid), {
                    firstName: editFirst,
                    lastName: editLast,
                    displayName: `${editFirst} ${editLast}`,
                    email: editEmail,
                    title: editTitle,
                    updatedAt: new Date().toISOString(),
                  }, { merge: true });
                  setFirestoreUser((prev: any) => ({
                    ...prev,
                    uid: realUid,
                    firstName: editFirst,
                    lastName: editLast,
                    displayName: `${editFirst} ${editLast}`,
                    email: editEmail,
                    title: editTitle,
                  }));
                  // Refresh context if editing own profile
                  if (refreshProfile && realUid === currentUser?.uid) {
                    await refreshProfile();
                  }
                  toast.success("User profile saved successfully!");
                } catch (err: any) {
                  console.error(err);
                  toast.error("Failed to save profile changes", { description: err?.message });
                }
              }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      {tab === "access" && (
        <div className="space-y-3 max-w-[800px]">
          <SectionPanel title="Program access">
            <ul className="divide-y divide-icm-border">
              {programs.map((p) => {
                const enabled = user.programs?.includes(p.name) ?? false;
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 text-[12px] font-geist text-icm-text"
                  >
                    <span>{p.name}</span>
                    <span className="flex items-center gap-2">
                      {enabled && (
                        <span className="text-[10.5px] font-geist text-icm-text-dim">
                          {roleLabel(user.role)}
                        </span>
                      )}
                      <Toggle defaultOn={enabled} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </SectionPanel>

          <SectionPanel title="State access">
            <div className="flex flex-wrap gap-3">
              {operatingStates.map((s) => (
                <label
                  key={s.code}
                  className="flex items-center gap-2 text-[12px] font-geist text-icm-text"
                >
                  <input
                    type="checkbox"
                    defaultChecked={user.states?.includes(s.code) ?? false}
                    className="accent-icm-accent"
                  />
                  {s.name}
                </label>
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Individual access">
            <div className="space-y-2 text-[12px] font-geist text-icm-text">
              <Radio
                name="access"
                defaultChecked
                label="Assigned individuals only"
                desc="User sees only individuals assigned to them as case manager"
              />
              <Radio
                name="access"
                label="All individuals in assigned programs"
                desc="User sees all individuals in their programs regardless of assignment"
              />
              <Radio
                name="access"
                label="All individuals in organization"
                desc="Admin-level access to all records (requires Admin or Supervisor role)"
              />
            </div>
          </SectionPanel>

          {user.role === "case_manager" && (
            <SectionPanel title="Caseload">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Current caseload" defaultValue={String(user.caseload ?? 0)} />
                <Field
                  label="Caseload capacity"
                  defaultValue={String(user.caseloadCapacity ?? 0)}
                />
                <Field label="Caseload weight" defaultValue="0" />
              </div>
            </SectionPanel>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
          <table className="w-full text-[12px] font-geist">
            <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Timestamp</th>
                <th className="text-left px-3 py-2 font-semibold">Action</th>
                <th className="text-left px-3 py-2 font-semibold">Module</th>
                <th className="text-left px-3 py-2 font-semibold">Individual</th>
                <th className="text-left px-3 py-2 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {[
                { t: "Today, 9:14 AM", a: "Login", m: "Auth", i: "—", ip: "10.0.1.42" },
                { t: "Today, 9:18 AM", a: "Viewed eChart", m: "People", i: "Joseph Brown", ip: "10.0.1.42" },
                { t: "Today, 9:32 AM", a: "Created contact note", m: "Contact Notes", i: "Joseph Brown", ip: "10.0.1.42" },
                { t: "Yesterday", a: "Submitted referral", m: "Referrals", i: "Joseph Brown", ip: "10.0.1.42" },
              ].map((row, i) => (
                <tr key={i} className="border-t border-icm-border">
                  <td className="px-3 py-2 text-icm-text-dim font-mono text-[11px]">{row.t}</td>
                  <td className="px-3 py-2 text-icm-text">{row.a}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.m}</td>
                  <td className="px-3 py-2 text-icm-text-dim">{row.i}</td>
                  <td className="px-3 py-2 text-icm-text-faint font-mono text-[11px]">{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "permissions" && (
        <div className="space-y-3 max-w-[900px]">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-icm-amber-soft ring-1 ring-icm-amber/20 text-[11.5px] font-geist text-icm-text">
            <Shield className="w-3.5 h-3.5 text-icm-amber mt-0.5 shrink-0" />
            Permission overrides for this user replace defaults set by their role. Use sparingly.
          </div>
          <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
            <table className="w-full text-[12px] font-geist">
              <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Module</th>
                  <th className="text-center px-3 py-2 font-semibold">Default ({roleLabel(user.role)})</th>
                  <th className="text-center px-3 py-2 font-semibold">Override</th>
                </tr>
              </thead>
              <tbody>
                {permissionsMatrix.slice(0, 8).map((row) => {
                  const def = row.perms[user.role];
                  return (
                    <tr key={row.module} className="border-t border-icm-border">
                      <td className="px-3 py-2 text-icm-text font-medium">{row.module}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center min-w-[44px] h-6 rounded-full text-[10px] font-geist font-semibold ring-1",
                            permTone(def)
                          )}
                        >
                          {permLabel(def)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <select className="h-7 px-2 rounded-lg border border-icm-border bg-icm-panel text-[11px] font-geist text-icm-text">
                          <option>Inherit</option>
                          <option>Allow</option>
                          <option>Deny</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => toast.success("Permission overrides reset to role defaults")}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold inline-flex items-center gap-1.5 hover:border-icm-border-strong"
          >
            <Activity className="w-3.5 h-3.5" />
            Reset all to role defaults
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="rounded-xl border border-icm-border bg-icm-panel p-4 max-w-[900px] space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
              Provider & Billing Information
            </p>
            {licenseWarning && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                licenseWarning.tone === "red"
                  ? "bg-icm-red-soft text-icm-red ring-icm-red/20"
                  : "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
              )}>
                <AlertTriangle className="w-3 h-3" />
                {licenseWarning.label}
              </span>
            )}
          </div>

          {/* Provider identifiers */}
          <div>
            <SubHeading>Provider identifiers</SubHeading>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Individual NPI (Type 1)"
                placeholder="Enter 10-digit NPI"
                value={provider.npi ?? ""}
                onChange={(v) => updateProvider("npi", v)}
              />
              <Field
                label="Taxonomy code"
                placeholder="e.g. 251T00000X"
                value={provider.taxonomy ?? ""}
                onChange={(v) => updateProvider("taxonomy", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label>Credential type</Label>
                <select
                  value={provider.credentialType ?? ""}
                  onChange={(e) => updateProvider("credentialType", (e.target.value || undefined) as CredentialType | undefined)}
                  className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                >
                  <option value="">Select credential…</option>
                  {CREDENTIAL_TYPES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <Field
                label="License number"
                value={provider.licenseNumber ?? ""}
                onChange={(v) => updateProvider("licenseNumber", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field
                label="License expiration date"
                placeholder="MM/DD/YYYY"
                value={provider.licenseExpiration ?? ""}
                onChange={(v) => updateProvider("licenseExpiration", v)}
              />
              <div>
                <Label>Supervising provider</Label>
                <select
                  value={provider.supervisingProviderUserId ?? ""}
                  onChange={(e) => updateProvider("supervisingProviderUserId", e.target.value || undefined)}
                  className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text"
                >
                  <option value="">None</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} — {roleLabel(s.role)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* State enrollment */}
          <div>
            <SubHeading>Individual Provider Enrollment by State</SubHeading>
            <p className="text-[11.5px] text-icm-text-dim font-geist mb-2">
              Each state where this user bills Medicaid requires a separate provider enrollment.
            </p>
            <div className="rounded-xl border border-icm-border overflow-hidden">
              <table className="w-full text-[12px] font-geist">
                <thead className="bg-icm-bg/60">
                  <tr>
                    {["State", "Provider ID", "Status", "Effective", "Expiration", ""].map((h) => (
                      <th key={h} className="text-left px-3 py-2 text-[10.5px] uppercase tracking-wide font-semibold text-icm-text-faint whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-icm-border">
                  {enrollments.map((row) => {
                    const isEditing = editingId === row.id;
                    const cellInput = "w-full h-7 px-2 rounded-md border border-icm-border bg-icm-panel text-[11.5px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong";
                    return (
                      <tr key={row.id} className="hover:bg-icm-bg/40">
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <input value={row.state} onChange={(e) => updateEnrollment(row.id, { state: e.target.value })} className={cellInput} placeholder="State" />
                          ) : (
                            <span className="font-medium text-icm-text">{row.state || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {isEditing ? (
                            <input value={row.providerId} onChange={(e) => updateEnrollment(row.id, { providerId: e.target.value })} className={cellInput} placeholder="Provider ID" />
                          ) : (
                            <span className="text-icm-text-dim">{row.providerId || "—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <select
                              value={row.status}
                              onChange={(e) => updateEnrollment(row.id, { status: e.target.value as StaffStateEnrollment["status"] })}
                              className={cellInput}
                            >
                              <option>Active</option>
                              <option>Pending</option>
                              <option>Expired</option>
                            </select>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-geist font-semibold ring-1",
                              row.status === "Active" ? "bg-icm-green-soft text-icm-green ring-icm-green/20"
                                : row.status === "Pending" ? "bg-icm-amber-soft text-icm-amber ring-icm-amber/20"
                                : "bg-icm-red-soft text-icm-red ring-icm-red/20"
                            )}>
                              {row.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-icm-text-dim">
                          {isEditing ? (
                            <input value={row.effective} onChange={(e) => updateEnrollment(row.id, { effective: e.target.value })} className={cellInput} placeholder="MM/DD/YYYY" />
                          ) : (row.effective || "—")}
                        </td>
                        <td className="px-3 py-2 font-mono text-icm-text-dim">
                          {isEditing ? (
                            <input value={row.expiration} onChange={(e) => updateEnrollment(row.id, { expiration: e.target.value })} className={cellInput} placeholder="MM/DD/YYYY" />
                          ) : (row.expiration || "—")}
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          {isEditing ? (
                            <button
                              onClick={() => { setEditingId(null); toast.success("Enrollment saved"); }}
                              className="h-7 px-2.5 rounded-lg bg-icm-text text-icm-panel text-[11px] font-geist font-semibold"
                            >
                              Save
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setEditingId(row.id)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-bg text-icm-text-dim"
                                aria-label="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => removeEnrollment(row.id)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-lg border border-icm-border hover:bg-icm-red-soft text-icm-red"
                                aria-label="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-icm-text-dim text-[12px]">
                        No state enrollments yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button
              onClick={addEnrollment}
              className="mt-2 h-8 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist font-semibold text-icm-text inline-flex items-center gap-1.5 hover:bg-icm-bg"
            >
              <Plus className="w-3.5 h-3.5" /> Add State Enrollment
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={async () => {
                const realUid = firestoreUser?.uid || userId || firebaseUser?.uid;
                if (!realUid) { toast.error("Cannot save: user ID not resolved"); return; }
                try {
                  await setDoc(doc(db, 'users', realUid), {
                    providerInfo: provider,
                    enrollments: enrollments,
                    updatedAt: new Date().toISOString(),
                  }, { merge: true });
                  toast.success("Provider & billing info saved successfully!");
                } catch (err: any) {
                  console.error(err);
                  toast.error("Failed to save provider info", { description: err?.message });
                }
              }}
              className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
            >
              Save provider info
            </button>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
};

function SectionPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel p-4">
      <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function Toggle({ defaultOn }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors",
        on ? "bg-icm-accent" : "bg-icm-border"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          on && "translate-x-4"
        )}
      />
    </button>
  );
}

function Radio({
  name,
  label,
  desc,
  defaultChecked,
}: {
  name: string;
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="radio"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 accent-icm-accent"
      />
      <div>
        <p className="font-medium text-icm-text">{label}</p>
        <p className="text-[11.5px] text-icm-text-dim">{desc}</p>
      </div>
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function Field({
  label,
  defaultValue,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  defaultValue?: string;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const controlled = value !== undefined && onChange !== undefined;
  return (
    <div>
      <Label>{label}</Label>
      <input
        {...(controlled
          ? { value, onChange: (e) => onChange!(e.target.value) }
          : { defaultValue })}
        placeholder={placeholder}
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-2">
      {children}
    </p>
  );
}

export default SettingsUserDetail;
