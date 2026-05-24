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
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(CHECK_IN_TIMEOUT);
  const [missedCheckIns, setMissedCheckIns] = useState(0);
  const [isEscalating, setIsEscalating] = useState(false);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const visibilityHandlerRef = useRef(null);
  const lastCheckInRef = useRef(null);
  const swReadyRef = useRef(false);

  // Attendre que le Service Worker soit prêt avant d'envoyer messages
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(() => {
      swReadyRef.current = true;
      console.log('[useCheckInTimer] SW prêt');
    }).catch((err) => {
      console.error('[useCheckInTimer] SW non disponible:', err);
    });
  }, []);

  // Fonction pour répondre "Oui, je vais bien"
  const handleCheckInYes = useCallback(async () => {
    if (!activeTrack?.id) return;

    try {
      await api.patch(`/api/tracks/${activeTrack.id}/checkin`, { response: 'ok' });
      setShowCheckInModal(false);
      setMissedCheckIns(0); // Reset le compteur
      setTimeRemaining(CHECK_IN_TIMEOUT);

      // Notifier le Service Worker de la réponse
      if (swReadyRef.current && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CHECK_IN_RESPONSE',
          trackId: activeTrack.id,
          action: 'yes',
        });
      }
    } catch (err) {
      console.error('❌ Erreur check-in:', err);
      console.error('  Message:', err.message);
      console.error('  Status:', err.response?.status);
      console.error('  Data:', err.response?.data);
      console.error('  Full error:', JSON.stringify(err, null, 2));
    }
  }, [activeTrack]);

  // Fonction pour "Je ne vais pas bien" → Afficher l'IA Assistant
  const handleCheckInNo = useCallback(() => {
    // Fermer le modal de check-in et afficher l'IA Assistant pour évaluation
    setShowCheckInModal(false);
    setShowAIAssistant(true);
  }, []);

  // Fonction pour arrêter complètement les check-ins
  const handleStopCheckIn = useCallback(async () => {
    if (!activeTrack?.id) return;

    try {
      // Arrêter le track
      await api.patch(`/api/tracks/${activeTrack.id}/end`, {});
      setShowCheckInModal(false);
    } catch (err) {
      console.error('❌ Erreur arrêt check-in:', err);
    }
  }, [activeTrack]);

  // Fonction quand Claude escalade vers Emergency
  const handleEmergencyFromAI = useCallback(() => {
    setShowAIAssistant(false);
    // Le composant parent gérera la navigation vers Emergency
  }, []);

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
    localStorage.setItem('checkin_tracking', lastCheckInRef.current.toString());

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
      localStorage.removeItem('checkin_tracking');

      // Notifier le Service Worker de l'arrêt du track
      if (swReadyRef.current && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TRACK_ENDED',
        });
      }

      return;
    }

    // Notifier le Service Worker du démarrage du track
    if (swReadyRef.current && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'TRACK_STARTED',
        trackId: activeTrack.id,
      });
    }

    // Initialiser le timestamp du dernier check-in - restaurer depuis localStorage si exist
    if (!lastCheckInRef.current) {
      const stored = localStorage.getItem('checkin_tracking');
      lastCheckInRef.current = stored ? parseInt(stored, 10) : Date.now();
    }
    localStorage.setItem('checkin_tracking', lastCheckInRef.current.toString());

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
  }, [activeTrack?.id]); // Seulement surveiller si le track a changé

  return {
    showCheckInModal,
    setShowCheckInModal,
    showAIAssistant,
    setShowAIAssistant,
    timeRemaining,
    missedCheckIns,
    handleCheckInYes,
    handleCheckInNo,
    handleStopCheckIn,
    handleEmergencyFromAI,
    isEscalating,
  };
}
