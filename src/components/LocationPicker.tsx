import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation, Check, X } from 'lucide-react';

// Fix for default marker icons in Leaflet with Webpack/Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  onLocationSelected: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
  initialLocation?: { lat: number; lng: number };
}

export const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelected, onClose, initialLocation }) => {
  const [position, setPosition] = useState<L.LatLng | null>(
    initialLocation ? new L.LatLng(initialLocation.lat, initialLocation.lng) : null
  );
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  // Reverse geocoding helper
  const fetchAddress = async (lat: number, lng: number) => {
    try {
      // Usamos addressdetails=1 para pegar os campos separados
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
      const data = await response.json();
      
      if (data.address) {
        const { road, house_number, suburb, city, town, village, state } = data.address;
        const street = road ? (house_number ? `${road}, ${house_number}` : road) : '';
        const neighborhood = suburb || '';
        const location = city || town || village || '';
        const initialStates: Record<string, string> = {
            'Bahia': 'BA', 'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Minas Gerais': 'MG',
            'Espírito Santo': 'ES', 'Paraná': 'PR', 'Santa Catarina': 'SC', 'Rio Grande do Sul': 'RS',
            'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Goiás': 'GO', 'Distrito Federal': 'DF'
        };
        const uf = initialStates[state] || state || '';
        
        const parts = [street, neighborhood, location, uf].filter(Boolean);
        setAddress(parts.join(' - '));
      } else {
        setAddress(data.display_name || '');
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  useEffect(() => {
    if (position) {
      fetchAddress(position.lat, position.lng);
    }
  }, [position]);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });

    return position === null ? null : (
      <Marker position={position} />
    );
  };

  const RecenterMap = ({ pos }: { pos: L.LatLng }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(pos, 16);
    }, [pos, map]);
    return null;
  };

  const handleGetCurrentLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = new L.LatLng(pos.coords.latitude, pos.coords.longitude);
        setPosition(newPos);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao pegar GPS:", error);
        alert("Não foi possível acessar seu GPS. Por favor, marque manualmente no mapa.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    if (position) {
      onLocationSelected(position.lat, position.lng, address);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="text-orange-500" /> Confirmar Local de Entrega
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Clique no mapa ou use o GPS para precisão total
            </p>
          </div>
          <button 
            onClick={onClose} 
            title="Fechar Mapa"
            aria-label="Fechar seletor de localização"
            className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <MapContainer 
            center={position || [-15.7801, -47.9292]} 
            zoom={position ? 16 : 4} 
            className="w-full h-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker />
            {position && <RecenterMap pos={position} />}
          </MapContainer>

          {/* GPS Button */}
          <button 
            onClick={handleGetCurrentLocation}
            disabled={loading}
            title="Minha Localização Atual"
            aria-label="Capturar minha localização via GPS"
            className="absolute bottom-6 right-6 z-[1000] bg-white text-orange-600 p-4 rounded-2xl shadow-xl border border-orange-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Navigation size={18} />
            )}
            {loading ? 'Buscando...' : 'Meu GPS'}
          </button>
        </div>

        {/* Footer info & Buttons */}
        <div className="p-6 bg-white border-t border-gray-100 space-y-4">
          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
            <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Endereço Detectado</label>
            <p className="text-xs font-bold text-slate-700 leading-tight">
              {address || 'Clique no mapa para identificar o endereço...'}
            </p>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!position}
              className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
            >
              <Check size={18} /> Confirmar Localização
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
