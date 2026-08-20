import React, { useState, useRef } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  FileText,
  BarChart3,
  MessageSquareText,
  ChevronLeft,
  Cpu,
  LogOut
} from 'lucide-react';
import { useCases } from '../../context/CaseContext';
import { useAuth } from '../../context/AuthContext';

export interface NavItemConfig {
  path: string;
  Icon: React.ElementType;
  label: string;
  badge?: string | number | null;
  matchPrefix?: string;
}

interface AppShellProps {
  children?: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { cases } = useCases();
  const { user, clearAuth } = useAuth();

  const handleLogout = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    clearAuth();
    navigate('/login');
  };

  const navItems: NavItemConfig[] = [
    { path: '/applications', Icon: FileText, label: 'Applications', badge: cases.length, matchPrefix: '/applications' },
    { path: '/policy-assistant', Icon: MessageSquareText, label: 'PolicyLens', badge: null },
    { path: '/decision-engine', Icon: Cpu, label: 'Risk Evaluator', badge: null },
    { path: '/analytics', Icon: BarChart3, label: 'Analytics & Stats', badge: null, matchPrefix: '/analytics' },
  ];

  const isItemActive = (item: NavItemConfig) => {
    if (item.matchPrefix) {
      return location.pathname === item.path || location.pathname.startsWith(`${item.matchPrefix}/`);
    }
    return location.pathname === item.path;
  };

  const displayName = user?.name || 'A. Nambiar';
  const displayInitials = user?.avatarInitials || 'AN';
  const displayRole = user?.role === 'admin' ? 'Risk Administrator' : 'Risk Underwriter';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f6f7f9] text-[#111827]">

      {/* ── Single Collapsible Sidebar ── */}
      <aside
        ref={sidebarRef}
        onClick={() => {
          setIsExpanded(prev => !prev);
        }}
        className="flex-shrink-0 flex flex-col select-none z-20"
        style={{
          width: isExpanded ? '220px' : '62px',
          margin: '8px',
          marginRight: 0,
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)',
          transition: [
            'width 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            'background 0.2s ease',
          ].join(', '),
          willChange: 'width',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {/* ── Header / Toggle ── */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            padding: isExpanded ? '16px 14px 12px' : '16px 0 12px',
            justifyContent: isExpanded ? 'space-between' : 'center',
            width: '100%',
          }}
        >
          {/* Brand mark — clicks to landing page */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isExpanded ? 'flex-start' : 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              flex: isExpanded ? 1 : 'none',
              minWidth: 0,
            }}
            title="Go to Landing Page"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 28 28" fill="none">
                <path d="M7 14 L11 9 L14 14 L17 9 L21 14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 19 L11 14 L14 19 L17 14 L21 19" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
              </svg>
            </div>
            {isExpanded && (
              <span style={{ fontWeight: 800, fontSize: 14, color: '#111827', lineHeight: 1.2, letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}>
                finlens
              </span>
            )}
          </button>

          {/* Collapse Toggle Button (when expanded) */}
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 6,
                color: '#6b7280',
                flexShrink: 0,
              }}
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        {/* ── Flat 4-Item Nav ── */}
        <nav
          className="flex-1 overflow-y-auto pb-2"
          style={{
            scrollbarWidth: 'none',
            padding: isExpanded ? '0 8px' : '0 8px',
            transition: 'padding 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 4 }}>
            {navItems.map((item) => {
              const { path, Icon, label, badge } = item;
              const isActive = isItemActive(item);
              return (
                <li key={path}>
                  {isExpanded ? (
                    /* ── EXPANDED: full-width pill ── */
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(path);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: isActive ? '#f1f5f9' : 'transparent',
                        color: isActive ? '#0f172a' : '#4b5563',
                        fontSize: 12.5,
                        fontWeight: isActive ? 600 : 500,
                        border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s ease, color 0.12s ease',
                      }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <Icon style={{ width: 16, height: 16, flexShrink: 0, color: isActive ? '#0f172a' : '#6b7280' }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      {badge !== null && badge !== undefined && (
                        <span
                          style={{
                            background: isActive ? '#e2e8f0' : '#f1f5f9',
                            color: isActive ? '#0f172a' : '#64748b',
                            borderRadius: 9999,
                            minWidth: 18,
                            height: 18,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 600,
                            padding: '0 5px',
                            lineHeight: 1,
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  ) : (
                    /* ── COLLAPSED: centered icon pill ── */
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(path);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px 0',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      title={label}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isActive ? '#f1f5f9' : 'transparent',
                          border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <Icon style={{ width: 17, height: 17, color: isActive ? '#0f172a' : '#6b7280' }} />
                      </div>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── User footer with 1-click Log Out ── */}
        <div
          className="flex-shrink-0 border-t border-slate-200"
          style={{ padding: isExpanded ? '8px 10px' : '8px 0' }}
        >
          {isExpanded ? (
            /* EXPANDED: Full user row with explicit Log Out button */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                padding: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <div
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {displayInitials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {displayRole}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6,
                  color: '#94a3b8',
                  flexShrink: 0,
                }}
                className="hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={`Log out of ${displayName}`}
                aria-label="Log Out"
              >
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>
          ) : (
            /* COLLAPSED: Centered profile avatar indicator */
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 28, height: 28,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontSize: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title={`${displayName} (${displayRole})`}
              >
                {displayInitials}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f6f7f9]">
        {/* Workspace Body */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-3 flex flex-col min-h-0">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
