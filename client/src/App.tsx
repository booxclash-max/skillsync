import React, { useState, useEffect, useRef } from 'react';
import SimulationInterface from './components/SimulationInterface';
import { UploadCloud, XCircle, Cpu, ShieldCheck } from 'lucide-react';

const BACKEND_URL = import.meta.env.MODE === 'production' 
  ? 'https://skillsync-kdzy.onrender.com' 
  : 'http://localhost:8000';

type Phase = 'upload' | 'training' | 'ready' | 'simulation';

// --- NEW COMPONENT: Typewriter Effect Helper ---
const TypewriterLine = ({ text, delay = 30 }: { text: string, delay?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        setIsComplete(true);
        clearInterval(timer);
      }
    }, delay);

    return () => clearInterval(timer);
  }, [text, delay]);

  return (
    <span className={isComplete ? '' : 'border-r-2 border-cyan-500 animate-pulse'}>
      {displayedText}
    </span>
  );
};
// ------------------------------------------------

function App() {
  const [phase, setPhase] = useState<Phase>('upload');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  
  // Auto-scroll to bottom of logs
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [bootLogs]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${BACKEND_URL}/upload`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) throw new Error('Uplink Interrupted');
      const data = await response.json();
      
      setLoading(false);
      setPhase('training');
      runBootSequence(data.info);
    } catch (err) {
      setLoading(false);
      setUploadError('CONNECTION REFUSED: Check Mainframe Status');
    }
  };

  const runBootSequence = (serverMessage?: string) => {
    const logs = [
      "> INITIALIZING NEURAL LINK...",
      `> MOUNTING DATA: ${fileName}`,
      "> DECRYPTING SEMANTIC LAYERS...",
      "> GENERATING VECTOR NODES...",
      `> SERVER_MSG: ${serverMessage || 'READY'}`,
      "> SYNCING WITH CORE AI...",
      "> ENCRYPTING SESSION...",
      "> READY."
    ];

    let i = 0;
    setBootLogs([]); 
    
    // Slower interval so the typewriter has time to finish before the next line
    const interval = setInterval(() => {
      if (i < logs.length) {
        const nextLog = logs[i];
        setBootLogs(prev => [...prev, nextLog]);
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase('ready'), 1500);
      }
    }, 800); // Increased from 300 to 800ms to allow typing to breathe
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] text-cyan-400 font-mono relative overflow-hidden">
      {/* Sci-Fi Background Elements */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />

      {/* Header HUD */}
      {phase !== 'simulation' && (
  <header className="pt-12 flex flex-col items-center z-20 relative animate-in fade-in slide-in-from-top duration-700">
    <div className="group relative">
      <div className="absolute -inset-1 bg-cyan-500 rounded blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>

      <div className="relative px-8 py-4 bg-slate-950 border border-cyan-500/50 rounded-lg flex items-center space-x-4">
        
        {/* IMAGE ICON (32px like Database) */}
        <img
          src="/icons/skillsync-core.png"  // change to your image path
          alt="SkillSync Core"
          className="w-8 h-8 animate-pulse"
        />

        <div>
          <h1 className="text-4xl font-black tracking-[0.3em] text-white">
            SKILLSYNC
          </h1>

          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
            <p className="text-[10px] text-cyan-500/70 font-bold tracking-widest uppercase">
              Kernel v4.0.2 // Neural Interface
            </p>
          </div>
        </div>

      </div>
    </div>
  </header>
)}

      <main className="container mx-auto px-4 pt-20 pb-12 flex flex-col items-center justify-center min-h-[70vh] z-10 relative">
        
        {/* PHASE: UPLOAD */}
        {phase === 'upload' && (
          <div className="w-full max-w-lg bg-slate-900/40 backdrop-blur-xl border border-white/10 p-10 rounded-2xl shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 animate-pulse"></div>
                <UploadCloud size={64} className="text-cyan-400 relative" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-widest">ESTABLISH DATA UPLINK</h2>
              
              {uploadError && (
                <div className="w-full bg-red-500/10 border border-red-500/50 p-3 rounded text-red-400 text-xs flex items-center gap-2">
                  <XCircle size={16} /> {uploadError}
                </div>
              )}

              <label className="w-full group cursor-pointer">
                <div className={`py-6 px-10 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center gap-3 ${loading ? 'border-cyan-500 bg-cyan-500/10 animate-pulse' : 'border-slate-700 hover:border-cyan-400 hover:bg-white/5'}`}>
                   {loading ? <Cpu className="animate-spin text-cyan-400" /> : <div className="text-cyan-400 font-bold uppercase tracking-widest">Select Source PDF</div>}
                   <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Maximum payload: 50MB</div>
                </div>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading} />
              </label>
            </div>
          </div>
        )}

        {/* PHASE: TRAINING (LOGS) */}
        {phase === 'training' && (
          <div className="w-full max-w-2xl bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="flex items-center gap-2 mb-4 border-b border-cyan-500/20 pb-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
              <span className="text-[10px] text-cyan-500/50 tracking-[0.3em] ml-4 uppercase">System_Decoding_Sequence</span>
            </div>
            
            <div className="space-y-2 h-64 overflow-y-auto font-mono text-sm scrollbar-hide">
              {bootLogs.map((log, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <span className="text-cyan-900 text-[10px] w-20 whitespace-nowrap">
                    [{new Date().toLocaleTimeString([], {hour12: false})}]
                  </span>
                  <span className={(log?.toString().includes('READY')) ? 'text-green-400 font-bold' : 'text-cyan-400'}>
                    {/* IMPLEMENTED TYPEWRITER HERE */}
                    <TypewriterLine text={log} delay={20} />
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* PHASE: READY */}
        {phase === 'ready' && (
          <div className="text-center animate-in zoom-in duration-500">
            <div className="mb-8 relative inline-block">
              <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse"></div>
              <ShieldCheck size={120} className="text-green-500 relative" />
            </div>
            <h2 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">Neural Sync Complete</h2>
            <button 
              onClick={() => setPhase('simulation')}
              className="px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-full tracking-[0.2em] transition-all transform hover:scale-105 hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]"
            >
              INITIALIZE INTERFACE
            </button>
          </div>
        )}

        {/* PHASE: SIMULATION */}
        {phase === 'simulation' && <SimulationInterface />}
      </main>
    </div>
  );
}

export default App;