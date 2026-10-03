import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import CommunityFeedSection from '../components/CommunityFeedSection';
import VoiceReportModal from '../components/VoiceReportModal';
import TodayPlanCard from '../components/TodayPlanCard';
import * as api from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getCommunityFeed: vi.fn(),
    getCommunitySignals: vi.fn(),
    recordMeToo: vi.fn(),
    createCommunityReport: vi.fn(),
    createVoiceCommunityReport: vi.fn(),
    searchCommunityReports: vi.fn(),
    getTodayPlan: vi.fn(),
    sendVoiceConversation: vi.fn(),
    synthesizeSpeech: vi.fn(),
  };
});

describe('Community Engine & Voice-First UX Frontend Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CommunityFeedSection with regional signals, anonymized locality, and 1-tap Me Too', async () => {
    api.getCommunityFeed.mockResolvedValueOnce({
      success: true,
      locality: 'Warangal Rural',
      signals: [
        {
          id: 'sig-1',
          crop: 'Chilli',
          title: '⚠️ Local Chilli Outbreak Signal',
          issue_category: 'PEST_DISEASE',
          report_count: 7,
          nearby_report_count: 7,
          signal_level: 'STRONG',
          locality_name: 'Warangal Rural',
          summary: '7 farmers nearby reported similar symptoms.',
          symptom_summary: 'Leaf curling and flower drop in early flowering chilli.',
          last_observed_at: '2026-10-03T10:00:00Z',
        },
      ],
      reports: [
        {
          id: 'rep-1',
          crop: 'Chilli',
          crop_name: 'Chilli',
          category: 'PEST_DISEASE',
          title: 'మిరపలో ఆకులు ముడుచుకుంటున్నాయి',
          description: 'ఆకుల వెనుక తెల్లటి పురుగులు కనిపిస్తున్నాయి.',
          approx_location: 'Warangal Rural (approx. 3.2 km)',
          me_too_count: 6,
          has_me_too: false,
          created_at: '2026-10-03T08:30:00Z',
          aeo_verification: {
            officer_name: 'AEO Ramesh Kumar',
            guidance: 'రైతులు డైమెథోయేట్ లేదా వేపనూనె పిచికారీ చేయాలి.',
          },
        },
      ],
    });

    api.recordMeToo.mockResolvedValueOnce({
      success: true,
      new_me_too_count: 7,
    });

    render(
      <LanguageProvider>
        <CommunityFeedSection farmerPhone="9876543210" activeCrop="Chilli" />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('community-feed-section')).toBeInTheDocument();
    });

    // Check regional outbreak signal
    expect(screen.getByTestId('community-signals-banner')).toBeInTheDocument();
    expect(screen.getByText(/7 farmers nearby reported similar symptoms/i)).toBeInTheDocument();

    // Check farmer report with anonymized locality (no phone number or exact GPS)
    expect(screen.getByText(/మిరపలో ఆకులు ముడుచుకుంటున్నాయి/i)).toBeInTheDocument();
    expect(screen.getByText(/Warangal Rural \(approx\. 3\.2 km\)/i)).toBeInTheDocument();
    expect(screen.getByText(/AEO Ramesh Kumar/i)).toBeInTheDocument();

    // 1-Tap Me Too interaction
    const meTooBtn = screen.getByTestId('me-too-btn-rep-1');
    expect(meTooBtn).toBeInTheDocument();
    fireEvent.click(meTooBtn);

    await waitFor(() => {
      expect(api.recordMeToo).toHaveBeenCalledWith({
        reportId: 'rep-1',
        farmerPhone: '9876543210',
      });
    });
  });

  it('allows creating a community report via VoiceReportModal', async () => {
    api.createCommunityReport.mockResolvedValueOnce({
      success: true,
      report: {
        id: 'rep-new-1',
        crop_name: 'Chilli',
        title: 'Chilli issue reported',
        category: 'pest',
      },
    });

    const handleCreated = vi.fn();
    const handleClose = vi.fn();

    render(
      <LanguageProvider>
        <VoiceReportModal
          isOpen={true}
          onClose={handleClose}
          farmerPhone="9876543210"
          activeCrop="Chilli"
          onReportCreated={handleCreated}
        />
      </LanguageProvider>
    );

    expect(screen.getByTestId('voice-report-modal')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/ఆకులు ముడుచుకుంటున్నాయి|Describe what you see/i);
    fireEvent.change(textarea, { target: { value: 'నా మిరపలో ఆకులు ముడుచుకుంటున్నాయి' } });

    const submitBtn = screen.getByTestId('submit-voice-report-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createCommunityReport).toHaveBeenCalledWith(
        expect.objectContaining({
          farmer_phone: '9876543210',
          description: 'నా మిరపలో ఆకులు ముడుచుకుంటున్నాయి',
        })
      );
      expect(handleCreated).toHaveBeenCalled();
    });
  });

  it('renders TodayPlanCard with COMMUNITY_RISK alert and TTS listen button', async () => {
    api.getTodayPlan.mockResolvedValueOnce({
      success: true,
      date: '2026-10-03',
      priorities: [
        {
          type: 'COMMUNITY_RISK',
          priority: 'HIGH',
          title: '⚠️ Local Chilli Alert (7 Nearby Farmers)',
          summary: '7 nearby chilli farmers reported similar symptoms in the last few days.',
          reasoning: 'Proximity signal detected within 15km in Warangal Rural.',
          actions: ['Inspect underside of leaves', 'Submit photo check if curling increases'],
        },
      ],
    });

    api.synthesizeSpeech.mockResolvedValueOnce({
      success: true,
      audio_data: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      audio_mime: 'audio/wav',
    });

    render(
      <LanguageProvider>
        <TodayPlanCard
          fieldId="field-1"
          cropCycleId="cycle-1"
          farmerPhone="9876543210"
        />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('today-plan-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/Local Chilli Alert/i)).toBeInTheDocument();
    expect(screen.getByText(/7 nearby chilli farmers/i)).toBeInTheDocument();

    const listenBtn = screen.getByTestId('listen-today-advice-btn');
    expect(listenBtn).toBeInTheDocument();
    fireEvent.click(listenBtn);

    await waitFor(() => {
      expect(listenBtn).toBeInTheDocument();
    });
  });
});
