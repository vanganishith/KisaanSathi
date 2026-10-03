import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  togglePostWorkedForMe,
  toggleCommentWorkedForMe,
  addCommentToPost,
  speakText,
  stopSpeaking,
} from '../services/communityDataStore';

export default function CommunityPostCard({ post, onUpdate }) {
  const { currentLang, t } = useLanguage();
  const [showOriginal, setShowOriginal] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPlayingVoiceRecord, setIsPlayingVoiceRecord] = useState(false);
  const [voicePlaybackSeconds, setVoicePlaybackSeconds] = useState(0);

  // Comment Form state
  const [isCommentBoxOpen, setIsCommentBoxOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const [commentVoiceRecorded, setCommentVoiceRecorded] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);

  // Lightbox for image
  const [isImageOpen, setIsImageOpen] = useState(false);

  // Current language mapping: fallback to 'te' or 'en'
  const langKey = currentLang === 'hi' ? 'hi' : currentLang === 'en' ? 'en' : 'te';
  const displayContent = showOriginal
    ? (typeof post.content === 'object' && post.content !== null
        ? (post.content[post.original_language] || post.content.te || post.content.en || '')
        : (post.content || ''))
    : (typeof post.content === 'object' && post.content !== null
        ? (post.content[langKey] || post.content.te || post.content.en || '')
        : (post.content || ''));

  const originalLangName =
    post.original_language === 'te' ? 'తెలుగు (Telugu)' : post.original_language === 'hi' ? 'हिंदी (Hindi)' : 'English';

  // Audio Hear Button Handler
  const handleHearText = () => {
    if (isPlayingAudio) {
      stopSpeaking();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      speakText(displayContent, langKey, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  // Voice Note Player simulation
  const handleToggleVoicePlayback = () => {
    if (isPlayingVoiceRecord) {
      setIsPlayingVoiceRecord(false);
    } else {
      setIsPlayingVoiceRecord(true);
      setVoicePlaybackSeconds(0);
      const interval = setInterval(() => {
        setVoicePlaybackSeconds((prev) => {
          if (prev >= 25) {
            clearInterval(interval);
            setIsPlayingVoiceRecord(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  // Worked for Me button on post
  const handlePostWorkedForMe = () => {
    togglePostWorkedForMe(post.id);
    if (onUpdate) onUpdate();
  };

  // Worked for Me button on comment
  const handleCommentWorkedForMe = (commentId) => {
    toggleCommentWorkedForMe(post.id, commentId);
    if (onUpdate) onUpdate();
  };

  // Voice recording simulation for comments
  const handleStartVoiceComment = () => {
    setIsRecordingComment(true);
    setRecordingTimer(0);
    const interval = setInterval(() => {
      setRecordingTimer((sec) => {
        if (sec >= 4) {
          clearInterval(interval);
          setIsRecordingComment(false);
          setCommentVoiceRecorded(true);
          // Realistic speech-to-text conversion
          if (langKey === 'te') {
            setCommentText('నేను కూడా ఈ పద్ధతిని వాడాను, 4 రోజుల్లో ఫలితం కనిపించింది. చాలా ధన్యవాదాలు.');
          } else if (langKey === 'hi') {
            setCommentText('मैंने भी यही तरीका आजमाया था और 4 दिनों में अच्छा सुधार दिखा। बहुत उपयोगी सुझाव।');
          } else {
            setCommentText('I applied this recommended treatment in my plot and saw significant recovery within 4 days. Highly effective.');
          }
          return 4;
        }
        return sec + 1;
      });
    }, 1000);
  };

  // Submit comment
  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    // Retrieve active farmer or default
    let authorName = 'Fellow Farmer';
    try {
      const stored = JSON.parse(localStorage.getItem('kisaansathi_farmer_profile') || 'null');
      if (stored?.name) authorName = stored.name;
    } catch {}

    addCommentToPost(post.id, {
      author: {
        name: authorName,
        village: 'Ghatkesar Mandal',
        role: 'Farmer',
        is_officer: false,
      },
      content: commentText.trim(),
      contentTe: commentText.trim(),
      contentHi: commentText.trim(),
      contentEn: commentText.trim(),
      originalLanguage: langKey,
      hasVoice: commentVoiceRecorded,
      voiceDuration: commentVoiceRecorded ? '0:18' : null,
    });

    setCommentText('');
    setCommentVoiceRecorded(false);
    setIsCommentBoxOpen(false);
    if (onUpdate) onUpdate();
  };

  // Sort comments: Highest "Worked for Me" first
  const sortedComments = [...(post.comments || [])].sort(
    (a, b) => (b.worked_for_me_count || 0) - (a.worked_for_me_count || 0)
  );

  return (
    <article className="community-post-card card" data-testid={`community-post-${post.id}`}>
      {/* 1. Header: Author Identity & Approximate Locality */}
      <div className="post-header-row">
        <div className="author-identity-block">
          <div className="author-avatar-badge">
            {post.crop_icon || '🌱'}
          </div>
          <div>
            <div className="author-name-row">
              <strong className="author-name">{post.author?.name || 'Farmer'}</strong>
              <span className="author-locality-badge">
                📍 {post.approximate_location || 'Ghatkesar'}
              </span>
            </div>
            <div className="post-meta-sub">
              <span>{new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {post.severity && (
                <span className={`post-severity-pill severity-${post.severity.toLowerCase()}`}>
                  {post.severity} Severity
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Origin indicator if from submitted problem */}
        {post.is_submitted_problem && (
          <div className="submitted-origin-tag" title="Originated from a verified field problem report">
            <span>📋 From Field Report</span>
            {post.related_incident_ref && <small>#{post.related_incident_ref}</small>}
          </div>
        )}
      </div>

      {/* 2. Crop & Title */}
      <div className="post-crop-banner">
        <span className="crop-pill">
          {post.crop_icon || '🌱'} {post.crop}
        </span>
        <h3 className="post-headline">{post.title || `${post.crop || 'Field'} Observation`}</h3>
      </div>

      {/* 3. Text Description with Multilingual Controls */}
      <div className="post-content-container">
        <p className="post-body-text">{displayContent}</p>

        {/* Translation & Voice Audio Toolbar */}
        <div className="multilingual-audio-toolbar">
          <button
            type="button"
            className="btn btn-sm btn-hear-audio"
            onClick={handleHearText}
            data-testid={`hear-post-btn-${post.id}`}
            title="Listen to this post in your selected language"
          >
            {isPlayingAudio ? (
              <>
                <span className="audio-wave-anim">🔊 ⏹️</span>
                <span>Stop Listening</span>
              </>
            ) : (
              <>
                <span>🔊 Hear in {langKey.toUpperCase()}</span>
              </>
            )}
          </button>

          {post.original_language !== langKey && (
            <button
              type="button"
              className="btn btn-sm btn-outline-translate"
              onClick={() => setShowOriginal(!showOriginal)}
              data-testid={`translate-toggle-${post.id}`}
            >
              {showOriginal ? `🌐 Show Translated (${langKey.toUpperCase()})` : `🌐 View Original (${originalLangName})`}
            </button>
          )}
        </div>
      </div>

      {/* 4. Voice Description Note (If recorded by farmer) */}
      {post.has_voice && (
        <div className="post-voice-note-card" data-testid={`post-voice-note-${post.id}`}>
          <div className="voice-note-info">
            <span className="voice-mic-icon">🎙️</span>
            <div>
              <strong>Original Farmer Voice Description</strong>
              <small>Recorded in field ({post.voice_duration || '0:28'})</small>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-voice-play"
            onClick={handleToggleVoicePlayback}
          >
            {isPlayingVoiceRecord ? `⏸️ Pause (${voicePlaybackSeconds}s)` : '▶️ Play Voice'}
          </button>
        </div>
      )}

      {/* 5. Attached Photo (If available) */}
      {post.photo_url && (
        <div className="post-photo-wrapper">
          <img
            src={post.photo_url}
            alt={post.title}
            className="post-crop-photo"
            loading="lazy"
            onClick={() => setIsImageOpen(true)}
          />
          <small className="photo-caption">🔍 Click photo to expand crop symptom view</small>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {isImageOpen && (
        <div className="image-lightbox-backdrop" onClick={() => setIsImageOpen(false)}>
          <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={post.photo_url} alt={post.title} className="lightbox-full-img" />
            <button
              type="button"
              className="btn btn-sm btn-lightbox-close"
              onClick={() => setIsImageOpen(false)}
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}

      {/* 6. Interaction Bar: "Worked for Me" & Comment Trigger */}
      <div className="post-action-bar">
        <button
          type="button"
          className={`btn btn-worked-for-me ${post.has_user_worked_for_me ? 'active' : ''}`}
          onClick={handlePostWorkedForMe}
          data-testid={`worked-for-me-post-${post.id}`}
        >
          <span>👍</span>
          <strong>Worked for Me</strong>
          <span className="worked-count-badge">{post.worked_for_me_count || 0} farmers</span>
        </button>

        <button
          type="button"
          className="btn btn-outline-comment"
          onClick={() => setIsCommentBoxOpen(!isCommentBoxOpen)}
          data-testid={`toggle-comments-${post.id}`}
        >
          <span>💬</span>
          <span>Comments ({sortedComments.length})</span>
        </button>
      </div>

      {/* 7. Comments & Solutions Section */}
      <div className="post-comments-section">
        {/* Comment Form */}
        {isCommentBoxOpen && (
          <form onSubmit={handleSubmitComment} className="comment-create-form" data-testid="comment-form">
            <div className="comment-input-row">
              <textarea
                className="form-input comment-textarea"
                rows="2"
                placeholder="Share your practical field experience or solution..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
            </div>

            <div className="comment-voice-action-row">
              <button
                type="button"
                className={`btn btn-sm ${isRecordingComment ? 'btn-recording-active' : 'btn-voice-input'}`}
                onClick={handleStartVoiceComment}
                disabled={isRecordingComment}
              >
                {isRecordingComment ? `🎙️ Listening (${recordingTimer}s)...` : '🎙️ Speak Comment Instead'}
              </button>

              {commentVoiceRecorded && (
                <span className="voice-transcribed-hint">✓ Voice converted to text. You can edit above.</span>
              )}

              <button
                type="submit"
                className="btn btn-sm btn-primary btn-submit-comment"
                disabled={!commentText.trim()}
              >
                Post Solution / Comment
              </button>
            </div>
          </form>
        )}

        {/* Existing Comments list (Sorted by "Worked for Me") */}
        {sortedComments.length > 0 && (
          <div className="comments-stream">
            <div className="comments-header-label">
              <span>🌾 Practical Farmer Solutions & Official AEO Guidance</span>
              <small>Sorted by highest "Worked for Me" confirmation</small>
            </div>

            {sortedComments.map((comment) => {
              const commentDisplay =
                typeof comment.content === 'object' && comment.content !== null
                  ? comment.content[langKey] || comment.content.te || comment.content.en || ''
                  : comment.content || '';
              return (
                <div
                  key={comment.id}
                  className={`comment-item-card ${comment.is_officer ? 'aeo-official-comment' : ''}`}
                  data-testid={`comment-${comment.id}`}
                >
                  <div className="comment-header">
                    <div className="comment-author-info">
                      <strong>{comment.author?.name}</strong>
                      {comment.is_officer ? (
                        <span className="badge-aeo-official">
                          🛡️ Official AEO Guidance
                        </span>
                      ) : (
                        <span className="badge-farmer-role">
                          {comment.author?.village ? `📍 ${comment.author.village}` : '🌾 Farmer'}
                        </span>
                      )}
                    </div>
                    <span className="comment-timestamp">
                      {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="comment-content-text">{commentDisplay}</p>

                  <div className="comment-footer-row">
                    <button
                      type="button"
                      className={`btn btn-sm btn-worked-for-me-comment ${comment.has_user_worked_for_me ? 'active' : ''}`}
                      onClick={() => handleCommentWorkedForMe(comment.id)}
                      data-testid={`worked-for-me-comment-${comment.id}`}
                    >
                      <span>👍 Worked for Me</span>
                      <b>{comment.worked_for_me_count || 0} farmers</b>
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-comment-hear"
                      onClick={() => speakText(commentDisplay, langKey)}
                      title="Hear this comment"
                    >
                      🔊 Hear
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}
