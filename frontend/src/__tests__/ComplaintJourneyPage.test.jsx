import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ComplaintJourneyPage from '../pages/ComplaintJourneyPage';
import { LanguageProvider } from '../context/LanguageContext';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  getCommunityProblem: vi.fn(),
  fetchCommunityIncidents: vi.fn(),
}));

const mockProblem = {
  id: 'test-prob-123',
  crop: 'Cotton',
  crop_icon: '🌿',
  description: 'Leaf curling and whiteflies observed on cotton crop',
  photo_url: 'https://example.com/test-cotton.jpg',
  photos: ['https://example.com/test-cotton.jpg'],
  audio_url: 'https://example.com/farmer-audio.webm',
  created_at: '2026-09-04T21:49:50.268876Z',
  status: 'RESOLVED',
  priority: 'HIGH',
  locality: 'Ghatkesar',
  farmer_name: 'Venkat',
  advisory: {
    officer_name: 'Srinivas Rao',
    officer_designation: 'Agricultural Extension Officer, Ghatkesar Mandal',
    advisory: {
      title: 'Cotton Whitefly and Sucking Pest Management',
      te: 'పైరిప్రాక్సిఫెన్ పిచికారీ చేయండి.',
      en: 'Spray Pyriproxyfen 10% EC @ 2 ml/L.',
      hi: 'पाइरीप्रॉक्सिफेन का छिड़काव करें।',
    },
    status: 'APPROVED',
    is_verified: true,
  },
  timeline: [
    {
      status: 'NEW',
      label: 'Complaint Received',
      timestamp: '2026-09-04T21:49:50Z',
      note: 'Complaint registered by farmer',
    },
    {
      status: 'INVESTIGATING',
      label: 'Field Visit Scheduled',
      timestamp: '2026-09-05T10:00:00Z',
      note: 'AEO scheduled field inspection',
    },
    {
      status: 'RESOLVED',
      label: 'Resolved',
      timestamp: '2026-09-06T15:00:00Z',
      note: 'Advisory issued and applied',
    },
  ],
};

describe('ComplaintJourneyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the complaint journey with 5-step stepper and AEO advisory', async () => {
    api.getCommunityProblem.mockResolvedValueOnce({
      success: true,
      problem: mockProblem,
    });

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/community/problems/test-prob-123']}>
          <Routes>
            <Route path="/community/problems/:problemId" element={<ComplaintJourneyPage />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    );

    // Header and crop badge
    expect(await screen.findByText(/Leaf curling and whiteflies observed on cotton crop/i)).toBeInTheDocument();
    expect(screen.getByText(/Ref #TEST-PRO/i)).toBeInTheDocument();

    // 5-step Resolution Stepper
    expect(screen.getByText(/Complaint Resolution Journey/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Complaint Registered/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Field Investigation/i)).toBeInTheDocument();
    expect(screen.getByText(/AEO Guidance & Solution/i)).toBeInTheDocument();

    // Official AEO Verified Advisory Card
    expect(screen.getByTestId('official-aeo-advisory-section')).toBeInTheDocument();
    expect(screen.getByText(/Official AEO Advisory & Prescription/i)).toBeInTheDocument();
    expect(screen.getByText(/Srinivas Rao/i)).toBeInTheDocument();
    expect(screen.getByText(/Cotton Whitefly and Sucking Pest Management/i)).toBeInTheDocument();

    // Farmer voice audio note
    expect(screen.getByText(/Original Farmer Voice Audio/i)).toBeInTheDocument();

    // Audit timeline
    expect(screen.getByText(/Case Timeline & Action History/i)).toBeInTheDocument();
    expect(screen.getByText(/Field Visit Scheduled/i)).toBeInTheDocument();
  });

  it('provides a back button to navigate to /my-issues', async () => {
    api.getCommunityProblem.mockResolvedValueOnce({
      success: true,
      problem: mockProblem,
    });

    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={['/community/problems/test-prob-123']}>
          <Routes>
            <Route path="/community/problems/:problemId" element={<ComplaintJourneyPage />} />
            <Route path="/my-issues" element={<div>My Issues Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    );

    const backBtn = await screen.findByRole('button', { name: /Back to My Issues/i });
    expect(backBtn).toBeInTheDocument();

    fireEvent.click(backBtn);
    expect(await screen.findByText(/My Issues Dashboard/i)).toBeInTheDocument();
  });
});
