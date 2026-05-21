import { useState } from "react";
import { initials, riskAvatarClass, type Person } from "@/data/people";

interface PersonAvatarProps {
  person: Person;
  size?: number; // px
  shape?: "rounded" | "circle" | "square";
  className?: string;
}

/**
 * Avatar that renders the person's photo when available, otherwise falls back
 * to a risk-tinted initials tile. Keeps existing visual language intact.
 */
export function PersonAvatar({
  person,
  size = 48,
  shape = "rounded",
  className = "",
}: PersonAvatarProps) {
  const [errored, setErrored] = useState(false);
  const radius =
    shape === "circle" ? "rounded-full" : shape === "square" ? "rounded-lg" : "rounded-xl";
  const style = { width: size, height: size };
  const showPhoto = person.photoUrl && !errored;

  if (showPhoto) {
    return (
      <img
        src={person.photoUrl}
        alt={`${person.firstName} ${person.lastName}`}
        style={style}
        onError={() => setErrored(true)}
        className={`${radius} object-cover border border-icm-border shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={style}
      className={`${radius} border flex items-center justify-center shrink-0 font-mono font-bold ${riskAvatarClass(
        person.riskScore,
      )} ${className}`}
    >
      {initials(person)}
    </div>
  );
}
