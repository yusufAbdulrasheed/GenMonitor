import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../utils/api';
import { litresFromPct } from '../lib/format';

const STATUS_COLOR = {
  Fault: '#a2382f',
  UnderMaintenance: '#96691a',
  Running: '#3c7853',
  Standby: '#386690',
  Offline: '#b4ad9c',
};

// worst-first
const RANK = ['Fault', 'UnderMaintenance', 'Standby', 'Running'];

const FleetMap = () => {
  const { data: sites = [] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get('/sites')).data,
  });
  const { data: generators = [] } = useQuery({
    queryKey: ['generators'],
    queryFn: async () => (await api.get('/generators/realtime')).data,
    refetchInterval: 15000,
  });

  const points = useMemo(() => {
    const bySite = generators.reduce((acc, g) => {
      const key = String(g.siteId?._id || g.siteId || '');
      (acc[key] = acc[key] || []).push(g);
      return acc;
    }, {});

    return sites
      .filter((s) => s.coordinates?.lat != null && s.coordinates?.lng != null)
      .map((s) => {
        const gens = bySite[String(s._id)] || [];
        const worst =
          gens.map((g) => g.status).sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b))[0] || 'Offline';
        return {
          id: s._id,
          name: s.name,
          siteCode: s.siteCode,
          lat: s.coordinates.lat,
          lng: s.coordinates.lng,
          gens,
          worst,
        };
      });
  }, [sites, generators]);

  const center = points.length
    ? [points.reduce((a, p) => a + p.lat, 0) / points.length, points.reduce((a, p) => a + p.lng, 0) / points.length]
    : [20, 0];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="p-4 sm:p-6 pb-3 sm:pb-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100">Fleet Map</h1>
        <p className="text-slate-400 text-sm">Live site status — worst generator condition per site.</p>
      </div>
      <div className="flex-1 mx-4 sm:mx-6 mb-4 sm:mb-6 rounded-xl overflow-hidden border border-slate-800">
        {points.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            No sites with coordinates yet.
          </div>
        ) : (
          <MapContainer center={center} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={11}
                pathOptions={{
                  color: STATUS_COLOR[p.worst] || '#64748b',
                  fillColor: STATUS_COLOR[p.worst] || '#64748b',
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Tooltip direction="top">{p.name} — {p.worst}</Tooltip>
                <Popup>
                  <div className="text-sm">
                    <strong>{p.name}</strong> <span className="text-slate-500">({p.siteCode})</span>
                    <ul className="mt-1">
                      {p.gens.map((g) => {
                        const litres = litresFromPct(g.fuelLevel, g.fuelTankSize);
                        return (
                          <li key={g._id}>
                            {g.generatorId}: {g.status} ·{' '}
                            {litres != null ? `${litres.toLocaleString()} L fuel` : 'n/a'}
                          </li>
                        );
                      })}
                      {p.gens.length === 0 && <li>No generators</li>}
                    </ul>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
};

export default FleetMap;
