import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { HS, ICONS } from '../tokens';
import { Icon, Button, BottomNav, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const generateAnonName = () => {
  const adjectives = ['Brave', 'Forte', 'Sage', 'Noble', 'Libre', 'Courageuse', 'Lumière', 'Étoile', 'Aile', 'Flamme', 'Voix', 'Cœur', 'Âme', 'Pluie', 'Vent'];
  const nouns = ['Guerrière', 'Reine', 'Lotus', 'Phénix', 'Aurore', 'Harmonie', 'Victoire', 'Sagesse', 'Liberté', 'Éspoir', 'Fleur', 'Aube', 'Écho', 'Vague', 'Couleur'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);
  return `${adj}${noun}${num}`;
};

// NO HARDCODED CONTENT - LOAD FROM API ONLY

const Post = ({ item, type, onDelete, onReport, user, setToast, CATEGORIES }) => {
  const [open, setOpen] = useState(item.trigger_warning_level === 'none' || item.trigger_warning_level === 'low');
  const [reported, setReported] = useState(false);
  const [liked, setLiked] = useState(item.user_liked || false);
  const [supportCount, setSupportCount] = useState(item.support_count || 0);
  const [commentCount, setCommentCount] = useState(item.comment_count || 0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentLikes, setCommentLikes] = useState({});
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLikes, setReplyLikes] = useState({});
  const myPosts = JSON.parse(localStorage.getItem('lesgirls_my_posts') || '{}');
  const isOwner = item.user_id === user?.id || myPosts[item.id] === type;
  const isSensitive = item.trigger_warning_level === 'moderate' || item.trigger_warning_level === 'severe';

  // Charger les commentaires existants
  useEffect(() => {
    if (showCommentsModal) {
      if (type === 'testimony') {
        api.get(`/api/testimonies/${item.id}/comments`).then(r => {
          const comms = r.data.data || [];
          setComments(comms);
          setCommentCount(comms.length);
          const likedComments = JSON.parse(localStorage.getItem('lesgirls_comment_likes') || '{}');
          const likes = {};
          comms.forEach(c => {
            likes[c.id] = likedComments[c.id] || false;
          });
          setCommentLikes(likes);
        }).catch(() => setComments([]));
      } else if (['article', 'photo', 'video'].includes(type)) {
        // Utiliser le nouvel endpoint /api/comments
        api.get(`/api/comments?content_type=${type}&content_id=${item.id}`).then(r => {
          const comms = r.data.data || [];
          setComments(comms);
          setCommentCount(comms.length);
          const likes = {};
          const replyLikesMap = {};
          comms.forEach(c => {
            likes[c.id] = c.user_liked || false; // Utiliser user_liked de l'API
            if (c.replies) {
              c.replies.forEach(reply => {
                replyLikesMap[reply.id] = reply.user_liked || false;
              });
            }
          });
          setCommentLikes(likes);
          setReplyLikes(replyLikesMap);
        }).catch(err => {
          console.error('Error loading comments:', err);
          setComments([]);
        });
      }
    }
  }, [item.id, type, showCommentsModal]);

  // Charger l'état "signalé" depuis localStorage
  useEffect(() => {
    const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
    if (reported_items.includes(item.id)) {
      setReported(true);
    }
  }, [item.id]);

  const handleDeleteConfirm = async () => {
    try {
      console.log('handleDeleteConfirm called', { itemId: item.id, type, onDelete });
      if (!onDelete) {
        console.error('onDelete is undefined!');
        setToast({ message: 'Erreur: onDelete non défini', type: 'error' });
        return;
      }
      await onDelete(item.id, type);
      setShowDeleteModal(false);
      setToast({ message: 'Supprimé ✓', type: 'success' });
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ message: 'Erreur suppression', type: 'error' });
    }
  };

  const handleReportConfirm = async () => {
    try {
      await onReport(item.id, type, reportReason);
      setReported(true);
      // Sauvegarder dans localStorage
      const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
      if (!reported_items.includes(item.id)) {
        reported_items.push(item.id);
        localStorage.setItem('lesgirls_reported', JSON.stringify(reported_items));
      }
      setShowReportModal(false);
      setToast({ message: 'Signalé ✓ Merci!', type: 'success' });
    } catch (err) {
      console.error('Report error:', err);
      setReported(true);
      const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
      if (!reported_items.includes(item.id)) {
        reported_items.push(item.id);
        localStorage.setItem('lesgirls_reported', JSON.stringify(reported_items));
      }
      setShowReportModal(false);
      setToast({ message: 'Signalé ✓ Merci!', type: 'success' });
    }
  };

  const handleLike = async () => {
    try {
      const endpoint = type === 'testimony'
        ? `/api/testimonies/${item.id}/like`
        : `/api/${type}s/${item.id}/like`;

      await api.post(endpoint);
      setLiked(!liked);
      setSupportCount(liked ? supportCount - 1 : supportCount + 1);
    } catch (err) {
      console.error('Like error:', err);
      setToast({ message: 'Erreur like', type: 'error' });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      if (type === 'testimony') {
        const res = await api.post(`/api/testimonies/${item.id}/comments`, {
          content: comment.trim(),
          is_anonymous: false, // User is NOT anonymous by default
        });
        // Reload comments from API
        const commentsRes = await api.get(`/api/testimonies/${item.id}/comments`);
        setComments(commentsRes.data.data || []);
        setCommentCount((commentsRes.data.data || []).length);
      } else if (['article', 'photo', 'video'].includes(type)) {
        // Appeler le nouvel endpoint /api/comments
        const res = await api.post('/api/comments', {
          content_type: type,
          content_id: item.id,
          comment_text: comment.trim(),
          is_anonymous: false,
        });

        // Ajouter le commentaire à la liste
        const newComment = res.data.data;
        setComments([...comments, newComment]);
        setCommentCount(comments.length + 1);
      }

      setComment('');
      setToast({ message: 'Commentaire ajouté ✓', type: 'success' });
    } catch (err) {
      console.error('Error adding comment:', err);
      setToast({ message: 'Erreur ajout commentaire', type: 'error' });
    }
  };

  const handleCommentLike = async (commentId) => {
    const liked = commentLikes[commentId];

    try {
      // Appeler d'ABORD l'API pour liker/unliker
      await api.post(`/api/comments/${commentId}/like`);

      // PUIS mettre à jour l'UI seulement si l'API réussit
      setCommentLikes({ ...commentLikes, [commentId]: !liked });

      // Mettre à jour le like_count directement
      setComments(comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            like_count: (c.like_count || 0) + (liked ? -1 : 1)
          };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error liking comment:', err);
      setToast({ message: 'Erreur like commentaire', type: 'error' });
    }
  };

  const handleAddReply = async () => {
    if (!replyText.trim() || !replyingTo) return;

    try {
      // Appeler l'API pour ajouter la réponse
      const res = await api.post(`/api/comments/${replyingTo}/replies`, {
        reply_text: replyText.trim(),
      });

      const newReply = res.data.data;

      // Mettre à jour les commentaires pour afficher la nouvelle réponse
      const updatedComments = comments.map(c => {
        if (c.id === replyingTo) {
          const replies = c.replies || [];
          return { ...c, replies: [...replies, { ...newReply, user_name: newReply.user?.full_name }] };
        }
        return c;
      });
      setComments(updatedComments);
      setReplyingTo(null);
      setReplyText('');
      setToast({ message: 'Réponse ajoutée ✓', type: 'success' });
    } catch (err) {
      console.error('Error adding reply:', err);
      setToast({ message: 'Erreur ajout réponse', type: 'error' });
    }
  };

  return (
    <div style={{ paddingBottom: 24, borderBottom: `1px solid ${HS.border}`, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: HS.chocolate, marginBottom: 4 }}>
            {item.title}
          </div>
          <div style={{ fontSize: 12, color: HS.textMute }}>
            Par {item.display_name || 'Anonyme'} • {new Date(item.created_at).toLocaleDateString('fr-FR')}
            {item.location_label && ` • 📍 ${item.location_label}`}
            {item.category && ` • ${CATEGORIES.find(c => c.v === item.category)?.l || ''}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginLeft: 12, flexShrink: 0 }}>
          {reported ? (
            <span style={{ color: HS.textMute, fontSize: 11, fontWeight: 700, padding: '8px 12px' }}>✓ Signalé</span>
          ) : (
            <button onClick={() => setShowReportModal(true)} style={{ background: 'transparent', border: `1px solid ${HS.warn}`, color: HS.warn, padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font, whiteSpace: 'nowrap' }}>
              🚩 Signaler
            </button>
          )}
          {isOwner && (
            <button onClick={() => setShowDeleteModal(true)} style={{ background: HS.danger, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font, whiteSpace: 'nowrap' }}>
              ✕ Supprimer
            </button>
          )}
        </div>
      </div>

      {type === 'photo' && item.url && (
        <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', maxHeight: 400, background: HS.surface, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={item.url} alt={item.title || item.description} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 400, objectFit: 'contain' }} />
        </div>
      )}

      {type === 'video' && item.url && (
        <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: HS.surface }}>
          <iframe width="100%" height="100%" src={item.url} title={item.title || item.description} style={{ border: 'none', borderRadius: 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
        </div>
      )}

      {isSensitive && !open ? (
        <div style={{ background: `${item.trigger_warning_level === 'severe' ? HS.danger : HS.warn}20`, border: `2px solid ${item.trigger_warning_level === 'severe' ? HS.danger : HS.warn}`, borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: item.trigger_warning_level === 'severe' ? HS.danger : HS.warn, marginBottom: 8 }}>
            ⚠️ Contenu {item.trigger_warning_level === 'severe' ? 'grave' : 'sensible'}
          </div>
          <button onClick={() => setOpen(true)} style={{ background: item.trigger_warning_level === 'severe' ? HS.danger : HS.warn, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
            Lire le contenu
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 14, color: HS.textDim, lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
          {item.content || item.description}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}`, opacity: reported ? 0.5 : 1 }}>
        <button disabled={reported} onClick={handleLike} style={{ background: 'none', border: 'none', color: reported ? HS.textMute : (liked ? HS.danger : HS.textMute), cursor: reported ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0 }}>
          {liked ? '❤️' : '🤍'} {supportCount}
        </button>
        <button disabled={reported} onClick={() => !reported && setShowCommentsModal(true)} style={{ background: 'none', border: 'none', color: reported ? HS.textMute : HS.textMute, cursor: reported ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0 }}>
          💬 {commentCount}
        </button>
      </div>

      {showCommentsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowCommentsModal(false)}>
          <div style={{ background: HS.bg, borderRadius: 16, maxWidth: 500, width: '95%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: 16, borderBottom: `1px solid ${HS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: HS.chocolate }}>Commentaires</div>
              <button onClick={() => setShowCommentsModal(false)} style={{ background: 'none', border: 'none', color: HS.textMute, fontSize: 20, cursor: 'pointer', padding: 0 }}>×</button>
            </div>

            {/* Comments Feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: 'center', color: HS.textMute, fontSize: 13, padding: 32 }}>
                  Pas encore de commentaires. Sois la première! 💬
                </div>
              ) : (
                comments.map(c => {
                  const replies = c.replies || [];
                  return (
                    <div key={c.id} style={{ paddingBottom: 12, borderBottom: `1px solid ${HS.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: HS.chocolate, fontSize: 13 }}>{c.user_name || 'Anonyme'}</div>
                          <div style={{ fontSize: 11, color: HS.textMute }}>
                            {new Date(c.created_at).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                        {c.author_id === user?.id && (
                          <button onClick={async () => {
                            try {
                              await api.delete(`/api/comments/${c.id}`);
                              setComments(comments.filter(x => x.id !== c.id));
                              setCommentCount(Math.max(0, commentCount - 1));
                            } catch (err) { console.error(err); }
                          }} style={{ background: 'none', border: 'none', color: HS.danger, fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
                        )}
                      </div>
                      <div style={{ color: HS.textDim, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{c.comment_text}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                        <button onClick={() => handleCommentLike(c.id)} style={{ background: 'none', border: 'none', color: commentLikes[c.id] ? HS.danger : HS.textMute, fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0, cursor: 'pointer' }}>
                          {commentLikes[c.id] ? '❤️' : '🤍'} {c.like_count || 0}
                        </button>
                        <button onClick={() => setReplyingTo(c.id)} style={{ background: 'none', border: 'none', color: HS.textMute, fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0, cursor: 'pointer' }}>
                          💬 Répondre
                        </button>
                      </div>

                      {replies.length > 0 && (
                        <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: `2px solid ${HS.border}` }}>
                          {replies.map(r => (
                            <div key={r.id} style={{ paddingBottom: 8, marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                  <div style={{ fontWeight: 600, color: HS.chocolate, fontSize: 12 }}>{r.user_name || 'Anonyme'}</div>
                                  <div style={{ fontSize: 11, color: HS.textMute, marginBottom: 4 }}>
                                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                                  </div>
                                </div>
                                {r.author_id === user?.id && (
                                  <button onClick={async () => {
                                    try {
                                      await api.delete(`/api/comments/replies/${r.id}`);
                                      const updatedComments = comments.map(cmt => {
                                        if (cmt.id === c.id) {
                                          return { ...cmt, replies: (cmt.replies || []).filter(reply => reply.id !== r.id) };
                                        }
                                        return cmt;
                                      });
                                      setComments(updatedComments);
                                    } catch (err) { console.error(err); }
                                  }} style={{ background: 'none', border: 'none', color: HS.danger, fontSize: 10, cursor: 'pointer', padding: 0 }}>✕</button>
                                )}
                              </div>
                              <div style={{ color: HS.textDim, fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{r.reply_text}</div>
                              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                                <button onClick={async () => {
                                  try {
                                    await api.post(`/api/comments/replies/${r.id}/like`);
                                    const isLiked = replyLikes[r.id];
                                    setReplyLikes({ ...replyLikes, [r.id]: !isLiked });
                                    const updatedComments = comments.map(cmt => {
                                      if (cmt.id === c.id) {
                                        return {
                                          ...cmt,
                                          replies: (cmt.replies || []).map(reply => {
                                            if (reply.id === r.id) {
                                              return {
                                                ...reply,
                                                like_count: (reply.like_count || 0) + (isLiked ? -1 : 1)
                                              };
                                            }
                                            return reply;
                                          })
                                        };
                                      }
                                      return cmt;
                                    });
                                    setComments(updatedComments);
                                  } catch (err) { console.error(err); }
                                }} style={{ background: 'none', border: 'none', color: replyLikes[r.id] ? HS.danger : HS.textMute, fontSize: 11, fontWeight: 600, fontFamily: HS.font, padding: 0, cursor: 'pointer' }}>
                                  {replyLikes[r.id] ? '❤️' : '🤍'} {r.like_count || 0}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {replyingTo === c.id && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}`, display: 'flex', gap: 8 }}>
                          <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Répondre..." style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 12, boxSizing: 'border-box', background: HS.surface, color: HS.textDim }} onKeyPress={(e) => e.key === 'Enter' && handleAddReply()} />
                          <button onClick={handleAddReply} disabled={!replyText.trim()} style={{ background: replyText.trim() ? HS.chocolate : HS.border, color: replyText.trim() ? '#fff' : HS.textMute, border: 'none', padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: replyText.trim() ? 'pointer' : 'not-allowed', fontFamily: HS.font }}>
                            Envoyer
                          </button>
                          <button onClick={() => { setReplyingTo(null); setReplyText(''); }} style={{ background: 'none', border: 'none', color: HS.textMute, fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Input */}
            {!reported && (
              <div style={{ padding: 16, borderTop: `1px solid ${HS.border}`, display: 'flex', gap: 8 }}>
                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ajoute un commentaire..." style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 13, boxSizing: 'border-box', background: HS.surface, color: HS.textDim }} onKeyPress={(e) => e.key === 'Enter' && handleAddComment()} />
                <button onClick={handleAddComment} disabled={!comment.trim()} style={{ background: comment.trim() ? HS.chocolate : HS.border, color: comment.trim() ? '#fff' : HS.textMute, border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: comment.trim() ? 'pointer' : 'not-allowed', fontFamily: HS.font }}>
                  Envoyer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showReportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowReportModal(false)}>
          <div style={{ background: HS.bg, borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', maxHeight: '80vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: HS.chocolate, marginBottom: 16 }}>Pourquoi signaler?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {['harassment', 'violence', 'misinformation', 'spam', 'other'].map(reason => (
                <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 8, background: reportReason === reason ? HS.surface : 'transparent', cursor: 'pointer' }}>
                  <input type="radio" checked={reportReason === reason} onChange={() => setReportReason(reason)} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: HS.textDim }}>
                    {reason === 'harassment' && '😤 Harcèlement'}
                    {reason === 'violence' && '⚔️ Violence'}
                    {reason === 'misinformation' && '❌ Désinformation'}
                    {reason === 'spam' && '🚫 Spam'}
                    {reason === 'other' && '🤔 Autre'}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowReportModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, background: HS.surface, border: 'none', color: HS.chocolate, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
                Annuler
              </button>
              <button onClick={handleReportConfirm} style={{ flex: 1, padding: 12, borderRadius: 8, background: HS.warn, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowDeleteModal(false)}>
          <div style={{ background: HS.bg, borderRadius: 12, padding: 24, maxWidth: 400, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: HS.danger, marginBottom: 12 }}>Supprimer?</div>
            <div style={{ fontSize: 13, color: HS.textDim, marginBottom: 20 }}>
              Cette action est définitive. Tu es sûre?
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, background: HS.surface, border: 'none', color: HS.chocolate, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
                Annuler
              </button>
              <button onClick={handleDeleteConfirm} style={{ flex: 1, padding: 12, borderRadius: 8, background: HS.danger, border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Community() {
  const { user } = useAuth();
  const [contentType, setContentType] = useState('testimonies');
  const [testimonies, setTestimonies] = useState([]);
  const [articles, setArticles] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('feed');
  const [form, setForm] = useState({
    title: '', content: '', category: 'harcelement_verbal',
    location_label: '', is_anonymous: true, trigger_warning_level: 'none'
  });

  const CATEGORIES = [
    { v: 'harcelement_verbal', l: 'Harcèlement' },
    { v: 'agression_physique', l: 'Agression' },
    { v: 'agression_sexuelle', l: 'Agression sexuelle' },
    { v: 'vol', l: 'Vol' },
    { v: 'suivi', l: 'Suivi' },
    { v: 'detour_force', l: 'Détour forcé' },
    { v: 'autre', l: 'Autre' },
  ];

  const load = () => {
    // Charger les témoignages depuis l'API
    console.log('[Community LOAD] Fetching testimonies from API...');
    api.get('/api/testimonies').then((r) => {
      const apiTestimonies = r.data.data || [];
      console.log('[Community LOAD] API returned', apiTestimonies.length, 'testimonies');
      if (apiTestimonies.length > 0) setTestimonies(apiTestimonies);
    }).catch((err) => {
      console.error('[Community LOAD] API error:', err.message);
      // GARDER les données hardcodées au lieu de vider
    });

    // Charger les articles depuis l'API
    console.log('[Community LOAD] Fetching articles from API...');
    api.get('/api/articles').then((r) => {
      const apiArticles = r.data.data || [];
      console.log('[Community LOAD] API returned', apiArticles.length, 'articles');
      if (apiArticles.length > 0) {
        setArticles(apiArticles);
        // Marquer les articles créés par moi dans le localStorage
        if (user?.id) {
          const myPosts = JSON.parse(localStorage.getItem('lesgirls_my_posts') || '{}');
          apiArticles.forEach(article => {
            if (article.user_id === user.id) {
              myPosts[article.id] = 'article';
            }
          });
          localStorage.setItem('lesgirls_my_posts', JSON.stringify(myPosts));
        }
      }
    }).catch((err) => {
      console.error('[Community LOAD] Articles API error:', err.message);
      // GARDER les données hardcodées au lieu de vider
    });

    // Charger les photos depuis l'API
    console.log('[Community LOAD] Fetching photos from API...');
    api.get('/api/photos').then((r) => {
      const apiPhotos = r.data.data || [];
      console.log('[Community LOAD] API returned', apiPhotos.length, 'photos');
      if (apiPhotos.length > 0) setPhotos(apiPhotos);
    }).catch((err) => {
      console.error('[Community LOAD] Photos API error:', err.message);
      // GARDER les données hardcodées au lieu de vider
    });

    // Charger les vidéos depuis l'API
    console.log('[Community LOAD] Fetching videos from API...');
    api.get('/api/videos').then((r) => {
      const apiVideos = r.data.data || [];
      console.log('[Community LOAD] API returned', apiVideos.length, 'videos');
      // Vérifier que les vidéos ont des URLs avant de les utiliser
      const videosWithUrls = apiVideos.filter(v => v.url || v.video_url);
      console.log('[Community LOAD] Videos with URLs:', videosWithUrls.length);
      if (videosWithUrls.length > 0) setVideos(videosWithUrls);
      // Sinon garder les hardcodées
    }).catch((err) => {
      console.error('[Community LOAD] Videos API error:', err.message);
      // GARDER les données hardcodées au lieu de vider
    });
  };

  const generateDefault = () => {
    console.log('[CRITICAL] generateDefault() APPELÉE - chargeant données hardcodées...');
    const generateExampleComments = () => {
      const allComments = {};

      // Example comments for testimonies
      const testimonyComments = {
        1: [ // Suivi au marché
          { id: 'tc_1_1', content: 'Bravo pour ton courage! C\'était une bonne idée d\'alerter la vendeuse.', display_name: 'FortePhoenix234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'tc_1_2', content: 'Ça m\'est arrivé aussi. C\'est effrayant mais ta réaction était parfaite.', display_name: 'LumiereLotus567', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
          { id: 'tc_1_3', content: 'Contente que tu sois en sécurité! Les vendeurs peuvent vraiment nous aider.', display_name: 'VoixCourage891', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 3 },
        ],
        2: [ // Agression - J'ai crié
          { id: 'tc_2_1', content: 'Crier c\'est SO efficace! Merci d\'avoir partagé. Ça aide les autres.', display_name: 'BraveEchoe123', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 5 },
          { id: 'tc_2_2', content: 'Incroyable tu as réussi à t\'échapper! Je vais utiliser ça aussi.', display_name: 'SageFleur456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 4 },
          { id: 'tc_2_3', content: 'J\'espère que tu as signalé à la police? C\'est important pour les statistiques.', display_name: 'ForteReine789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 2 },
          { id: 'tc_2_4', content: 'Les femmes qui crient sauvent les femmes qui ne peuvent pas. Merci!', display_name: 'LibreAurore234', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 6 },
          { id: 'tc_2_5', content: 'Ça prend du courage de partager ça. Je suis fière de toi.', display_name: 'CourageuseLotus567', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 3 },
        ],
        3: [ // Commentaires au travail
          { id: 'tc_3_1', content: 'RH s\'en fou généralement. Bien d\'avoir documenté. 💪', display_name: 'ForceVoix321', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 4 },
          { id: 'tc_3_2', content: 'Pareil au mien! On mérite d\'être respectées. Ensemble on est plus fortes.', display_name: 'NobleCouleur654', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 3 },
          { id: 'tc_3_3', content: 'Oser dire non c\'est la plus belle forme de résistance.', display_name: 'SageLumiere987', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 5 },
        ],
        4: [ // Taxi: détour menace
          { id: 'tc_4_1', content: 'Bravo pour le calme! Enregistrer c\'est très smart. Ça peut servir de preuve.', display_name: 'CourageusePhoenix456', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'tc_4_2', content: 'J\'utilise toujours Uber pour cette raison. On doit partager nos numéros de chauffeur.', display_name: 'LumiereLotus123', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 2 },
        ],
        5: [ // Vol en minibus
          { id: 'tc_5_1', content: 'C\'est tellement injuste. Pourquoi personne ne protège les femmes?', display_name: 'VoixColère789', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 1 },
          { id: 'tc_5_2', content: 'Tu devrais essayer les alternatives: Uber, taxi radio. C\'est plus cher mais plus sûr.', display_name: 'ForteAurore234', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 2 },
          { id: 'tc_5_3', content: 'Les voleurs savent qu\'on n\'a pas d\'arme ni d\'appui. L\'État doit faire plus.', display_name: 'SageEchoe567', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 1 },
        ],
        6: [ // Agression au bureau
          { id: 'tc_6_1', content: 'C\'est du harcèlement sexuel. Tu peux faire un dossier et le signaler légalement.', display_name: 'ForceJustice234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 4 },
          { id: 'tc_6_2', content: '"C\'est juste son style" = il s\'en fout. Document tout. Chaque incident.', display_name: 'BraveLotus456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 5 },
          { id: 'tc_6_3', content: 'Même dans un bureau "respectable". C\'est partout. Courage à toi 💜', display_name: 'LumiereCouleur789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 3 },
          { id: 'tc_6_4', content: 'Signaler à RH c\'est bien mais c\'est aussi pas mal. Fais un dossier légal.', display_name: 'SagePhoenix123', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 2 },
        ],
      };

      // Example comments for articles
      const articleComments = {
        100: [ // Reconnaître un comportement toxique
          { id: 'ac_100_1', content: 'Mon ex faisait TOUS ces trucs. J\'ai enfin compris que c\'était pas normal.', display_name: 'ForteLotus789', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'ac_100_2', content: 'Checklist parfaite. Toutes mes amies devraient lire ça.', display_name: 'BraveCouleur234', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 5 },
          { id: 'ac_100_3', content: 'C\'est tellement vrai. Le contrôle ça ressemble à de l\'amour au début. Puis ça étouffé.', display_name: 'SageEtoile567', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 4 },
          { id: 'ac_100_4', content: 'J\'ai reconnu plusieurs signes de mon situation actuelle. Merci.', display_name: 'VoixLumiere891', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 2 },
        ],
        101: [ // Techniques d'échappement rapide
          { id: 'ac_101_1', content: 'Les yeux/nez/gorge c\'est TRÈS efficace. Confirmé.', display_name: 'CourageusePhoenix456', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 6 },
          { id: 'ac_101_2', content: 'Je vais aller à un atelier d\'auto-défense grâce à ça. Merci!', display_name: 'ForteLumiereAure', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 4 },
          { id: 'ac_101_3', content: 'Le cri c\'est psychologique aussi. Ça paralyse les agresseurs.', display_name: 'NobleLotus234', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 5 },
          { id: 'ac_101_4', content: 'Jamais oublier qu\'on est plus fortes qu\'on le croit.', display_name: 'BraveVoix789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 3 },
          { id: 'ac_101_5', content: 'Les cours d\'auto-défense sont gratuits à [nom du centre] à Abidjan!', display_name: 'SageAurore567', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 2 },
        ],
        102: [ // Comment documenter le harcèlement
          { id: 'ac_102_1', content: 'La documentation c\'est LA arme légale. Absolument crucial.', display_name: 'ForceJustice234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 4 },
          { id: 'ac_102_2', content: 'J\'ai gardé TOUS les SMS. C\'est ce qui a aidé à la police.', display_name: 'LumiereLotus456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 5 },
          { id: 'ac_102_3', content: 'Bon conseil: screenshot + date + lien au cloud privé.', display_name: 'BraveEtoile789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 3 },
          { id: 'ac_102_4', content: 'Photos de blessures = preuve physique. TRÈS importante.', display_name: 'SageCouleur123', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 2 },
          { id: 'ac_102_5', content: 'On m\'a dit ça et ça a sauvé mon cas. Merci pour ce guide!', display_name: 'VoixForce891', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 4 },
        ],
        103: [ // Ressources d'urgence 24/7
          { id: 'ac_103_1', content: 'J\'ai appelé le 180. Ils ont vraiment aidé. Ne pas hésiter!', display_name: 'CourageuseAurore234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 6 },
          { id: 'ac_103_2', content: 'Ligne d\'écoute 180 sauve des vies. Ils savent ce qu\'ils font.', display_name: 'ForteLotus567', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 5 },
          { id: 'ac_103_3', content: 'La police (110) ne prend pas toujours au sérieux. L\'hôpital fait un dossier légal.', display_name: 'NobleLumiere789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 4 },
          { id: 'ac_103_4', content: 'Bookmark cette page pour l\'urgence. On ne pense pas clair dans le stress.', display_name: 'BraveVoix456', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 3 },
          { id: 'ac_103_5', content: 'Aucune raison de ne pas appeler. C\'est GRATUIT et confidentiel.', display_name: 'SageCouleur789', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 2 },
          { id: 'ac_103_6', content: 'Merci d\'avoir rappelé les numéros. Je les utiliserai si j\'ai besoin.', display_name: 'LumiereEtoile234', created_at: new Date(Date.now() - 24000000).toISOString(), likes_count: 1 },
        ],
        104: [ // Guérir après trauma
          { id: 'ac_104_1', content: 'Les cauchemars sont RÉELS mais c\'est pas permanent. J\'ai guéri.', display_name: 'RésilienceFleur234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 5 },
          { id: 'ac_104_2', content: 'Yoga/sport m\'a vraiment aidée à reprendre mon corps. Merci pour ce guide!', display_name: 'FortePhoenix456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 6 },
          { id: 'ac_104_3', content: 'J\'ai trouvé un groupe de soutien. Les autres survivantes COMPRENNENT.', display_name: 'BraveAurore789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 4 },
          { id: 'ac_104_4', content: 'C\'est pas votre faute c\'est TELLEMENT important à entendre.', display_name: 'SageLotus123', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 5 },
          { id: 'ac_104_5', content: 'Thérapie gratuite existe. Cherchez "thérapie gratuite [votre ville]". Ça aide!', display_name: 'VoixLumiere456', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 3 },
          { id: 'ac_104_6', content: 'Des milliers guérissent = MOI aussi je peux guérir. Merci pour ça.', display_name: 'CourageuseVague789', created_at: new Date(Date.now() - 24000000).toISOString(), likes_count: 4 },
        ],
        105: [ // Créer des espaces sûrs (collectivement)
          { id: 'ac_105_1', content: 'Groupe escorte WhatsApp à notre bâtiment. C\'est efficace!', display_name: 'ForteSage234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 4 },
          { id: 'ac_105_2', content: 'La sécurité c\'est collectif. Cet article le rappelle bien.', display_name: 'BraveLotus456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 5 },
          { id: 'ac_105_3', content: 'En famille j\'enseigne le consentement depuis que ma fille a 6 ans.', display_name: 'NoblePhoenix789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 6 },
          { id: 'ac_105_4', content: 'Le coup de sifflet c\'est une excellente idée. Je vais le proposer.', display_name: 'LumiereCouleur123', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 3 },
          { id: 'ac_105_5', content: 'RH chez nous a une politique zéro harcèlement. Il faut le rappeler partout!', display_name: 'VoixJustice456', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 4 },
        ],
      };

      // Example comments for photos
      const photoComments = {
        200: [ // Marche pour la sécurité
          { id: 'pc_200_1', content: 'Quelle belle mobilisation! 500+ femmes = PUISSANCE 💪', display_name: 'ForteLotus234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'pc_200_2', content: 'J\'y étais! C\'était incroyable de se sentir soutenus par tant de monde.', display_name: 'BraveAurore456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 2 },
          { id: 'pc_200_3', content: 'Merci pour cette marche. Ça montre qu\'on n\'est pas seules.', display_name: 'SageCouleur789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 1 },
        ],
        201: [ // Atelier auto-défense
          { id: 'pc_201_1', content: 'J\'irai samedi! Merci d\'organiser ça. C\'est crucial.', display_name: 'CourageusePhoenix234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'pc_201_2', content: 'Auto-défense gratuite = une ressource qu\'on ne peux pas ignorer.', display_name: 'LumiereLotus456', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 1 },
          { id: 'pc_201_3', content: 'Combien de places? Je veux amener ma sœur aussi!', display_name: 'VoixForce789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 0 },
        ],
        202: [ // Refuge d'urgence 24/7
          { id: 'pc_202_1', content: 'Les refuges sauvent des vies. Merci aux gens qui les gèrent.', display_name: 'BraveEtoile234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'pc_202_2', content: 'Important qu\'on sache qu\'il existe 24/7. Ça met de la sécurité.', display_name: 'SageLotus456', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 1 },
          { id: 'pc_202_3', content: 'Le counseling + ressources légales = TOUT ce qu\'il faut pour commencer.', display_name: 'ForteCouleur789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 0 },
        ],
        203: [ // Groupe de soutien
          { id: 'pc_203_1', content: 'Les groupes de soutien c\'est LA thérapie qu\'on n\'attendait pas!', display_name: 'RésilienceLotus234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'pc_203_2', content: 'Mercredi 18h? Je suis intéressée. Comment rejoindre?', display_name: 'BraveLumiere456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
          { id: 'pc_203_3', content: 'Les autres survivantes COMPRENNENT comme personne d\'autre. Crucial.', display_name: 'VoixPhoenix789', created_at: new Date(Date.now() - 48000000).toISOString(), likes_count: 2 },
          { id: 'pc_203_4', content: 'Confidentialité garantie = pouvoir parler librement. C\'est ça la guérison.', display_name: 'SageAurore123', created_at: new Date(Date.now() - 36000000).toISOString(), likes_count: 1 },
        ],
      };

      // Example comments for videos - 6 vidéos avec commentaires
      const videoComments = {
        300: [
          { id: 'vc_300_1', content: 'Très utile et informatif! 👍', display_name: 'ForteFemme123', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'vc_300_2', content: 'Merci pour ce contenu important.', display_name: 'BraveCourage456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
          { id: 'vc_300_3', content: 'Je partage avec mes amies!', display_name: 'SageAide789', created_at: new Date(Date.now() - 60000000).toISOString(), likes_count: 0 },
        ],
        301: [
          { id: 'vc_301_1', content: 'Excellente ressource! 💪', display_name: 'FortePhoenix234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'vc_301_2', content: 'Très bien expliqué.', display_name: 'BraveLotus567', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
        ],
        302: [
          { id: 'vc_302_1', content: 'Information cruciale! 🙌', display_name: 'SageVoix123', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'vc_302_2', content: 'À regarder absolument.', display_name: 'CourageuseLotus456', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
        ],
        303: [
          { id: 'vc_303_1', content: 'Très important à savoir!', display_name: 'ForteLumiere789', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'vc_303_2', content: 'Merci beaucoup.', display_name: 'BraveAurore123', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 0 },
        ],
        304: [
          { id: 'vc_304_1', content: 'Contenu utile et clair! ✨', display_name: 'SageFemme234', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 2 },
          { id: 'vc_304_2', content: 'Bien produit.', display_name: 'ForteVoix567', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
        ],
        305: [
          { id: 'vc_305_1', content: 'Super ressource! 👏', display_name: 'BraveLotus890', created_at: new Date(Date.now() - 86400000).toISOString(), likes_count: 3 },
          { id: 'vc_305_2', content: 'À connaître absolument.', display_name: 'SagePhoenix123', created_at: new Date(Date.now() - 72000000).toISOString(), likes_count: 1 },
        ],
      };

      Object.assign(allComments, testimonyComments, articleComments, photoComments, videoComments);
      return allComments;
    };

    const temps = [
      { id: 1, display_name: 'CourageuseEtoile', created_at: new Date(), title: 'Suivi au marché', content: '👨→👩 Un homme m\'a suivie 20 min\n🙏 Une vendeuse m\'a aidée\n✨ Plus seule désormais!', category: 'suivi', location_label: 'Marché Adjamé', trigger_warning_level: 'moderate', support_count: 12, comment_count: 3, is_anonymous: true },
      { id: 2, display_name: 'BraveLumiere', created_at: new Date(), title: 'Agression - J\'ai crié', content: '🚨 Groupe de 3 hommes\n📱 Vol téléphone + sac\n💪 J\'ai crié → j\'ai réussi à m\'échapper\n❤️ Une dame m\'a aidée', category: 'agression_physique', location_label: 'Plateau', trigger_warning_level: 'severe', support_count: 45, comment_count: 5, is_anonymous: true },
      { id: 3, display_name: 'LibreFlamme', created_at: new Date(), title: 'Commentaires au travail', content: '😤 Mon patron: remarques sur mon corps\n📅 Depuis 2 ans, chaque jour\n📢 J\'ai signalé à RH\n💪 Je ne la ferme plus', category: 'harcelement_verbal', location_label: 'Centre-ville', trigger_warning_level: 'moderate', support_count: 28, comment_count: 3, is_anonymous: true },
      { id: 4, display_name: 'FemmeForte', created_at: new Date(), title: 'Taxi: détour menace', content: '🚕 Chauffeur menaçait détour\n📹 J\'ai gardé calme + enregistré\n🚔 Signalement fait\n✓ Sécurité en priorité', category: 'detour_force', location_label: 'Cocody', trigger_warning_level: 'moderate', support_count: 18, comment_count: 2, is_anonymous: true },
      { id: 5, display_name: 'VoixLibre', created_at: new Date(), title: 'Vol en minibus', content: '❌ 3e fois cette année\n📱 Téléphone + collier volés\n👊 Poussée quand j\'ai protesté\n😢 Personne n\'a aidé', category: 'vol', location_label: 'Yopougon', trigger_warning_level: 'low', support_count: 35, comment_count: 3, is_anonymous: true },
      { id: 6, display_name: 'Résiliente', created_at: new Date(), title: 'Agression au bureau', content: '🤨 Collègue main sur mes hanches\n😶 J\'ai gelé\n🙅 Collègue: "c\'est juste son style"\n💜 J\'ai décidé de lutter', category: 'agression_sexuelle', location_label: 'Treichville', trigger_warning_level: 'severe', support_count: 62, comment_count: 4, is_anonymous: true },
    ];

    const arts = [
      { id: 100, title: '🚩 Reconnaître un comportement toxique', content: 'Un partenaire contrôlant peut:\n\n• Vérifier constamment votre téléphone\n• Vous isoler de vos amies/famille\n• Critiquer votre apparence régulièrement\n• Menacer de vous quitter si vous refusez\n• Vous blâmer pour sa colère\n\n⚠️ Ce ne sont PAS des signes d\'amour - c\'est du contrôle.\n\n🛑 Agissez: parlez à quelqu\'un de confiance, notez les incidents, planifiez votre départ en sécurité.', trigger_warning_level: 'none', support_count: 142, comment_count: 4 },

      { id: 101, title: '💪 Techniques d\'échappement rapide', content: 'Si quelqu\'un vous agresse:\n\n1️⃣ CRIEZ "NON!" très fort (attire l\'attention)\n2️⃣ Frappez les zones vulnérables: yeux, nez, gorge, aine\n3️⃣ Courez vers un endroit éclairé/public\n4️⃣ Appelez la police (110)\n5️⃣ Racontez à quelqu\'un\n\n✅ Votre instinct a raison - n\'hésitez pas!\n✅ Pratiquez avec un coach pour avoir confiance.', trigger_warning_level: 'low', support_count: 89, comment_count: 5 },

      { id: 102, title: '📱 Comment documenter le harcèlement', content: 'Gardez des preuves pour la police:\n\n✓ Dates + heures exactes\n✓ Lieux précis\n✓ Témoins (noms/numéros)\n✓ SMS/messages (screenshot)\n✓ Blessures (photos datées)\n✓ Témoins de violence verbale\n\n💾 Stockez en sécurité (drive privé, mail à ami)\n🚨 Allez au commissariat avec ce dossier\n\nLa documentation = preuve légale forte.', trigger_warning_level: 'low', support_count: 156, comment_count: 5 },

      { id: 103, title: '🆘 Ressources d\'urgence 24/7', content: '📞 Police: 110 (urgence immédiate)\n\n☎️ Ligne d\'écoute femmes: 180\n• Gratuit • Confidentiel • 24h/24\n• Conseillers formés • Ressources légales\n\n🏥 Hôpital: 111 (soins + dossier légal)\n\n🏠 Abris d\'urgence:\n• Locaux: cherchez \"refuge femmes\" + ville\n• Online: plateforme.ci (ressources locales)\n\n👨‍👩‍👧 Dites à quelqu\'un de confiance', trigger_warning_level: 'none', support_count: 203, comment_count: 6 },

      { id: 104, title: '🧠 Guérir après trauma (c\'est possible!)', content: 'Après agression, c\'est normal d\'avoir:\n\n• Cauchemars/flashbacks\n• Peur de certains lieux\n• Difficultés à faire confiance\n• Dépression/anxiété\n\n✅ CE N\'EST PAS VOTRE FAUTE\n✅ CE N\'EST PAS PERMANENT\n\n💜 Guérison:\n1. Thérapie (gratuit certains centres)\n2. Groupes de soutien (femmes survivantes)\n3. Mouvements/yoga (reprendre le corps)\n4. Amies/famille bienveillantes\n5. Temps + patience avec vous-même\n\nDes milliers guérissent - vous aussi! 💪', trigger_warning_level: 'moderate', support_count: 287, comment_count: 6 },

      { id: 105, title: '🤝 Créer des espaces sûrs (collectivement)', content: 'La sécurité, c\'est ensemble:\n\n🏘️ À votre niveau:\n• Groupe escorte du quartier (WhatsApp)\n• Voisines qui se connaissent\n• Signal d\'alerte (coup de sifflet)\n\n💼 Au travail:\n• Signalez harcèlement à RH\n• Groupes femmes internes\n• Politiques claires = protection\n\n👨‍👩‍👧 En famille:\n• Parlez sécurité avec enfants\n• Enseignez le consentement\n• Écoutez sans juger\n\n📱 Online:\n• Plateformes comme celle-ci\n• Partagez ressources/conseils\n• Créez communauté\n\n✨ Seules on est fortes. Ensemble = invincibles.', trigger_warning_level: 'none', support_count: 412, comment_count: 5 },
    ];

    const phos = [
      { id: 200, title: '🚺 Marche pour la sécurité', description: 'Femmes unies pour des espaces plus sûrs\nÀbidjan 2026 • 500+ participantes', image_url: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&h=500&fit=crop', trigger_warning_level: 'none', user_id: null, support_count: 89, comment_count: 3 },
      { id: 201, title: '💪 Atelier auto-défense', description: 'Formation gratuite pour femmes\nTechniques simples et efficaces\nProchaine: samedi 15h', image_url: 'https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?w=500&h=500&fit=crop', trigger_warning_level: 'none', user_id: null, support_count: 64, comment_count: 3 },
      { id: 202, title: '🏠 Refuge d\'urgence 24/7', description: 'Accueil sûr et confidentiel\nAide gratuite • Counseling • Ressources légales', image_url: 'https://images.unsplash.com/photo-1517457373614-b7152f800fd1?w=500&h=500&fit=crop', trigger_warning_level: 'none', user_id: null, support_count: 72, comment_count: 3 },
      { id: 203, title: '💜 Groupe de soutien', description: 'Femmes survivantes partageant\nLe mercredi 18h • Confidentialité garantie', image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=500&fit=crop', trigger_warning_level: 'low', user_id: null, support_count: 51, comment_count: 4 },
    ];

    const vids = [
      { id: 300, title: '💜 Vidéo Sécurité 1', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/Ki3yfkj4Yls', trigger_warning_level: 'low', user_id: null, support_count: 8, comment_count: 3 },
      { id: 301, title: '🧠 Vidéo Sécurité 2', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/Ac9jgayoOGk', trigger_warning_level: 'low', user_id: null, support_count: 6, comment_count: 2 },
      { id: 302, title: '⚖️ Vidéo Sécurité 3', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/VF4ZyJRUxk8', trigger_warning_level: 'none', user_id: null, support_count: 5, comment_count: 2 },
      { id: 303, title: '👩‍⚖️ Vidéo Sécurité 4', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/gkjW9PZBRfk', trigger_warning_level: 'none', user_id: null, support_count: 7, comment_count: 1 },
      { id: 304, title: '💪 Vidéo Sécurité 5', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/UpgZ5PCuf8A', trigger_warning_level: 'low', user_id: null, support_count: 9, comment_count: 3 },
      { id: 305, title: '🛡️ Vidéo Sécurité 6', description: 'Contenu éducatif important pour votre sécurité', url: 'https://www.youtube.com/embed/m_UjYOfmkn8', trigger_warning_level: 'none', user_id: null, support_count: 10, comment_count: 2 },
    ];

    setTestimonies(temps);
    setArticles(arts);
    setPhotos(phos);
    setVideos(vids);
    localStorage.setItem('lesgirls_testimonies', JSON.stringify(temps));
    localStorage.setItem('lesgirls_articles', JSON.stringify(arts));
    localStorage.setItem('lesgirls_photos', JSON.stringify(phos));
    localStorage.setItem('lesgirls_videos', JSON.stringify(vids));

    // ❌ REMOVED: localStorage comments - use API instead
    // const exampleComments = generateExampleComments();
    // localStorage.setItem('lesgirls_comments', JSON.stringify(exampleComments));
  };

  useEffect(() => {
    // Charger depuis l'API (6 vidéos + commentaires maintenant en BD)
    load();
  }, []);

  // WebSocket pour synchronisation en temps réel des commentaires
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Community] WebSocket connecté');
    };

    ws.onmessage = (event) => {
      try {
        const { event: eventType, data } = JSON.parse(event.data);
        console.log('[Community] WebSocket event:', eventType, data);

        if (eventType === 'COMMENT_DELETED') {
          // Un commentaire a été supprimé par l'admin
          console.log('[Community] Commentaire supprimé:', data.commentId);
          load();
        } else if (eventType === 'COMMENT_ADDED') {
          // Un nouveau commentaire a été ajouté
          console.log('[Community] Nouveau commentaire:', data.comment);
          load();
        } else if (eventType === 'POST_DELETED') {
          // Un post a été supprimé par l'admin
          console.log('[Community] Post supprimé:', data.contentId);
          load();
        }
      } catch (err) {
        console.error('[Community] WebSocket parsing error:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[Community] WebSocket error:', err);
    };

    ws.onclose = () => {
      console.log('[Community] WebSocket fermé');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setToast({ message: 'Remplis les champs', type: 'error' });
      return;
    }

    try {
      if (contentType === 'testimonies') {
        const payload = {
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
          is_anonymous: form.is_anonymous,
          trigger_warning_level: form.trigger_warning_level || 'none',
        };
        if (form.location_label?.trim()) {
          payload.location_label = form.location_label.trim();
        }
        console.log('Sending testimony:', payload);
        await api.post('/api/testimonies', payload);
        // Recharger les témoignages pour avoir le user_id
        const res = await api.get('/api/testimonies');
        setTestimonies(res.data.data);
        setToast({ message: 'Témoignage publié ✓', type: 'success' });
      } else if (contentType === 'articles') {
        // Sauvegarder article en BD
        const payload = {
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
        };
        const response = await api.post('/api/articles', payload);
        const newArticle = response.data.data;
        setArticles([...articles, newArticle]);
        setToast({ message: 'Article publié ✓', type: 'success' });
      } else if (contentType === 'photos') {
        // Sauvegarder photo en BD
        const payload = {
          url: form.content.trim(), // L'URL de la photo
          description: form.title.trim(),
          category: form.category,
        };
        const response = await api.post('/api/photos', payload);
        const newPhoto = response.data.data;
        // Marquer comme créé par moi
        const myPosts = JSON.parse(localStorage.getItem('lesgirls_my_posts') || '{}');
        myPosts[newPhoto.id] = 'photo';
        localStorage.setItem('lesgirls_my_posts', JSON.stringify(myPosts));
        setPhotos([...photos, newPhoto]);
        setToast({ message: 'Photo publiée ✓', type: 'success' });
      } else if (contentType === 'videos') {
        // Sauvegarder vidéo en BD
        const payload = {
          url: form.content.trim(), // L'URL de la vidéo
          description: form.title.trim(),
          category: form.category,
        };
        const response = await api.post('/api/videos', payload);
        const newVideo = response.data.data;
        // Marquer comme créé par moi
        const myPosts = JSON.parse(localStorage.getItem('lesgirls_my_posts') || '{}');
        myPosts[newVideo.id] = 'video';
        localStorage.setItem('lesgirls_my_posts', JSON.stringify(myPosts));
        setVideos([...videos, newVideo]);
        setToast({ message: 'Vidéo publiée ✓', type: 'success' });
      }
      setForm({ title: '', content: '', category: 'harcelement_verbal', location_label: '', is_anonymous: true, trigger_warning_level: 'none' });
      setTab('feed');
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Erreur', type: 'error' });
    }
  };


  const handleDelete = async (itemId, type) => {
    if (type === 'testimony') {
      await api.delete(`/api/testimonies/${itemId}`);
      // Recharger pour s'assurer que c'est vraiment supprimé
      const res = await api.get('/api/testimonies');
      setTestimonies(res.data.data);
    } else if (type === 'article') {
      const updated = articles.filter(a => a.id !== itemId);
      setArticles(updated);
      localStorage.setItem('lesgirls_articles', JSON.stringify(updated));
    } else if (type === 'photo') {
      const updated = photos.filter(p => p.id !== itemId);
      setPhotos(updated);
      localStorage.setItem('lesgirls_photos', JSON.stringify(updated));
    } else if (type === 'video') {
      const updated = videos.filter(v => v.id !== itemId);
      setVideos(updated);
      localStorage.setItem('lesgirls_videos', JSON.stringify(updated));
    }
  };

  const handleReport = async (itemId, type, reason) => {
    const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
    if (!reported_items.includes(itemId)) {
      reported_items.push(itemId);
      localStorage.setItem('lesgirls_reported', JSON.stringify(reported_items));
    }

    if (type === 'testimony') {
      try {
        // TODO: Uncomment when /api/content-reports endpoint is available
        // await api.post('/api/content-reports', { report_type: 'testimony', testimony_id: itemId, reason });
      } catch (err) {
        console.error('Report error:', err);
      }
    }
  };

  const data = { testimonies, articles, photos, videos };
  const items = data[contentType] || [];

  return (
    <PageShell>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '54px 20px 0' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: HS.warn, letterSpacing: 1, marginBottom: 8 }}>LESGIRLS</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: HS.chocolate, marginBottom: 20 }}>Notre communauté</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: `2px solid ${HS.border}`, overflowX: 'auto', paddingBottom: 12 }}>
          {[{ id: 'testimonies', l: '💬 Témoignages' }, { id: 'articles', l: '📖 Articles' }, { id: 'photos', l: '📸 Photos' }, { id: 'videos', l: '🎬 Vidéos' }].map(t => (
            <button key={t.id} onClick={() => { console.log('[Tabs] Switching to:', t.id); setContentType(t.id); setTab('feed'); }} style={{
              padding: '8px 0', fontSize: 13, fontWeight: 700, background: 'none', border: 'none', borderBottom: contentType === t.id ? `3px solid ${HS.chocolate}` : 'none',
              color: contentType === t.id ? HS.chocolate : HS.textMute, cursor: 'pointer', fontFamily: HS.font, whiteSpace: 'nowrap'
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button onClick={() => setTab('feed')} style={{ flex: 1, padding: '10px', background: tab === 'feed' ? HS.chocolate : HS.surface, color: tab === 'feed' ? '#fff' : HS.textDim, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
            Flux
          </button>
          <button onClick={() => setTab('new')} style={{ flex: 1, padding: '10px', background: tab === 'new' ? HS.chocolate : HS.surface, color: tab === 'new' ? '#fff' : HS.textDim, border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: HS.font }}>
            + Partager
          </button>
        </div>
      </div>

      <ScrollArea style={{ padding: '0 20px 90px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {tab === 'feed' ? (
            items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: HS.textMute }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
                <div>Sois la première à partager</div>
              </div>
            ) : (
              (() => {
                const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
                // Séparer items signalés (utilisatrice ou admin) et non-signalés
                const nonReported = items.filter(item => !reported_items.includes(item.id) && !item.flagged);
                const reported = items.filter(item => reported_items.includes(item.id) || item.flagged);
                const sorted = [...nonReported, ...reported];
                return sorted.map((item) => {
                  const typeMap = { testimonies: 'testimony', articles: 'article', photos: 'photo', videos: 'video' };
                  return <Post key={item.id} item={item} type={typeMap[contentType]} onDelete={handleDelete} onReport={handleReport} user={user} setToast={setToast} CATEGORIES={CATEGORIES} />;
                });
              })()
            )
          ) : (
            <form onSubmit={submit} style={{ maxWidth: 700 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Titre</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre..." style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: 20 }}>
                {contentType === 'testimonies' || contentType === 'articles' ? (
                  <>
                    <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Contenu</label>
                    <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Écris..." style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, minHeight: 120, boxSizing: 'border-box' }} required />
                  </>
                ) : contentType === 'photos' ? (
                  <>
                    <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>URL Photo</label>
                    <input type="url" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="https://example.com/photo.jpg" style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, boxSizing: 'border-box' }} required />
                  </>
                ) : contentType === 'videos' ? (
                  <>
                    <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>URL Vidéo (YouTube embed)</label>
                    <input type="url" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="https://www.youtube.com/embed/..." style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, boxSizing: 'border-box' }} required />
                  </>
                ) : null}
              </div>

              {contentType === 'testimonies' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Catégorie</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {CATEGORIES.map(c => (
                        <button key={c.v} type="button" onClick={() => setForm({ ...form, category: c.v })} style={{ padding: '6px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: form.category === c.v ? HS.chocolate : HS.surface, color: form.category === c.v ? '#fff' : HS.textDim, border: 'none', cursor: 'pointer', fontFamily: HS.font }}>
                          {c.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <input type="text" value={form.location_label} onChange={(e) => setForm({ ...form, location_label: e.target.value })} placeholder="Lieu (optionnel)" style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>⚠️ Avertissement</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['none', 'low', 'moderate', 'severe'].map(w => (
                    <button key={w} type="button" onClick={() => setForm({ ...form, trigger_warning_level: w })} style={{ padding: '6px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: form.trigger_warning_level === w ? HS.warn : HS.surface, color: form.trigger_warning_level === w ? '#fff' : HS.textDim, border: 'none', cursor: 'pointer', fontFamily: HS.font }}>
                      {w === 'none' ? 'Aucun' : w === 'low' ? '⚠️ Léger' : w === 'moderate' ? '⚠️ Modéré' : '⚠️⚠️ Grave'}
                    </button>
                  ))}
                </div>
              </div>

              {contentType === 'testimonies' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20 }}>
                  <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: 13, color: HS.textDim }}>Publier anonymement</span>
                </label>
              )}

              <button type="submit" style={{ width: '100%', padding: 14, background: HS.chocolate, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: HS.font }}>
                Publier
              </button>
            </form>
          )}
        </div>
      </ScrollArea>

      <BottomNav />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
