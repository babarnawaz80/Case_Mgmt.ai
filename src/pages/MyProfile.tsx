import React, { useRef, useState, useCallback } from "react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { useAuth } from "@/contexts/AuthContext";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Camera, Loader2, Check, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const compressImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 256;
        const MAX_HEIGHT = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2d context from canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

function getInitials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

const MyProfile = () => {
  const { userProfile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Personal info edits
  const [firstName, setFirstName] = useState(userProfile?.firstName ?? "");
  const [lastName, setLastName] = useState(userProfile?.lastName ?? "");
  const [phone, setPhone] = useState(userProfile?.phone ?? "");
  const [savingInfo, setSavingInfo] = useState(false);

  const currentPhoto = preview ?? userProfile?.photoURL ?? null;

  const handleFile = (f: File) => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are allowed.");
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB} MB.`);
      return;
    }
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = ""; // allow re-selecting same file
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const clearPreview = () => {
    setPreview(null);
    setFile(null);
  };

  const uploadPhoto = async () => {
    if (!file || !userProfile?.uid) return;
    setUploading(true);
    setProgress(0);
    try {
      let downloadURL = "";
      try {
        // Try uploading to Firebase Storage
        const storageRef = ref(storage, `profile_photos/${userProfile.uid}/${Date.now()}_${file.name}`);
        const task = uploadBytesResumable(storageRef, file, {
          contentType: file.type,
          customMetadata: { uploadedBy: userProfile.uid },
        });

        downloadURL = await new Promise<string>((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref))
          );
        });
      } catch (storageErr) {
        console.warn("Firebase Storage upload failed, using robust Base64 local storage fallback:", storageErr);
        // Robust Base64 Local Database fallback
        downloadURL = await compressImageToBase64(file);
      }

      // Update Firestore user doc
      await updateDoc(doc(db, "users", userProfile.uid), {
        photoURL: downloadURL,
        updatedAt: serverTimestamp(),
      });

      // Update Firebase Auth profile so it shows in auth.currentUser
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadURL });
      }

      // Refresh Auth profile context to propagate changes instantly
      if (refreshProfile) {
        await refreshProfile();
      }

      setPreview(downloadURL);
      setFile(null);
      toast.success("Profile photo updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Upload failed", { description: err?.message || "An unknown error occurred during upload." });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const saveInfo = async () => {
    if (!userProfile?.uid) return;
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name are required.");
      return;
    }
    setSavingInfo(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await updateDoc(doc(db, "users", userProfile.uid), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName,
        phone: phone.trim() || null,
        updatedAt: serverTimestamp(),
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
      // Refresh Auth context so Dashboard greeting and nav update immediately
      if (refreshProfile) {
        await refreshProfile();
      }
      toast.success("Profile saved");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save", { description: err?.message });
    } finally {
      setSavingInfo(false);
    }
  };

  if (!userProfile) return null;

  return (
    <SettingsLayout title="My Profile" subtitle="Manage your personal information and photo">

      {/* ── Photo section ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 max-w-[600px]">
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim mb-4">
          Profile Photo
        </p>

        <div className="flex items-start gap-6">
          {/* Avatar preview */}
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-24 h-24 rounded-2xl overflow-hidden border-2 transition-colors",
                dragOver ? "border-icm-accent scale-105" : "border-icm-border"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              {currentPhoto ? (
                <img src={currentPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-icm-accent-soft flex items-center justify-center text-icm-accent text-[28px] font-manrope font-bold">
                  {getInitials(userProfile.firstName, userProfile.lastName)}
                </div>
              )}
            </div>
            {/* Camera overlay */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-icm-text text-icm-panel flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
              title="Change photo"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drop zone + actions */}
          <div className="flex-1 min-w-0">
            {file ? (
              /* Pending upload state */
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-icm-green/40 bg-icm-green-soft/40">
                  <Check className="w-4 h-4 text-icm-green shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-geist font-semibold text-icm-text truncate">{file.name}</p>
                    <p className="text-[11px] text-icm-text-dim">{(file.size / 1024).toFixed(0)} KB — ready to upload</p>
                  </div>
                  <button onClick={clearPreview} className="ml-auto shrink-0 text-icm-text-dim hover:text-icm-red">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {uploading && (
                  <div className="w-full h-1.5 rounded-full bg-icm-border overflow-hidden">
                    <div
                      className="h-full bg-icm-accent rounded-full transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={uploadPhoto}
                    disabled={uploading}
                    className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading {progress}%…</> : "Save Photo"}
                  </button>
                  <button onClick={clearPreview} disabled={uploading} className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold disabled:opacity-40">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Drop zone prompt */
              <button
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={cn(
                  "w-full h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer",
                  dragOver
                    ? "border-icm-accent bg-icm-accent-soft/30 text-icm-accent"
                    : "border-icm-border bg-icm-bg/50 text-icm-text-dim hover:border-icm-accent hover:text-icm-accent"
                )}
              >
                <User className="w-5 h-5" />
                <p className="text-[12px] font-geist font-semibold">Click or drag photo here</p>
                <p className="text-[11px] font-geist">JPEG, PNG, WebP · max {MAX_SIZE_MB} MB</p>
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={onFileInput}
        />
      </div>

      {/* ── Personal info section ── */}
      <div className="rounded-xl border border-icm-border bg-icm-panel p-5 max-w-[600px] space-y-4">
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
          Personal Information
        </p>

        <div className="grid grid-cols-2 gap-3">
          <ProfileField label="First name" value={firstName} onChange={setFirstName} />
          <ProfileField label="Last name" value={lastName} onChange={setLastName} />
        </div>
        <ProfileField label="Email" value={userProfile.email} readOnly hint="Contact your admin to change your email." />
        <ProfileField label="Phone" value={phone} onChange={setPhone} placeholder="+1 (555) 000-0000" />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <PLabel>Role</PLabel>
            <p className="mt-1 h-9 px-3 rounded-xl border border-icm-border bg-icm-bg/50 text-[12px] font-geist text-icm-text-dim flex items-center capitalize">
              {userProfile.role.replace("_", " ")}
            </p>
          </div>
          <div>
            <PLabel>Organization</PLabel>
            <p className="mt-1 h-9 px-3 rounded-xl border border-icm-border bg-icm-bg/50 text-[12px] font-geist text-icm-text-dim flex items-center truncate">
              {userProfile.organizationId}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={saveInfo}
            disabled={savingInfo}
            className="h-9 px-4 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {savingInfo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {savingInfo ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
};

function PLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
      {children}
    </label>
  );
}

function ProfileField({
  label, value, onChange, placeholder, readOnly = false, hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <PLabel>{label}</PLabel>
      <input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        className={cn(
          "mt-1 w-full h-9 px-3 rounded-xl border border-icm-border text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong",
          readOnly ? "bg-icm-bg/50 text-icm-text-dim cursor-not-allowed" : "bg-icm-panel"
        )}
      />
      {hint && <p className="mt-0.5 text-[10.5px] text-icm-text-faint font-geist">{hint}</p>}
    </div>
  );
}

export default MyProfile;
