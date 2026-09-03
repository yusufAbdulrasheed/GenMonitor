import React from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import GeneratorCard from "./GeneratorCard";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { num } from "../lib/format";

const DashboardOverview = () => {
  const { user } = useAuth();
  const { data: generators, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["generators"],
    queryFn: async () => (await api.get("/generators/realtime")).data,
    refetchInterval: 10000,
  });
  const { data: summary } = useQuery({
    queryKey: ["analyticsSummary", "7d"],
    queryFn: async () => (await api.get("/analytics/summary?range=7d")).data,
    refetchInterval: 30000,
  });

  const handleSeed = async () => {
    try {
      await api.post("/seed");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to seed database");
    }
  };

  if (isLoading) {
    return <div className="p-6 font-mono text-xs text-slate-500">loading fleet…</div>;
  }
  if (isError) {
    return (
      <div className="p-6">
        <h2 className="text-base font-semibold text-rose-500">Couldn’t load fleet data</h2>
        <p className="text-sm text-slate-400 mt-1">{error.message || "Server issue."}</p>
      </div>
    );
  }

  const total = generators?.length || 0;
  const by = (s) => generators?.filter((g) => g.status === s).length || 0;

  const stats = [
    { label: "Units", value: total, to: "/generators" },
    { label: "Running", value: by("Running"), tone: "#3c7853", to: "/generators" },
    { label: "Standby", value: by("Standby") + by("UnderMaintenance"), tone: "#386690", to: "/generators" },
    { label: "Faults", value: by("Fault"), tone: by("Fault") ? "#a2382f" : undefined, to: "/alerts" },
    { label: "Availability", value: summary ? `${num(summary.availabilityPct)}%` : "—", to: "/analytics" },
    { label: "MTBF", value: summary?.reliability?.mtbfHours != null ? `${num(summary.reliability.mtbfHours, 0)}h` : "—", to: "/analytics" },
    { label: "Open alerts", value: summary?.alertsOpen?.total ?? "—", tone: summary?.alertsOpen?.critical ? "#a2382f" : undefined, to: "/alerts" },
    { label: "Overdue WOs", value: summary?.workOrders?.overdue ?? "—", tone: summary?.workOrders?.overdue ? "#96691a" : undefined, to: "/work-orders" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-baseline justify-between gap-3 mb-5">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">Fleet overview</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            {total} unit{total === 1 ? "" : "s"} monitored
          </p>
        </div>
        <span className="font-mono text-[11px] text-slate-500 shrink-0">
          {isFetching ? "refreshing…" : "auto-refresh 10s"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border border-slate-800 rounded bg-slate-900 divide-x divide-slate-800 mb-8 overflow-hidden">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="px-4 py-3 hover:bg-slate-800/50 transition-colors">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 mb-1">{s.label}</p>
            <p className="text-[22px] font-semibold tabular-nums leading-none" style={{ color: s.tone || "#1e1c17" }}>
              {s.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Telemetry
        </h2>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {total === 0 ? (
        <div className="border border-dashed border-slate-700 rounded p-10 text-center">
          <p className="text-sm text-slate-300 font-medium">No generators yet</p>
          <p className="text-[13px] text-slate-500 mt-1 mb-5">
            {user?.role === "Admin"
              ? "Load the demo dataset to get started."
              : "Ask an administrator to load demo data."}
          </p>
          {user?.role === "Admin" && (
            <button
              onClick={handleSeed}
              className="px-4 py-2 rounded text-sm font-medium text-white transition-colors"
              style={{ background: "#1e1c17" }}
            >
              Seed database
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {generators.map((gen) => (
            <GeneratorCard key={gen._id || gen.id} generator={gen} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
