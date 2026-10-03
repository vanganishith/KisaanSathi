import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LanguageProvider } from '../context/LanguageContext';
import IrrigationDecisionCard from '../components/IrrigationDecisionCard';
import FertilizerAdvisoryCard from '../components/FertilizerAdvisoryCard';
import CropHealthCheckCard from '../components/CropHealthCheckCard';
import TodayPlanCard from '../components/TodayPlanCard';
import * as api from '../services/api';

vi.mock('../services/api', async () => {
  const actual = await vi.importActual('../services/api');
  return {
    ...actual,
    getIrrigationRecommendation: vi.fn(),
    logIrrigationEvent: vi.fn(),
    getFertilizerRecommendation: vi.fn(),
    logFertilizerEvent: vi.fn(),
    assessCropHealth: vi.fn(),
    getTodayPlan: vi.fn(),
    getAiRecommendation: vi.fn(),
  };
});

describe('Intelligence Layer Frontend Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders IrrigationDecisionCard with DEFER recommendation and supports 1-tap logging', async () => {
    api.getIrrigationRecommendation.mockResolvedValueOnce({
      success: true,
      decision: 'DEFER',
      title: 'Do not irrigate today',
      summary: 'Rain expected tomorrow. Soil moisture sufficient.',
      farmer_response: 'ఈరోజు నీరు పెట్టాల్సిన అవసరం లేదు. రేపు వర్షం వచ్చే అవకాశం ఉంది.',
      factors: ['Upcoming precipitation probability 80%', 'Field has drip irrigation'],
      days_since_last_irrigation: 2,
    });

    api.logIrrigationEvent.mockResolvedValueOnce({
      success: true,
      activity: { id: 'act-1' },
    });

    render(
      <LanguageProvider>
        <IrrigationDecisionCard
          fieldId="field-1"
          cropCycleId="cycle-1"
          farmerPhone="9876543210"
        />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('irrigation-decision-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/Do not irrigate today/i)).toBeInTheDocument();
    expect(screen.getByTestId('log-irrigation-btn')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('log-irrigation-btn'));
    await waitFor(() => {
      expect(api.logIrrigationEvent).toHaveBeenCalled();
    });
  });

  it('renders FertilizerAdvisoryCard with zero-fabrication safety notice and stage guidance', async () => {
    api.getFertilizerRecommendation.mockResolvedValueOnce({
      success: true,
      crop_name: 'Chilli',
      stage: 'flowering',
      soil_test_available: false,
      title: 'Flowering Stage Nutrient Advisory (Standard)',
      summary: 'Focus on phosphorus and potassium balance for flower retention.',
      farmer_response: 'పుత మరియు కాత నిలబడటానికి పొటాష్ మరియు బోరాన్ సమతుల్యత అవసరం.',
      timing: 'Apply in split doses during morning or evening.',
      warnings: ['No verified soil test available. Stage baseline guidance only.'],
      washoff_risk: false,
    });

    render(
      <LanguageProvider>
        <FertilizerAdvisoryCard
          fieldId="field-1"
          cropCycleId="cycle-1"
          farmerPhone="9876543210"
        />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('fertilizer-advisory-card')).toBeInTheDocument();
    });

    expect(screen.getByText(/Flowering Stage Nutrient Advisory/i)).toBeInTheDocument();
  });

  it('renders CropHealthCheckCard and handles insufficient image quality without false disease claims', async () => {
    api.assessCropHealth.mockResolvedValueOnce({
      success: true,
      image_insufficient: true,
      farmer_response: 'Image quality is insufficient for reliable diagnosis. Please upload a clear photo of the leaf.',
      requires_aeo: false,
    });

    render(
      <LanguageProvider>
        <CropHealthCheckCard
          fieldId="field-1"
          cropCycleId="cycle-1"
          farmerPhone="9876543210"
        />
      </LanguageProvider>
    );

    const descInput = screen.getByPlaceholderText(/ఆకులపై మచ్చలు|Describe leaf spots/i);
    fireEvent.change(descInput, { target: { value: 'Curling leaves' } });

    const runBtn = screen.getByTestId('run-crop-health-btn');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByTestId('crop-health-result')).toBeInTheDocument();
    });

    expect(screen.getByText(/Photo Quality Insufficient|చిత్రం అస్పష్టంగా ఉంది/i)).toBeInTheDocument();
  });

  it('renders TodayPlanCard with prioritized actions', async () => {
    api.getTodayPlan.mockResolvedValueOnce({
      success: true,
      date: '2026-10-03',
      priorities: [
        {
          type: 'IRRIGATION',
          priority: 'HIGH',
          title: 'Hold Irrigation Due to Rain',
          summary: 'Rainfall expected. Defer watering today.',
          reasoning: '80% rain forecast.',
          actions: ['Check soil drainage'],
        },
        {
          type: 'FERTILIZER',
          priority: 'MEDIUM',
          title: 'Flowering Nutrient Window',
          summary: 'Apply stage booster.',
          actions: ['Avoid applying in heavy rain'],
        },
      ],
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

    expect(screen.getByText(/Hold Irrigation Due to Rain/i)).toBeInTheDocument();
    expect(screen.getByText(/Flowering Nutrient Window/i)).toBeInTheDocument();
  });
});
