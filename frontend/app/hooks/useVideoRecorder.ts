/**
 * React hook for video recording using MediaRecorder API.
 * Records video + audio from the user's camera/microphone.
 */

'use client';

import { useState, useRef, useCallback } from 'react';

export interface UseVideoRecorderReturn {
  // State
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  error: string | null;
  videoBlob: Blob | null;
  
  // Actions
  startRecording: (stream?: MediaStream) => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  getVideoBlob: () => Blob | null;
  reset: () => void;
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording
  const startRecording = useCallback(async (existingStream?: MediaStream) => {
    try {
      setError(null);
      chunksRef.current = [];
      setVideoBlob(null);
      setRecordingTime(0);

      // Use provided stream or get new one
      let stream = existingStream;
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
      streamRef.current = stream;

      // Determine best supported format
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      if (!selectedMimeType) {
        throw new Error('No supported video format found');
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VideoRecorder] Error:', event);
        setError('Recording error occurred');
      };

      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        setVideoBlob(blob);
        console.log('[VideoRecorder] Recording stopped, blob size:', blob.size);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log('[VideoRecorder] Started recording with', selectedMimeType);
    } catch (err) {
      console.error('[VideoRecorder] Failed to start:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      throw err;
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        setIsPaused(false);
        resolve(videoBlob);
        return;
      }

      // Wait for onstop to fire and blob to be created
      const currentRecorder = mediaRecorderRef.current;
      const originalOnStop = currentRecorder.onstop;
      
      currentRecorder.onstop = (event) => {
        if (originalOnStop) {
          originalOnStop.call(currentRecorder, event);
        }
        // Give time for state to update
        setTimeout(() => {
          const blob = new Blob(chunksRef.current, { type: currentRecorder.mimeType });
          setVideoBlob(blob);
          resolve(blob);
        }, 100);
      };

      currentRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);

      console.log('[VideoRecorder] Stopping recording...');
    });
  }, [videoBlob]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      console.log('[VideoRecorder] Paused');
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
      console.log('[VideoRecorder] Resumed');
    }
  }, []);

  // Get the recorded video blob
  const getVideoBlob = useCallback(() => {
    if (videoBlob) return videoBlob;
    
    // If recording is still going, create blob from current chunks
    if (chunksRef.current.length > 0) {
      const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
      return new Blob(chunksRef.current, { type: mimeType });
    }
    
    return null;
  }, [videoBlob]);

  // Reset state
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    // Don't stop the stream - let the camera component manage it
    
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setVideoBlob(null);
    setError(null);
  }, []);

  return {
    isRecording,
    isPaused,
    recordingTime,
    error,
    videoBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    getVideoBlob,
    reset,
  };
}
