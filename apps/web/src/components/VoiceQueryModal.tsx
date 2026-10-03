import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface VoiceQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvisoryReceived?: (advisory: any) => void;
}

type VoiceState = 'READY' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';

export const VoiceQueryModal: React.FC<VoiceQueryModalProps> = ({
  isOpen,
  onClose,
  onAdvisoryReceived
}) => {
  const { language } = useLanguage();
  const { token } = useAuth();
  const [state, setState] = useState<VoiceState>('READY');
  const [transcript, setTranscript] = useState<string>('');
  const [spokenResponse, setSpokenResponse] = useState<string>('');
  const [intent, setIntent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setState('READY');
      setTranscript('');
      setSpokenResponse('');
      setIntent('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = () => {
    setState('LISTENING');
    setTranscript('');
    setSpokenResponse('');
    setErrorMessage('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((res: any) => res[0].transcript)
          .join('');
        setTranscript(text);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access denied. You can type your query below.');
          setState('ERROR');
        } else {
          // If no speech heard, fallback to sample query
          fallbackToQuery("Should I water my tomato crop today?");
        }
      };

      recognition.onend = () => {
        if (transcript.trim().length > 0) {
          sendVoiceQuery(transcript);
        } else {
          fallbackToQuery("Should I water my tomato crop today?");
        }
      };

      try {
        recognition.start();
      } catch (e) {
        fallbackToQuery("Should I water my tomato crop today?");
      }
    } else {
      // Browser doesn't support Web Speech API, use sample voice query directly
      fallbackToQuery("Should I water my tomato crop today?");
    }
  };

  const fallbackToQuery = (defaultText: string) => {
    setTranscript(defaultText);
    sendVoiceQuery(defaultText);
  };

  const sendVoiceQuery = async (queryText: string) => {
    setState('PROCESSING');
    try {
      const formData = new FormData();
      formData.append('query_text', queryText);
      formData.append('language', language);
      formData.append('crop', 'Tomato');
      formData.append('farm_acres', '2.0');

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/v1/voice/transcribe', {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setIntent(data.nlu_analysis.intent);
        setSpokenResponse(data.spoken_response);
        setState('RESPONDING');

        // Text-to-Speech playback
        if ('speechSynthesis' in window && data.spoken_response) {
          const utterance = new SpeechSynthesisUtterance(data.spoken_response);
          utterance.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-US';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }

        if (data.advisory && onAdvisoryReceived) {
          onAdvisoryReceived(data.advisory);
        }
      } else {
        setState('ERROR');
        setErrorMessage('Failed to process voice query. Please try again.');
      }
    } catch (err) {
      setState('ERROR');
      setErrorMessage('Connection error. Please check your network or backend server.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 bg-agri-50 text-agri-800 text-xs font-semibold px-3 py-1 rounded-full mb-2 border border-agri-200">
            <Sparkles className="w-3.5 h-3.5 text-agri-600" />
            Multilingual Voice Assistant
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ask AgriEdge</h2>
          <p className="text-xs text-slate-500 mt-1">
            Speak in English, हिंदी, or தமிழ் about irrigation, weather, or crop health.
          </p>
        </div>

        {/* Central Animated Mic Button */}
        <div className="flex flex-col items-center justify-center py-6">
          <button
            onClick={state === 'LISTENING' ? () => recognitionRef.current?.stop() : startListening}
            disabled={state === 'PROCESSING'}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              state === 'LISTENING'
                ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-rose-500/40 ring-8 ring-rose-100'
                : state === 'PROCESSING'
                ? 'bg-amber-500 text-white animate-spin shadow-amber-500/30'
                : 'bg-gradient-to-tr from-agri-700 to-agri-500 text-white hover:scale-105 shadow-agri-700/30 ring-8 ring-agri-50'
            }`}
          >
            {state === 'LISTENING' ? (
              <MicOff className="w-10 h-10" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
          </button>

          <p className="mt-4 font-bold text-sm tracking-wide uppercase text-slate-700">
            {state === 'READY' && 'Tap to Speak'}
            {state === 'LISTENING' && 'Listening to your query...'}
            {state === 'PROCESSING' && 'Consulting Agricultural Agents...'}
            {state === 'RESPONDING' && 'AgriEdge Speaking'}
            {state === 'ERROR' && 'Unable to hear query'}
          </p>
        </div>

        {/* Query & Response Display */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-4 min-h-[90px] flex flex-col justify-center">
          {transcript ? (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">You asked:</p>
              <p className="text-sm font-semibold text-slate-900 italic">"{transcript}"</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              Try asking: "Should I irrigate today?", "Is rain coming tomorrow?", or "What are these spots on my leaves?"
            </p>
          )}

          {intent && (
            <div className="mt-2 inline-flex items-center gap-1 bg-agri-100 text-agri-800 text-[11px] font-semibold px-2 py-0.5 rounded w-max">
              <CheckCircle2 className="w-3 h-3 text-agri-600" />
              Intent: {intent}
            </div>
          )}
        </div>

        {/* Spoken Advice Display */}
        {spokenResponse && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 mb-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
              <Volume2 className="w-4 h-4 text-emerald-600" />
              AgriEdge Voice Advisory:
            </div>
            <p className="text-xs text-emerald-950 leading-relaxed font-medium">
              {spokenResponse}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 text-xs flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-1.5 justify-center pt-2">
          <button
            onClick={() => fallbackToQuery("Should I water my tomato crop today?")}
            className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition"
          >
            💧 Water advice for today
          </button>
          <button
            onClick={() => fallbackToQuery("Will it rain tomorrow in Mandya?")}
            className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition"
          >
            🌦 Weather & rain forecast
          </button>
          <button
            onClick={() => fallbackToQuery("Early blight treatment in tomato")}
            className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition"
          >
            🌱 Tomato blight remedy
          </button>
        </div>

      </div>
    </div>
  );
};
