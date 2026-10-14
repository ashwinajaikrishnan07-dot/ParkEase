import { useState } from 'react';

// Branded ParkEase placeholder (inline SVG data URI) shown when a remote image
// fails to load or none is provided — no broken-image icons ever appear.
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff4cc"/><stop offset="1" stop-color="#ffc928"/>
      </linearGradient></defs>
      <rect width="600" height="400" fill="url(#g)"/>
      <circle cx="300" cy="180" r="70" fill="#ffffff" opacity="0.65"/>
      <text x="300" y="212" font-family="Poppins,Arial,sans-serif" font-size="86" font-weight="800" fill="#8a6a00" text-anchor="middle">P</text>
      <text x="300" y="300" font-family="Poppins,Arial,sans-serif" font-size="26" font-weight="700" fill="#8a6a00" text-anchor="middle">ParkEase</text>
    </svg>`,
  );

export default function SmartImage({ alt = '', className = '', src, ...rest }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const resolved = failed || !src ? PLACEHOLDER : src;

  return (
    <img
      {...rest}
      alt={alt}
      className={`smart-image ${loaded ? 'is-loaded' : 'is-loading'} ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
      onLoad={() => setLoaded(true)}
      src={resolved}
    />
  );
}
