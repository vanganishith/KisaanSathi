import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { getAllPosts, fetchLiveCommunityPosts } from '../services/communityDataStore';
import CommunityPostCard from '../components/CommunityPostCard';
import CreatePostModal from '../components/CreatePostModal';
import FarmerGroupsSection from '../components/FarmerGroupsSection';
import LocalProblemsSection from '../components/LocalProblemsSection';

export default function CommunityPage() {
  const { currentLang, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Core 3 Tabs per specification: 'FEED' | 'GROUPS' | 'PROBLEMS'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.targetTab) return location.state.targetTab;
    if (location.pathname.includes('/problems')) return 'PROBLEMS';
    return 'FEED';
  });

  const [posts, setPosts] = useState(() => getAllPosts());
  const [cropFilter, setCropFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state if navigation changes
  useEffect(() => {
    if (location.state?.targetTab) {
      setActiveTab(location.state.targetTab);
    }
  }, [location.state]);

  const refreshPosts = () => {
    setPosts(getAllPosts());
  };

  // Sync real database posts on mount
  useEffect(() => {
    let mounted = true;
    setIsSyncing(true);
    fetchLiveCommunityPosts()
      .then(() => {
        if (mounted) {
          setPosts(getAllPosts());
          setIsSyncing(false);
        }
      })
      .catch(() => {
        if (mounted) setIsSyncing(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleStorageUpdate = () => {
      refreshPosts();
    };
    window.addEventListener('krishi_community_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('krishi_community_storage_updated', handleStorageUpdate);
  }, []);

  const filteredPosts = posts.filter((p) => {
    // 1. Exclude the current farmer's own complaints (seen in My Issues, not in Community)
    let myProfile = null;
    try {
      myProfile = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
    } catch {}
    if (myProfile && p.isSubmittedProblem) {
      if (myProfile.farmer_id && (p.farmer_id === myProfile.farmer_id || p.author?.id === myProfile.farmer_id)) {
        return false;
      }
      if (myProfile.phone) {
        const cleanPhone = String(myProfile.phone).replace(/[^0-9]/g, '');
        const pPhone = String(p.author?.phone || p.farmer_phone || '').replace(/[^0-9]/g, '');
        if (cleanPhone && pPhone && (cleanPhone === pPhone || pPhone.endsWith(cleanPhone.slice(-10)))) {
          return false;
        }
      }
    }
    // 2. Filter by crop
    if (cropFilter === 'ALL') return true;
    return p.crop?.toLowerCase() === cropFilter.toLowerCase();
  });

  return (
    <div className="community-page-wrapper" data-testid="community-page">
      {/* 1. COMMUNITY MAIN HEADER */}
      <header className="community-main-header">
        <div className="header-brand-block">
          <div className="brand-pill">
            <span className="brand-emoji">🌾</span>
            <span>Krishi Sahayak Field Network</span>
          </div>
          <h1 className="community-page-title">Farmer Community</h1>
          <p className="community-page-subtitle">
            Farmer Experiences &bull; Local Field Problems &bull; Verified AEO Guidance
          </p>
        </div>

        <div className="header-right-actions">
          <div className="locality-pill" title="Your approximate detected agricultural mandal">
            <span>📍 Ghatkesar Mandal, Medchal–Malkajgiri</span>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-create-community-post"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="open-create-post-modal-btn"
          >
            <span>＋ Share Problem / Create Post</span>
          </button>
        </div>
      </header>

      {/* 2. STRICTLY THREE CORE TABS NAVIGATION */}
      <nav className="community-navigation-tabs" aria-label="Community Core Tabs">
        <button
          type="button"
          className={`comm-tab-link ${activeTab === 'FEED' ? 'active' : ''}`}
          onClick={() => setActiveTab('FEED')}
          data-testid="tab-feed"
        >
          <span className="tab-icon">📰</span>
          <span className="tab-text">Community Feed</span>
        </button>

        <button
          type="button"
          className={`comm-tab-link ${activeTab === 'GROUPS' ? 'active' : ''}`}
          onClick={() => setActiveTab('GROUPS')}
          data-testid="tab-groups"
        >
          <span className="tab-icon">👥</span>
          <span className="tab-text">Farmer Groups</span>
        </button>

        <button
          type="button"
          className={`comm-tab-link ${activeTab === 'PROBLEMS' ? 'active' : ''}`}
          onClick={() => setActiveTab('PROBLEMS')}
          data-testid="tab-problems"
        >
          <span className="tab-icon">🔍</span>
          <span className="tab-text">Local Problems</span>
        </button>
      </nav>

      {/* 3. MAIN TAB CONTENT */}
      <main className="community-tab-content">
        {/* TAB 1: COMMUNITY FEED */}
        {activeTab === 'FEED' && (
          <section className="feed-view-section" data-testid="feed-view-section">
            {/* Quick summary banner */}
            <div className="feed-banner-card card">
              <div className="feed-banner-left">
                <span className="banner-emoji">💬</span>
                <div>
                  <h3>What are farmers experiencing and discussing?</h3>
                  <p>
                    Read proven treatments shared by fellow farmers in your area. Listen in your language or toggle original speech.
                  </p>
                </div>
              </div>

              {/* Quick Crop filter pills */}
              <div className="crop-filter-chips">
                {[
                  { label: 'All Crops', val: 'ALL' },
                  { label: '🌿 Cotton', val: 'Cotton' },
                  { label: '🌾 Rice / Paddy', val: 'Rice' },
                  { label: '🌶️ Chilli', val: 'Chilli' },
                  { label: '🍅 Tomato', val: 'Tomato' },
                  { label: '🥭 Mango', val: 'Mango' },
                ].map((c) => (
                  <button
                    key={c.val}
                    type="button"
                    className={`btn-crop-chip ${cropFilter === c.val ? 'active' : ''}`}
                    onClick={() => setCropFilter(c.val)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick in-feed Post Creator Box */}
            <div
              className="quick-composer-card card"
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="feed-quick-composer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 20px',
                background: '#ffffff',
                borderRadius: '14px',
                border: '1.5px solid #86efac',
                marginBottom: '16px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#16a34a';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#86efac';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.08)';
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0,
                }}
              >
                🌱
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#f8fafc',
                  borderRadius: '24px',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  fontSize: '0.925rem',
                  fontWeight: '500',
                  textAlign: 'left',
                }}
              >
                {currentLang === 'te'
                  ? 'మీ పంట సమస్యను లేదా అనుభవాన్ని ఇక్కడ పంచుకోండి... మాట్లాడండి లేదా టైప్ చేయండి'
                  : currentLang === 'hi'
                  ? 'अपने खेत की समस्या या अनुभव साझा करें... बोलें या लिखें'
                  : 'Share field problem or experience with nearby farmers... Tap to speak or type'}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ borderRadius: '20px', padding: '8px 18px', fontWeight: '700', whiteSpace: 'nowrap' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreateModalOpen(true);
                }}
              >
                ＋ Create Post
              </button>
            </div>

            {/* Posts Stream */}
            <div className="posts-stream">
              {filteredPosts.length === 0 ? (
                <div className="empty-community-state card">
                  <span>🌱 No posts found for {cropFilter}. Be the first to share an experience!</span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ marginTop: '14px' }}
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    ＋ Share Problem / Create Post
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <CommunityPostCard
                    key={post.id}
                    post={post}
                    onUpdate={refreshPosts}
                  />
                ))
              )}
            </div>
          </section>
        )}

        {/* TAB 2: FARMER GROUPS */}
        {activeTab === 'GROUPS' && <FarmerGroupsSection />}

        {/* TAB 3: LOCAL PROBLEMS */}
        {activeTab === 'PROBLEMS' && <LocalProblemsSection />}
      </main>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newPost) => {
            if (newPost) {
              setPosts((prev) => [newPost, ...prev.filter((p) => p.id !== newPost.id)]);
            } else {
              refreshPosts();
            }
            setActiveTab('FEED');
          }}
        />
      )}
    </div>
  );
}
