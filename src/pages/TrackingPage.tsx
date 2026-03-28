import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from "motion/react";
import { Navigation } from "lucide-react";
import { socket } from "../supabase";
import { cn, getTimeAgo } from "../lib/utils";
import { Order } from "../types";

export const TrackingPage = () => {
  const { courierId } = useParams<{ courierId: string }>();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [courierInfo, setCourierInfo] = useState<{ courierName?: string; latitude?: number; longitude?: number } | null>(null);
  const [status, setStatus] = useState<'waiting' | 'active' | 'stopped'>('waiting');

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Init map after CSS loads
    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Fix default icon path issue with bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([-23.5505, -46.6333], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);
      leafletMapRef.current = map;

      const courierIcon = L.divIcon({
        html: `<div style="background:#ea580c;width:40px;height:40px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px;">🛵</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: ''
      });

      const marker = L.marker([-23.5505, -46.6333], { icon: courierIcon }).addTo(map);
      marker.bindPopup('📍 Entregador');
      markerRef.current = marker;
    };

    initMap();

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!courierId) return;

    // Join tracking room
    socket.emit('track:join', { courierId });

    socket.on('courier:location:update', (data) => {
      setCourierInfo(data);
      setStatus('active');
      if (leafletMapRef.current && markerRef.current) {
        const latlng = [data.latitude, data.longitude] as [number, number];
        markerRef.current.setLatLng(latlng);
        markerRef.current.setPopupContent(`📍 ${data.courierName || 'Entregador'}`);
        leafletMapRef.current.setView(latlng, 16);
      }
    });

    socket.on('courier:location:stopped', () => {
      setStatus('stopped');
    });

    return () => {
      socket.emit('track:leave', { courierId });
      socket.off('courier:location:update');
      socket.off('courier:location:stopped');
    };
  }, [courierId]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
            <Navigation size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Rastreamento ao Vivo</p>
            <p className="text-slate-400 text-xs">{courierInfo?.courierName || 'Aguardando entregador...'}</p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold",
          status === 'active' ? 'bg-green-500/20 text-green-400' :
            status === 'stopped' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
        )}>
          <div className={cn("w-2 h-2 rounded-full", status === 'active' ? 'bg-green-400 animate-pulse' : status === 'stopped' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse')} />
          {status === 'active' ? 'Ao Vivo' : status === 'stopped' ? 'Encerrado' : 'Aguardando'}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full min-h-[calc(100vh-80px)]" />

        {status === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-6xl mb-4">🛵</div>
              <p className="text-white font-black text-xl">Aguardando o entregador...</p>
              <p className="text-slate-400 mt-2 text-sm">A localização aparecerá assim que o entregador ativar o GPS</p>
              <div className="mt-4 w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        )}
        {status === 'stopped' && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-900/80 text-white p-4 rounded-2xl text-center font-bold">
            O entregador parou de compartilhar a localização.
          </div>
        )}
      </div>
    </div>
  );
};
