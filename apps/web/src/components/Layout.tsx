import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  FileText,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Globe,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { Button } from './Button';

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/documents', label: t('nav.documents'), icon: FileText },
    { to: '/rules', label: t('nav.rules'), icon: Shield },
    { to: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en');
  };

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.875rem',
    borderRadius: 'var(--radius-md)',
    color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
    backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
    fontWeight: isActive ? 600 : 400,
    textDecoration: 'none',
    transition: 'all 0.15s',
    fontSize: '0.9375rem',
    minHeight: '44px',
  });

  const sidebar = (
    <nav
      style={{
        width: '240px',
        height: '100vh',
        backgroundColor: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--spacing-4)',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 30,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--spacing-8)',
          padding: '0.5rem 0',
        }}
      >
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
          DocRouter
        </h1>
        <button
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            minHeight: 'unset',
          }}
          className="sidebar-close-btn"
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => navLinkStyle(isActive)}
            onClick={() => setSidebarOpen(false)}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--spacing-4)',
          marginTop: 'var(--spacing-4)',
        }}
      >
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', padding: '0 0.25rem' }}>
          {user?.name}
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.625rem 0.875rem',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            fontSize: '0.9375rem',
            minHeight: '44px',
          }}
        >
          <LogOut size={18} />
          {t('nav.logout')}
        </button>
      </div>
    </nav>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="desktop-sidebar" style={{ width: '240px', flexShrink: 0 }}>
        {sidebar}
      </div>

      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgb(0 0 0 / 0.4)',
              zIndex: 25,
              display: 'none',
            }}
            className="mobile-overlay"
          />
          <div className="mobile-sidebar" style={{ display: 'none' }}>
            {sidebar}
          </div>
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          style={{
            backgroundColor: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
            padding: '0 var(--spacing-4)',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-text)',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
            className="mobile-menu-btn"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={toggleLanguage}>
              <Globe size={16} />
              {i18n.language.toUpperCase()}
            </Button>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {user?.email}
            </span>
          </div>
        </header>

        <main style={{ flex: 1, padding: 'var(--spacing-6)', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-menu-btn { display: none !important; }
          .desktop-sidebar { display: block !important; }
          .mobile-overlay { display: none !important; }
          .mobile-sidebar { display: none !important; }
          .sidebar-close-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-overlay { display: block !important; }
          .mobile-sidebar { display: block !important; }
          .sidebar-close-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}
