import React, { useEffect, useRef, useState } from 'react';
import { DiseaseHotspot } from '../types';
import { Shield, Filter, MapPin, AlertCircle } from 'lucide-react';
import L from 'leaflet';

interface DiseaseMapProps {
  hotspots: DiseaseHotspot[];
  onSelectCluster?: (cluster: DiseaseHotspot) => void;
}

export const DiseaseMap: React.FC<DiseaseMapProps> = ({ hotspots, onSelectCluster }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');

  const filteredHotspots = hotspots.filter((h) => {
    if (selectedCrop !== 'all' && h.crop.toLowerCase() !== selectedCrop.toLowerCase()) return false;
    if (selectedSeverity !== 'all' && h.severity.toLowerCase() !== selectedSeverity.toLowerCase()) return false;
    return true;
  });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet map centered around Mandya / Ramanagara, Karnataka
      const map = L.map(mapContainerRef.current, {
        center: [12.58, 77.05],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      // CartoDB Positron / OSM tiles for clean map rendering
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if container is unmounted
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when filteredHotspots change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredHotspots.forEach((h) => {
      const color =
        h.severity === 'Severe'
          ? '#EF4444' // red
          : h.severity === 'Moderate'
          ? '#F59E0B' // amber
          : '#10B981'; // green

      // Circle marker for aggregated privacy-safe centroid
      const circleMarker = L.circleMarker([h.latitude, h.longitude], {
        radius: 12 + Math.min(10, h.active_cases * 1.2),
        fillColor: color,
        color: '#FFFFFF',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.75,
      });

      const popupContent = `
        <div style="font-family: Inter, sans-serif; font-size: 12px; min-width: 180px;">
          <div style="font-weight: 800; color: #0F172A; font-size: 13px; margin-bottom: 2px;">
            ${h.village}
          </div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 6px;">
            ${h.block} Block, ${h.district}
          </div>
          <div style="background: #F1F5F9; padding: 4px 6px; border-radius: 6px; margin-bottom: 6px;">
            <div style="font-weight: 600; color: #0F382A;">${h.crop}: ${h.disease}</div>
            <div style="color: #475569; font-size: 11px;">Severity: <strong>${h.severity}</strong></div>
          </div>
          <div style="font-size: 11px; color: #334155;">
            Active Cases: <strong>${h.active_cases}</strong> (${h.affected_area_acres} acres)
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupContent);
      circleMarker.on('click', () => {
        if (onSelectCluster) onSelectCluster(h);
      });

      markersLayerRef.current?.addLayer(circleMarker);
    });
  }, [filteredHotspots, onSelectCluster]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header with Privacy Indicator and Filters */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">Regional Disease Hotspot Map</h3>
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              <Shield className="w-3 h-3 text-emerald-600" />
              Privacy-Preserved Centroids
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Individual farm coordinates masked. Aggregated to Village and Block boundaries.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Crops</option>
            <option value="tomato">Tomato</option>
            <option value="chilli">Chilli</option>
            <option value="paddy">Paddy / Rice</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="severe">Severe</option>
            <option value="moderate">Moderate</option>
            <option value="mild">Mild</option>
          </select>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} className="h-80 w-full z-0" />

      {/* Map Legend */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            Severe Outbreak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
            Moderate Outbreak
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            Mild / Monitored
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Showing {filteredHotspots.length} active village clusters
        </span>
      </div>
    </div>
  );
};
