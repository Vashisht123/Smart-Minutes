'use client';

import { useState, useEffect, useRef } from 'react';
import { useRecorder } from '@/hooks/useRecorder';
import { getSessions, updateSessionTitle } from '../actions'; // Added updateSessionTitle
import { Mic, Monitor, Square, FileText, Loader2, Settings2, RefreshCw, History, Clock, Pause, Play, Pencil, Check, X } from 'lucide-react';

// --- VISUALIZER COMPONENT (Inline) ---
function AudioVisualizer({ stream }: { stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!stream || !canvasRef.current) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);
      ctx.fillStyle = 'rgb(31, 41, 55)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`; 
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContext.state !== 'closed') audioContext.close();
    };
  }, [stream]);
  return <canvas ref={canvasRef} width={300} height={50} className="w-full rounded-md border border-gray-700" />;
}

export default function Dashboard() {
  const userId = "user_123_placeholder"; 
  const { 
    status, transcript, currentSummary, startRecording, stopRecording, togglePause, mediaStream,
    audioDevices, selectedDeviceId, setSelectedDeviceId, permissionError, refreshDevices 
  } = useRecorder(userId);

  // STATE
  const [history, setHistory] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  
  // RENAMING STATE
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Fetch history logic
  async function refreshHistory() {
    const sessions = await getSessions(userId);
    setHistory(sessions);
  }

  useEffect(() => {
    refreshHistory();
    if (status === 'completed') {
      refreshHistory();
      setSelectedSession(null);
    }
  }, [userId, status]);

  // Handle saving the new title
  const handleTitleSave = async () => {
    const sessionToUpdate = selectedSession || currentSummary; // Handle both history select and live finish
    if (!sessionToUpdate) return;

    try {
      await updateSessionTitle(sessionToUpdate.id, editedTitle);
      
      // Update local state to show new title immediately
      if (selectedSession) setSelectedSession({ ...selectedSession, title: editedTitle });
      
      setIsEditingTitle(false);
      refreshHistory(); // Refresh sidebar to show new name
    } catch (e) {
      alert("Failed to rename session");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${status === 'recording' ? 'bg-red-500 animate-pulse' : status === 'paused' ? 'bg-yellow-500' : 'bg-purple-500'}`}></div>
          SmartMinutes
        </h1>
        <div className="text-sm font-mono bg-gray-800 px-3 py-1 rounded text-purple-200 uppercase">
          STATUS: {status}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: Controls & History */}
        <div className="col-span-1 space-y-6">
          
          {/* CONTROLS CARD */}
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Recorder</h2>
            
            {status === 'recording' && (
              <div className="mb-4">
                 <AudioVisualizer stream={mediaStream} />
              </div>
            )}

            {/* CONTROL BUTTONS */}
            {status === 'idle' || status === 'completed' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-gray-400">
                     <label className="flex items-center gap-1"><Settings2 size={12} /> Mic Source</label>
                     <button onClick={refreshDevices} className="hover:text-white"><RefreshCw size={10} /></button>
                  </div>
                  {permissionError ? (
                     <div className="text-red-400 text-xs p-1 border border-red-800 rounded">Blocked</div>
                  ) : (
                    <select 
                      className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-xs text-white"
                      value={selectedDeviceId}
                      onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                      {audioDevices.map((d, i) => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${i+1}`}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button onClick={() => { setSelectedSession(null); startRecording('mic'); }} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 p-2 rounded-lg text-sm font-bold">
                  <Mic size={16} /> Record Mic
                </button>
                <button onClick={() => { setSelectedSession(null); startRecording('tab'); }} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 p-2 rounded-lg text-sm font-bold">
                  <Monitor size={16} /> Capture Tab
                </button>
              </div>
            ) : (status === 'recording' || status === 'paused') ? (
              <div className="space-y-3">
                 <button 
                  onClick={togglePause} 
                  className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition ${status === 'paused' ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                 >
                   {status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
                   {status === 'paused' ? 'Resume' : 'Pause'}
                 </button>
                 <button onClick={stopRecording} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 p-3 rounded-lg font-bold">
                   <Square size={20} /> Stop & Process
                 </button>
              </div>
            ) : (
               <button disabled className="w-full flex items-center justify-center gap-2 bg-gray-700 p-4 rounded-lg font-bold animate-pulse text-gray-400">
                 <Loader2 className="animate-spin" /> Processing...
               </button>
            )}
          </div>

          {/* HISTORY LIST CARD */}
          <div className="bg-gray-800 p-5 rounded-xl border border-gray-700 h-[400px] overflow-hidden flex flex-col">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <History size={14} /> Past Sessions
            </h2>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {history.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => { setSelectedSession(session); setIsEditingTitle(false); }}
                  className={`p-3 rounded-lg cursor-pointer text-sm transition border ${selectedSession?.id === session.id ? 'bg-purple-900/40 border-purple-500' : 'bg-gray-700/50 border-transparent hover:bg-gray-700'}`}
                >
                  <div className="font-bold text-white truncate">{session.title}</div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {session.duration}s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Content Display */}
        <div className="col-span-1 md:col-span-3 space-y-6">
          
          {(status === 'recording' || status === 'paused' || status === 'processing') && (
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
               <h2 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                 {status === 'paused' ? '⏸️ Session Paused' : '🔴 Live Session'}
               </h2>
               <div className="bg-black/30 p-4 rounded-lg font-mono text-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                 {transcript || "Listening..."}
               </div>
            </div>
          )}

          {/* SUMMARY VIEW (Edit Title Logic Added Here) */}
          {(currentSummary || selectedSession) && (status === 'idle' || status === 'completed') && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-xl border border-gray-700 shadow-2xl">
                
                {/* HEADER: TITLE EDITING */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1 mr-4">
                     {isEditingTitle ? (
                       <div className="flex items-center gap-2">
                         <input 
                           type="text" 
                           value={editedTitle}
                           onChange={(e) => setEditedTitle(e.target.value)}
                           className="bg-gray-900 border border-purple-500 text-white text-2xl font-bold rounded px-2 py-1 w-full focus:outline-none"
                           autoFocus
                         />
                         <button onClick={handleTitleSave} className="bg-green-600 p-2 rounded hover:bg-green-500"><Check size={18}/></button>
                         <button onClick={() => setIsEditingTitle(false)} className="bg-gray-600 p-2 rounded hover:bg-gray-500"><X size={18}/></button>
                       </div>
                     ) : (
                       <div className="group flex items-center gap-3">
                         <h2 className="text-2xl font-bold text-white mb-1">
                           {selectedSession ? selectedSession.title : (currentSummary?.title || "New Meeting Summary")}
                         </h2>
                         <button 
                           onClick={() => {
                             const currentTitle = selectedSession ? selectedSession.title : (currentSummary?.title || "New Meeting");
                             setEditedTitle(currentTitle);
                             setIsEditingTitle(true);
                           }}
                           className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-purple-400 transition"
                         >
                           <Pencil size={18} />
                         </button>
                       </div>
                     )}
                     
                     <p className="text-gray-400 text-sm mt-1">
                       {selectedSession ? new Date(selectedSession.createdAt).toLocaleString() : "Just now"}
                     </p>
                  </div>
                  <div className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-800">
                    COMPLETED
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-purple-400 font-bold uppercase tracking-wider text-xs mb-3">AI Analysis</h3>
                    <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                       <div className="whitespace-pre-wrap">
                         {(selectedSession ? selectedSession.summary : currentSummary?.summary) || "No summary available."}
                       </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-blue-400 font-bold uppercase tracking-wider text-xs mb-3">Full Transcript</h3>
                    <div className="bg-black/40 p-4 rounded-lg text-xs text-gray-400 font-mono h-[300px] overflow-y-auto border border-gray-700/50">
                      {(selectedSession ? selectedSession.transcript : currentSummary?.transcript || transcript)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {status === 'idle' && !currentSummary && !selectedSession && (
            <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl min-h-[400px]">
              <FileText size={48} className="mb-4 opacity-50" />
              <p>Select a past session or start a new recording</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}