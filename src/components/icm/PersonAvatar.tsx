import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { updateIndividual } from "@/hooks/useIndividuals";

interface PersonAvatarProps {
  person: any; // Support both Person (static) and Individual (Firestore)
  size?: number; // px
  shape?: "rounded" | "circle" | "square";
  className?: string;
  /** If provided, renders a camera-upload overlay on hover. Pass the Firestore individual id. */
  editable?: boolean;
  individualId?: string;
  /** Called after a successful upload with the new photo URL */
  onPhotoUpdated?: (url: string) => void;
}

/**
 * Avatar that renders the person's photo when available, otherwise falls back
 * to a risk-tinted initials tile. When `editable` + `individualId` are set,
 * hovering the avatar reveals a camera icon — clicking opens a file picker,
 * uploads to Firebase Storage, and writes the URL back to Firestore.
 */
export function PersonAvatar({
  person,
  size = 48,
  shape = "rounded",
  className = "",
  editable = false,
  individualId,
  onPhotoUpdated,
}: PersonAvatarProps) {
  const [errored, setErrored] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const borderRadius = shape === "circle" ? "9999px" : shape === "square" ? "0px" : "0.5rem";

  // Handle both Person (camelCase) and Individual (snake_case) schemas
  const firstName = person?.firstName ?? person?.first_name ?? "";
  const lastName  = person?.lastName  ?? person?.last_name  ?? "";
  const riskScore = person?.riskScore ?? person?.risk_score;
  const photoUrl  = localUrl ?? person?.photoUrl ?? person?.photo_url;

  const showPhoto = photoUrl && !errored;

  // Initials
  const initialsStr = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";

  // Risk-tinted class for initials tile
  let riskClass = "bg-icm-bg text-icm-text-dim border-icm-border";
  if (riskScore !== undefined && riskScore !== null) {
    if      (riskScore >= 60) riskClass = "bg-icm-red/10 text-icm-red border-icm-red/20";
    else if (riskScore >= 35) riskClass = "bg-icm-amber/10 text-icm-amber border-icm-amber/20";
    else                      riskClass = "bg-icm-green/10 text-icm-green border-icm-green/20";
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !individualId) return;

    // Validate type + size (max 5 MB)
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }

    setUploading(true);

    // Show instant preview
    const preview = URL.createObjectURL(file);
    setLocalUrl(preview);
    setErrored(false);

    try {
      const storagePath = `individual_photos/${individualId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

      await new Promise<void>((resolve, reject) => {
        task.on("state_changed", null, reject, resolve);
      });

      const downloadUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      await updateIndividual(individualId, { photo_url: downloadUrl } as any);

      // Replace local blob URL with the real one
      URL.revokeObjectURL(preview);
      setLocalUrl(downloadUrl);
      onPhotoUpdated?.(downloadUrl);
    } catch (err) {
      console.error("[PersonAvatar] Upload failed:", err);
      URL.revokeObjectURL(preview);
      setLocalUrl(null);
      alert("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius,
    position: "relative",
    flexShrink: 0,
    cursor: editable ? "pointer" : "default",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const overlayVisible = editable && (hovered || uploading);

  return (
    <div
      style={baseStyle}
      className={className}
      onMouseEnter={() => editable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => editable && !uploading && fileInputRef.current?.click()}
      title={editable ? "Click to upload photo" : undefined}
    >
      {/* Photo or initials */}
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={`${firstName} ${lastName}`}
          style={{ width: size, height: size, borderRadius, objectFit: "cover" }}
          onError={() => setErrored(true)}
          className="border border-icm-border"
        />
      ) : (
        <div
          style={{ width: size, height: size, borderRadius, fontSize: size * 0.3 }}
          className={`border flex items-center justify-center font-mono font-bold ${riskClass}`}
        >
          {initialsStr}
        </div>
      )}

      {/* Camera overlay on hover */}
      {editable && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius,
            background: "rgba(0,0,0,0.52)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            opacity: overlayVisible ? 1 : 0,
            transition: "opacity 0.18s ease",
            pointerEvents: overlayVisible ? "auto" : "none",
          }}
        >
          {uploading ? (
            <Loader2
              style={{ width: size * 0.32, height: size * 0.32, color: "#fff", animation: "spin 1s linear infinite" }}
            />
          ) : (
            <>
              <Camera style={{ width: size * 0.3, height: size * 0.3, color: "#fff" }} />
              {size >= 56 && (
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 600, letterSpacing: "0.02em" }}>
                  Upload
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
