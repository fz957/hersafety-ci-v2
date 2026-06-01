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
            Par {item.display_name || generateAnonName()} • {new Date(item.created_at).toLocaleDateString('fr-FR')}
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

  const load = async () => {
    try {
      // Charger tous les contenus en parallèle
      console.log('[Community LOAD] Fetching all content from API...');

      const [testimonyRes, articlesRes, photosRes, videosRes] = await Promise.allSettled([
        api.get('/api/testimonies'),
        api.get('/api/articles'),
        api.get('/api/photos'),
        api.get('/api/videos'),
      ]);

      // Traiter les témoignages
      if (testimonyRes.status === 'fulfilled') {
        const apiTestimonies = testimonyRes.value.data.data || [];
        console.log('[Community LOAD] API returned', apiTestimonies.length, 'testimonies');
        setTestimonies(apiTestimonies);
      } else {
        console.error('[Community LOAD] Testimonies API error:', testimonyRes.reason);
        setTestimonies([]);
      }

      // Traiter les articles
      if (articlesRes.status === 'fulfilled') {
        const apiArticles = articlesRes.value.data.data || [];
        console.log('[Community LOAD] API returned', apiArticles.length, 'articles');
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
      } else {
        console.error('[Community LOAD] Articles API error:', articlesRes.reason);
        setArticles([]);
      }

      // Traiter les photos
      if (photosRes.status === 'fulfilled') {
        const apiPhotos = photosRes.value.data.data || [];
        console.log('[Community LOAD] API returned', apiPhotos.length, 'photos');
        setPhotos(apiPhotos);
      } else {
        console.error('[Community LOAD] Photos API error:', photosRes.reason);
        setPhotos([]);
      }

      // Traiter les vidéos
      if (videosRes.status === 'fulfilled') {
        const apiVideos = videosRes.value.data.data || [];
        console.log('[Community LOAD] API returned', apiVideos.length, 'videos');
        const videosWithUrls = apiVideos.filter(v => v.url || v.video_url);
        console.log('[Community LOAD] Videos with URLs:', videosWithUrls.length);
        setVideos(videosWithUrls);
      } else {
        console.error('[Community LOAD] Videos API error:', videosRes.reason);
        setVideos([]);
      }
    } catch (err) {
      console.error('[Community LOAD] Unexpected error:', err);
    }
  };


  useEffect(() => {
    // Charger depuis l'API (6 vidéos + commentaires maintenant en BD)
    load();
  }, []);

  // Polling pour mises à jour en temps réel (remplace WebSocket qui est bloqué en HTTPS)
  useEffect(() => {
    console.log('[Community] Polling enabled for real-time updates');
    // Rafraîchir les données toutes les 5 secondes pour les mises à jour
    const pollInterval = setInterval(() => {
      load();
    }, 5000);

    return () => clearInterval(pollInterval);
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
    try {
      // Envoie le signalement à l'API
      const endpoint = type === 'testimony'
        ? `/api/testimonies/${itemId}/report`
        : `/api/${type}s/${itemId}/report`;

      await api.post(endpoint, { reason });

      // Marque comme signalé localement
      const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
      if (!reported_items.includes(itemId)) {
        reported_items.push(itemId);
        localStorage.setItem('lesgirls_reported', JSON.stringify(reported_items));
      }

      console.log(`✓ ${type} ${itemId} signalé pour: ${reason}`);
    } catch (err) {
      console.error('Report error:', err);
      // Marque quand même comme signalé localement même si l'API fail
      const reported_items = JSON.parse(localStorage.getItem('lesgirls_reported') || '[]');
      if (!reported_items.includes(itemId)) {
        reported_items.push(itemId);
        localStorage.setItem('lesgirls_reported', JSON.stringify(reported_items));
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
