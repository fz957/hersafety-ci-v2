import { useEffect, useRef, useState } from 'react';

/**
 * Hook pour enregistrer l'audio automatiquement
 * Utilisé en cas d'urgence pour garder des preuves
 */
export function useAudioRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      setError(null);

      // Demander l'accès au micro
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Créer le MediaRecorder - préférer webm mais fallback sur des formats supportés
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';  // Laisser le navigateur choisir le format par défaut
      }

      console.log('[AudioRecorder] Utilisant MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream,
        mimeType ? { mimeType } : {}
      );

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      console.log('[AudioRecorder] ✓ Enregistrement démarré');
    } catch (err) {
      const errorMsg = err.name === 'NotAllowedError'
        ? 'Microphone: Permission refusée. Accepte l\'accès au microphone pour enregistrer l\'audio.'
        : err.name === 'NotFoundError'
        ? 'Microphone: Aucun périphérique trouvé'
        : 'Impossible d\'accéder au microphone';

      console.error('[AudioRecorder] ✗ Erreur:', err.name, '-', err.message);
      setError(errorMsg);
      setIsRecording(false);
    }
  };

  // Arrêter l'enregistrement et retourner le blob
  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        console.log('[AudioRecorder] Pas d\'enregistrement actif');
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      // Check if already stopping
      if (mediaRecorder.state === 'inactive') {
        console.log('[AudioRecorder] Enregistrement déjà arrêté');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        resolve(audioBlob);
        return;
      }

      mediaRecorder.onstop = () => {
        // Créer le blob audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Arrêter le stream IMMÉDIATEMENT
        if (streamRef.current) {
          console.log('[AudioRecorder] Stopping all tracks...');
          streamRef.current.getTracks().forEach(track => {
            console.log('[AudioRecorder] Stopping track:', track.kind, track.readyState);
            track.stop();
            console.log('[AudioRecorder] Track stopped:', track.readyState);
          });
          streamRef.current = null;
        }

        mediaRecorderRef.current = null;
        setIsRecording(false);

        console.log('[AudioRecorder] Enregistrement arrêté, blob size:', audioBlob.size);
        resolve(audioBlob);
      };

      console.log('[AudioRecorder] Arrêt en cours...');
      mediaRecorder.stop();

      // Force stop immediately just in case
      setTimeout(() => {
        if (streamRef.current) {
          console.log('[AudioRecorder] Force stopping stream after timeout');
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      }, 100);
    });
  };

  // Nettoyer les ressources
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
  };
}
