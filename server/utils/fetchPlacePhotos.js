/*
 * Backfills each Destination with a real photo from the Google Places API (New).
 *
 * Setup:
 *   1. Create a Google Cloud project and enable the "Places API (New)".
 *   2. Create an API key and set it in server/.env as GOOGLE_MAPS_API_KEY.
 *   3. Run:  node utils/fetchPlacePhotos.js         (only fills missing photos)
 *            node utils/fetchPlacePhotos.js --force  (re-fetch all)
 *
 * The API key is used ONLY here (server-side). We store the resulting public
 * photo URL (lh3.googleusercontent.com, no key) on destination.image, so the
 * frontend keeps using destination.image with no key exposure.
 */
require('dotenv').config();

const { connectDB, disconnectDB } = require('../config/db');
const Destination = require('../models/Destination');

const KEY = process.env.GOOGLE_MAPS_API_KEY;
const FORCE = process.argv.includes('--force');

async function resolvePhoto(destination) {
  const query = `${destination.name} ${destination.city || 'Coimbatore'}`;

  const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.photos',
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
  });
  if (!searchRes.ok) throw new Error(`search HTTP ${searchRes.status}: ${(await searchRes.text()).slice(0, 160)}`);

  const data = await searchRes.json();
  const place = data.places?.[0];
  const photo = place?.photos?.[0];
  if (!photo?.name) return null;

  const mediaUrl = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1000&skipHttpRedirect=true&key=${KEY}`;
  const mediaRes = await fetch(mediaUrl);
  if (!mediaRes.ok) throw new Error(`media HTTP ${mediaRes.status}`);
  const media = await mediaRes.json();

  const attribution = (photo.authorAttributions?.[0]?.displayName) || 'Google';
  return { uri: media.photoUri || null, attribution: `Photo: ${attribution} via Google` };
}

(async () => {
  if (!KEY) {
    console.error('GOOGLE_MAPS_API_KEY is not set in server/.env — add it and re-run.');
    process.exit(1);
  }
  await connectDB();
  const destinations = await Destination.find();
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const destination of destinations) {
    try {
      if (destination.googlePhoto && !FORCE) { skipped += 1; continue; }
      const result = await resolvePhoto(destination);
      if (result?.uri) {
        destination.image = result.uri;
        destination.imageAttribution = result.attribution;
        destination.googlePhoto = true;
        await destination.save();
        updated += 1;
        console.log(`OK    ${destination.name}`);
      } else {
        failed += 1;
        console.log(`NONE  ${destination.name} (no photo returned; keeping existing image)`);
      }
      await new Promise((r) => setTimeout(r, 200)); // be gentle on the API
    } catch (error) {
      failed += 1;
      console.log(`FAIL  ${destination.name} — ${error.message}`);
    }
  }

  console.log(`\nDone: updated=${updated} skipped=${skipped} failed=${failed}`);
  await disconnectDB();
  process.exit(0);
})().catch((error) => { console.error('Photo backfill failed:', error); process.exit(1); });
