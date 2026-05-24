import { useAuth } from '../hooks/useAuth';
import { ChatAssistant } from './ChatAssistant';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { PageShell, BottomNav } from '../components/ui/index.jsx';

/**
 * Page Chat - Interface pour discuter librement avec Claude/Aïcha
 */
export default function Chat() {
  const { user } = useAuth();
  const [activeTrack, setActiveTrack] = useState(null);

  // Charger le track actif
  useEffect(() => {
    const loadActiveTrack = async () => {
      try {
        const res = await api.get('/api/tracks');
        const tracks = res.data.data || [];
        const active = tracks.find((t) => t.status === 'active');
        setActiveTrack(active || null);
      } catch (err) {
        console.error('Erreur chargement track:', err.message);
      }
    };

    loadActiveTrack();
  }, []);

  return (
    <PageShell>
      <ChatAssistant
        activeTrack={activeTrack}
        onClose={() => {}} // Pas de fermeture pour la page dédiée
      />
      <BottomNav />
    </PageShell>
  );
}
