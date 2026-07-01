"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  TrendingUp,
  DollarSign,
  Clock,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Search,
  CheckCircle2,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";

type DashboardData = {
  activeOpportunities: number;
  pipelineValue: number;
  pendingFollowups: number;
  customerActivity: number;
  recentActivity: Array<{ id: string; action: string; target: string; createdAt: string }>;
  aiAlerts: Array<{ id: string; title: string; stage: string }>;
};

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    enabled: Boolean(session?.user?.tenantId),
    refetchInterval: 30000,
  });

  const activeCount = dashboard.data?.activeOpportunities ?? 0;
  const pipelineVal = dashboard.data?.pipelineValue ?? 0;
  const activityCount = dashboard.data?.customerActivity ?? 0;
  const alertsCount = dashboard.data?.aiAlerts?.length ?? 0;

  // Mini sparkline SVG generator for dashboard analytics
  const sparklineData = {
    active: "M 0 15 Q 10 5, 20 18 T 40 4 T 60 10 T 80 2",
    pipeline: "M 0 18 Q 15 12, 30 18 T 60 2 T 80 8",
    activity: "M 0 2 Q 10 15, 20 8 T 40 18 T 60 4 T 80 12",
    alerts: "M 0 18 Q 20 18, 40 12 T 80 18",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Header with search bar and User profile (Dribbble CRM style) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary">Overview</h1>
          <p className="text-xs text-secondary mt-1">Real-time indicators across your multi-tenant workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-tertiary" />
            <input
              type="text"
              placeholder="Search console..."
              className="field w-full pl-9 pr-3 py-1.5 text-xs bg-tertiary"
            />
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded border border-default bg-tertiary text-xs font-semibold text-secondary">
            {(session?.user?.name ?? session?.user?.email ?? "U")[0].toUpperCase()}
          </div>
        </div>
      </div>

      {/* 2. KPI Grid with Sparkline trends */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
        
        {/* Active opportunities */}
        <div className="kpi-card flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <span className="text-xs text-secondary">Active Deals</span>
            <span className="text-[10px] font-semibold text-success font-mono">+12.4%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
              {dashboard.isLoading ? "—" : activeCount}
            </p>
            <svg className="w-16 h-8 opacity-60 text-secondary" stroke="currentColor" strokeWidth="1.5" fill="none">
              <path d={sparklineData.active} />
            </svg>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="kpi-card flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <span className="text-xs text-secondary">Revenue Pipeline</span>
            <span className="text-[10px] font-semibold text-success font-mono">+4.2%</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
              {dashboard.isLoading ? "—" : `$${pipelineVal.toLocaleString()}`}
            </p>
            <svg className="w-16 h-8 opacity-60 text-success" stroke="var(--success)" strokeWidth="1.5" fill="none">
              <path d={sparklineData.pipeline} />
            </svg>
          </div>
        </div>

        {/* Customer Activity */}
        <div className="kpi-card flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <span className="text-xs text-secondary">Customer Activity</span>
            <span className="text-[10px] font-semibold text-success font-mono">Active</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
              {dashboard.isLoading ? "—" : activityCount}
            </p>
            <svg className="w-16 h-8 opacity-60 text-success" stroke="var(--success)" strokeWidth="1.5" fill="none">
              <path d={sparklineData.activity} />
            </svg>
          </div>
        </div>

        {/* AI Alerts */}
        <div className="kpi-card flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <span className="text-xs text-secondary">AI Alerts</span>
            <span className="text-[10px] font-semibold text-danger font-mono">{alertsCount > 0 ? "Stale" : "Healthy"}</span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
              {dashboard.isLoading ? "—" : alertsCount}
            </p>
            <svg className="w-16 h-8 opacity-60 text-danger" stroke="var(--danger)" strokeWidth="1.5" fill="none">
              <path d={sparklineData.alerts} />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Monthly target metrics (Progress bar representation) */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-primary">Monthly Workspace Target Progress</span>
          <span className="text-secondary font-mono">
            {dashboard.isLoading ? "0%" : `${Math.round((pipelineVal / 100000) * 100)}%`} ($100k target)
          </span>
        </div>
        <div className="w-full h-1.5 bg-tertiary rounded overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{
              width: dashboard.isLoading ? "0%" : `${Math.min(100, Math.round((pipelineVal / 100000) * 100))}%`,
              background: "var(--text-primary)",
              transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>
      </div>

      {/* 4. Activity Logs and Stale Alerts sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        
        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
              <Activity size={14} className="text-primary" />
              Audit log activity
            </h2>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {dashboard.isLoading ? (
              <div className="empty-state" style={{ padding: "24px" }}>
                <Loader2 size={16} className="animate-spin text-tertiary" />
              </div>
            ) : dashboard.data?.recentActivity?.length ? (
              dashboard.data.recentActivity.slice(0, 8).map((log, i) => {
                const isWorkflow = log.action.includes("automation") || log.action.includes("workflow");
                const isCRM = log.action.includes("crm") || log.action.includes("contact");
                
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 rounded border border-subtle p-2 hover:bg-tertiary transition-colors"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-default bg-tertiary">
                      {isWorkflow ? (
                        <CheckCircle2 size={11} className="text-success" />
                      ) : isCRM ? (
                        <Users size={11} className="text-info" />
                      ) : (
                        <Activity size={11} className="text-secondary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">
                        {log.action.replace(/\./g, " › ")}
                      </p>
                      <p className="text-[10px] text-tertiary truncate">Target: {log.target}</p>
                    </div>
                    <span className="text-[10px] text-tertiary font-mono">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty-state" style={{ padding: "24px" }}>
                <p>No recent workspace logs</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-secondary flex items-center gap-2">
              <AlertTriangle size={14} className="text-warning" />
              AI warnings & flags
            </h2>
          </div>
          <div className="space-y-2">
            {dashboard.isLoading ? (
              <div className="empty-state" style={{ padding: "24px" }}>
                <Loader2 size={16} className="animate-spin text-tertiary" />
              </div>
            ) : dashboard.data?.aiAlerts?.length ? (
              dashboard.data.aiAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between rounded border border-warning/10 p-3 bg-warning-bg"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">
                      {alert.title}
                    </p>
                    <p className="text-[10px] text-warning mt-0.5 font-mono">
                      Stage: {alert.stage} • 9+ days stale
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-warning flex-shrink-0" />
                </div>
              ))
            ) : (
              <div className="empty-state" style={{ padding: "24px" }}>
                <p className="text-success text-xs">✓ Workspace pipeline is currently active and healthy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
