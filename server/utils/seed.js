require('dotenv').config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Destination = require('../models/Destination');
const ParkingArea = require('../models/ParkingArea');
const ParkingSlot = require('../models/ParkingSlot');
const Reservation = require('../models/Reservation');
const ParkingReport = require('../models/ParkingReport');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const TrafficReport = require('../models/TrafficReport');
const { estimateCost, overstayFee } = require('./pricing');

const areaPriceById = new Map();

const DEMO_PASSWORD = 'Password123';
const violations = ['NO_VALID_RESERVATION', 'WRONG_SLOT', 'RESTRICTED_SLOT', 'ACCESSIBLE_SLOT_MISUSE', 'BLOCKING_OR_OBSTRUCTING'];
const categories = ['GENERAL', 'VISITOR', 'ACCESSIBLE'];
const trafficLevels = ['SMOOTH', 'MODERATE', 'HEAVY'];

// Public destinations across Coimbatore city (real places, approximate coordinates).
const destinationDefinitions = [
  { key: 'brookefields', name: 'Brookefields Mall', category: 'MALL', address: 'Brookebond Road, Coimbatore', city: 'Coimbatore', latitude: 11.0028, longitude: 76.9668, rating: 4.5, image: '/destinations/brookefields.jpg' },
  { key: 'funrepublic', name: 'Fun Republic Mall', category: 'MALL', address: 'Avinashi Road, Peelamedu', city: 'Coimbatore', latitude: 11.0295, longitude: 77.0266, rating: 4.4, image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=70' },
  { key: 'prozone', name: 'Prozone Mall', category: 'MALL', address: 'Saravanampatti, Coimbatore', city: 'Coimbatore', latitude: 11.0785, longitude: 77.0010, rating: 4.3, image: 'https://images.unsplash.com/photo-1567958451986-2de427a4a0be?auto=format&fit=crop&w=800&q=70' },
  { key: 'kmch', name: 'KMCH Hospital', category: 'HOSPITAL', address: 'Avinashi Road, Coimbatore', city: 'Coimbatore', latitude: 11.0333, longitude: 77.0167, rating: 4.3, image: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70' },
  { key: 'gknm', name: 'G. Kuppuswamy Naidu Hospital', category: 'HOSPITAL', address: 'Pappanaickenpalayam, Coimbatore', city: 'Coimbatore', latitude: 11.0138, longitude: 76.9560, rating: 4.2, image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=70' },
  { key: 'gandhipuram', name: 'Gandhipuram Bus Stand', category: 'BUS_STAND', address: 'Gandhipuram, Coimbatore', city: 'Coimbatore', latitude: 11.0183, longitude: 76.9680, rating: 4.0, image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=70' },
  { key: 'ukkadam', name: 'Ukkadam Bus Terminus', category: 'BUS_STAND', address: 'Ukkadam, Coimbatore', city: 'Coimbatore', latitude: 10.9920, longitude: 76.9590, rating: 3.9, image: '/destinations/ukkadam.jpg' },
  { key: 'junction', name: 'Coimbatore Junction Railway Station', category: 'PUBLIC_PLACE', address: 'Gopalapuram, Coimbatore', city: 'Coimbatore', latitude: 10.9966, longitude: 76.9674, rating: 4.1, image: '/destinations/junction.jpg' },
  { key: 'codissia', name: 'CODISSIA Trade Fair Complex', category: 'EVENT_VENUE', address: 'Peelamedu, Coimbatore', city: 'Coimbatore', latitude: 11.0290, longitude: 77.0190, rating: 4.4, image: '/destinations/codissia.png' },
  { key: 'vocpark', name: 'VOC Park & Zoo', category: 'PUBLIC_PLACE', address: 'Gandhipuram, Coimbatore', city: 'Coimbatore', latitude: 11.0030, longitude: 76.9640, rating: 4.2, image: 'https://images.unsplash.com/photo-1507666405895-422eee7d517f?auto=format&fit=crop&w=800&q=70' },
  { key: 'racecourse', name: 'Race Course Food Street', category: 'RESTAURANT', address: 'Race Course Road, Coimbatore', city: 'Coimbatore', latitude: 11.0030, longitude: 76.9720, rating: 4.5, image: '/destinations/racecourse.jpg' },
  { key: 'townhall', name: 'Town Hall Market', category: 'PUBLIC_PLACE', address: 'Town Hall, Coimbatore', city: 'Coimbatore', latitude: 10.9985, longitude: 76.9610, rating: 3.8, image: '/destinations/townhall.jpg' },
  { key: 'psg', name: 'PSG College of Technology', category: 'COLLEGE', address: 'Peelamedu, Coimbatore', city: 'Coimbatore', latitude: 11.0245, longitude: 77.0025, rating: 4.6, image: '/destinations/psg.webp' },
  { key: 'cit', name: 'Coimbatore Institute of Technology', category: 'COLLEGE', address: 'Civil Aerodrome Post, Coimbatore', city: 'Coimbatore', latitude: 11.0260, longitude: 77.0010, rating: 4.5, image: '/destinations/cit.jpg' },
  { key: 'marudhamalai', name: 'Marudhamalai Temple', category: 'TEMPLE', address: 'Marudhamalai, Coimbatore', city: 'Coimbatore', latitude: 11.0520, longitude: 76.8790, rating: 4.7, image: '/destinations/marudhamalai.jpg' },
  { key: 'perur', name: 'Perur Pateeswarar Temple', category: 'TEMPLE', address: 'Perur, Coimbatore', city: 'Coimbatore', latitude: 10.9700, longitude: 76.9120, rating: 4.6, image: '/destinations/perur.jpg' },
];

// Public parking areas. Slot count is normalised to 100-120 at creation time.
// lat/lng are small offsets near the destination so areas plot on the map.
const areaDefinitions = [
  { destination: 'brookefields', name: 'Basement Parking', location: 'Lower ground floor', allowedVehicleTypes: ['CAR'], walkingMinutes: 2, pricePerHour: 30, covered: true, latOff: 0.0006, lngOff: 0.0004 },
  { destination: 'brookefields', name: 'Two-Wheeler Parking', location: 'Entry ramp', allowedVehicleTypes: ['MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 10, covered: true, latOff: -0.0005, lngOff: 0.0006 },
  { destination: 'funrepublic', name: 'Level 2 Parking', location: 'Level 2', allowedVehicleTypes: ['CAR', 'MOTORCYCLE'], walkingMinutes: 4, pricePerHour: 30, covered: true, latOff: 0.0005, lngOff: 0.0005 },
  { destination: 'funrepublic', name: 'Rooftop Parking', location: 'Terrace level', allowedVehicleTypes: ['CAR', 'MOTORCYCLE'], walkingMinutes: 6, pricePerHour: 25, covered: false, latOff: -0.0006, lngOff: -0.0004 },
  { destination: 'prozone', name: 'Multi-Level Parking', location: 'Levels 1-3', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 30, covered: true, latOff: 0.0005, lngOff: 0.0005 },
  { destination: 'kmch', name: 'Visitor Parking', location: 'Main gate', allowedVehicleTypes: ['CAR', 'MOTORCYCLE'], walkingMinutes: 5, pricePerHour: 20, covered: false, latOff: 0.0004, lngOff: -0.0005 },
  { destination: 'kmch', name: 'Two-Wheeler Parking', location: 'East block', allowedVehicleTypes: ['MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 10, covered: true, latOff: -0.0005, lngOff: 0.0004 },
  { destination: 'gknm', name: 'Patient Parking', location: 'Block B', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 4, pricePerHour: 15, covered: true, latOff: 0.0005, lngOff: 0.0004 },
  { destination: 'gandhipuram', name: 'Bus Stand Parking', location: 'Gate 2', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 2, pricePerHour: 10, covered: false, latOff: 0.0004, lngOff: 0.0005 },
  { destination: 'gandhipuram', name: 'Cross Cut Road Parking', location: 'Cross Cut Road', allowedVehicleTypes: ['CAR', 'MOTORCYCLE'], walkingMinutes: 5, pricePerHour: 15, covered: false, latOff: -0.0006, lngOff: -0.0005 },
  { destination: 'ukkadam', name: 'Terminus Parking', location: 'South yard', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 10, covered: false, latOff: 0.0005, lngOff: 0.0004 },
  { destination: 'junction', name: 'Station Parking', location: 'Main entrance', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 2, pricePerHour: 15, covered: false, latOff: 0.0004, lngOff: 0.0005 },
  { destination: 'junction', name: 'Platform Side Parking', location: 'North platform', allowedVehicleTypes: ['MOTORCYCLE', 'SCOOTER'], walkingMinutes: 4, pricePerHour: 10, covered: false, latOff: -0.0005, lngOff: 0.0004 },
  { destination: 'codissia', name: 'Hall A Parking', location: 'Near Hall A', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 25, covered: false, latOff: 0.0006, lngOff: 0.0005 },
  { destination: 'codissia', name: 'Open Ground Parking', location: 'Trade fair ground', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 6, pricePerHour: 20, covered: false, latOff: -0.0007, lngOff: -0.0006, isOverflow: true },
  { destination: 'vocpark', name: 'Park Visitor Parking', location: 'Main gate', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 2, pricePerHour: 10, covered: false, latOff: 0.0004, lngOff: 0.0004 },
  { destination: 'racecourse', name: 'Food Street Parking', location: 'Race Course Road', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 2, pricePerHour: 15, covered: false, latOff: 0.0004, lngOff: 0.0005 },
  { destination: 'townhall', name: 'Market Parking', location: 'Town Hall', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 10, covered: false, latOff: 0.0005, lngOff: 0.0004 },
  { destination: 'psg', name: 'Main Gate Parking', location: 'Peelamedu entrance', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 15, covered: false, latOff: 0.0005, lngOff: 0.0005 },
  { destination: 'psg', name: 'Two-Wheeler Parking', location: 'Hostel block', allowedVehicleTypes: ['MOTORCYCLE', 'SCOOTER'], walkingMinutes: 4, pricePerHour: 10, covered: true, latOff: -0.0005, lngOff: 0.0004 },
  { destination: 'cit', name: 'Campus Parking', location: 'Main block', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 15, covered: false, latOff: 0.0005, lngOff: 0.0004 },
  { destination: 'marudhamalai', name: 'Hill Foot Parking', location: 'Temple base', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 5, pricePerHour: 10, covered: false, latOff: 0.0006, lngOff: 0.0005 },
  { destination: 'perur', name: 'Temple Parking', location: 'West entrance', allowedVehicleTypes: ['CAR', 'MOTORCYCLE', 'SCOOTER'], walkingMinutes: 3, pricePerHour: 10, covered: false, latOff: 0.0004, lngOff: 0.0004 },
];

function pad(number) {
  return String(number).padStart(2, '0');
}

async function seed() {
  await connectDB();
  console.log('Clearing demo data (real user-registered accounts are preserved)…');
  await Promise.all([
    // Only remove the demo accounts — never wipe accounts people registered themselves.
    User.deleteMany({ email: { $regex: /@parkwise\.demo$/i } }),
    Vehicle.deleteMany({}),
    Destination.deleteMany({}),
    ParkingArea.deleteMany({}),
    ParkingSlot.deleteMany({}),
    Reservation.deleteMany({}),
    ParkingReport.deleteMany({}),
    Event.deleteMany({}),
    Notification.deleteMany({}),
    TrafficReport.deleteMany({}),
  ]);

  console.log('Creating users…');
  const admin = await User.create({ name: 'ParkEase Admin', email: 'admin@parkwise.demo', password: DEMO_PASSWORD, phone: '9000000001', role: 'admin' });
  void admin;
  await User.create({ name: 'Security Lead', email: 'security@parkwise.demo', password: DEMO_PASSWORD, phone: '9000000002', role: 'security' });
  await User.create({ name: 'Security Officer', email: 'security2@parkwise.demo', password: DEMO_PASSWORD, phone: '9000000003', role: 'security' });

  // Everyday Coimbatore drivers (the public). Login emails are kept stable
  // (student@parkwise.demo … student10@parkwise.demo) for easy demo access.
  const driverNames = ['Arjun Kumar', 'Priya Narayan', 'Rahul Menon', 'Divya Rajan', 'Karthik S', 'Meena Iyer', 'Suresh Babu', 'Lakshmi R', 'Vijay Anand', 'Fathima Noor'];
  const students = [];
  for (let i = 1; i <= 10; i += 1) {
    const email = i === 1 ? 'student@parkwise.demo' : `student${i}@parkwise.demo`;
    students.push(await User.create({ name: driverNames[i - 1], email, password: DEMO_PASSWORD, phone: `90000001${pad(i)}`, role: 'user' }));
  }

  console.log('Creating destinations…');
  const destinationByKey = new Map();
  for (const definition of destinationDefinitions) {
    const { key, ...fields } = definition;
    destinationByKey.set(key, await Destination.create({ ...fields, description: `${fields.name} — parking available nearby.` }));
  }

  console.log('Creating parking areas and slots…');
  const areas = [];
  const slots = [];
  for (let a = 0; a < areaDefinitions.length; a += 1) {
    const definition = areaDefinitions[a];
    const destination = destinationByKey.get(definition.destination);
    // Each area holds 100-120 slots (spread deterministically for variety).
    const slotCount = 100 + ((a * 13) % 21);
    const area = await ParkingArea.create({
      destination: destination._id,
      name: definition.name,
      location: definition.location,
      description: `${definition.name} at ${destination.name}.`,
      capacity: slotCount,
      allowedVehicleTypes: definition.allowedVehicleTypes,
      walkingMinutes: definition.walkingMinutes,
      pricePerHour: definition.pricePerHour,
      covered: definition.covered,
      cctv: true,
      evCharging: false,
      isOverflow: Boolean(definition.isOverflow),
      latitude: destination.latitude != null ? Math.round((destination.latitude + (definition.latOff || 0)) * 1e6) / 1e6 : null,
      longitude: destination.longitude != null ? Math.round((destination.longitude + (definition.lngOff || 0)) * 1e6) / 1e6 : null,
      status: 'OPEN',
    });
    areaPriceById.set(area._id.toString(), definition.pricePerHour);
    areas.push(area);
    const slotDocs = [];
    for (let s = 1; s <= slotCount; s += 1) {
      const vehicleType = definition.allowedVehicleTypes[s % definition.allowedVehicleTypes.length];
      const category = categories[s % categories.length];
      slotDocs.push({
        area: area._id,
        slotNumber: `${String.fromCharCode(65 + a)}${pad(s)}`,
        vehicleType,
        category,
        status: 'AVAILABLE',
      });
    }
    const createdSlots = await ParkingSlot.insertMany(slotDocs);
    slots.push(...createdSlots);
  }

  console.log('Creating vehicles…');
  const vehicles = [];
  const vehicleTypesForSeed = ['CAR', 'CAR', 'CAR', 'CAR', 'CAR', 'CAR', 'CAR', 'CAR', 'MOTORCYCLE', 'SCOOTER'];
  for (let i = 0; i < 10; i += 1) {
    const type = vehicleTypesForSeed[i];
    const model = type === 'CAR' ? ['Honda City', 'Hyundai i20', 'Maruti Swift', 'Tata Nexon'][i % 4] : type === 'MOTORCYCLE' ? 'Royal Enfield' : 'Honda Activa';
    vehicles.push(await Vehicle.create({
      owner: students[i]._id,
      registrationNumber: `TN${pad(37)}${['AB', 'CD', 'EF', 'GH', 'JK', 'LM', 'NP', 'QR', 'ST', 'UV'][i]}${pad(1000 + i).slice(0, 2)}${i}`,
      type,
      model,
      color: ['White', 'Silver', 'Blue', 'Black'][i % 4],
    }));
  }

  console.log('Creating upcoming reservations…');
  const carSlots = slots.filter((slot) => slot.vehicleType === 'CAR');
  for (let i = 0; i < 10 && i < carSlots.length; i += 1) {
    const slot = carSlots[i];
    const vehicle = vehicles[i % 8]; // the 8 car vehicles
    const start = new Date(Date.now() + (i + 1) * 30 * 60000);
    const end = new Date(start.getTime() + 60 * 60000);
    const pricePerHour = areaPriceById.get(slot.area.toString()) || 20;
    const reservation = await Reservation.create({
      user: vehicle.owner,
      vehicle: vehicle._id,
      area: slot.area,
      slot: slot._id,
      startTime: start,
      endTime: end,
      status: 'ACTIVE',
      pricePerHour,
      estimatedCost: estimateCost(pricePerHour, start, end),
    });
    await ParkingSlot.updateOne({ _id: slot._id }, { status: 'RESERVED', currentReservation: reservation._id });
  }

  console.log('Creating booking history (completed) for receipts & expenses…');
  // Completed reservations in the recent past so the expense tracker and receipts
  // have real data. These do not hold a slot (slots stay AVAILABLE).
  for (let i = 0; i < 12; i += 1) {
    const slot = carSlots[(i + 3) % carSlots.length];
    const vehicle = vehicles[i % 8];
    const daysAgo = i + 1;
    const start = new Date(Date.now() - daysAgo * 24 * 60 * 60000 - 2 * 60 * 60000);
    const hours = (i % 3) + 1; // 1-3 hour sessions
    const end = new Date(start.getTime() + hours * 60 * 60000);
    const pricePerHour = areaPriceById.get(slot.area.toString()) || 20;
    const base = estimateCost(pricePerHour, start, end);
    // Every 4th booking overstayed by ~40 minutes.
    const overstayMins = i % 4 === 0 ? 40 : 0;
    const lateFee = overstayFee(pricePerHour, overstayMins);
    const checkedOutAt = new Date(end.getTime() + overstayMins * 60000);
    const durationMinutes = Math.ceil((checkedOutAt - start) / 60000);
    await Reservation.create({
      user: vehicle.owner,
      vehicle: vehicle._id,
      area: slot.area,
      slot: slot._id,
      startTime: start,
      endTime: end,
      status: 'COMPLETED',
      checkedInAt: start,
      checkedOutAt,
      durationMinutes,
      pricePerHour,
      estimatedCost: base,
      overstayMinutes: overstayMins,
      overstayFee: lateFee,
      finalCost: base + lateFee,
    });
  }

  console.log('Creating sample notifications…');
  const demoStudent = students[0];
  await Notification.create([
    { user: demoStudent._id, type: 'BOOKING', title: 'Booking confirmed', message: 'Your upcoming parking slot is reserved.', read: false },
    { user: demoStudent._id, type: 'CHECKOUT', title: 'Checked out', message: 'Thanks for parking with ParkEase. Your receipt is ready.', read: false },
    { user: demoStudent._id, type: 'SYSTEM', title: 'Welcome to ParkEase', message: 'Find parking at any destination and reserve in seconds.', read: true },
  ]);

  console.log('Creating reports…');
  for (let i = 0; i < 5; i += 1) {
    const slot = slots[i];
    await ParkingReport.create({
      reporter: students[i]._id,
      area: slot.area,
      slot: slot._id,
      vehicleNumber: `TN${pad(37)}XX${pad(2000 + i).slice(0, 3)}`,
      violationType: violations[i % violations.length],
      description: `Reported a wrongly parked vehicle, incident ${i + 1}, for review.`,
      status: 'PENDING',
    });
  }

  console.log('Creating traffic reports from drivers…');
  const trafficComments = [
    'Smooth entry, plenty of space near the gate.',
    'Moderate traffic on the approach road, allow extra time.',
    'Heavy jam at the main junction right now.',
    'Filling up fast but still moving.',
    'Easy parking, no queues at the moment.',
  ];
  const trafficDests = ['brookefields', 'funrepublic', 'codissia', 'gandhipuram', 'kmch'];
  for (let i = 0; i < trafficDests.length; i += 1) {
    const dest = destinationByKey.get(trafficDests[i]);
    await TrafficReport.create({
      user: students[i]._id,
      destination: dest._id,
      level: trafficLevels[i % trafficLevels.length],
      comment: trafficComments[i % trafficComments.length],
    });
  }

  console.log('Creating events…');
  const eventVenue = destinationByKey.get('codissia');
  const eventStart = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  await Event.create({
    destination: eventVenue._id,
    name: 'Coimbatore Music Festival 2026',
    description: 'Live concert weekend — expect heavy parking demand. Book early to enjoy the show.',
    startsAt: eventStart,
    endsAt: new Date(eventStart.getTime() + 8 * 60 * 60 * 1000),
    createdBy: admin._id,
  });

  const counts = {
    users: await User.countDocuments(),
    destinations: await Destination.countDocuments(),
    events: await Event.countDocuments(),
    areas: await ParkingArea.countDocuments(),
    slots: await ParkingSlot.countDocuments(),
    vehicles: await Vehicle.countDocuments(),
    reservations: await Reservation.countDocuments(),
    reports: await ParkingReport.countDocuments(),
    notifications: await Notification.countDocuments(),
    trafficReports: await TrafficReport.countDocuments(),
  };
  console.log('Seed complete:', JSON.stringify(counts, null, 2));
  console.log(`Demo password for all accounts: ${DEMO_PASSWORD}`);

  await disconnectDB();
  return counts;
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    mongoose.connection.close().finally(() => process.exit(1));
  });
