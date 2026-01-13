import { useState, useEffect } from 'react';
import { 
  Languages, Send, RefreshCw, CheckCircle, AlertTriangle, 
  Shield, Zap, Eye, Mic, Volume2, StopCircle 
} from 'lucide-react';

// --- TYPE DEFINITIONS FOR WEB SPEECH API ---
declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

const BACKEND_URL = "http://localhost:8000";

const SimulationInterface = () => {
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [feedback, setFeedback] = useState<any>(null);
  const [showRef, setShowRef] = useState(false);

  // --- VOICE STATE ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const languages = ["English", "Chinese", "Spanish", "French", "German", "Japanese", "Arabic"];

  // ==========================================
  // 1. TEXT-TO-SPEECH (READER)
  // ==========================================
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;

    // Stop any current speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Try to match the selected language code (simplified)
    const langMap: Record<string, string> = {
      "English": "en-US", "Chinese": "zh-CN", "Spanish": "es-ES",
      "French": "fr-FR", "German": "de-DE", "Japanese": "ja-JP", "Arabic": "ar-SA"
    };
    utterance.lang = langMap[selectedLanguage] || "en-US";
    utterance.rate = 1.0;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // 2. SPEECH-TO-TEXT (LISTENER)
  // ==========================================
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Browser does not support Speech Recognition (Try Chrome).");
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // Map language for recognition
    const langMap: Record<string, string> = {
      "English": "en-US", "Chinese": "zh-CN", "Spanish": "es-ES",
      "French": "fr-FR", "German": "de-DE", "Japanese": "ja-JP", "Arabic": "ar-SA"
    };
    recognition.lang = langMap[selectedLanguage] || "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("Listening...");
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Optional: Auto-submit if match found? 
      // For safety, we just let the user see the text for now.
      matchVoiceToOption(transcript); 
    };

    recognition.start();
  };

  // Simple fuzzy matcher to select option by voice
  const matchVoiceToOption = (spokenText: string) => {
    if (!quiz?.data?.options) return;
    const lowerSpoken = spokenText.toLowerCase();

    // Check if user said "Option A", "Option 1", or read the text
    const matchedOption = quiz.data.options.find((opt: string) => 
      opt.toLowerCase().includes(lowerSpoken) || lowerSpoken.includes(opt.toLowerCase())
    );

    if (matchedOption) {
      submitAnswer(matchedOption);
    }
  };

  // ==========================================
  // 3. DATA FETCHING
  // ==========================================
  const fetchScenario = async () => {
    setLoading(true);
    setFeedback(null);
    setTranscript("");
    window.speechSynthesis.cancel(); // Stop speaking on new load
    try {
      const res = await fetch(`${BACKEND_URL}/generate_quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_language: selectedLanguage }),
      });
      const data = await res.json();
      setQuiz(data);
    } catch (err) {
      console.error("Link Failure");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (option: string) => {
    if (loading || feedback) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/evaluate_answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: quiz.data.question,
          selected_option: option,
          context: quiz.context,
          target_language: selectedLanguage
        }),
      });
      const result = await res.json();
      setFeedback(result);
      
      // Auto-read feedback
      if (result.feedback) {
         // Small delay to feel natural
         setTimeout(() => speakText(result.feedback), 500);
      }

    } catch (err) {
      console.error("Audit Failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScenario(); }, []);

  return (
    <div className="w-full max-w-7xl grid grid-cols-12 gap-6 animate-in fade-in zoom-in duration-700">
      
      {/* TOP BAR: HUD INFO */}
      <div className="col-span-12 flex items-center justify-between bg-slate-900/50 border border-cyan-500/20 p-4 rounded-lg backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-cyan-500'} shadow-[0_0_10px_currentColor]`}></div>
            <span className="text-[10px] font-bold tracking-[0.2em]">{isListening ? 'VOICE_ACTIVE' : 'LIVE_FEED'}</span>
          </div>
          <div className="flex items-center gap-3 border-l border-white/10 pl-6">
            <Languages size={16} className="text-cyan-400" />
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-cyan-400 appearance-none border-b border-cyan-500/50 hover:border-cyan-400"
            >
              {languages.map(l => <option key={l} value={l} className="bg-slate-900">{l.toUpperCase()}</option>)}
            </select>
          </div>
        </div>
        
        <button 
          onClick={fetchScenario}
          disabled={loading}
          className="group flex items-center gap-2 text-[10px] font-black tracking-widest bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 px-4 py-2 rounded transition-all border border-cyan-500/30"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform"} />
          GENERATE NEXT SCENARIO
        </button>
      </div>

      {/* LEFT COLUMN: SCENARIO & INPUT */}
      <div className="col-span-12 lg:col-span-7 space-y-6">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
          <div className="relative bg-slate-900/80 border border-white/10 p-8 rounded-xl backdrop-blur-xl min-h-[400px] flex flex-col justify-between">
            {quiz ? (
              <>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={18} className="text-yellow-500" />
                      <span className="text-xs font-bold tracking-[0.4em] text-slate-500 uppercase">Mission Objective</span>
                    </div>
                    {/* READER TOGGLE */}
                    <button 
                      onClick={() => speakText(`${quiz.data.scenario}. Question: ${quiz.data.question}`)}
                      className={`p-2 rounded-full transition-all ${isSpeaking ? 'bg-cyan-500 text-black animate-pulse' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                    >
                       {isSpeaking ? <StopCircle size={16} /> : <Volume2 size={16} />}
                    </button>
                  </div>

                  <p className="text-xl text-white leading-relaxed font-light">{quiz.data.scenario}</p>
                  <div className="p-4 bg-cyan-500/5 border-l-4 border-cyan-500">
                    <p className="text-cyan-400 font-bold italic">{quiz.data.question}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-10">
                  {quiz.data.options.map((opt: string, i: number) => (
                    <button 
                      key={i} 
                      onClick={() => submitAnswer(opt)}
                      disabled={!!feedback}
                      className={`group flex items-center justify-between p-4 border rounded-lg transition-all text-left ${
                        feedback 
                          ? 'opacity-50 cursor-not-allowed border-slate-800' 
                          : 'border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10'
                      }`}
                    >
                      <span className="text-sm tracking-wide group-hover:translate-x-2 transition-transform">{opt}</span>
                      <Send size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                    </button>
                  ))}
                </div>

                {/* VOICE INPUT CONTROL */}
                <div className="mt-6 flex items-center justify-center border-t border-white/5 pt-4">
                    <button 
                        onClick={startListening}
                        disabled={isListening || !!feedback}
                        className={`flex items-center gap-3 px-6 py-3 rounded-full border transition-all ${
                            isListening 
                            ? 'bg-red-500/10 border-red-500 text-red-400' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'
                        }`}
                    >
                        <Mic size={18} className={isListening ? "animate-bounce" : ""} />
                        <span className="text-xs font-bold tracking-widest">
                            {isListening ? "LISTENING..." : "ENABLE VOICE COMMAND"}
                        </span>
                    </button>
                    {transcript && !isListening && (
                        <span className="ml-4 text-xs text-slate-500 italic">Heard: "{transcript}"</span>
                    )}
                </div>

              </>
            ) : (
              <div className="flex items-center justify-center h-full animate-pulse text-cyan-900">SYNCING...</div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: VISUAL FEED & FEEDBACK */}
      <div className="col-span-12 lg:col-span-5 space-y-6">
        {/* VISUAL MONITOR */}
        <div className="bg-black rounded-xl border border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50 z-10 animate-scanline"></div>
          <div className="aspect-video relative flex items-center justify-center bg-[#050505]">
            {quiz?.image_url ? (
              <img src={quiz.image_url} alt="Evidence" className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-800">
                <Eye size={48} />
                <span className="text-[10px] font-bold">NO_VISUAL_FEED</span>
              </div>
            )}
            
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="bg-red-500 h-2 w-2 rounded-full animate-ping"></span>
              <span className="text-[9px] font-black text-red-500 tracking-tighter">REC // {quiz?.image_source || 'SIGNAL_LOST'}</span>
            </div>
          </div>
        </div>

        {/* AUDIT FEEDBACK */}
        <div className={`min-h-[250px] rounded-xl border p-6 transition-all duration-500 ${
          feedback 
            ? (feedback.is_correct ? 'bg-green-500/5 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-red-500/5 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]')
            : 'bg-slate-900/30 border-white/5'
        }`}>
          {!feedback ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
              <Shield size={40} className="opacity-20" />
              <p className="text-[10px] font-bold tracking-[0.3em]">WAITING FOR INSTRUCTOR AUDIT...</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  {feedback.is_correct ? <CheckCircle className="text-green-500" /> : <AlertTriangle className="text-red-500" />}
                  <span className={`text-xs font-black tracking-widest ${feedback.is_correct ? 'text-green-500' : 'text-red-500'}`}>
                    {feedback.is_correct ? 'PROTOCOL_VERIFIED' : 'PROTOCOL_VIOLATION'}
                  </span>
                </div>
                
                {/* FEEDBACK READER */}
                <button 
                    onClick={() => speakText(feedback.feedback)}
                    className="text-slate-500 hover:text-white"
                >
                    <Volume2 size={14} />
                </button>
              </div>
              
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "{feedback.feedback}"
              </p>

              <div className="pt-4">
                <button 
                  onClick={() => setShowRef(!showRef)}
                  className="text-[10px] text-cyan-500 hover:text-cyan-400 font-bold underline decoration-dotted"
                >
                  {showRef ? 'HIDE SOURCE' : 'VIEW RAW SOURCE MATERIAL'}
                </button>
                {showRef && (
                  <div className="mt-2 p-3 bg-black/40 rounded text-[11px] text-slate-500 border border-white/5 font-mono">
                    {feedback.citation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default SimulationInterface;