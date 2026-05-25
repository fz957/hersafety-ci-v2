import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { HS, ICONS } from '../tokens';
import { Icon, Button, BottomNav, PageShell, ScrollArea, Toast } from '../components/ui/index.jsx';

const Post = ({ item, type, onDelete, onReport, user, setToast, CATEGORIES }) => {
  const [open, setOpen] = useState(item.trigger_warning_level === 'none' || item.trigger_warning_level === 'low');
  const [reported, setReported] = useState(false);
  const [liked, setLiked] = useState(false);
  const [supportCount, setSupportCount] = useState(item.support_count || 0);
  const [commentCount, setCommentCount] = useState(item.comment_count || 0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isOwner = item.user_id === user?.id;
  const isSensitive = item.trigger_warning_level === 'moderate' || item.trigger_warning_level === 'severe';

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
      setShowReportModal(false);
      setToast({ message: 'Signalé ✓ Merci!', type: 'success' });
    } catch (err) {
      console.error('Report error:', err);
      setReported(true);
      setShowReportModal(false);
      setToast({ message: 'Signalé ✓ Merci!', type: 'success' });
    }
  };

  const handleLike = async () => {
    if (type === 'testimony') {
      try {
        await api.post(`/api/testimonies/${item.id}/like`);
        setLiked(!liked);
        setSupportCount(liked ? supportCount - 1 : supportCount + 1);
      } catch (err) {
        console.error('Like error:', err);
      }
    } else {
      if (liked) {
        setLiked(false);
        setSupportCount(supportCount - 1);
      } else {
        setLiked(true);
        setSupportCount(supportCount + 1);
      }
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    if (type === 'testimony') {
      try {
        await api.post(`/api/testimonies/${item.id}/comments`, {
          content: comment,
          is_anonymous: true,
        });
        setCommentCount(commentCount + 1);
      } catch (err) {
        console.error('Comment error:', err);
      }
    }
    setComment('');
    setShowCommentInput(false);
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

      <div style={{ display: 'flex', gap: 16, fontSize: 12, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}` }}>
        <button onClick={handleLike} style={{ background: 'none', border: 'none', color: liked ? HS.danger : HS.textMute, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0 }}>
          {liked ? '❤️' : '🤍'} {supportCount}
        </button>
        <button onClick={() => setShowCommentInput(!showCommentInput)} style={{ background: 'none', border: 'none', color: showCommentInput ? HS.chocolate : HS.textMute, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: HS.font, padding: 0 }}>
          💬 {commentCount}
        </button>
      </div>

      {showCommentInput && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${HS.border}`, display: 'flex', gap: 6 }}>
          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ajoute un commentaire..." style={{ flex: 1, padding: '8px 10px', borderRadius: 6, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 12, boxSizing: 'border-box' }} onKeyPress={(e) => e.key === 'Enter' && handleAddComment()} />
          <button onClick={handleAddComment} style={{ background: HS.chocolate, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: HS.font }}>
            ✓
          </button>
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
    api.get('/api/testimonies').then((r) => setTestimonies(r.data.data)).catch(() => {});
    const arts = JSON.parse(localStorage.getItem('lesgirls_articles') || '[]');
    const phos = JSON.parse(localStorage.getItem('lesgirls_photos') || '[]');
    const vids = JSON.parse(localStorage.getItem('lesgirls_videos') || '[]');
    if (arts.length === 0) generateDefault();
    else {
      setArticles(arts);
      setPhotos(phos);
      setVideos(vids);
    }
  };

  const generateDefault = () => {
    const temps = [
      { id: 1, display_name: 'CourageuseEtoile', created_at: new Date(), title: 'Suivi au marché', content: '👨→👩 Un homme m\'a suivie 20 min\n🙏 Une vendeuse m\'a aidée\n✨ Plus seule désormais!', category: 'suivi', location_label: 'Marché Adjamé', trigger_warning_level: 'moderate', support_count: 12, comment_count: 3, is_anonymous: true },
      { id: 2, display_name: 'BraveLumiere', created_at: new Date(), title: 'Agression - J\'ai crié', content: '🚨 Groupe de 3 hommes\n📱 Vol téléphone + sac\n💪 J\'ai crié → j\'ai réussi à m\'échapper\n❤️ Une dame m\'a aidée', category: 'agression_physique', location_label: 'Plateau', trigger_warning_level: 'severe', support_count: 45, comment_count: 8, is_anonymous: true },
      { id: 3, display_name: 'LibreFlamme', created_at: new Date(), title: 'Commentaires au travail', content: '😤 Mon patron: remarques sur mon corps\n📅 Depuis 2 ans, chaque jour\n📢 J\'ai signalé à RH\n💪 Je ne la ferme plus', category: 'harcelement_verbal', location_label: 'Centre-ville', trigger_warning_level: 'moderate', support_count: 28, comment_count: 5, is_anonymous: true },
      { id: 4, display_name: 'FemmeForte', created_at: new Date(), title: 'Taxi: détour menace', content: '🚕 Chauffeur menaçait détour\n📹 J\'ai gardé calme + enregistré\n🚔 Signalement fait\n✓ Sécurité en priorité', category: 'detour_force', location_label: 'Cocody', trigger_warning_level: 'moderate', support_count: 18, comment_count: 4, is_anonymous: true },
      { id: 5, display_name: 'VoixLibre', created_at: new Date(), title: 'Vol en minibus', content: '❌ 3e fois cette année\n📱 Téléphone + collier volés\n👊 Poussée quand j\'ai protesté\n😢 Personne n\'a aidé', category: 'vol', location_label: 'Yopougon', trigger_warning_level: 'low', support_count: 35, comment_count: 7, is_anonymous: true },
      { id: 6, display_name: 'Résiliente', created_at: new Date(), title: 'Agression au bureau', content: '🤨 Collègue main sur mes hanches\n😶 J\'ai gelé\n🙅 Collègue: "c\'est juste son style"\n💜 J\'ai décidé de lutter', category: 'agression_sexuelle', location_label: 'Treichville', trigger_warning_level: 'severe', support_count: 62, comment_count: 12, is_anonymous: true },
    ];

    const arts = [
      { id: 100, title: '🚩 5 signes d\'alerte', content: '1️⃣ Suivi répété\n2️⃣ Remarques dégradantes\n3️⃣ Isolement forcé\n4️⃣ Contrôle téléphone\n5️⃣ Menaces subtiles\n\n➜ Documentez + cherchez aide', trigger_warning_level: 'none', support_count: 24, comment_count: 5 },
      { id: 101, title: '🆘 Si harcelée: 5 étapes', content: '1. Calme → lieu sûr\n2. Appel 110/180\n3. Note date, lieu\n4. Dites à quelqu\'un\n5. Signalez police', trigger_warning_level: 'low', support_count: 31, comment_count: 8 },
      { id: 102, title: '💪 Auto-défense rapide', content: '🗣️ Crier "NON!" fort\n👊 Dégagez-vous + courez\n🔑 Utilisez objets (clés)\n👀 Visez yeux/nez\n✅ Confiance = meilleure défense', trigger_warning_level: 'low', support_count: 47, comment_count: 12 },
      { id: 103, title: '📞 Numéros urgence', content: '🚨 110 - Police\n☎️ 111 - Urgence médicale\n👧 180 - Femmes\n👶 1308 - Enfants\n\n24/7 • Gratuit • Confidentiel', trigger_warning_level: 'none', support_count: 15, comment_count: 3 },
      { id: 104, title: '💜 Après agression', content: 'Anxiété? Insomnie? Normal!\n\n✓ Thérapie (gratuit certains jours)\n✓ Groupes de soutien\n✓ Amies écoutent\n\nVous guérirez. Pas seule! 💪', trigger_warning_level: 'moderate', support_count: 58, comment_count: 14 },
      { id: 105, title: '🤝 Espaces sûrs', content: '👨‍👩‍👧 Famille: respect + consentement\n💼 Travail: signalez harcèlement\n🏘️ Quartier: groupes escorte\n📱 Ligne: confidentialité stricte', trigger_warning_level: 'none', support_count: 19, comment_count: 4 },
    ];

    const phos = [
      { id: 200, title: '🚺 Marche solidarité', description: '500 femmes ensemble\n➜ Plus de lumière!\n➜ Plus de sécurité!', trigger_warning_level: 'none', user_id: null, support_count: 89, comment_count: 18 },
      { id: 201, title: '💪 Auto-défense class', description: '20 femmes formées\n"Je me sens forte!"\nProchain: samedi 15h', trigger_warning_level: 'none', user_id: null, support_count: 64, comment_count: 11 },
      { id: 202, title: '🏠 Refuge 24/7', description: 'Sûr • Gratuit • Anonyme\nChambre • Repas • Écoute\nAppel 110 maintenant', trigger_warning_level: 'none', user_id: null, support_count: 72, comment_count: 9 },
      { id: 203, title: '💜 Groupe parole', description: 'Mercredi 18h\nFemmes survivantes\n"Pas seule ici!"', trigger_warning_level: 'low', user_id: null, support_count: 51, comment_count: 13 },
    ];

    const vids = [
      { id: 300, title: '💜 Ama: Ma guérison', description: '"Comment j\'ai retrouvé confiance"\n⏱️ 8 min • Inspirant', trigger_warning_level: 'moderate', user_id: null, support_count: 142, comment_count: 31 },
      { id: 301, title: '💪 3 techniques rapides', description: 'Coach Koffi en 5 min\n✓ Simple • ✓ Efficace', trigger_warning_level: 'low', user_id: null, support_count: 107, comment_count: 22 },
      { id: 302, title: '🧠 Guérir du trauma', description: 'Dr Yao explique\n⏱️ 10 min • Important', trigger_warning_level: 'moderate', user_id: null, support_count: 95, comment_count: 19 },
      { id: 303, title: '⚖️ Vos droits', description: 'Me Assandé: comment porter plainte\n⏱️ 8 min • Utile', trigger_warning_level: 'low', user_id: null, support_count: 78, comment_count: 14 },
    ];

    setTestimonies(temps);
    setArticles(arts);
    setPhotos(phos);
    setVideos(vids);
    localStorage.setItem('lesgirls_articles', JSON.stringify(arts));
    localStorage.setItem('lesgirls_photos', JSON.stringify(phos));
    localStorage.setItem('lesgirls_videos', JSON.stringify(vids));
  };

  useEffect(() => { load(); }, []);

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
      } else {
        const item = { id: Date.now(), title: form.title, content: form.content, description: form.content, trigger_warning_level: form.trigger_warning_level, user_id: user?.id };
        if (contentType === 'articles') {
          const updated = [...articles, item];
          setArticles(updated);
          localStorage.setItem('lesgirls_articles', JSON.stringify(updated));
        } else if (contentType === 'photos') {
          const updated = [...photos, item];
          setPhotos(updated);
          localStorage.setItem('lesgirls_photos', JSON.stringify(updated));
        } else if (contentType === 'videos') {
          const updated = [...videos, item];
          setVideos(updated);
          localStorage.setItem('lesgirls_videos', JSON.stringify(updated));
        }
        setToast({ message: 'Publié ✓', type: 'success' });
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
    if (type === 'testimony') {
      try {
        // TODO: Uncomment when /api/content-reports endpoint is available
        // await api.post('/api/content-reports', { report_type: 'testimony', testimony_id: itemId, reason });
      } catch (err) {
        console.error('Report error:', err);
      }
    }
    // Pour tous types: marquer comme reporté localement (géré dans le state du Post)
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
            <button key={t.id} onClick={() => { setContentType(t.id); setTab('feed'); }} style={{
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
              items.map((item) => {
                const typeMap = { testimonies: 'testimony', articles: 'article', photos: 'photo', videos: 'video' };
                return <Post key={item.id} item={item} type={typeMap[contentType]} onDelete={handleDelete} onReport={handleReport} user={user} setToast={setToast} CATEGORIES={CATEGORIES} />;
              })
            )
          ) : (
            <form onSubmit={submit} style={{ maxWidth: 700 }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Titre</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre..." style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, boxSizing: 'border-box' }} required />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: HS.textMute, display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Contenu</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Écris..." style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${HS.border}`, fontFamily: HS.font, fontSize: 14, minHeight: 120, boxSizing: 'border-box' }} required />
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
