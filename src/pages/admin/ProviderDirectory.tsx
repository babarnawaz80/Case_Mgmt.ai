import { ICMShell } from "@/components/icm/ICMShell";
import { useRole } from "@/contexts/RoleContext";
import { AdminOnly } from "@/components/platform/AdminOnly";
import { providers as mockProviders } from "@/data/referrals";
import { MapPin, Phone, Globe } from "lucide-react";

const ProviderDirectory = () => {
  const { isAdmin } = useRole();
  if (!isAdmin) return <AdminOnly />;

  return (
    <ICMShell title="Provider Directory" showAIPanel={false}>
      <div className="space-y-5 max-w-[1100px]">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
              Provider Directory
            </h1>
            <p className="text-[13px] text-icm-text-dim mt-1 font-geist">
              Community providers available for referral matching
            </p>
          </div>
          <button className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity">
            + Add provider
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mockProviders.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-icm-border bg-icm-panel p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-manrope font-bold text-[14px] text-icm-text">
                    {p.name}
                  </p>
                  <p className="text-[11.5px] text-icm-text-dim font-geist mt-0.5">
                    {p.type}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {p.acceptsMedicaid && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20">
                      Medicaid
                    </span>
                  )}
                  {p.acceptingNewClients && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20">
                      Accepting
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 space-y-1 text-[11.5px] font-geist text-icm-text-dim">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {p.address}, {p.city} {p.state}
                </p>
                {p.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {p.phone}
                  </p>
                )}
                {p.website && (
                  <p className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    {p.website}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ICMShell>
  );
};

export default ProviderDirectory;
