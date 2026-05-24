import { useState } from "react";

interface PersonAvatarProps {
  person: any; // Support both Person (static) and Individual (Firestore)
  size?: number; // px
  shape?: "rounded" | "circle" | "square";
  className?: string;
}

/**
 * Avatar that renders the person's photo when available, otherwise falls back
 * to a risk-tinted initials tile. Robust against both camelCase and snake_case schemas.
 */
export function PersonAvatar({
  person,
  size = 48,
  shape = "rounded",
  className = "",
}: PersonAvatarProps) {
  const [errored, setErrored] = useState(false);
  const radius = "rounded-lg"; // Enforce slightly-rounded squares

  const style = { width: size, height: size };
  
  // Handle both Person (camelCase) and Individual (snake_case) schemas
  const firstName = person?.firstName ?? person?.first_name ?? "";
  const lastName = person?.lastName ?? person?.last_name ?? "";
  const riskScore = person?.riskScore ?? person?.risk_score;
  const photoUrl = person?.photoUrl;
  
  const showPhoto = photoUrl && !errored;

  if (showPhoto) {
    return (
      <img
        src={photoUrl}
        alt={`${firstName} ${lastName}`}
        style={style}
        onError={() => setErrored(true)}
        className={`${radius} object-cover border border-icm-border shrink-0 ${className}`}
      />
    );
  }

  // Schema-agnostic initials resolver
  const firstInitial = firstName ? firstName[0] : "";
  const lastInitial = lastName ? lastName[0] : "";
  const initialsStr = `${firstInitial}${lastInitial}`.toUpperCase();

  // Schema-agnostic risk-tinted avatar classes
  let riskClass = "bg-icm-bg text-icm-text-dim border-icm-border";
  if (riskScore !== undefined && riskScore !== null) {
    if (riskScore >= 60) {
      riskClass = "bg-icm-red/10 text-icm-red border-icm-red/20";
    } else if (riskScore >= 35) {
      riskClass = "bg-icm-amber/10 text-icm-amber border-icm-amber/20";
    } else {
      riskClass = "bg-icm-green/10 text-icm-green border-icm-green/20";
    }
  }

  return (
    <div
      style={style}
      className={`${radius} border flex items-center justify-center shrink-0 font-mono font-bold ${riskClass} ${className}`}
    >
      {initialsStr || "?"}
    </div>
  );
}

