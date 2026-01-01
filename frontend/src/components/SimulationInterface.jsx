import  {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';

import {
  Terminal,
  AlertTriangle,
  Send,
  Globe,
  RefreshCw,
  Volume2,
  VolumeX,
  Mic,
  ImageIcon,
  MicOff,
} from 'lucide-react';

import './SimulationInterface.css';

const API_URL = 'http://localhost:8000';

/* ==========================================
   AUDIO FEEDBACK SYSTEM
========================================== */
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  return audioCtx;
};

const playTone = (type) => {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'closed') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'type') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.03);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    }

    if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    }
  } catch (e) {
    console.warn('Audio Context Error:', e);
  }
};

const ErnieDiagram = ({ query }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchImage = async () => {
      setLoading(true);
      try {
        const res = await axios.post(`${API_URL}/generate_image`, {
          prompt: query,
        });

        if (mounted && res.data?.image) {
          setImgSrc(res.data.image);
        }
      } catch (err) {
        console.error('Image gen failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchImage();

    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <div
      className="diagram-container"
      style={{
        margin: '15px 0',
        border: '1px solid #00ff41',
        padding: '10px',
        background: 'rgba(0, 20, 0, 0.5)',
      }}
    >
      <div
        className="diagram-header"
        style={{
          display: 'flex',
          gap: '10px',
          color: '#00ff41',
          fontSize: '0.8rem',
          marginBottom: '10px',
        }}
      >
        <ImageIcon size={16} />
        <span>VISUAL DATA: {query.toUpperCase()}</span>
      </div>

      {loading ? (
        <div
          className="diagram-loading"
          style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00ff41',
          }}
        >
          <RefreshCw className="spin" size={24} />
          <span>RENDERING SCHEMATIC...</span>
        </div>
      ) : (
        <img
          src={imgSrc}
          alt={query}
          className="generated-diagram"
          style={{
            width: '100%',
            maxHeight: '400px',
            objectFit: 'contain',
            border: '1px solid #333',
          }}
        />
      )}
    </div>
  );
};

const renderScenarioWithImages = (text) => {
  // Split by [Image of ...]
  const parts = text.split(/(\[Image of .*?\])/g);

  return parts.map((part, index) => {
    const match = part.match(/\[Image of (.*?)\]/);

    if (match) {
      return (
        <ErnieDiagram
          key={`img-${index}`}
          query={match[1]}
        />
      );
    }

    return (
      <ReactMarkdown
        key={`txt-${index}`}
        rehypePlugins={[rehypeHighlight]}
      >
        {part}
      </ReactMarkdown>
    );
  });
};

/* ==========================================
   MAIN INTERFACE
========================================== */
const SimulationInterface = () => {
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('IDLE');
  const [fullScenarioText, setFullScenarioText] = useState('');
  const [displayedText, setDisplayedText] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [language, setLanguage] = useState('English');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const typewriterRef = useRef(null);

  /* ===== SEND MOVE ===== */
  const sendMove = useCallback(
    async (action, hidden = false) => {
      if (!action.trim()) return;

      setLoading(true);

      let newHistory = history;

      if (!hidden) {
        newHistory = [...history, { role: 'user', content: action }];
        setHistory(newHistory);
      }

      try {
        const res = await axios.post(`${API_URL}/simulate`, {
          action,
          history: newHistory,
          language,
        });

        let rawText = res.data.response
          .replace(/Trainer:|Game Master:|AI:/gi, '')
          .trim();

        let newStatus = 'ACTIVE';

        if (rawText.toLowerCase().includes('fail') || rawText.includes('❌')) {
          newStatus = 'CRITICAL';
          soundOn && playTone('error');
        }

        if (rawText.toLowerCase().includes('correct') || rawText.includes('✅')) {
          newStatus = 'SAFE';
          soundOn && playTone('success');
        }

        setStatus(newStatus);
        setFullScenarioText(rawText);
      } catch {
        setFullScenarioText('⚠️ **CONNECTION ERROR**: NEURAL LINK SEVERED.');
        setStatus('CRITICAL');
      }

      setInput('');
      setLoading(false);
    },
    [history, language, soundOn]
  );

  /* ===== INITIAL START (ESLINT SAFE) ===== */
  useEffect(() => {
    if (history.length === 0) {
      sendMove('START SIMULATION', true);
    }
  }, [history.length, sendMove]);

  /* ===== TYPEWRITER EFFECT ===== */
  useEffect(() => {
    setDisplayedText('');
    let i = 0;

    clearInterval(typewriterRef.current);

    typewriterRef.current = setInterval(() => {
      if (i < fullScenarioText.length) {
        setDisplayedText((p) => p + fullScenarioText[i]);
        soundOn && i % 4 === 0 && playTone('type');
        i++;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        clearInterval(typewriterRef.current);
      }
    }, 10);

    return () => clearInterval(typewriterRef.current);
  }, [fullScenarioText, soundOn]);

  /* ===== VOICE INPUT ===== */
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input only works in Chrome/Edge.');
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.lang =
      language === 'Chinese'
        ? 'zh-CN'
        : language === 'Spanish'
        ? 'es-ES'
        : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      soundOn && playTone('type');
    };

    recognition.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setIsListening(false);
    };

    recognition.onerror = recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const hudClass =
    status === 'CRITICAL' ? 'critical' : status === 'SAFE' ? 'safe' : '';
  const boxClass =
    status === 'CRITICAL' ? 'border-red' : status === 'SAFE' ? 'border-green' : '';

  return (
    <div className="sim-root">
      <div className="scanlines" />

      <div className={`sim-hud ${hudClass}`}>
        <div className="hud-left">
          {status === 'CRITICAL' ? <AlertTriangle /> : <Terminal />}
          <div>
            <h2 className="glitch">SKILLSYNC_OS</h2>
            <span>STATUS: {status}</span>
          </div>
        </div>

        <div className="hud-controls">
          <Globe size={16} />
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="English">ENGLISH</option>
            <option value="Chinese">中文</option>
            <option value="Spanish">ESPAÑOL</option>
            <option value="French">FRANÇAIS</option>
          </select>

          <button onClick={() => setSoundOn(!soundOn)}>
            {soundOn ? <Volume2 /> : <VolumeX />}
          </button>
        </div>
      </div>

      <div className="sim-main">
        <div className={`scenario-box ${boxClass}`}>
          {loading ? (
            <div className="loading">
              <RefreshCw className="spin" /> PROCESSING...
            </div>
          ) : (
        <div className="scenario-text">
          {renderScenarioWithImages(displayedText)}
          <span className="cursor" />
        </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      <div className="sim-controls">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMove(input)}
          disabled={loading}
        />

        <button onClick={startListening}>
          {isListening ? <Mic /> : <MicOff />}
        </button>

        <button onClick={() => sendMove(input)} disabled={loading}>
          EXECUTE <Send />
        </button>
      </div>
    </div>
  );
};

export default SimulationInterface;
