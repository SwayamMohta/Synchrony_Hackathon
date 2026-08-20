import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export const PublicNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'About', path: '/about' },
    { label: 'FAQ', path: '/faq' },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      padding: '20px 32px 0',
      display: 'flex',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Main Navigation Pill: Perfectly Centered */}
        <div style={{
          width: '100%',
          maxWidth: '640px',
          height: '54px',
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '16px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        }}>
          {/* Logo on Left of Pill */}
          <div
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
          >
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="#0f172a" />
              <path d="M7 14 L11 9 L14 14 L17 9 L21 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M7 19 L11 14 L14 19 L17 14 L21 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.04em', color: '#0f172a' }}>finlens</span>
          </div>

          {/* Nav Items (About, FAQ) on Right of Pill */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#0f172a' : '#4b5563',
                    letterSpacing: '-0.01em',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0f172a';
                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = isActive ? '#0f172a' : '#4b5563';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Log in Button on Right */}
        <button
          onClick={() => navigate('/login')}
          style={{
            position: 'absolute',
            right: 0,
            height: '54px',
            padding: '0 22px',
            background: 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#0f172a',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 24px -2px rgba(15, 23, 42, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.9)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)';
          }}
        >
          <LogIn size={16} strokeWidth={2.2} style={{ color: '#0f172a' }} />
          <span>Log in</span>
        </button>
      </div>
    </header>
  );
};

export default PublicNav;
