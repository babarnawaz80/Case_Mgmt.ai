import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import employeePhoto from "@/assets/employee-kathy.jpg";

interface AuthorCellProps {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

export function AuthorCell({ name = "System", className = "", size = "sm", showName = true }: AuthorCellProps) {
  const { userProfile, currentUser } = useAuth();

  const cleanName = name.trim();
  const lowerName = cleanName.toLowerCase();
  
  const isKathy = lowerName.includes("kathy") || lowerName.includes("martinez") || lowerName.includes("adams");
  const isCurrentUser = userProfile?.displayName && lowerName.includes(userProfile.displayName.toLowerCase());
  const isBabar = lowerName.includes("babar") || lowerName.includes("nawaz");
  
  let photoUrl = null;
  if (isKathy || isCurrentUser || isBabar) {
    photoUrl = userProfile?.photoURL || currentUser?.photoURL || employeePhoto;
  }

  const sizeClasses = {
    sm: "w-5 h-5 text-[9px]",
    md: "w-7 h-7 text-[11px]",
    lg: "w-10 h-10 text-[13px]"
  };

  const getHashColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
      bg: `hsla(${hue}, 65%, 92%, 1)`,
      border: `hsla(${hue}, 65%, 82%, 1)`,
      text: `hsla(${hue}, 70%, 35%, 1)`
    };
  };

  const colors = getHashColor(cleanName);
  const initials = cleanName
    .split(" ")
    .filter(Boolean)
    .map(n => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full overflow-hidden shrink-0 flex items-center justify-center border font-geist font-bold transition-all`}
        style={photoUrl ? { borderColor: "rgba(99, 102, 241, 0.15)" } : { 
          backgroundColor: colors.bg, 
          borderColor: colors.border, 
          color: colors.text 
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={cleanName} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      {showName && (
        <span className="font-medium text-icm-text truncate max-w-[150px]" title={cleanName}>
          {cleanName}
        </span>
      )}
    </div>
  );
}
