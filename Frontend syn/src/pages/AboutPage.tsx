import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cpu, GitBranch, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import PublicNav from '../components/layout/PublicNav';
import AmbientGridBackground from '../components/AmbientGridBackground';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  const pillars = [
    {
      icon: <Cpu size={24} style={{ color: '#0f172a' }} />,
      title: 'Autonomous Credit Decisioning',
      desc: 'High-throughput decision engine evaluating bureau data, debt-to-income models, and bank statements in under 400 milliseconds.'
    },
    {
      icon: <GitBranch size={24} style={{ color: '#0f172a' }} />,
      title: 'Graph Fraud Intelligence',
      desc: 'Synthetic identity detection, application velocity tracking, and cross-entity risk clustering to stop first-party and bust-out fraud.'
    },
    {
      icon: <ShieldCheck size={24} style={{ color: '#0f172a' }} />,
      title: 'Regulatory & Policy Copilot',
      desc: 'Natural language regulatory policy assistant providing instant citations, credit guideline auditing, and transparent adverse action rationales.'
    },
    {
      icon: <Zap size={24} style={{ color: '#0f172a' }} />,
      title: 'Explainable AI Engine',
      desc: 'Full decision transparency with Shapley value feature attributions, ensuring compliance with fair lending guidelines and audit mandates.'
    }
  ];

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

      {/* Floating Single Pill Navbar */}
      <PublicNav />

      {/* Main Content */}
      <main style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '60px 24px 100px',
      }}>
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.05)',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#0f172a',
            marginBottom: '18px',
          }}>
            <span>About FinLens Engine</span>
          </div>

          <h1 style={{
            fontSize: '48px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.15,
            letterSpacing: '-0.04em',
            margin: '0 0 20px',
          }}>
            Next-Generation Credit Intelligence & Underwriting
          </h1>

          <p style={{
            fontSize: '17px',
            color: '#4b5563',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto',
            letterSpacing: '-0.01em',
          }}>
            FinLens empowers financial institutions, neo-banks, and NBFCs with real-time risk assessment, automated credit decisioning, and policy verification.
          </p>
        </div>

        {/* Pillars Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '64px',
        }}>
          {pillars.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                borderRadius: '16px',
                padding: '28px 24px',
                boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 30px -4px rgba(15, 23, 42, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(15, 23, 42, 0.04)';
              }}
            >
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                {p.icon}
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {p.title}
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Enterprise Standards Banner */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226, 232, 240, 0.9)',
          borderRadius: '20px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.04)',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
            Built for Enterprise Scale & Compliance
          </h2>
          <p style={{ fontSize: '14.5px', color: '#64748b', maxWidth: '600px', margin: '0 0 28px', lineHeight: 1.5 }}>
            Designed to meet bank-grade security standards with 99.99% uptime, end-to-end encryption, and automated regulatory audit logging.
          </p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
            {['SOC 2 Type II Certified', 'Fair Lending & RBI Compliant', 'Sub-400ms Decision SLA', 'Full Audit Traceability'].map((badge, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                <span>{badge}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/login')}
            style={{
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 28px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.15)';
            }}
          >
            <span>Explore Dashboard</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </main>
    </div>
  );
};

export default AboutPage;
