/**
 * OrgPrintHeader — letterhead-style header for printed/PDF documents.
 *
 * Displays the organization logo (or name fallback), address, phone, fax,
 * and an optional individual headshot. Intended to appear at the top of any
 * printable page so every document carries proper agency branding.
 *
 * Usage:
 *   <OrgPrintHeader
 *     orgId={userProfile.organizationId}
 *     individualName="Joseph Brown"
 *     individualPhotoUrl={individual.photo_url}
 *     documentTitle="Care Plan / ISP"
 *   />
 */

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrgPrintHeaderProps {
  orgId: string;
  individualName?: string;
  individualPhotoUrl?: string;
  documentTitle?: string;
}

interface OrgData {
  name: string;
  logoUrl: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  fax: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OrgPrintHeader({
  orgId,
  individualName,
  individualPhotoUrl,
  documentTitle,
}: OrgPrintHeaderProps) {
  const [org, setOrg] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getDoc(doc(db, "organizations", orgId))
      .then((snap) => {
        if (cancelled) return;

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const d = snap.data();
        const addr = d.address ?? {};

        setOrg({
          name: d.name ?? "Organization",
          logoUrl: d.logoUrl ?? null,
          street: addr.street ?? d.street ?? null,
          city: addr.city ?? d.city ?? null,
          state: addr.state ?? d.state ?? null,
          zip: addr.zip ?? d.zip ?? null,
          phone: d.phone ?? null,
          fax: d.fax ?? null,
        });
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // ── Skeleton while loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="org-print-header mb-4 pb-3 border-b border-gray-300 flex items-center gap-4 animate-pulse">
        <div className="w-24 h-12 bg-gray-200 rounded" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="h-3 bg-gray-100 rounded w-64" />
          <div className="h-3 bg-gray-100 rounded w-40" />
        </div>
      </div>
    );
  }

  // ── Build address & contact strings ────────────────────────────────────────
  const addressLine = org
    ? [
        org.street,
        [org.city, org.state].filter(Boolean).join(", "),
        org.zip,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  const contactParts: string[] = [];
  if (org?.phone) contactParts.push(`Ph: ${org.phone}`);
  if (org?.fax) contactParts.push(`Fax: ${org.fax}`);
  const contactLine = contactParts.join(" | ") || null;

  const orgName = org?.name ?? "Organization";
  const logoUrl = org?.logoUrl ?? null;

  return (
    <div className="org-print-header mb-4 pb-3 border-b border-gray-300">
      {/* Top row: logo | org info | optional headshot */}
      <div className="flex items-start gap-4">
        {/* Logo or org-name monogram */}
        <div className="shrink-0 flex items-center" style={{ minWidth: 80 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`${orgName} logo`}
              className="max-h-12 max-w-[120px] object-contain"
              style={{ maxHeight: 48 }}
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-[18px]"
              style={{ width: 48, height: 48 }}
              aria-label={orgName}
            >
              {orgName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Org name + address + contact */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] leading-snug text-gray-900">
            {orgName}
          </p>
          {documentTitle && (
            <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold mt-0.5">
              {documentTitle}
            </p>
          )}
          {addressLine && (
            <p className="text-[11.5px] text-gray-600 mt-0.5">{addressLine}</p>
          )}
          {contactLine && (
            <p className="text-[11.5px] text-gray-600">{contactLine}</p>
          )}
        </div>

        {/* Individual headshot (optional) */}
        {individualPhotoUrl && (
          <div className="shrink-0 flex flex-col items-center gap-1">
            <img
              src={individualPhotoUrl}
              alt={individualName ?? "Individual photo"}
              className="rounded-full object-cover border-2 border-gray-200"
              style={{ width: 40, height: 40 }}
            />
            {individualName && (
              <p className="text-[9.5px] text-gray-500 text-center max-w-[56px] leading-tight">
                {individualName}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Print-specific styles injected inline so they work without a global CSS file */}
      <style>{`
        @media print {
          .org-print-header {
            display: flex !important;
            flex-direction: column;
          }
        }
        @media screen {
          .org-print-header {
            /* Visible on screen (print previews) */
          }
        }
      `}</style>
    </div>
  );
}
