import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Route-level code splitting: each page (and its heavy deps like Leaflet maps
// and the QR library) loads on demand, keeping the initial bundle small.
const AdminAnalyticsPage = lazy(() => import('./pages/AdminAnalyticsPage.jsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.jsx'));
const AdminEventsPage = lazy(() => import('./pages/AdminEventsPage.jsx'));
const AdminReservationsPage = lazy(() => import('./pages/AdminReservationsPage.jsx'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.jsx'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage.jsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const DestinationDetailPage = lazy(() => import('./pages/DestinationDetailPage.jsx'));
const DestinationsPage = lazy(() => import('./pages/DestinationsPage.jsx'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage.jsx'));
const HomePage = lazy(() => import('./pages/HomePage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const ParkingAreaDetailPage = lazy(() => import('./pages/ParkingAreaDetailPage.jsx'));
const ParkingAreasPage = lazy(() => import('./pages/ParkingAreasPage.jsx'));
const ParkingAvailabilityPage = lazy(() => import('./pages/ParkingAvailabilityPage.jsx'));
const ParkingSlotsPage = lazy(() => import('./pages/ParkingSlotsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const ReservationsPage = lazy(() => import('./pages/ReservationsPage.jsx'));
const SecurityVerifyPage = lazy(() => import('./pages/SecurityVerifyPage.jsx'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage.jsx'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage.jsx'));

function AboutPage() {
  return (
    <main className="status-card">
      <p className="eyebrow">About</p>
      <h1>Smarter city parking</h1>
      <p className="summary">ParkEase helps everyone in Coimbatore find and book parking at malls, hospitals, stations, and events through a secure, accessible booking experience.</p>
      <Link className="text-link" to="/">Return home</Link>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="status-card">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="summary">The page you requested does not exist.</p>
      <Link className="text-link" to="/">Return home</Link>
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Suspense fallback={<main className="route-status" role="status"><span className="spinner" /> Loading…</main>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/destinations/:id" element={<DestinationDetailPage />} />
          <Route path="/parking" element={<ParkingAvailabilityPage />} />
          <Route path="/parking/:id" element={<ParkingAreaDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/booking-success" element={<BookingSuccessPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['security', 'admin']} />}>
          <Route path="/security" element={<SecurityVerifyPage />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/reservations" element={<AdminReservationsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/parking" element={<ParkingAreasPage />} />
          <Route path="/admin/slots" element={<ParkingSlotsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </Suspense>
      <Footer />
    </div>
  );
}
