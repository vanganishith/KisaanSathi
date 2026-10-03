import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import AlertNotificationBanner from '../components/AlertNotificationBanner';
import FarmMemoryView from '../components/FarmMemoryView';
import YieldHarvestPlannerCard from '../components/YieldHarvestPlannerCard';
import FarmAnalyticsCard from '../components/FarmAnalyticsCard';
import * as api from '../services/api';

// Mock API
vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getFarmerAlerts: vi.fn().mockResolvedValue({
      success: true,
      alerts: [
        {
          id: 'alert-weather-1',
          type: 'WEATHER',
          title: 'Heavy Rainfall Expected Tomorrow',
          summary: 'Avoid irrigation in Chilli field today to prevent waterlogging.',
          priority: 'HIGH',
          status: 'UNREAD',
          suggested_action: 'VIEW_PLAN',
          source: 'WEATHER',
          created_at: new Date().toISOString(),
        },
        {
          id: 'alert-community-1',
          type: 'COMMUNITY_RISK',
          title: 'Nearby Crop Health Concern',
          summary: '6 nearby Chilli farmers reported thrips symptoms recently.',
          priority: 'HIGH',
          status: 'UNREAD',
          suggested_action: 'CHECK_CROP',
          source: 'COMMUNITY_SIGNAL',
          created_at: new Date().toISOString(),
        }
      ],
      unread_count: 2,
      high_priority_count: 2,
    }),
    markAlertRead: vi.fn().mockResolvedValue({ success: true }),
    dismissAlert: vi.fn().mockResolvedValue({ success: true }),
    actionAlert: vi.fn().mockResolvedValue({ success: true }),
    getFarmTimeline: vi.fn().mockResolvedValue({
      success: true,
      timeline: [
        {
          id: 'mem-1',
          activity_type: 'IRRIGATION',
          title: 'Drip Irrigation Completed',
          description: 'Applied 18mm drip irrigation according to AI recommendation.',
          source: 'FARMER',
          recorded_at: '2026-09-10T10:00:00Z',
          outcome: 'RESOLVED',
        },
        {
          id: 'mem-2',
          activity_type: 'CROP_HEALTH_CHECK',
          title: 'Crop Inspection Follow-up',
          description: 'Uploaded leaf image. Mild curl symptoms diagnosed.',
          source: 'AI',
          recorded_at: '2026-09-08T09:00:00Z',
          outcome: 'IMPROVING',
        },
        {
          id: 'mem-3',
          activity_type: 'AEO_INTERVENTION',
          title: 'AEO Official Guidance',
          description: 'Officer Srinivas Rao recommended organic neem oil spray.',
          source: 'AEO',
          recorded_at: '2026-09-05T14:30:00Z',
          outcome: 'RESOLVED',
        }
      ],
      count: 3,
    }),
    getYieldEstimate: vi.fn().mockResolvedValue({
      success: true,
      crop_name: 'Chilli',
      area_acres: 2.0,
      estimated_min_kg: 2800.0,
      estimated_max_kg: 3600.0,
      estimated_unit: 'kg',
      confidence_level: 'MEDIUM',
      disclaimer: 'AI-assisted estimate based on historical and contextual factors',
      factors: [
        {
          name: 'Crop Stage',
          impact: 'POSITIVE',
          description: 'Healthy vegetative & flowering stage growth',
        }
      ],
    }),
    getHarvestPlan: vi.fn().mockResolvedValue({
      success: true,
      crop_name: 'Chilli',
      earliest_harvest_date: '2026-11-15',
      latest_harvest_date: '2026-11-25',
      days_to_window: 43,
      weather_consideration: 'Rain is expected around early harvest window. Monitor drying yards.',
      readiness_checklist: [
        'Pods turning uniform deep red color',
        'Clean tarpaulins arranged for sun drying'
      ],
    }),
    getMarketPrices: vi.fn().mockResolvedValue({
      success: true,
      commodity: 'Chilli',
      modal_price: 18500,
      price_unit: '₹ / Quintal',
      market_name: 'Warangal Enamamula Market',
    }),
    createHarvestRecord: vi.fn().mockResolvedValue({
      success: true,
      id: 'harvest-rec-1',
      message: 'Harvest record saved successfully.',
    }),
    getFarmAnalytics: vi.fn().mockResolvedValue({
      success: true,
      total_farm_area_acres: 4.0,
      total_irrigation_activities: 6,
      total_fertilizer_activities: 3,
      total_crop_issues: 2,
      resolved_crop_issues: 2,
    }),
  };
});

