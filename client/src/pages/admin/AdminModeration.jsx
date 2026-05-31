import { useState, useEffect } from 'react';
import api from '../../services/api';
import { HS, ICONS } from '../../tokens';
import { useTheme } from '../../context/ThemeContext';
import { Icon, Card, Eyebrow, H2, BackButton, PageShell, ScrollArea, Toast, Spinner } from '../../components/ui/index.jsx';

const CONTENT_TYPES = [
  { id: 'testimonies', label: '💬 Témoignages', icon: ICONS.comment },
  { id: 'articles', label: '📄 Articles', icon: ICONS.mail },
  { id: 'photos', label: '📸 Photos', icon: ICONS.pin },
  { id: 'videos', label: '🎥 Vidéos', icon: ICONS.play },
];

const CATEGORIES = [
  { id: 'all', label: 'Tous' },
  { id: 'harcelement_verbal', label: 'Harcèlement verbal' },
  { id: 'agression_physique', label: 'Agression physique' },
  { id: 'agression_sexuelle', label: 'Agression sexuelle' },
  { id: 'suivi', label: 'Suivi' },
  { id: 'vol', label: 'Vol' },
  { id: 'autre', label: 'Autre' },
];

export default function AdminModeration() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [allContent, setAllContent] = useState({ testimonies: [], articles: [], photos: [], videos: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [contentType, setContentType] = useState('testimonies');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [warningModal, setWarningModal] = useState(null);
  const [warningText, setWarningText] = useState('');

  const load = () => {
    setLoading(true);
    api.get('/api/admin/moderation')
      .then((r) => setAllContent(r.data.data || {}))
      .catch(() => setAllContent({ testimonies: [], articles: [], photos: [], videos: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Combiner et filtrer le contenu
  const getAllContent = () => {
    const items = [];
    if (contentType === 'testimonies') {
      items.push(...(allContent.testimonies || []).map(t => ({ ...t, type: 'testimonies' })));
    }
    if (contentType === 'articles') {
      items.push(...(allContent.articles || []).map(a => ({ ...a, type: 'articles' })));
    }
    if (contentType === 'photos') {
      items.push(...(allContent.photos || []).map(p => ({ ...p, type: 'photos' })));
    }
    if (contentType === 'videos') {
      items.push(...(allContent.videos || []).map(v => ({ ...v, type: 'videos' })));
    }

    return categoryFilter === 'all'
      ? items
      : items.filter((item) => item.category === categoryFilter);
  };

  const filtered = getAllContent();
  const totalCount = (allContent.testimonies?.length || 0) + (allContent.articles?.length || 0) +
                     (allContent.photos?.length || 0) + (allContent.videos?.length || 0);

  const handleFlag = async (id, type) => {
    try {
      const endpoints = {
        testimonies: `/api/testimonies/${id}`,
        articles: `/api/admin/articles/${id}`,
        photos: `/api/admin/photos/${id}`,
        videos: `/api/admin/videos/${id}`,
      };
      const bodies = {
        testimonies: { action: 'flag' },
        articles: { status: 'flagged' },
        photos: { status: 'flagged' },
        videos: { status: 'flagged' },
      };

      await api.patch(endpoints[type], bodies[type]);
      setAllContent(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter((item) => item.id !== id)
      }));
      setToast({ message: '🚩 Publication signalée', type: 'warn' });
    } catch {
      setToast({ message: 'Erreur', type: 'error' });
    }
  };

  const handleDelete = async (id, type) => {
    if (!warningText.trim()) {
      setToast({ message: 'Écris un message d\'avertissement', type: 'warn' });
      return;
    }
    try {
      const endpoints = {
        testimonies: `/api/testimonies/${id}`,
        articles: `/api/admin/articles/${id}`,
        photos: `/api/admin/photos/${id}`,
        videos: `/api/admin/videos/${id}`,
      };
      const bodies = {
        testimonies: { action: 'delete', warningMessage: warningText },
        articles: { status: 'deleted' },
        photos: { status: 'deleted' },
        videos: { status: 'deleted' },
      };

      await api.patch(endpoints[type], bodies[type]);
      setAllContent(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter((item) => item.id !== id)
      }));
      setToast({ message: '🗑️ Supprimée + avertissement envoyé', type: 'success' });
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
      <div style={{ padding: '54px 20px 16px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${theme.border}` }}>
        <BackButton to="/admin" />
        <div style={{ flex: 1 }}>
          <Eyebrow>Modération</Eyebrow>
          <H2 style={{ marginTop: 2, color: theme.chocolate }}>{currentType?.label}</H2>
        </div>
        <button onClick={toggleTheme} style={{ background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: '6px 10px', color: theme.text, cursor: 'pointer', fontSize: 16, display: 'flex',
          alignItems: 'center' }}>
          {isDark ? '☀️' : '🌙'}
        </button>
        {totalCount > 0 && (
          <span style={{ background: theme.sakura, color: theme.chocolate, borderRadius: 10,
            padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>{filtered.length}</span>
        )}
      </div>

      {/* Onglets type de contenu */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
        {CONTENT_TYPES.map((ct) => (
          <button key={ct.id} onClick={() => { setContentType(ct.id); setCategoryFilter('all'); }}
            style={{ padding: '8px 14px', borderRadius: 20, border: 'none',
              background: contentType === ct.id ? theme.chocolate : theme.surface,
              color: contentType === ct.id ? '#fff' : theme.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {ct.label}
          </button>
        ))}
      </div>

      {/* Onglets catégorie */}
      <div style={{ padding: '12px 20px', display: 'flex', gap: 8, borderBottom: `1px solid ${theme.border}`, overflowX: 'auto' }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
            style={{ padding: '8px 14px', borderRadius: 20, border: 'none',
              background: categoryFilter === cat.id ? theme.chocolate : theme.surface,
              color: categoryFilter === cat.id ? '#fff' : theme.textDim,
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: theme.font, whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
            {cat.label}
          </button>
        ))}
      </div>

      <ScrollArea style={{ padding: '16px 16px 40px', background: theme.bg }}>
        {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
          : filtered.length === 0 ? <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: 14, color: theme.textMute }}>Aucun contenu à modérer.</div>
            </div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((item) => (
                <Card key={item.id} style={{ padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme.textMute, textTransform: 'uppercase' }}>
                      {item.type === 'testimonies' && '💬 Témoignage'}
                      {item.type === 'articles' && '📄 Article'}
                      {item.type === 'photos' && '📸 Photo'}
                      {item.type === 'videos' && '🎥 Vidéo'}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: theme.chocolate, marginBottom: 8 }}>
                    {item.title || item.display_name || item.description || '(sans titre)'}
                  </div>

                  {/* Afficher les images pour les photos */}
                  {item.type === 'photos' && item.url && (
                    <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', maxHeight: 300, background: theme.surface }}>
                      <img src={item.url} alt={item.title || 'photo'} style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 300, objectFit: 'cover' }} />
                    </div>
                  )}

                  {/* Afficher les vidéos pour les vidéos */}
                  {item.type === 'videos' && item.url && (
                    <div style={{ marginBottom: 12, borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: theme.surface }}>
                      <iframe width="100%" height="100%" src={item.url} title={item.title || 'vidéo'} style={{ border: 'none', borderRadius: 8 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                    </div>
                  )}

                  <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.5, marginBottom: 10 }}>
                    {item.content || item.description || '(contenu vide)'}
                  </div>
                  <div style={{ fontSize: 11, color: theme.textMute, marginBottom: 12 }}>
                    {item.location_label && `📍 ${item.location_label} · `}{fmtDate(item.created_at)}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleFlag(item.id, item.type)} style={{ flex: 1, padding: '12px',
                      borderRadius: 12, background: theme.warnSoft, color: theme.warn, border: 'none',
                      fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                      🚩 Signaler
                    </button>
                    <button onClick={() => setWarningModal({ id: item.id, type: item.type })} style={{ flex: 1, padding: '12px',
                      borderRadius: 12, background: theme.dangerSoft, color: theme.danger, border: 'none',
                      fontWeight: 700, fontSize: 13, fontFamily: theme.font }}>
                      🗑️ Supprimer
                    </button>
                  </div>
                </Card>
              ))}
            </div>
        }
      </ScrollArea>

      {/* Modal avertissement */}
      {warningModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(42,26,17,0.45)',
          display: 'flex', alignItems: 'flex-end', zIndex: 200 }}>
          <div style={{ width: '100%', background: theme.surface, borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.border, margin: '0 auto 20px' }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.chocolate, marginBottom: 16 }}>
              ⚠️ Avertissement de suppression
            </div>
            <textarea placeholder="Explique pourquoi tu supprimes (harcèlement, contenu inapproprié, etc.)"
              value={warningText} onChange={(e) => setWarningText(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 12, border: `1px solid ${theme.border}`,
                background: theme.bg, color: theme.text, fontFamily: theme.font,
                fontSize: 13, resize: 'vertical', minHeight: 80, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setWarningModal(null)} style={{ flex: 1, padding: 14, borderRadius: 12,
                background: theme.surface, border: `1px solid ${theme.border}`, fontWeight: 700,
                fontSize: 14, color: theme.textDim, fontFamily: theme.font }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(warningModal.id, warningModal.type)} style={{ flex: 1, padding: 14, borderRadius: 12,
                background: theme.danger, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, fontFamily: theme.font }}>
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
