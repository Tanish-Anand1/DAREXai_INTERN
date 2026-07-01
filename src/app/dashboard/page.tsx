"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  Activity,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Users,
  ChevronRight,
  Plus,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";

type Opportunity = {
  id: string;
  title: string;
  stage: string;
  value: number;
  createdAt: string;
  contact?: {
    name: string;
    email: string;
    phone?: string;
  };
};

type DashboardData = {
  activeOpportunities: number;
  pipelineValue: number;
  pendingFollowups: number;
  customerActivity: number;
  recentActivity: Array<{ id: string; action: string; resourceId: string | null; createdAt: string }>;
  aiAlerts: Array<{ id: string; title: string; stage: string }>;
  opportunities?: Opportunity[];
};

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  // If opportunities are not returned, fetch them from crm opportunities endpoint
  if (!data.opportunities) {
    const oppRes = await fetch("/api/crm/opportunities");
    if (oppRes.ok) {
      const jsonRes = await oppRes.json();
      data.opportunities = jsonRes.opportunities || [];
    }
  }
  return data;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    enabled: Boolean(session?.user?.tenantId),
    refetchInterval: 30000,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);

  // Group opportunities by BizLink stages
  const getOpportunitiesByStage = (stageName: string): Opportunity[] => {
    const list = dashboard.data?.opportunities ?? [];
    return list.filter((opp) => {
      const matchSearch = opp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (opp.contact?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchSearch) return false;

      if (stageName === "contacted") {
        return opp.stage === "new" || opp.stage === "qualified";
      }
      if (stageName === "negotiation") {
        return opp.stage === "negotiation";
      }
      if (stageName === "offerSent") {
        return opp.stage === "proposal";
      }
      if (stageName === "dealClosed") {
        return opp.stage === "won";
      }
      return false;
    });
  };

  const pipelineVal = dashboard.data?.pipelineValue ?? 0;
  const activeCount = dashboard.data?.activeOpportunities ?? 0;

  // Render SVG Columns for "New Customers" Weekly Chart
  const barChartData = [
    { day: "Mon", value: 4 },
    { day: "Tue", value: 8 },
    { day: "Wed", value: 6 },
    { day: "Thu", value: 9 },
    { day: "Fri", value: 5 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Header Row (Matches Dribbble top navigation) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-default">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-secondary" />
          <input
            type="text"
            placeholder="Search customer, deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="field w-full pl-10 pr-4 py-2 bg-secondary border border-default rounded-xl"
            style={{ borderRadius: "10px" }}
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-medium">
            <SlidersHorizontal size={14} /> Sort by
          </button>
          <button className="btn btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 font-medium">
            <Filter size={14} /> Filters
          </button>
        </div>
      </div>

      {dashboard.isLoading ? (
        <div className="space-y-6">
          <div className="skeleton h-[180px] w-full" />
          <div className="grid grid-cols-4 gap-4">
            <div className="skeleton h-[300px]" />
            <div className="skeleton h-[300px]" />
            <div className="skeleton h-[300px]" />
            <div className="skeleton h-[300px]" />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Top Info section (Exact recreation of Dribbble top header layout) */}
          <div className="grid gap-6 lg:grid-cols-12">
            
            {/* Left section: Weekly chart */}
            <div className="lg:col-span-5 card flex flex-col justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">New customers</span>
                <div className="flex items-end justify-between h-24 mt-4 px-2">
                  {barChartData.map((bar) => {
                    const pct = (bar.value / 10) * 100;
                    return (
                      <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                        <div className="w-6 bg-primary rounded-t-sm" style={{ height: `${pct}%`, background: "var(--text-primary)" }} />
                        <span className="text-[10px] text-secondary font-mono">{bar.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Middle section: Speedometer success rate */}
            <div className="lg:col-span-3 card flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Simulated circular progress */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="var(--border-default)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="44"
                    stroke="var(--text-primary)"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - 0.68)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold font-mono">68%</span>
                  <span className="text-[9px] text-secondary font-mono">Success rate</span>
                </div>
              </div>
              <p className="text-[10px] text-secondary font-mono mt-3">68% Successful deals</p>
            </div>

            {/* Right sections: Metrics count */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-4">
              <div className="card flex flex-col justify-between p-5">
                <span className="text-2xl font-bold font-mono">{activeCount}</span>
                <span className="text-[11px] text-secondary font-medium">Tasks in progress</span>
              </div>
              
              <div className="card flex flex-col justify-between p-5">
                <span className="text-2xl font-bold font-mono">${pipelineVal.toLocaleString()}</span>
                <span className="text-[11px] text-secondary font-medium">Prepayments value</span>
              </div>
            </div>

          </div>

          {/* CRM Kanban board (Exact reconstruction of Dribbble Columns layout) */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
              <Layers size={14} className="text-primary" />
              Pipeline Opportunities board
            </h2>

            {/* Mobile Horizontal Scroll container */}
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6">
              <div className="flex gap-6 min-w-[1000px] lg:min-w-0 lg:grid lg:grid-cols-4">
                
                {/* Column 1: Contacted */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-default">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Contacted</span>
                    <span className="text-[10px] bg-secondary border border-default px-2 py-0.5 rounded text-secondary font-mono">
                      {getOpportunitiesByStage("contacted").length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[400px]">
                    {getOpportunitiesByStage("contacted").map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        isActive={activeCardId === opp.id}
                        onClick={() => setActiveCardId(opp.id)}
                      />
                    ))}
                    {getOpportunitiesByStage("contacted").length === 0 && <EmptyColumn />}
                  </div>
                </div>

                {/* Column 2: Negotiation */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-default">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Negotiation</span>
                    <span className="text-[10px] bg-secondary border border-default px-2 py-0.5 rounded text-secondary font-mono">
                      {getOpportunitiesByStage("negotiation").length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[400px]">
                    {getOpportunitiesByStage("negotiation").map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        isActive={activeCardId === opp.id}
                        onClick={() => setActiveCardId(opp.id)}
                      />
                    ))}
                    {getOpportunitiesByStage("negotiation").length === 0 && <EmptyColumn />}
                  </div>
                </div>

                {/* Column 3: Offer Sent */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-default">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Offer Sent</span>
                    <span className="text-[10px] bg-secondary border border-default px-2 py-0.5 rounded text-secondary font-mono">
                      {getOpportunitiesByStage("offerSent").length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[400px]">
                    {getOpportunitiesByStage("offerSent").map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        isActive={activeCardId === opp.id}
                        onClick={() => setActiveCardId(opp.id)}
                      />
                    ))}
                    {getOpportunitiesByStage("offerSent").length === 0 && <EmptyColumn />}
                  </div>
                </div>

                {/* Column 4: Deal Closed */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-default">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Deal Closed</span>
                    <span className="text-[10px] bg-secondary border border-default px-2 py-0.5 rounded text-secondary font-mono">
                      {getOpportunitiesByStage("dealClosed").length}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[400px]">
                    {getOpportunitiesByStage("dealClosed").map((opp) => (
                      <OpportunityCard
                        key={opp.id}
                        opp={opp}
                        isActive={activeCardId === opp.id}
                        onClick={() => setActiveCardId(opp.id)}
                      />
                    ))}
                    {getOpportunitiesByStage("dealClosed").length === 0 && <EmptyColumn />}
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// Opportunity card widget (Matches Ronas IT card layout with metadata rows)
function OpportunityCard({ 
  opp, 
  isActive, 
  onClick 
}: { 
  opp: Opportunity; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const formattedDate = new Date(opp.createdAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short"
  });

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 select-none ${
        isActive ? "card-dark-highlight scale-[1.02]" : "card hover:scale-[1.01]"
      }`}
      style={{ padding: "16px", borderRadius: "12px" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-bold truncate flex-1">{opp.title}</h3>
        <span className="text-[10px] font-semibold font-mono whitespace-nowrap">
          ${opp.value.toLocaleString()}
        </span>
      </div>
      
      <p className={`text-[10px] mt-2 line-clamp-2 ${isActive ? "text-white/70" : "text-secondary"}`}>
        {opp.contact?.name ? `Lead Account: ${opp.contact.name}` : "General pipeline opportunities lead account"}
      </p>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-default/10">
        <span className={`text-[9px] font-mono flex items-center gap-1 ${isActive ? "text-white/60" : "text-tertiary"}`}>
          <Calendar size={11} /> {formattedDate}
        </span>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
          isActive 
            ? "bg-white/10 text-white" 
            : "bg-tertiary text-primary border border-default"
        }`}>
          {opp.stage.toLowerCase()}
        </span>
      </div>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex-1 border border-dashed border-default rounded-xl flex items-center justify-center p-6 text-center">
      <span className="text-[10px] font-mono text-tertiary">No deals in stage</span>
    </div>
  );
}
