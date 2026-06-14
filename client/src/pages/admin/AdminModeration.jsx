import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner, Avatar, Card } from '../../components/ui/index.jsx';

const CONTENT_TYPES = [
  { id: 'testimonies', label: '💬 Témoignages' },
  { id: 'articles', label: '📄 Articles' },
  { id: 'photos', label: '📸 Photos' },
  { id: 'videos', label: '🎥 Vidéos' },
];

export default function AdminModeration() {
  const { theme } = useTheme();
  const [contentType, setContentType] = useState('testimonies');
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [warningModal, setWarningModal] = useState(null);
  const [warningText, setWarningText] = useState('');
  const [commentsModal, setCommentsModal] = useState(null);
  const [comments, setComments] = useState([]);

  // Charger les données
  const loadContent = async () => {
    setLoading(true);
    try {
      const endpoints = {
        testimonies: '/api/testimonies',
        articles: '/api/articles',
        photos: '/api/photos',
        videos: '/api/videos',
      };

      const res = await api.get(endpoints[contentType]);
      const posts = (res.data.data || []).map(post => ({
        ...post,
        type: contentType
      }));

      // Charger les COMMENTAIRES COMPLETS (pas juste le count) pour chaque post
      const postsWithMeta = await Promise.all(posts.map(async (post) => {
        try {
          // Convertir type au singulier pour l'API (photos -> photo, videos -> video, etc)
          const typeForApi = contentType === 'testimonies' ? 'testimonies' : contentType.slice(0, -1);
          const endpoint = contentType === 'testimonies'
            ? `/api/testimonies/${post.id}/comments`
            : `/api/comments?content_type=${typeForApi}&content_id=${post.id}`;

          console.log(`[AdminMod] Loading comments for ${post.id}:`, endpoint);
          const commentsRes = await api.get(endpoint);
          console.log(`[AdminMod] Full response for ${post.id}:`, commentsRes.data);
          const comments = commentsRes.data.data || [];
          console.log(`[AdminMod] Got ${comments.length} comments for ${post.id}:`, comments);
          return {
            ...post,
            comments: comments,
            comment_count: comments.length
          };
        } catch (err) {
          console.error(`[AdminMod] Error loading comments for ${post.id}:`, err);
          return { ...post, comments: [], comment_count: 0 };
        }
      }));

      setAllContent(postsWithMeta);
    } catch (err) {
      console.error('Error loading content:', err);
      setAllContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [contentType]);

  // Auto-refresh juste les NOUVELLES publications toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const endpoints = {
          testimonies: '/api/testimonies',
          articles: '/api/articles',
          photos: '/api/photos',
          videos: '/api/videos',
        };

        const res = await api.get(endpoints[contentType]);
        const newPosts = (res.data.data || []).map(post => ({ ...post, type: contentType }));

        // Ajouter seulement les nouveaux posts (ceux qui ne sont pas dans allContent)
        const existingIds = new Set(allContent.map(p => p.id));
        const addedPosts = newPosts.filter(p => !existingIds.has(p.id));

        if (addedPosts.length > 0) {
          // Charger les commentaires pour les nouveaux posts
          const postsWithMeta = await Promise.all(addedPosts.map(async (post) => {
            try {
              const typeForApi = contentType === 'testimonies' ? 'testimonies' : contentType.slice(0, -1);
              const endpoint = contentType === 'testimonies'
                ? `/api/testimonies/${post.id}/comments`
                : `/api/comments?content_type=${typeForApi}&content_id=${post.id}`;
              const commentsRes = await api.get(endpoint);
              const comments = commentsRes.data.data || [];
              return { ...post, comments: comments, comment_count: comments.length };
            } catch {
              return { ...post, comments: [], comment_count: 0 };
            }
          }));

          // Ajouter les nouveaux posts au début
          setAllContent(prev => [...postsWithMeta, ...prev]);
        }
      } catch (err) {
        console.error('Error refreshing:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [contentType, allContent]);


  const handleViewComments = async (post) => {
    setCommentsModal(post);

    // Recharger les commentaires FRAIS depuis l'API (pas le cache)
    try {
      const typeForApi = post.type === 'testimonies' ? 'testimonies' : post.type.slice(0, -1);
      const endpoint = post.type === 'testimonies'
        ? `/api/testimonies/${post.id}/comments`
        : `/api/comments?content_type=${typeForApi}&content_id=${post.id}`;

      console.log('[AdminMod] Reloading fresh comments from:', endpoint);
      const commentsRes = await api.get(endpoint);
      const freshComments = commentsRes.data.data || [];
      console.log('[AdminMod] Got', freshComments.length, 'fresh comments');
      setComments(freshComments);
    } catch (err) {
      console.error('[AdminMod] Error reloading comments:', err);
      setComments(post.comments || []);
    }
  };

  const handleFlag = async (id, type) => {
    try {
      const endpoints = {
        testimonies: `/api/testimonies/${id}/flag`,
        articles: `/api/articles/${id}/flag`,
        photos: `/api/photos/${id}/flag`,
        videos: `/api/videos/${id}/flag`,
      };

      const res = await api.post(endpoints[type]);

      // Mettre à jour le post dans la liste
      setAllContent(prev => prev.map(p =>
        p.id === id ? { ...p, flagged: res.data.data.flagged } : p
      ));

      const message = res.data.data.flagged ? '🚩 Signalé' : '🔄 Dé-signalé';
      setToast({ message, type: 'warn' });
    } catch {
      setToast({ message: 'Erreur signalement', type: 'error' });
    }
  };

  const handleDelete = async (id, type) => {
    if (!warningText.trim()) {
      setToast({ message: 'Écris la raison', type: 'warn' });
      return;
    }
    try {
      const endpoints = {
        testimonies: `/api/admin/testimonies/${id}`,
        articles: `/api/articles/${id}`,
        photos: `/api/photos/${id}`,
        videos: `/api/videos/${id}`,
      };

      await api.delete(endpoints[type], { data: { reason: warningText } });
      setAllContent(prev => prev.filter(p => p.id !== id));
      setToast({ message: '🗑️ Supprimé + avertissement envoyé', type: 'success' });
      setWarningModal(null);
      setWarningText('');
    } catch {
      setToast({ message: 'Erreur suppression', type: 'error' });
    }
  };


  const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const currentType = CONTENT_TYPES.find(t => t.id === contentType);

  return (
    <PageShell>
      <div style={{
        padding: '54px 20px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        borderBottom: `1px solid ${theme.border}`
      }}>
        <BackButton to="/admin" />
        <div style={{ flex: 1 }}>
          <Eyebrow>Modération</Eyebrow>
          <H2 style={{ marginTop: 2, color: theme.chocolate }}>Communauté</H2>
        </div>
        <span style={{
          background: theme.sakura,
          color: theme.chocolate,
          borderRadius: 10,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 800
        }}>{allContent.length}</span>
      </div>

      {/* Onglets type de contenu */}
      <div style={{
        padding: '12px 20px',
        display: 'flex',
        gap: 8,
        borderBottom: `1px solid ${theme.border}`,
        overflowX: 'auto'
      }}>
        {CONTENT_TYPES.map((ct) => (
          <button key={ct.id} onClick={() => setContentType(ct.id)} style={{
            padding: '8px 14px',
            borderRadius: 20,
            border: 'none',
            background: contentType === ct.id ? theme.chocolate : theme.surface,
            color: contentType === ct.id ? '#fff' : theme.textDim,
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: theme.font,
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}>
            {ct.label}
          </button>
        ))}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px', background: theme.bg }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : allContent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
            <div style={{ fontSize: 14, color: theme.textMute }}>Aucun contenu à modérer</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allContent.map((item) => (
              <Card key={item.id} style={{ padding: 16 }}>
                {/* Auteur */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  {/* Display name: if anonymous, show display_name; otherwise show user_name from users table */}
                  <Avatar size={36} name={item.is_anonymous ? (item.display_name || 'Anonyme') : (item.user_name || item.display_name || 'Utilisateur')} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                      {item.is_anonymous ? (item.display_name || 'Anonyme') : (item.user_name || item.display_name || 'Utilisateur')}
                    </div>
                    <div style={{ fontSize: 11, color: theme.textMute }}>{fmtDate(item.created_at)}</div>
                  </div>
                </div>

                {/* Titre */}
                {(item.title || item.description) && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.chocolate, marginBottom: 8 }}>
                    {item.title || item.description || '(sans titre)'}
                  </div>
                )}

                {/* Image/Vidéo */}
                {item.type === 'photos' && item.url && (
                  <div style={{
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    maxHeight: 350,
                    background: theme.surface,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img src={item.url} alt={item.title} style={{
                      maxWidth: '100%',
                      maxHeight: '350px',
                      height: 'auto',
                      display: 'block',
                      objectFit: 'contain'
                    }} />
                  </div>
                )}

                {item.type === 'videos' && item.url && (
                  <div style={{
                    marginBottom: 12,
                    borderRadius: 8,
                    overflow: 'hidden',
                    aspectRatio: '16/9',
                    maxHeight: 280,
                    background: theme.surface
                  }}>
                    <iframe width="100%" height="100%" src={item.url} title={item.title || item.description} style={{ border: 'none', borderRadius: 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  </div>
                )}

                {/* Contenu */}
                <div style={{
                  fontSize: 13,
                  color: theme.textDim,
                  lineHeight: 1.5,
                  marginBottom: 12
                }}>
                  {item.content || item.description || '(contenu vide)'}
                </div>

                {/* Commentaires + Likes */}
                <div style={{
                  fontSize: 11,
                  color: theme.textMute,
                  marginBottom: 12,
                  display: 'flex',
                  gap: 12
                }}>
                  {item.support_count > 0 && <span>❤️ {item.support_count}</span>}
                  {item.comment_count > 0 && <span>💬 {item.comment_count}</span>}
                </div>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => handleViewComments(item)} style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '10px',
                    borderRadius: 12,
                    background: theme.mistyRose,
                    color: theme.chocolate,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    fontFamily: theme.font,
                    cursor: 'pointer'
                  }}>
                    💬 Commentaires ({item.comment_count})
                  </button>
                  <button onClick={() => handleFlag(item.id, item.type)} style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '10px',
                    borderRadius: 12,
                    background: item.flagged ? theme.mistyRose : theme.warnSoft,
                    color: item.flagged ? theme.chocolate : theme.warn,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    fontFamily: theme.font,
                    cursor: 'pointer'
                  }}>
                    {item.flagged ? '🔄 Dé-signaler' : '🚩 Signaler'}
                  </button>
                  <button onClick={() => setWarningModal({ id: item.id, type: item.type })} style={{
                    flex: 1,
                    minWidth: 100,
                    padding: '10px',
                    borderRadius: 12,
                    background: theme.dangerSoft,
                    color: theme.danger,
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    fontFamily: theme.font,
                    cursor: 'pointer'
                  }}>
                    🗑️ Supprimer
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>


      {/* Modal commentaires */}
      {commentsModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42,26,17,0.45)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 200
        }}>
          <div style={{
            width: '100%',
            background: theme.surface,
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.border, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.chocolate, marginBottom: 16 }}>
              💬 Commentaires ({comments.length})
            </div>

            {comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: theme.textMute }}>Aucun commentaire</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {comments.map(c => (
                  <Card key={c.id} style={{ padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.textMute, marginBottom: 6 }}>
                      {c.user_name || 'Anon'} · {fmtDate(c.created_at)}
                    </div>
                    <div style={{ fontSize: 13, color: theme.text, marginBottom: 10, lineHeight: 1.4 }}>
                      {c.comment_text || c.content}
                    </div>
                    {c.like_count > 0 && (
                      <div style={{ fontSize: 11, color: theme.textMute, marginBottom: 8 }}>❤️ {c.like_count}</div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={async () => {
                        if (window.confirm('Supprimer ce commentaire?')) {
                          try {
                            await api.delete(`/api/admin/comments/${c.id}`);
                            setComments(prev => prev.filter(x => x.id !== c.id));
                            setToast({ message: '🗑️ Commentaire supprimé (SYNC en temps réel)', type: 'success' });
                          } catch (err) {
                            setToast({ message: 'Erreur suppression', type: 'error' });
                            console.error(err);
                          }
                        }
                      }} style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: 6,
                        background: theme.dangerSoft,
                        color: theme.danger,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: theme.font
                      }}>
                        🗑️ Supprimer
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <button onClick={() => setCommentsModal(null)} style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              background: theme.chocolate,
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              fontFamily: theme.font
            }}>
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal suppression */}
      {warningModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42,26,17,0.45)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 200
        }}>
          <div style={{
            width: '100%',
            background: theme.surface,
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px'
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.border, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.chocolate, marginBottom: 16 }}>
              ⚠️ Supprimer cette publication?
            </div>
            <textarea placeholder="Raison de la suppression..."
              value={warningText}
              onChange={(e) => setWarningText(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.bg,
                color: theme.text,
                fontFamily: theme.font,
                fontSize: 13,
                resize: 'vertical',
                minHeight: 80,
                marginBottom: 16
              }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setWarningModal(null)} style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                background: theme.surface,
                border: `1px solid ${theme.border}`,
                fontWeight: 700,
                fontSize: 14,
                color: theme.textDim,
                fontFamily: theme.font,
                cursor: 'pointer'
              }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(warningModal.id, warningModal.type)} style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                background: theme.danger,
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                fontFamily: theme.font,
                cursor: 'pointer'
              }}>
                Supprimer + Avertir
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </PageShell>
  );
}
