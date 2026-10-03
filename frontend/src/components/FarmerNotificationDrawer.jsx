import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getAllAnnouncements,
} from '../services/communityDataStore';

export default function FarmerNotificationDrawer({ isOpen, onClose }) {
  const { currentLang, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => getAllNotifications());
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'AEO_UPDATE' | 'AEO_ANNOUNCEMENT' | 'COMMUNITY'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const langKey = currentLang === 'hi' ? 'hi' : currentLang === 'en' ? 'en' : 'te';

  useEffect(() => {
    if (isOpen) {
      setNotifications(getAllNotifications());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNotificationClick = (notif) => {
    markNotificationAsRead(notif.id);
    setNotifications(getAllNotifications());

    if (notif.action_type === 'PROBLEM_DETAIL') {
      onClose();
      navigate('/community', { state: { targetTab: 'PROBLEMS', problemId: notif.target_id } });
    } else if (notif.action_type === 'COMMUNITY_POST') {
      onClose();
      navigate('/community', { state: { targetTab: 'FEED', postId: notif.target_id } });
    } else if (notif.action_type === 'ANNOUNCEMENT') {
      const announcements = getAllAnnouncements();
      const target = announcements.find((a) => a.id === notif.target_id) || announcements[0];
      setSelectedAnnouncement(target);
    }
  };

  const handleMarkAllRead = () => {
    const updated = markAllNotificationsAsRead();
    setNotifications(updated);
  };

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'ALL') return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="farmer-notification-drawer">
      <div className="notification-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="bell-icon">🔔</span>
            <div>
              <h3>Farmer Notifications</h3>
              <small>{unreadCount} unread agricultural alert(s)</small>
            </div>
          </div>

          <div className="drawer-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline btn-mark-all"
                onClick={handleMarkAllRead}
                data-testid="mark-all-read-btn"
              >
                Mark all read
              </button>
            )}
            <button type="button" className="btn-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Filter categories */}
        <div className="drawer-category-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'AEO_UPDATE' ? 'active' : ''}`}
            onClick={() => setActiveTab('AEO_UPDATE')}
          >
            🛡️ AEO Updates
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'AEO_ANNOUNCEMENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('AEO_ANNOUNCEMENT')}
          >
            📢 Advisories
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'COMMUNITY' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMMUNITY')}
          >
            💬 Community
          </button>
        </div>

        {/* Notifications stream */}
        <div className="drawer-notifications-list">
          {filteredNotifs.length === 0 ? (
            <div className="empty-notifications-state">
              <span>🌾 No new notifications in this category.</span>
            </div>
          ) : (
            filteredNotifs.map((notif) => {
              const title = notif.title[langKey] || notif.title.te || notif.title.en;
              const msg = notif.message[langKey] || notif.message.te || notif.message.en;

              return (
                <div
                  key={notif.id}
                  className={`notification-item-card ${!notif.is_read ? 'unread-notification' : ''}`}
                  onClick={() => handleNotificationClick(notif)}
                  data-testid={`notif-item-${notif.id}`}
                >
                  <div className="notif-card-header">
                    <strong className="notif-title">{title}</strong>
                    {!notif.is_read && <span className="unread-dot"></span>}
                  </div>
                  <p className="notif-message-text">{msg}</p>
                  <div className="notif-meta-footer">
                    <span className="notif-time">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(notif.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="notif-tap-hint">Tap to view →</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal preview for Official AEO Announcement */}
        {selectedAnnouncement && (
          <div className="announcement-detail-overlay" onClick={() => setSelectedAnnouncement(null)}>
            <div className="announcement-modal-card card" onClick={(e) => e.stopPropagation()}>
              <div className="announcement-badge-header">
                <span>🛡️ OFFICIAL AEO ANNOUNCEMENT</span>
                <span className={`priority-pill priority-${selectedAnnouncement.priority?.toLowerCase()}`}>
                  {selectedAnnouncement.priority} Priority
                </span>
              </div>

              <h2>{selectedAnnouncement.title}</h2>

              <div className="announcement-meta-strip">
                <span>Issued by: <strong>{selectedAnnouncement.issued_by}</strong></span>
                <span>Crop: <strong>{selectedAnnouncement.crop}</strong></span>
                <span>Area: <strong>{selectedAnnouncement.target_area}</strong></span>
              </div>

              <div className="announcement-body-content">
                <pre className="announcement-formatted-text">
                  {selectedAnnouncement.content[langKey] ||
                    selectedAnnouncement.content.te ||
                    selectedAnnouncement.content.en}
                </pre>
              </div>

              <div className="announcement-modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setSelectedAnnouncement(null)}
                >
                  Close Advisory
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
