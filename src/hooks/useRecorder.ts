import { useState, useRef, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type RecorderState = 'idle' | 'recording' | 'paused' | 'processing' | 'completed';

export function useRecorder(userId: string) {
  const [status, setStatus] = useState<RecorderState>('idle');
  const [transcript, setTranscript] = useState<string>("");
  const [currentSummary, setSummary] = useState<any>(null);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [permissionError, setPermissionError] = useState<boolean>(false);
  
  const socketRef = useRef<Socket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getDevices = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices
        .filter(d => d.kind === 'audioinput')
        .map((d, index) => ({
            ...d,
            label: d.label || `Microphone ${index + 1} (System Default)`
        }));

      setAudioDevices(mics);
      if (mics.length > 0 && !selectedDeviceId) setSelectedDeviceId(mics[0].deviceId);
      stream.getTracks().forEach(t => t.stop());
      setPermissionError(false);
    } catch (e) {
      setPermissionError(true);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000", { path: "/socket.io/" });
    socketRef.current.on('status', (s) => setStatus(s));
    socketRef.current.on('transcript-update', (data) => setTranscript(data.fullTranscript));
    socketRef.current.on('session-completed', (data) => { setStatus('completed'); setSummary(data); });
    getDevices();
    return () => { socketRef.current?.disconnect(); };
  }, [getDevices]);

  const startRecording = useCallback(async (source: 'mic' | 'tab') => {
    try {
      let stream;
      if (source === 'tab') {
        // @ts-ignore
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { width: 1, height: 1 }, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true, autoGainControl: true
          } 
        });
      }
      
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      socketRef.current?.emit('start-session', { userId });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current && recorder.state === "recording") {
          socketRef.current.emit('audio-data', event.data);
        }
      };

      recorder.start(6000); 
      setStatus('recording');
      stream.getTracks().forEach(track => { track.onended = stopRecording; });

    } catch (err) {
      alert("Could not access microphone.");
    }
  }, [userId, selectedDeviceId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    socketRef.current?.emit('stop-session');
  }, []);

  // NEW: PAUSE FUNCTION
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    
    if (status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
    } else if (status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
    }
  }, [status]);

  return {
    status, transcript, currentSummary, startRecording, stopRecording, 
    togglePause, // <--- EXPORT THIS
    mediaStream: streamRef.current, audioDevices, selectedDeviceId, setSelectedDeviceId, permissionError, refreshDevices: getDevices 
  };
}