import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllProblems,
  fetchLiveLocalProblems,
  toggleProblemFacingToo,
  speakText,
} from '../services/communityDataStore';

export default function LocalProblemsSection({ onSelectProblem }) {
  const { currentLang, t } = useLanguage();
  const [problems, setProblems] = useState(() => getAllProblems());
  const [selectedProblem, setSelectedProblem] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchLiveLocalProblems()
      .then((live) => {
        if (mounted && Array.isArray(live)) {
          setProblems(live);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const langKey = currentLang === 'hi' ? 'hi' : currentLang === 'en' ? 'en' : 'te';

  const handleFacingToo = (problemId, e) => {
    e.stopPropagation();
    const { updated, isNowFacing } = toggleProblemFacingToo(problemId);
    setProblems(updated);
    if (selectedProblem && selectedProblem.id === problemId) {
      const target = updated.find((p) => p.id === problemId);
      setSelectedProblem(target);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'AEO Verified':
        return 'status-aeo-verified';
      case 'Under Investigation':
        return 'status-under-investigation';
      case 'Emerging Problem':
        return 'status-emerging';
      default:
        return 'status-farmer-reported';
    }
  };

  return (
    <div className="local-problems-container" data-testid="local-problems-section">
      {!selectedProblem ? (
        <>
          <div className="problems-section-intro">
            <div>
              <h3>🔍 Agricultural Problems Around You</h3>
              <p>Clustered reports from nearby farmers in your mandal with verified AEO advisories.</p>
            </div>
            <div className="problems-legend">
              <span className="legend-tag status-aeo-verified">🛡️ AEO Verified</span>
              <span className="legend-tag status-under-investigation">🔬 Under Investigation</span>
              <span className="legend-tag status-emerging">⚠️ Emerging</span>
            </div>
          </div>

          <div className="problems-grid">
            {problems.map((prob) => {
              const title = prob.title[langKey] || prob.title.te || prob.title.en;
              const symptoms = prob.symptoms[langKey] || prob.symptoms.te || prob.symptoms.en;

              return (
                <div
                  key={prob.id}
                  className={`problem-cluster-card card ${prob.status === 'AEO Verified' ? 'border-verified' : ''}`}
                  onClick={() => setSelectedProblem(prob)}
                  data-testid={`problem-card-${prob.id}`}
                >
                  <div className="problem-cluster-header">
                    <span className="crop-pill">
                      {prob.crop_icon} {prob.crop}
                    </span>
                    <span className={`status-badge ${getStatusBadgeClass(prob.status)}`}>
                      {prob.status}
                    </span>
                  </div>

                  <h3 className="problem-title">{title}</h3>
                  <p className="problem-symptoms-snippet">{symptoms}</p>

                  <div className="problem-metrics-grid">
                    <div className="metric-box problem-metric-box">
                      <strong>{prob.affected_farmers_count}</strong>
                      <span>Farmers Affected</span>
                    </div>
                    <div className="metric-box problem-metric-box">
                      <strong>{prob.affected_mandals_count}</strong>
                      <span>Mandals / Areas</span>
                    </div>
                    <div className="metric-box problem-metric-box">
                      <strong>{prob.total_reports_count}</strong>
                      <span>Reports Clustered</span>
                    </div>
                  </div>

                  {prob.status === 'AEO Verified' && prob.aeo_verified_response ? (
                    <div className="aeo-verified-preview-strip">
                      <span>🛡️ Official AEO Response Issued</span>
                      <small>Verified by {prob.aeo_verified_response.officer_name}</small>
                    </div>
                  ) : (
                    <div className="emerging-status-preview-strip">
                      <span>🔬 Field Reports Under Review</span>
                      <small>Local field alerts active</small>
                    </div>
                  )}

                  <div className="problem-cluster-actions">
                    <button
                      type="button"
                      className={`btn btn-facing-too ${prob.user_facing_this_too ? 'active' : ''}`}
                      onClick={(e) => handleFacingToo(prob.id, e)}
                      data-testid={`facing-too-btn-${prob.id}`}
                    >
                      <span>{prob.user_facing_this_too ? '✓ Recorded: Facing This Too' : "🌱 I'm Facing This Too"}</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-view-problem-details"
                      onClick={() => setSelectedProblem(prob)}
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Problem Detail View */
        <div className="problem-detail-container" data-testid="problem-detail-view">
          <button
            type="button"
            className="btn btn-sm btn-outline btn-back-problems"
            onClick={() => setSelectedProblem(null)}
          >
            ← Back to Clustered Problems
          </button>

          <div className="problem-detail-header-card card">
            <div className="detail-header-top">
              <span className="crop-pill">
                {selectedProblem.crop_icon} {selectedProblem.crop}
              </span>
              <span className={`status-badge ${getStatusBadgeClass(selectedProblem.status)}`}>
                {selectedProblem.status}
              </span>
            </div>

            <h1 className="detail-headline">
              {selectedProblem.title[langKey] || selectedProblem.title.te || selectedProblem.title.en}
            </h1>

            <div className="detail-meta-row">
              <span>📍 Approximate Area: <strong>{selectedProblem.approximate_area}</strong></span>
              <span>&bull; First reported: {selectedProblem.first_reported}</span>
              <span>&bull; Activity: {selectedProblem.latest_activity}</span>
            </div>

            {/* Prominent "I'm Facing This Too" Action */}
            <div className="detail-facing-too-card">
              <div className="facing-too-text">
                <h3>Is this problem happening in your plot too?</h3>
                <p>
                  Help the agriculture department monitor the spread. Your exact coordinates are kept strictly confidential.
                </p>
              </div>
              <button
                type="button"
                className={`btn btn-facing-too-large ${selectedProblem.user_facing_this_too ? 'active' : ''}`}
                onClick={(e) => handleFacingToo(selectedProblem.id, e)}
                data-testid="detail-facing-too-btn"
              >
                <span>🌱</span>
                <strong>
                  {selectedProblem.user_facing_this_too
                    ? "✓ You're Linked to this Problem Cluster"
                    : "I'm Facing This Too"}
                </strong>
                <span className="count-pill">{selectedProblem.affected_farmers_count} farmers confirmed</span>
              </button>
            </div>
          </div>

          {/* OFFICIAL AEO VERIFIED RESPONSE CARD (If investigated) */}
          {selectedProblem.aeo_verified_response ? (
            <div className="aeo-verified-response-card card" data-testid="aeo-verified-card">
              <div className="aeo-verified-header">
                <div className="aeo-badge-large">
                  <span className="shield-icon">🛡️</span>
                  <div>
                    <h2>OFFICIAL AEO VERIFIED RESPONSE</h2>
                    <span>Issued by Department of Agriculture &bull; Official Inspection</span>
                  </div>
                </div>
                <div className="aeo-officer-stamp">
                  <strong>{selectedProblem.aeo_verified_response.officer_name}</strong>
                  <small>{selectedProblem.aeo_verified_response.designation}</small>
                  <small className="inspection-date">Verified: {selectedProblem.aeo_verified_response.verification_date}</small>
                </div>
              </div>

              <div className="aeo-verified-body">
                <div className="verified-section">
                  <h4>🔬 Diagnostic Field Finding:</h4>
                  <p>
                    {selectedProblem.aeo_verified_response.summary[langKey] ||
                      selectedProblem.aeo_verified_response.summary.te ||
                      selectedProblem.aeo_verified_response.summary.en}
                  </p>
                </div>

                <div className="verified-section action-section">
                  <h4>🌾 Prescribed Treatment & Preventive Action:</h4>
                  <pre className="prescribed-action-text">
                    {selectedProblem.aeo_verified_response.recommended_action[langKey] ||
                      selectedProblem.aeo_verified_response.recommended_action.te ||
                      selectedProblem.aeo_verified_response.recommended_action.en}
                  </pre>
                </div>

                <button
                  type="button"
                  className="btn btn-hear-audio"
                  onClick={() =>
                    speakText(
                      selectedProblem.aeo_verified_response.recommended_action[langKey] ||
                        selectedProblem.aeo_verified_response.recommended_action.te ||
                        selectedProblem.aeo_verified_response.recommended_action.en,
                      langKey
                    )
                  }
                >
                  🔊 Hear Official Advisory in {langKey.toUpperCase()}
                </button>
              </div>

              <div className="aeo-verified-footer">
                <small>
                  ✓ This is verified guidance based on physical field sample analysis. Always follow recommended dilution ratios.
                </small>
              </div>
            </div>
          ) : (
            <div className="aeo-investigation-pending card">
              <span className="pending-icon">🔬</span>
              <div>
                <strong>AEO Field Investigation in Progress</strong>
                <p>
                  18+ farmers in Ghatkesar have flagged this issue. The local Agricultural Extension Officer has been scheduled to inspect and formulate verified recommendations.
                </p>
              </div>
            </div>
          )}

          {/* Investigation & Clustered Timeline */}
          <div className="problem-timeline-card card">
            <h3>📈 Cluster Progress & Investigation Journey</h3>
            <div className="cluster-timeline-steps">
              {selectedProblem.timeline.map((step, idx) => (
                <div key={idx} className="timeline-step-row">
                  <span className="step-num">{idx + 1}</span>
                  <div className="step-content">
                    <strong>{step.step}</strong>
                    <small>{step.date}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