// Helper renderer
const renderWithProviders = (ui) => {
  return render(
    <LanguageProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </LanguageProvider>
  );
};

describe('Proactive Intelligence Layer: Alerts, Memory, Yield & Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock SpeechSynthesis
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
    };
    function MockUtterance(text) {
      this.text = text;
      this.lang = 'te-IN';
    }
    window.SpeechSynthesisUtterance = MockUtterance;
  });

  it('renders proactive AlertNotificationBanner with high-priority warnings', async () => {
    const handleActionTriggered = vi.fn();
    renderWithProviders(
      <AlertNotificationBanner
        farmerPhone="9876543210"
        fieldId="field-1"
        cropCycleId="crop-1"
        onActionTriggered={handleActionTriggered}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('alert-notification-banner')).toBeInTheDocument();
    });

    expect(screen.getByText(/Heavy Rainfall Expected Tomorrow/i)).toBeInTheDocument();

    // Expand banner
    fireEvent.click(screen.getByTestId('toggle-alerts-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('alert-action-btn-alert-weather-1')).toBeInTheDocument();
    });

    // Click 1-tap action
    fireEvent.click(screen.getByTestId('alert-action-btn-alert-weather-1'));
    await waitFor(() => {
      expect(handleActionTriggered).toHaveBeenCalledWith('VIEW_PLAN');
    });
  });

  it('triggers voice audio playback on Listen button click', async () => {
    renderWithProviders(
      <AlertNotificationBanner
        farmerPhone="9876543210"
        fieldId="field-1"
        cropCycleId="crop-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('alert-notification-banner')).toBeInTheDocument();
    });

    // Expand banner
    fireEvent.click(screen.getByTestId('toggle-alerts-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('alert-listen-btn-alert-weather-1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('alert-listen-btn-alert-weather-1'));
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('renders FarmMemoryView with chronological activities and explicit source attribution', async () => {
    renderWithProviders(
      <FarmMemoryView
        fieldId="field-1"
        cropCycleId="crop-1"
        farmerPhone="9876543210"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('farm-memory-timeline')).toBeInTheDocument();
    });

    expect(screen.getByText('Drip Irrigation Completed')).toBeInTheDocument();
    expect(screen.getByText('Crop Inspection Follow-up')).toBeInTheDocument();
    expect(screen.getByText('AEO Official Guidance')).toBeInTheDocument();

    // Verify source badges
    expect(screen.getByTestId('source-badge-mem-1')).toBeInTheDocument();
    expect(screen.getByTestId('source-badge-mem-2')).toBeInTheDocument();
    expect(screen.getByTestId('source-badge-mem-3')).toBeInTheDocument();
  });

  it('renders YieldHarvestPlannerCard with AI-assisted yield range and factors', async () => {
    renderWithProviders(
      <YieldHarvestPlannerCard
        cropCycleId="crop-1"
        farmerPhone="9876543210"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('yield-harvest-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/2,800/i)).toBeInTheDocument();
    expect(screen.getByText(/3,600/i)).toBeInTheDocument();
    expect(screen.getByText(/Healthy vegetative & flowering stage growth/i)).toBeInTheDocument();
    expect(screen.getByText(/Rain is expected around early harvest window/i)).toBeInTheDocument();
  });

  it('allows farmer to open modal and record actual harvested yield', async () => {
    renderWithProviders(
      <YieldHarvestPlannerCard
        cropCycleId="crop-1"
        farmerPhone="9876543210"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('open-record-harvest-btn')).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByTestId('open-record-harvest-btn'));
    expect(screen.getByTestId('actual-yield-input')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId('actual-yield-input'), { target: { value: '3200' } });
    fireEvent.click(screen.getByTestId('submit-harvest-btn'));

    await waitFor(() => {
      expect(api.createHarvestRecord).toHaveBeenCalledWith(expect.objectContaining({
        cropCycleId: 'crop-1',
        actualYieldKg: 3200,
      }));
    });
  });

  it('renders FarmAnalyticsCard with lightweight structured metrics', async () => {
    renderWithProviders(
      <FarmAnalyticsCard
        farmerPhone="9876543210"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('farm-analytics-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText(/6/)).toBeInTheDocument();
    expect(screen.getByText(/3/)).toBeInTheDocument();
  });
});
