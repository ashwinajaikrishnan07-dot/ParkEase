import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { Crosshair } from 'lucide-react';

// Inline SVG pins as divIcons so we don't depend on Leaflet's bundled marker
// image assets (which break under bundlers without extra config).
function pinIcon(color, selected = false) {
  const scale = selected ? 38 : 30;
  const html = `<span class="map-pin-marker${selected ? ' is-selected' : ''}">
    <svg viewBox="0 0 24 24" width="${scale}" height="${scale}" fill="${color}" stroke="#fff" stroke-width="1.5">
      <path d="M12 2C7.6 2 4 5.6 4 10c0 5.2 6.6 11.3 7.3 11.9.4.4 1 .4 1.4 0C13.4 21.3 20 15.2 20 10c0-4.4-3.6-8-8-8z"/>
      <circle cx="12" cy="10" r="3" fill="#fff" stroke="none"/>
    </svg>
  </span>`;
  return L.divIcon({ html, className: 'map-pin', iconSize: [scale, scale], iconAnchor: [scale / 2, scale], popupAnchor: [0, -scale + 2] });
}

const DEST = { base: '#f2b900', sel: '#e07a00' };
const AREA = { base: '#2d7ef7', sel: '#0a5bd0' };

const userIcon = L.divIcon({
  html: '<span class="map-user-dot"></span>',
  className: 'map-user',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Fits the map to all markers (and the user position) once per marker-set change.
function FitBounds({ points }) {
  const map = useMap();
  const signature = points.map((p) => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 15);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return null;
}

// Flies to and opens the popup for the externally-selected marker.
function FlyToSelected({ selectedId, markerRefs, markers }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const marker = markers.find((m) => m.id === selectedId);
    if (!marker) return;
    map.flyTo([marker.lat, marker.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    const ref = markerRefs.current[selectedId];
    if (ref) ref.openPopup();
  }, [selectedId, map, markerRefs, markers]);
  return null;
}

export default function MapView({ center, zoom = 13, markers = [], height = 320, selectedId = null, onSelect, showLocate = true }) {
  const valid = markers.filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng));
  const fallback = valid[0] ? [valid[0].lat, valid[0].lng] : [11.0168, 76.9558]; // Coimbatore
  const mapCenter = center && Number.isFinite(center[0]) ? center : fallback;
  const markerRefs = useRef({});
  const [userPos, setUserPos] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');

  const fitPoints = userPos ? [...valid, userPos] : valid;

  function locate() {
    if (!navigator.geolocation) { setLocateError('Location is not supported by this browser.'); return; }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocateError('Location permission denied. Search a destination instead.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="map-view" style={{ height }}>
      <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={fitPoints} />
        <FlyToSelected markers={valid} markerRefs={markerRefs} selectedId={selectedId} />

        {valid.map((marker) => {
          const palette = marker.kind === 'area' ? AREA : DEST;
          const isSel = marker.id === selectedId;
          return (
            <Marker
              eventHandlers={{ click: () => onSelect?.(marker.id) }}
              icon={pinIcon(isSel ? palette.sel : palette.base, isSel)}
              key={marker.id}
              position={[marker.lat, marker.lng]}
              ref={(ref) => { if (ref) markerRefs.current[marker.id] = ref; }}
              zIndexOffset={isSel ? 1000 : 0}
            >
              <Popup>
                <strong>{marker.title}</strong>
                {marker.subtitle && <div className="map-popup-sub">{marker.subtitle}</div>}
                {marker.to && <Link className="map-popup-link" to={marker.to}>View parking →</Link>}
              </Popup>
            </Marker>
          );
        })}

        {userPos && (
          <Marker icon={userIcon} position={[userPos.lat, userPos.lng]}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>

      {showLocate && (
        <button className="map-locate" onClick={locate} type="button" title="Use my location" aria-label="Use my location">
          <Crosshair size={18} />
          <span>{locating ? 'Locating…' : 'My location'}</span>
        </button>
      )}
      {locateError && <p className="map-locate-error" role="status">{locateError}</p>}
    </div>
  );
}
