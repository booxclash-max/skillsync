import { useState } from 'react';
import SimulationInterface from './components/SimulationInterface';
import { HardDrive, UploadCloud, CheckCircle, Database, XCircle } from 'lucide-react';
import './App.css';

function App() {
  const [phase, setPhase] = useState('upload'); // upload | training | ready | simulation
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadError, setUploadError] = useState(""); // Track upload errors
  
  // Fake Terminal Logs for "Training" phase
  const [bootLogs, setBootLogs] = useState([]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    setUploadError(""); // Reset previous errors

    try {
        // --- REAL UPLOAD LOGIC START ---
        const formData = new FormData();
        formData.append("file", file);

        // Send to Backend
        const response = await fetch("http://localhost:8000/upload", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server Error: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Upload Success:", data);

        // If upload is good, start the cool boot sequence
        setLoading(false);
        setPhase('training');
        runBootSequence();
        // --- REAL UPLOAD LOGIC END ---

    } catch (err) {
        console.error("Upload failed:", err);
        setLoading(false);
        setUploadError("CONNECTION FAILED: Check Backend Terminal");
    }
  };

  const runBootSequence = () => {
      const logs = [
          "Initializing Neural Link...",
          `Reading: ${fileName}...`,
          "Extracting Semantic Layers...",
          "Optimizing Vector Embeddings...",
          "Connecting to ERNIE-3.5 Mainframe...",
          "Generating Simulation Context...",
          "COMPLETE."
      ];
      
      let i = 0;
      const interval = setInterval(() => {
          if (i < logs.length) {
              setBootLogs(prev => [...prev, logs[i]]);
              i++;
          } else {
              clearInterval(interval);
              setTimeout(() => setPhase('ready'), 800);
          }
      }, 600);
  };

  return (
    <div className="app-container">
      {/* BACKGROUND GRID */}
      <div className="grid-bg"></div>

      {/* HEADER */}
      {phase !== 'simulation' && (
        <header className="app-header">
            <div className="logo-box">
                <Database color="#00d0ff" size={32} />
                <h1>SKILLSYNC <span className="version">OS v4.0</span></h1>
            </div>
            <p className="status-line">SYSTEM ONLINE // WAITING FOR INPUT</p>
        </header>
      )}

      <main className="app-main">

        {/* 1. UPLOAD CARD */}
        {phase === 'upload' && (
          <div className="cyber-card">
            <div className="card-header">
                <UploadCloud size={40} color="#00d0ff"/>
                <h2>DATA UPLINK</h2>
            </div>
            <p className="instruction">Upload Protocol Manual (PDF/IMG) to initialize training simulation.</p>

            {/* Error Message if Upload Fails */}
            {uploadError && (
                <div style={{color: '#ff003c', marginBottom: '10px', display:'flex', alignItems:'center', gap:'8px'}}>
                    <XCircle size={16}/> {uploadError}
                </div>
            )}

            <label className={`upload-zone ${loading ? 'scanning' : ''}`}>
              {loading ? "UPLOADING TO MAINFRAME..." : "SELECT FILE"}
              <input type="file" onChange={handleFileUpload} disabled={loading} />
            </label>
            
            <div className="tech-decor">
                <span>SECURE CONNECTION</span>
                <span>BAIDU CLOUD</span>
            </div>
          </div>
        )}

        {/* 2. TRAINING (BOOT SEQUENCE) */}
        {phase === 'training' && (
          <div className="cyber-card wide">
             <div className="terminal-window">
                 <div className="terminal-header">
                     <span className="dot red"></span>
                     <span className="dot yellow"></span>
                     <span className="dot green"></span>
                     <span className="title">root@skillsync:~/training</span>
                 </div>
                 <div className="terminal-body">
                     {bootLogs.map((log, i) => (
                         <div key={i} className="log-line">
                             <span className="prompt">$</span> {log}
                         </div>
                     ))}
                     <div className="cursor-block"></div>
                 </div>
             </div>
          </div>
        )}

        {/* 3. READY STATE */}
        {phase === 'ready' && (
          <div className="cyber-card">
            <div className="success-ring">
                <CheckCircle size={60} color="#00ff41" />
            </div>
            <h2>SIMULATION GENERATED</h2>
            <p>The AI has absorbed the material. You are now entering the scenario.</p>
            
            <button className="start-cyber-btn" onClick={() => setPhase('simulation')}>
               <HardDrive size={18} style={{marginRight:8}}/> 
               INITIATE SEQUENCE
            </button>
          </div>
        )}

        {/* 4. SIMULATION */}
        {phase === 'simulation' && <SimulationInterface />}
      </main>
    </div>
  );
}

export default App;