import React from 'react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../context/LanguageContext';
import FarmerPillarHome from '../pages/FarmerPillarHome';
import CropLifecycleCard from '../components/CropLifecycleCard';
import WeatherContextCard from '../components/WeatherContextCard';
import SoilProfileCard from '../components/SoilProfileCard';
import FarmMemoryTimeline from '../components/FarmMemoryTimeline';
import VoiceAssistantHero from '../components/VoiceAssistantHero';
import * as api from '../services/api';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getUnifiedFarmContext: vi.fn().mockResolvedValue({
      success: true,
      farmer: { name: 'Ramesh Kumar', phone: '9876543210', village: 'Warangal' },
      farm: { total_area: 4.0 },
      crop: { crop_name: 'Chilli', area: 2.0 },
      cropStage: { crop_age_days: 48, current_stage: 'Vegetative & Establishment', next_stage: 'Flowering' },
      weather: { available: true, temperature_c: 29.5, relative_humidity_pct: 65, precipitation_probability_pct: 15, weather_condition: 'Partly cloudy' },
      soil: { soil_type: 'Red soil', is_verified: false },
      recentActivities: [],
    }),
    submitVoiceFarmUpdate: vi.fn().mockResolvedValue({
      success: true,
      conversational_ack: 'నమోదు చేశాము',
      current_context: { crop_name: 'Chilli', crop_age_days: 48 },
    }),
  };
});

// Helper to render with providers
const renderWithProviders = (ui) => {
  return render(
    <LanguageProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </LanguageProvider>
  );
};

describe('Foundation Layer: Three-Pillar Farm Decision Platform', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      'kisaansathi_farmer_profile',
      JSON.stringify({
        farmer_id: 'test-farmer-1',
        name: 'Ramesh Kumar',
        phone: '9876543210',
        village: 'Warangal',
        crop: 'Chilli',
      })
    );
  });

  it('renders Three-Pillar navigation tabs (PLAN, CROP, COMMUNITY)', () => {
    renderWithProviders(<FarmerPillarHome />);

    expect(screen.getByTestId('pillar-navigation-tabs')).toBeInTheDocument();
    expect(screen.getByTestId('pillar-tab-plan')).toBeInTheDocument();
    expect(screen.getByTestId('pillar-tab-crop')).toBeInTheDocument();
    expect(screen.getByTestId('pillar-tab-community')).toBeInTheDocument();
  });

  it('defaults to CROP pillar with CropLifecycleCard, Weather, Soil and Timeline', () => {
    renderWithProviders(<FarmerPillarHome />);

    expect(screen.getByTestId('pillar-content-crop')).toBeInTheDocument();
    expect(screen.getByTestId('crop-lifecycle-card')).toBeInTheDocument();
    expect(screen.getByTestId('weather-context-card')).toBeInTheDocument();
    expect(screen.getByTestId('soil-profile-card')).toBeInTheDocument();
    expect(screen.getByTestId('farm-memory-timeline')).toBeInTheDocument();
  });

  it('toggles seamlessly between PLAN, CROP, and COMMUNITY tabs', () => {
    renderWithProviders(<FarmerPillarHome />);

    // Switch to PLAN
    fireEvent.click(screen.getByTestId('pillar-tab-plan'));
    expect(screen.getByTestId('pillar-content-plan')).toBeInTheDocument();
    expect(screen.queryByTestId('pillar-content-crop')).not.toBeInTheDocument();

    // Switch to COMMUNITY
    fireEvent.click(screen.getByTestId('pillar-tab-community'));
    expect(screen.getByTestId('pillar-content-community')).toBeInTheDocument();
    expect(screen.queryByTestId('pillar-content-plan')).not.toBeInTheDocument();

    // Switch back to CROP
    fireEvent.click(screen.getByTestId('pillar-tab-crop'));
    expect(screen.getByTestId('pillar-content-crop')).toBeInTheDocument();
  });

  it('renders CropLifecycleCard with accurate crop name, age, and stage progression', () => {
    renderWithProviders(
      <CropLifecycleCard
        cropData={{ crop_name: 'Chilli', area: 2.0, crop_variety: 'Teja' }}
        cropStageData={{
          crop_age_days: 48,
          current_stage: 'Vegetative & Establishment',
          next_stage: 'Flowering',
          days_to_next_stage: 7,
          approx_harvest_window: 'Approx 90-110 days away',
          stage_care_activities: ['Maintain drip irrigation every 2-3 days; scout for thrips.'],
        }}
      />
    );

    expect(screen.getByText('Chilli')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText('Vegetative & Establishment')).toBeInTheDocument();
    expect(screen.getByText(/Flowering/i)).toBeInTheDocument();
    expect(screen.getByText(/Maintain drip irrigation/i)).toBeInTheDocument();
  });

  it('renders WeatherContextCard with Open-Meteo metrics, rain probability and agricultural context', () => {
    renderWithProviders(
      <WeatherContextCard
        weatherData={{
          available: true,
          temperature_c: 29.5,
          relative_humidity_pct: 65,
          precipitation_probability_pct: 15,
          wind_speed_kmh: 10.5,
          weather_condition: 'Partly cloudy',
          agricultural_hints: ['Favorable weather window for field operations and planned crop care.'],
          source: 'Open-Meteo',
        }}
      />
    );

    expect(screen.getByText('29.5°C')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
    expect(screen.getByText(/Favorable weather window/i)).toBeInTheDocument();
  });

  it('renders SoilProfileCard without fabricating unverified NPK lab values', () => {
    renderWithProviders(
      <SoilProfileCard
        soilData={{
          soil_type: 'Red soil',
          is_verified: false,
          source: 'farmer_statement',
          ph: null,
          n: null,
          p: null,
          k: null,
        }}
      />
    );

    expect(screen.getByText('Red soil')).toBeInTheDocument();
    expect(screen.getByText('📝 Farmer Stated')).toBeInTheDocument();
    expect(screen.getByText(/ఖచ్చితమైన pH & N-P-K|Exact pH & NPK/i)).toBeInTheDocument();
  });

  it('renders FarmMemoryTimeline with 1-tap quick action buttons', () => {
    renderWithProviders(
      <FarmMemoryTimeline
        fieldId="field-1"
        cropCycleId="cycle-1"
        activities={[
          { id: '1', title: 'Chilli Planted', activity_type: 'planting', event_date: '2026-08-10T09:00:00Z' },
          { id: '2', title: 'Drip Irrigation', activity_type: 'irrigation', event_date: '2026-08-18T07:30:00Z' },
        ]}
      />
    );

    expect(screen.getByText('Chilli Planted')).toBeInTheDocument();
    expect(screen.getByText('Drip Irrigation')).toBeInTheDocument();
    expect(screen.getByText(/నీరు పెట్టాను|Watered/i)).toBeInTheDocument();
    expect(screen.getByText(/ఎరువు వేశాను|Fertilized/i)).toBeInTheDocument();
  });

  it('renders VoiceAssistantHero with prominent microphone button and quick voice chips', () => {
    renderWithProviders(
      <VoiceAssistantHero
        farmer={{ name: 'Ramesh', phone: '9876543210', village: 'Warangal' }}
        activeCrop="Chilli"
        cropAge={48}
      />
    );

    expect(screen.getByTestId('voice-hero-mic-btn')).toBeInTheDocument();
    expect(screen.getByText(/ASK KISAANSAATHI|కిసాన్‌సాథి తో మాట్లాడండి/i)).toBeInTheDocument();
    expect(screen.getAllByText(/మిరప ఉంది|Chilli/i).length).toBeGreaterThanOrEqual(1);
  });
});
