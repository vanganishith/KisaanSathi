import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyIssuesPage from '../pages/MyIssuesPage';
import { LanguageProvider } from '../context/LanguageContext';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  getMyIssues: vi.fn(),
}));

const mockIncidents = [
  {
    id: 'inc-1',
    crop: 'Cotton',
    description: 'Whitefly problem on leaves',
    status: 'INVESTIGATING',
    created_at: '2026-09-04T12:00:00Z',
    photo_url: 'https://example.com/cotton.jpg',
  },
  {
    id: 'inc-2',
    crop: 'Tomato',
    description: 'Early blight dark concentric rings',
    status: 'RESOLVED',
    created_at: '2026-09-02T10:00:00Z',
    photo_url: 'https://example.com/tomato.jpg',
  },
];

describe('MyIssuesPage Authentication Gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows login prompt and does NOT show issues when user is not logged in', () => {
    // Set arbitrary cache from old session
    localStorage.setItem('kisaansathi_my_issues_cache', JSON.stringify(mockIncidents));

    render(
      <LanguageProvider>
        <MemoryRouter>
          <MyIssuesPage />
        </MemoryRouter>
      </LanguageProvider>
    );

    // Should show login prompt
    expect(screen.getByTestId('farmer-login-prompt')).toBeInTheDocument();
    expect(screen.getByText(/Farmer Login Required to View Your Issues/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login with Mobile Number/i })).toBeInTheDocument();

    // Should NOT display the cached issues
    expect(screen.queryByText(/Whitefly problem on leaves/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Early blight dark concentric rings/i)).not.toBeInTheDocument();
  });

  it('shows issues when farmer is logged in', async () => {
    localStorage.setItem(
      'kisaansathi_farmer_profile',
      JSON.stringify({
        farmer_id: 'farmer-99',
        name: 'Ramesh Reddy',
        phone: '+919876543210',
      })
    );

    api.getMyIssues.mockResolvedValueOnce({
      success: true,
      farmer: { id: 'farmer-99', name: 'Ramesh Reddy' },
      incidents: mockIncidents,
    });

    render(
      <LanguageProvider>
        <MemoryRouter>
          <MyIssuesPage />
        </MemoryRouter>
      </LanguageProvider>
    );

    expect(await screen.findByText(/Whitefly problem on leaves/i)).toBeInTheDocument();
    expect(screen.getByText(/Early blight dark concentric rings/i)).toBeInTheDocument();
    expect(screen.queryByTestId('farmer-login-prompt')).not.toBeInTheDocument();
  });

  it('allows looking up issues by entering phone number', async () => {
    api.getMyIssues.mockResolvedValueOnce({
      success: true,
      farmer: { id: 'farmer-88', name: 'Srinivas' },
      incidents: mockIncidents,
    });

    render(
      <LanguageProvider>
        <MemoryRouter>
          <MyIssuesPage />
        </MemoryRouter>
      </LanguageProvider>
    );

    const input = screen.getByLabelText(/Mobile number/i);
    fireEvent.change(input, { target: { value: '9876543210' } });

    const submitBtn = screen.getByRole('button', { name: /Find My Issues/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Whitefly problem on leaves/i)).toBeInTheDocument();
    expect(api.getMyIssues).toHaveBeenCalledWith(30, '+919876543210');
  });
});
