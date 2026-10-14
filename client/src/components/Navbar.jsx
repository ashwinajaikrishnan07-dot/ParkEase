import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CircleParking, Moon, Sun } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useTheme } from '../hooks/useTheme.js';
import NotificationBell from './NotificationBell.jsx';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? 'Light mode' : 'Dark mode'}
      type="button"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function initials(name) {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isStaff = isAdmin || user?.role === 'security';
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();

  useEffect(() => { setIsOpen(false); }, [location.pathname]);

  function handleLogout() {
    setIsOpen(false);
    logout();
  }

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="ParkEase home">
        <CircleParking size={22} color="#f2b900" style={{ verticalAlign: '-4px', marginRight: 6 }} />
        Park<span className="brand-wise">Ease</span>
      </Link>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-label="Toggle navigation menu"
        className="nav-toggle"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true" className="nav-toggle-bar" />
        <span aria-hidden="true" className="nav-toggle-bar" />
        <span aria-hidden="true" className="nav-toggle-bar" />
      </button>
      <nav aria-label="Primary navigation" className={isOpen ? 'nav-open' : ''} id={menuId}>
        <NavLink to="/" end>Home</NavLink>
        {isAuthenticated ? (
          <>
            <NavLink to="/destinations">Find Parking</NavLink>
            <NavLink to="/reservations">My Bookings</NavLink>
            <NavLink to="/expenses">Expenses</NavLink>
            <NavLink to="/vehicles">Vehicles</NavLink>
            <NavLink to="/reports">Report</NavLink>
            {isStaff && <NavLink to="/security">Verify</NavLink>}
            {isAdmin && <NavLink to="/admin">Admin</NavLink>}
            <ThemeToggle />
            <NotificationBell />
            <NavLink className="nav-user" to="/profile">
              <span aria-hidden="true" className="nav-avatar">{initials(user?.name)}</span>
              {user?.name?.split(' ')[0] || 'Account'}
            </NavLink>
            <button className="nav-button" onClick={handleLogout} type="button">Sign out</button>
          </>
        ) : (
          <>
            <ThemeToggle />
            <NavLink to="/login">Sign in</NavLink>
            <NavLink className="nav-cta" to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
