import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllGroups,
  toggleGroupMembership,
  speakText,
} from '../services/communityDataStore';

export default function FarmerGroupsSection() {
  const { currentLang, t } = useLanguage();
  const [groups, setGroups] = useState(() => getAllGroups());
  const [groupDiscoveryType, setGroupDiscoveryType] = useState('CROP'); // 'CROP' | 'NEARBY'
  const [radiusFilterKm, setRadiusFilterKm] = useState(10); // 5 | 10 | 25
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Group voice chat room state
  const [isVoiceRoomActive, setIsVoiceRoomActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const langKey = currentLang === 'hi' ? 'hi' : currentLang === 'en' ? 'en' : 'te';

  const handleToggleJoin = (groupId, e) => {
    e.stopPropagation();
    const updated = toggleGroupMembership(groupId);
    setGroups(updated);
    if (selectedGroup && selectedGroup.id === groupId) {
      const found = updated.find((g) => g.id === groupId);
      setSelectedGroup(found);
    }
  };

  // Filtered groups based on active discovery mode
  const filteredGroups = groups.filter((g) => {
    if (groupDiscoveryType === 'CROP') {
      return g.type === 'CROP';
    }
    // NEARBY mode with configurable radius
    return g.type === 'NEARBY' && g.distance_km <= radiusFilterKm;
  });

  return (
    <div className="farmer-groups-container" data-testid="farmer-groups-section">
      {/* 1. Group Mode Switcher (Crop-wise vs Nearby) */}
      <div className="groups-navigation-bar">
        <div className="discovery-type-buttons">
          <button
            type="button"
            className={`btn btn-group-toggle ${groupDiscoveryType === 'CROP' ? 'active' : ''}`}
            onClick={() => {
              setGroupDiscoveryType('CROP');
              setSelectedGroup(null);
            }}
            data-testid="group-type-crop-btn"
          >
            <span>🌾 Plant / Crop-wise Groups</span>
          </button>
          <button
            type="button"
            className={`btn btn-group-toggle ${groupDiscoveryType === 'NEARBY' ? 'active' : ''}`}
            onClick={() => {
              setGroupDiscoveryType('NEARBY');
              setSelectedGroup(null);
            }}
            data-testid="group-type-nearby-btn"
          >
            <span>📍 Groups Near You</span>
          </button>
        </div>

        {/* Configurable Radius Selector (Only for Nearby Groups) */}
        {groupDiscoveryType === 'NEARBY' && (
          <div className="radius-selector-card" data-testid="radius-selector">
            <span className="radius-label">Nearby Search Radius:</span>
            <div className="radius-button-group">
              {[5, 10, 25].map((rad) => (
                <button
                  key={rad}
                  type="button"
                  className={`btn btn-sm btn-radius-pill ${radiusFilterKm === rad ? 'active' : ''}`}
                  onClick={() => setRadiusFilterKm(rad)}
                  data-testid={`radius-${rad}km-btn`}
                >
                  {rad} km
                </button>
              ))}
            </div>
            <small className="radius-hint">
              Showing farmer circles within {radiusFilterKm} km of your mandal.
            </small>
          </div>
        )}
      </div>

      {/* 2. Group List or Selected Group Detail */}
      {!selectedGroup ? (
        <div className="groups-grid">
          {filteredGroups.map((group) => {
            const groupName = group.name[langKey] || group.name.te || group.name.en;
            const groupDesc = group.description ? group.description[langKey] || group.description.te || group.description.en : '';

            return (
              <div
                key={group.id}
                className={`group-card card ${group.is_joined ? 'group-joined' : ''}`}
                onClick={() => setSelectedGroup(group)}
                data-testid={`group-card-${group.id}`}
              >
                <div className="group-card-header">
                  <div className="group-avatar-icon">{group.icon || '🌱'}</div>
                  <div className="group-header-text">
                    <h3 className="group-title">{groupName}</h3>
                    <div className="group-meta-tags">
                      <span className="group-members-pill">👥 {group.member_count} farmers</span>
                      {group.distance_km && (
                        <span className="group-distance-pill">
                          📍 {group.distance_km} km away
                        </span>
                      )}
                      {group.aeo_present && (
                        <span className="group-aeo-badge" title="Agricultural Extension Officer participates in this group">
                          🛡️ AEO Participating
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {groupDesc && <p className="group-description-text">{groupDesc}</p>}
                {group.approximate_locality && (
                  <div className="group-locality-sub">
                    <span>Coverage: {group.approximate_locality}</span>
                  </div>
                )}

                <div className="group-card-actions">
                  <button
                    type="button"
                    className={`btn btn-sm ${group.is_joined ? 'btn-outline-joined' : 'btn-primary'}`}
                    onClick={(e) => handleToggleJoin(group.id, e)}
                    data-testid={`join-group-${group.id}`}
                  >
                    {group.is_joined ? '✓ Joined' : '+ Join Group'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-view-group"
                    onClick={() => setSelectedGroup(group)}
                  >
                    Open Group →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Selected Group Detail View */
        <div className="group-detail-view" data-testid="group-detail-view">
          <div className="group-detail-header-card card">
            <button
              type="button"
              className="btn btn-sm btn-outline btn-back-groups"
              onClick={() => setSelectedGroup(null)}
            >
              ← Back to All Groups
            </button>

            <div className="group-banner-top">
              <span className="banner-icon-large">{selectedGroup.icon || '🌱'}</span>
              <div>
                <h2>{selectedGroup.name[langKey] || selectedGroup.name.te || selectedGroup.name.en}</h2>
                <div className="group-banner-meta">
                  <span>👥 {selectedGroup.member_count} active farmer members</span>
                  {selectedGroup.distance_km && <span>&bull; 📍 {selectedGroup.distance_km} km radius</span>}
                  {selectedGroup.aeo_present && (
                    <span className="badge-aeo-present">
                      🛡️ {selectedGroup.aeo_name || 'Official AEO Participating'}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className={`btn ${selectedGroup.is_joined ? 'btn-outline-joined' : 'btn-primary'}`}
                onClick={(e) => handleToggleJoin(selectedGroup.id, e)}
              >
                {selectedGroup.is_joined ? '✓ Joined Group' : '+ Join Group'}
              </button>
            </div>
          </div>

          {/* Group Voice Communication Room */}
          <div className="group-voice-room-panel card">
            <div className="voice-room-header">
              <div className="voice-room-title">
                <span className="voice-live-dot"></span>
                <strong>🎙️ Live Farmer Voice Channel</strong>
                <small>Listen & speak with local {selectedGroup.crop} growers</small>
              </div>

              <div className="voice-room-controls">
                {!isVoiceRoomActive ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsVoiceRoomActive(true)}
                  >
                    Connect to Voice Channel
                  </button>
                ) : (
                  <div className="voice-connected-actions">
                    <button
                      type="button"
                      className={`btn btn-sm ${isMuted ? 'btn-danger' : 'btn-outline'}`}
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? '🔇 Unmute' : '🎙️ Mute Mic'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setIsVoiceRoomActive(false)}
                    >
                      Leave Voice
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isVoiceRoomActive && (
              <div className="voice-room-live-grid">
                <div className="voice-speaker-chip active-speaker">
                  <span className="speaker-avatar">👨‍🌾</span>
                  <span>Ramesh Reddy (Padamati Sai Guda)</span>
                  <span className="audio-anim">🔊 Talking...</span>
                </div>
                <div className="voice-speaker-chip">
                  <span className="speaker-avatar">🛡️</span>
                  <span>Srinivas Rao (AEO)</span>
                  <span>🎧 Listening</span>
                </div>
                <div className="voice-speaker-chip">
                  <span className="speaker-avatar">👨‍🌾</span>
                  <span>You (Connected)</span>
                  <span>{isMuted ? '🔇 Muted' : '🎙️ Ready'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Group Specific Discussions Feed */}
          <div className="group-discussions-stream">
            <div className="stream-heading">
              <h3>💬 Group Discussions & Guidance</h3>
              <small>All advice is accessible with instant audio translation</small>
            </div>

            <div className="group-discussion-card card">
              <div className="discussion-author-row">
                <strong>🛡️ Srinivas Rao (Agricultural Extension Officer)</strong>
                <span className="badge-aeo-official">Official Guidance</span>
                <span className="comment-timestamp">Today at 10:15 AM</span>
              </div>
              <p className="discussion-text">
                {langKey === 'te'
                  ? `ఈ వారం ${selectedGroup.crop} సాగు చేస్తున్న రైతులు ఎరువుల వాడకాన్ని తగ్గించి, మురుగు నీరు నిలవకుండా చూడాలి. తెగుళ్ల లక్షణాలు కనిపిస్తే వెంటనే రైతు సేవా కేంద్రానికి సమాచారం ఇవ్వండి.`
                  : langKey === 'hi'
                  ? `इस सप्ताह ${selectedGroup.crop} उत्पादक किसान संतुलित उर्वरक दें और खेत में जलभराव न होने दें। लक्षण दिखने पर तुरंत रिपोर्ट करें।`
                  : `All ${selectedGroup.crop} farmers in the mandal are advised to suspend excessive urea and ensure drainage trenches are cleared before weekend showers.`}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-hear-audio"
                onClick={() =>
                  speakText(
                    langKey === 'te'
                      ? `ఈ వారం ${selectedGroup.crop} సాగు చేస్తున్న రైతులు ఎరువుల వాడకాన్ని తగ్గించి జాగ్రత్తలు పాటించాలి.`
                      : `All ${selectedGroup.crop} farmers are advised to follow drainage recommendations.`,
                    langKey
                  )
                }
              >
                🔊 Hear in {langKey.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
