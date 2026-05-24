import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const CHECK_IN_INTERVAL = 1 * 60 * 1000; // 1 minute (pour tests - en prod: 10 * 60 * 1000)
const CHECK_IN_TIMEOUT = 2 * 60 * 1000; // 2 minutes to respond

/**
 * Hook pour gérer les check-ins automatiques pendant le niveau 1 (Vigilance)
 * - Affiche un modal toutes les 1 minute (tests) / 10 minutes (prod)
 * - Persiste même quand l'onglet perd le focus (utilise timestamp)
 * - Compte les réponses manquantes
 * - Escalade automatiquement après 2 check-ins sans réponse
 */
export function useCheckInTimer(activeTrack) {
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(CHECK_IN_TIMEOUT);
  const [missedCheckIns, setMissedCheckIns] = useState(0);
  const [isEscalating, setIsEscalating] = useState(false);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const visibilityHandlerRef = useRef(null);
  const lastCheckInRef = useRef(null);

  // Fonction pour répondre "Oui, je vais bien"
  const handleCheckInYes = useCallback(async () => {
    if (!activeTrack?.id) return;

    try {
      await api.patch(`/api/tracks/${activeTrack.id}/checkin`, { response: 'ok' });
      setShowCheckInModal(false);
      setMissedCheckIns(0); // Reset le compteur
      setTimeRemaining(CHECK_IN_TIMEOUT);
    } catch (err) {
      console.error('Erreur check-in:', err.message);
    }
  }, [activeTrack]);

  // Fonction pour escalader "Je ne vais pas bien" → niveau 2
  const handleCheckInNo = useCallback(async () => {
    if (!activeTrack?.id) return;

    setIsEscalating(true);
    try {
      // 1. Marquer le check-in comme "no_response"
      await api.patch(`/api/tracks/${activeTrack.id}/checkin`, { response: 'no_response' });

      // 2. Créer alerte niveau 2
      const alertRes = await api.post('/api/alerts', {
        level: '2',
        latitude: activeTrack.latest_lat,
        longitude: activeTrack.latest_lng,
        description: 'Escalade automatique: l\'utilisatrice ne va pas bien',
      });

      // 3. Envoyer SMS d'alerte aux contacts
      if (alertRes.data.data?.id) {
        await api.post('/api/sms/alert', { alert_id: alertRes.data.data.id });
      }

      setShowCheckInModal(false);
      // Le track s'arrêtera naturellement, pas besoin de le fermer
    } catch (err) {
      console.error('Erreur escalade:', err.message);
    } finally {
      setIsEscalating(false);
    }
  }, [activeTrack]);

  // Cleanup des timers
  const clearAllTimers = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (visibilityHandlerRef.current) {
      document.removeEventListener('visibilitychange', visibilityHandlerRef.current);
    }
  }, []);

  // Afficher le modal et démarrer le countdown
  const triggerCheckInModal = useCallback(() => {
    setShowCheckInModal(true);
    setTimeRemaining(CHECK_IN_TIMEOUT);
    lastCheckInRef.current = Date.now();

    // Countdown timer pour la réponse (2 minutes)
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1000) {
          // Timeout: marquer comme manqué
          setMissedCheckIns((missed) => {
            const newMissed = missed + 1;

            // Vérifier si 2 check-ins manqués → escalade automatique
            if (newMissed >= 2) {
              console.log('Auto-escalade: 2 check-ins manqués');
              handleCheckInNo(); // Auto-escalade
            }

            return newMissed;
          });

          // Fermer le modal si timeout et pas escalade
          if (missedCheckIns + 1 < 2) {
            setShowCheckInModal(false);
          }

          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  }, [handleCheckInNo, missedCheckIns]);

  // Principal: Gérer le cycle des check-ins
  useEffect(() => {
    if (!activeTrack?.id) {
      clearAllTimers();
      setShowCheckInModal(false);
      setMissedCheckIns(0);
      lastCheckInRef.current = null;
      return;
    }

    // Initialiser le timestamp du dernier check-in
    if (!lastCheckInRef.current) {
      lastCheckInRef.current = Date.now();
    }

    // Intervalle principal: vérifier toutes les 10 secondes si un check-in est dû
    intervalRef.current = setInterval(() => {
      if (lastCheckInRef.current) {
        const elapsed = Date.now() - lastCheckInRef.current;
        if (elapsed >= CHECK_IN_INTERVAL) {
          triggerCheckInModal();
        }
      }
    }, 10000); // Vérifie toutes les 10 secondes

    // Listener pour quand l'onglet reprend le focus
    visibilityHandlerRef.current = () => {
      if (document.visibilityState === 'visible' && activeTrack?.id && lastCheckInRef.current) {
        const elapsed = Date.now() - lastCheckInRef.current;
        if (elapsed >= CHECK_IN_INTERVAL && !showCheckInModal) {
          console.log(`Check-in dû: ${Math.floor(elapsed / 1000)}s écoulées`);
          triggerCheckInModal();
        }
      }
    };

    document.addEventListener('visibilitychange', visibilityHandlerRef.current);

    return clearAllTimers;
  }, [activeTrack, triggerCheckInModal, showCheckInModal, clearAllTimers]);

  return {
    showCheckInModal,
    setShowCheckInModal,
    timeRemaining,
    missedCheckIns,
    handleCheckInYes,
    handleCheckInNo,
    isEscalating,
  };
}
