import React from "react";
import { ShieldCheck } from "lucide-react";

export function SecurityBadge({ label = "Tenant-scoped" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
      <ShieldCheck aria-hidden size={16} />
      <span>{label}</span>
    </div>
  );
}
