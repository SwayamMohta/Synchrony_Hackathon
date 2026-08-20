import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PublicNav from '../components/layout/PublicNav';
import AmbientGridBackground from '../components/AmbientGridBackground';

/* ============================================================
   LANDING PAGE
   ============================================================ */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: '#f6f7f9',
      minHeight: '100vh',
      color: '#111827',
      overflowX: 'hidden',
      position: 'relative'
    }}>
      {/* Interactive Physics Grid Background Layer */}
      <AmbientGridBackground />

      {/* FLOATING SINGLE PILL NAVBAR WITH ABOUT, FAQ & LOGIN */}
      <PublicNav />

      {/* HERO */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        minHeight: 'calc(115vh - 64px)',
        padding: '0 24px 64px',
        maxWidth: '1080px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        marginTop: '-32px',
      }}>
        <h1 style={{
          fontSize: '62px',
          fontWeight: 800,
          color: '#0f172a',
          lineHeight: 1.12,
          letterSpacing: '-0.04em',
          margin: '0 0 24px',
          maxWidth: '960px',
        }}>
          Reach More People and Grow Your Brand Awareness
        </h1>
        <p style={{
          fontSize: '17px',
          color: '#4b5563',
          lineHeight: 1.5,
          margin: '0 0 36px',
          maxWidth: '780px',
          letterSpacing: '-0.01em',
          fontWeight: 400,
        }}>
          Intelligent credit decisioning, fraud detection, and policy management in one unified platform.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '14px 32px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '-0.02em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.18s ease',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.15)'; }}
          >
            <span>Get Started</span>
            <ArrowRight size={15} strokeWidth={2.4} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

