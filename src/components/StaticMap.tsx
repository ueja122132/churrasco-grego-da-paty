import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { cn } from '../lib/utils';

// Leaflet Icon Fix (same as LocationPicker)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface StaticMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

export const StaticMap: React.FC<StaticMapProps> = ({ lat, lng, zoom = 16, className }) => {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <MapContainer 
        center={[lat, lng]} 
        zoom={zoom} 
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        scrollWheelZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} />
      </MapContainer>
      
      {/* Overlay for clicking in some situations if needed, or to block any interactions totally */}
      <div className="absolute inset-0 z-[400] bg-transparent" />
    </div>
  );
};
