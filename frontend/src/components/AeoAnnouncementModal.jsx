import React, { useState } from 'react';
import { createAeoAnnouncement } from '../services/communityDataStore';

export default function AeoAnnouncementModal({ isOpen, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [crop, setCrop] = useState('All Crops (Broad Advisory)');
  const [targetArea, setTargetArea] = useState('Ghatkesar & Keesara Mandals');
  const [priority, setPriority] = useState('High');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);

    let officerName = 'Srinivas Rao (AEO)';
    let officerId = 'AEO-MDCL-014';
    try {
      const officer = JSON.parse(localStorage.getItem('aeo_officer_session') || 'null');
      if (officer?.name) officerName = officer.name;
      if (officer?.officer_id) officerId = officer.officer_id;
    } catch {}

    const newAnn = createAeoAnnouncement({
      title: title.trim(),
      crop,
      target_area: targetArea,
      priority,
      message: message.trim(),
      officer_name: officerName,
      officer_id: officerId,
    });

    setIsSubmitting(false);
    setSuccessNotice(true);

    setTimeout(() => {
      setSuccessNotice(false);
      if (onCreated) onCreated(newAnn);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="aeo-announcement-modal">
      <div className="modal-card aeo-announcement-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-icon-title">
            <span className="modal-icon">📢</span>
            <div>
              <h2>Issue Official AEO Announcement / Advisory</h2>
              <small>Broadcast verified guidance directly to registered farmers in target mandals</small>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {successNotice ? (
          <div className="announcement-success-splash">
            <div className="success-icon-badge">✓</div>
            <h3>Announcement Broadcasted Successfully!</h3>
            <p>Farmers in {targetArea} have received this advisory on their home notification feed.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="aeo-announcement-form">
            <div className="form-group">
              <label className="form-label">Announcement Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Heavy Rain Alert & Drainage Action in Paddy Fields"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="announcement-title-input"
              />
            </div>

            <div className="form-row-dual">
              <div className="form-group">
                <label className="form-label">Target Crop / Category</label>
                <select
                  className="form-select"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                >
                  <option value="All Crops (Broad Advisory)">All Crops (Broad Advisory)</option>
                  <option value="Paddy / Rice">🌾 Paddy / Rice</option>
                  <option value="Tomato">🍅 Tomato</option>
                  <option value="Chilli">🌶️ Chilli</option>
                  <option value="Cotton">🌿 Cotton</option>
                  <option value="Mango">🥭 Mango</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Advisory Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="Normal">Normal (Information / Subsidy)</option>
                  <option value="High">High (Seasonal Weather / Sowing)</option>
                  <option value="Urgent">🚨 Urgent (Outbreak / Calamity)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Target Geographic Area</label>
              <input
                type="text"
                className="form-input"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                placeholder="e.g. Ghatkesar, Medchal & Keesara"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Official Advisory Message *</label>
              <textarea
                className="form-input"
                rows="5"
                placeholder="Provide clear, actionable agronomic instructions (dosage, cultural practices, precautions)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                data-testid="announcement-message-input"
              />
              <small className="form-hint">
                🔒 Marked with 🛡️ OFFICIAL AEO ANNOUNCEMENT verification stamp in farmer feeds.
              </small>
            </div>

            <div className="modal-actions-footer">
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !title.trim() || !message.trim()}
                data-testid="submit-announcement-btn"
              >
                {isSubmitting ? 'Publishing...' : '📢 Publish & Notify Farmers'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
