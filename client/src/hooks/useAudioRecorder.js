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

      // Créer le MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      console.log('[AudioRecorder] Enregistrement démarré');
    } catch (err) {
      console.error('[AudioRecorder] Erreur:', err);
      setError('Impossible d\'accéder au microphone');
      setIsRecording(false);
    }
  };

  // Arrêter l'enregistrement et retourner le blob
  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        // Créer le blob audio
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Arrêter le stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        mediaRecorderRef.current = null;
        setIsRecording(false);

        console.log('[AudioRecorder] Enregistrement arrêté');
        resolve(audioBlob);
      };

      mediaRecorder.stop();
    });
  };

  // Nettoyer les ressources
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
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
