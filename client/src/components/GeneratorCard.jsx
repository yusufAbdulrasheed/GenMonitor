import React from "react";
import { Fuel, Battery, Thermometer, Clock } from "lucide-react";

const STATUS = {
  Running: { label: "running", color: "#3c7853" },
  Standby: { label: "standby", color: "#386690" },
  Fault: { label: "fault", color: "#a2382f" },
  UnderMaintenance: { label: "maintenance", color: "#96691a" },
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2">
    <Icon size={14} strokeWidth={1.75} className="text-slate-500" />
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 leading-none">{label}</p>
      <p className="text-[13px] font-medium tabular-nums text-slate-200 mt-0.5">{value}</p>
    </div>
  </div>
);

const GeneratorCard = ({ generator: g }) => {
  const s = STATUS[g.status] || { label: g.status, color: "#8c8578" };

  return (
    <div className="flex bg-slate-900 border border-slate-800 rounded overflow-hidden">
      <span className="w-1 flex-shrink-0" style={{ background: s.color }} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <p className="font-mono text-[13px] font-semibold text-slate-100 truncate">{g.generatorId}</p>
            <p className="text-[12px] text-slate-500 truncate">
              {g.siteId?.name || g.siteCode || "Unassigned"}
            </p>
          </div>
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm flex-shrink-0"
            style={{ background: `${s.color}1a`, color: s.color }}
          >
            {s.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Metric icon={Fuel} label="Fuel" value={`${g.fuelLevel?.toFixed(0) ?? "–"}%`} />
          <Metric icon={Battery} label="Battery" value={`${g.batteryVoltage?.toFixed(1) ?? "–"} V`} />
          <Metric icon={Thermometer} label="Temp" value={`${g.temperature?.toFixed(0) ?? "–"} °C`} />
          <Metric icon={Clock} label="Runtime" value={`${g.runtimeHours?.toFixed(0) ?? 0} h`} />
        </div>
      </div>
    </div>
  );
};

export default GeneratorCard;
