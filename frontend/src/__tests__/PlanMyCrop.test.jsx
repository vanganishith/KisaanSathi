import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlanMyCropPage from '../pages/PlanMyCropPage';
import { LanguageProvider } from '../context/LanguageContext';
import * as api from '../services/api';

describe('PlanMyCropPage Component (AI Crop Planning)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithLanguage = (ui) => {
    return render(
      <MemoryRouter>
        <LanguageProvider>{ui}</LanguageProvider>
      </MemoryRouter>
    );
  };

  const mockRecommendationResponse = {
    success: true,
    input: {
      land_area_acres: 3,
      soil_type: 'BLACK',
      location: 'Medchal–Malkajgiri, Telangana',
      season: 'KHARIF',
      season_display: 'Kharif (Monsoon Season)',
    },
    summary: {
      location_label: 'Medchal–Malkajgiri, Telangana',
      season_label: 'Kharif (Monsoon Season)',
      soil_label: 'Black Soil',
      land_label: '3 Acres',
      intro_text: 'Based on your 3 acres of Black Soil in Medchal–Malkajgiri, here are the top options:',
    },
    recommendations: [
      {
        crop_name: 'Cotton (Bt Cotton)',
        reason: 'Black soils offer high moisture retention, ideal for cotton deep taproots.',
        estimated_investment_per_acre: 25000,
        estimated_total_investment: 75000,
        estimated_return_per_acre_min: 45000,
        estimated_return_per_acre_max: 65000,
        estimated_total_return_min: 135000,
        estimated_total_return_max: 195000,
        estimated_duration: '150 – 170 days',
        risk_note: 'Maintain drainage to prevent root rot.',
      },
      {
        crop_name: 'Red Gram (Pigeon Pea)',
        reason: 'Leguminous pulse that enriches soil nitrogen.',
        estimated_investment_per_acre: 15000,
        estimated_total_investment: 45000,
        estimated_return_per_acre_min: 35000,
        estimated_return_per_acre_max: 48000,
        estimated_total_return_min: 105000,
        estimated_total_return_max: 144000,
        estimated_duration: '160 – 180 days',
        risk_note: 'Inspect for pod borer at flowering.',
      }
    ],
    government_support: [
      {
        name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
        what_it_supports: 'Crop loss insurance',
        relevance: 'Potentially relevant: Financial safety net',
        how_to_apply: 'Nearest PACS or bank',
        source: 'pmfby.gov.in',
      }
    ],
    has_government_support: true,
    disclaimer: 'All investments and returns are estimates.',
  };

  it('renders Plan My Crop title, acre stepper with default 2 acres, and soil cards', () => {
    renderWithLanguage(<PlanMyCropPage />);

    expect(screen.getByTestId('acres-count')).toHaveTextContent('2');
    expect(screen.getByTestId('decrease-acres-btn')).toBeInTheDocument();
    expect(screen.getByTestId('increase-acres-btn')).toBeInTheDocument();
    expect(screen.getByTestId('soil-black-btn')).toBeInTheDocument();
    expect(screen.getByTestId('soil-red-btn')).toBeInTheDocument();
  });

  it('updates land area using + and − controls and prevents going below 1', () => {
    renderWithLanguage(<PlanMyCropPage />);

    const decBtn = screen.getByTestId('decrease-acres-btn');
    const incBtn = screen.getByTestId('increase-acres-btn');
    const acresDisplay = screen.getByTestId('acres-count');

    // Click +
    fireEvent.click(incBtn);
    expect(acresDisplay).toHaveTextContent('3');

    // Click − twice
    fireEvent.click(decBtn);
    expect(acresDisplay).toHaveTextContent('2');
    fireEvent.click(decBtn);
    expect(acresDisplay).toHaveTextContent('1');

    // Dec button is now disabled at 1 acre
    expect(decBtn).toBeDisabled();
  });

  it('allows toggling between Black Soil and Red Soil', () => {
    renderWithLanguage(<PlanMyCropPage />);

    const redSoilBtn = screen.getByTestId('soil-red-btn');
    const blackSoilBtn = screen.getByTestId('soil-black-btn');

    // Select Red Soil
    fireEvent.click(redSoilBtn);
    expect(redSoilBtn).toHaveTextContent('Red Soil');

    // Select Black Soil
    fireEvent.click(blackSoilBtn);
    expect(blackSoilBtn).toHaveTextContent('Black Soil');
  });

  it('submits recommendation request and renders crop recommendations with whole-farm math', async () => {
    vi.spyOn(api, 'getCropPlanningRecommendations').mockResolvedValue(mockRecommendationResponse);

    renderWithLanguage(<PlanMyCropPage />);

    const submitBtn = screen.getByTestId('submit-crop-planning');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Cotton (Bt Cotton)')).toBeInTheDocument();
      expect(screen.getByText('Red Gram (Pigeon Pea)')).toBeInTheDocument();
      expect(screen.getByTestId('continue-crop-0')).toBeInTheDocument();
    });
  });

  it('shows confirmation modal when Continue with Crop is clicked', async () => {
    vi.spyOn(api, 'getCropPlanningRecommendations').mockResolvedValue(mockRecommendationResponse);

    renderWithLanguage(<PlanMyCropPage />);

    const submitBtn = screen.getByTestId('submit-crop-planning');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('continue-crop-0')).toBeInTheDocument();
    });

    // Click Continue with Cotton
    fireEvent.click(screen.getByTestId('continue-crop-0'));

    expect(screen.getByTestId('confirm-add-crop-btn')).toBeInTheDocument();
    expect(screen.getByTestId('planted-today-yes')).toBeInTheDocument();
    expect(screen.getByTestId('planted-today-no')).toBeInTheDocument();
  });

  it('allows clicking "Plan Another Plot" to return to input form', async () => {
    vi.spyOn(api, 'getCropPlanningRecommendations').mockResolvedValue(mockRecommendationResponse);

    renderWithLanguage(<PlanMyCropPage />);

    const submitBtn = screen.getByTestId('submit-crop-planning');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('plan-another-btn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('plan-another-btn'));

    expect(screen.getByTestId('acres-count')).toBeInTheDocument();
  });
});
