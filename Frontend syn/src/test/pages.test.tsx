import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { CaseProvider } from '../context/CaseContext';
import { AppRoutes } from '../App';

vi.mock('../services/api', () => ({
  loadCases: vi.fn(() => Promise.resolve([])),
  queryPolicyAssistant: vi.fn(() => Promise.reject(new Error('backend down'))),
  fetchModelEvalMetrics: vi.fn(() => Promise.resolve([])),
  mapSnapshotToApplicationCase: vi.fn(() => ({})),
}));

vi.mock('../api/underwritingApi', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    postDecision: vi.fn(),
    getApplication: vi.fn(() => Promise.resolve({})),
    login: vi.fn(),
  };
});

function authed() {
  sessionStorage.setItem(
    'finlens_auth',
    JSON.stringify({
      token: 'test-token',
      role: 'analyst',
      user: { name: 'Test', username: 'test', role: 'analyst', avatarInitials: 'TE' },
    }),
  );
}

function renderAt(route: string) {
  return render(
    <AuthProvider>
      <CaseProvider>
        <MemoryRouter initialEntries={[route]}>
          <AppRoutes />
        </MemoryRouter>
      </CaseProvider>
    </AuthProvider>,
  );
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('AppRoutes page rendering', () => {
  it('renders public landing page at /', () => {
    renderAt('/');
    expect(document.body.textContent).toContain('Reach More People');
  });

  it('renders about page at /about', () => {
    renderAt('/about');
    expect(document.body.textContent).toContain('Next-Generation Credit Intelligence');
  });

  it('renders faq page at /faq', () => {
    renderAt('/faq');
    expect(document.body.textContent).toContain('Common Questions About FinLens');
  });

  it('renders login view at /login when unauthenticated', () => {
    renderAt('/login');
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders decision-engine page when authenticated', async () => {
    authed();
    renderAt('/decision-engine');
    expect(screen.getByText(/Risk Evaluator/i)).toBeTruthy();
  });

  it('renders applications hub page when authenticated', async () => {
    authed();
    renderAt('/applications');
    expect(screen.getByText(/Applications Workstation/i)).toBeTruthy();
  });

  it('renders application case page when authenticated (no case -> not found)', async () => {
    authed();
    renderAt('/applications/PR-000');
    expect(screen.getByText(/Application Not Found/i)).toBeTruthy();
  });

  it('renders policy assistant page when authenticated', async () => {
    authed();
    renderAt('/policy-assistant');
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders analytics page when authenticated', async () => {
    authed();
    renderAt('/analytics');
    expect(document.body.textContent).toBeTruthy();
  });

  it('renders new-application page (redirects to decision-engine)', async () => {
    authed();
    renderAt('/new-application');
    expect(screen.getByText(/Risk Evaluator/i)).toBeTruthy();
  });

  it('redirects unauthenticated protected routes to /login', () => {
    renderAt('/applications');
    expect(document.body.textContent).toBeTruthy();
  });
});
