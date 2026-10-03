import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, CheckCircle2, AlertCircle, RotateCcw, Send, CornerDownLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageCode } from '../types';

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
  const { language, setLanguage } = useLanguage();
  const { token } = useAuth();

  const [activeLang, setActiveLang] = useState<LanguageCode>(language || 'en');
  const [state, setState] = useState<VoiceState>('READY');
  const [queryInput, setQueryInput] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [spokenResponse, setSpokenResponse] = useState<string>('');
  const [intent, setIntent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  // Stop recognition helper
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors if already stopped
      }
    }
  }, []);

  // Sync with app language
  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  // Load voices for realistic TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        try {
          const loaded = window.speechSynthesis.getVoices();
          if (loaded && loaded.length > 0) {
            setVoices(loaded);
          }
        } catch (e) {
          console.warn('Error loading speech voices:', e);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Reset & cleanup when closed or unmounted
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      setState('READY');
      setQueryInput('');
      setTranscript('');
      setSpokenResponse('');
      setIntent('');
      setErrorMessage('');
      setIsSpeaking(false);
    }

    return () => {
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, [isOpen, stopListening]);

  const speakText = useCallback((text: string, langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLocale = langCode === 'hi' ? 'hi-IN' : langCode === 'ta' ? 'ta-IN' : 'en-IN';
      utterance.lang = targetLocale;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      if (voices.length > 0) {
        const langMatches = voices.filter((v) =>
          v.lang.toLowerCase().replace('_', '-').startsWith(langCode)
        );

        const naturalVoice =
          langMatches.find(
            (v) =>
              v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Swara') ||
              v.name.includes('Madhur') ||
              v.name.includes('Valluvar') ||
              v.name.includes('Pallavi')
          ) || langMatches[0];

        if (naturalVoice) {
          utterance.voice = naturalVoice;
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
    }
  }, [voices]);

  const handleLangSwitch = useCallback((lang: LanguageCode) => {
    setActiveLang(lang);
    setLanguage(lang);
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
    setErrorMessage('');
  }, [setLanguage, stopListening]);

  const sendVoiceQuery = useCallback(async (queryText: string) => {
    const textToSend = queryText?.trim();
    if (!textToSend) {
      setErrorMessage(
        activeLang === 'hi'
          ? 'कृपया प्रश्न बोलें या टाइप करें।'
          : activeLang === 'ta'
          ? 'தயவுசெய்து கேள்வியை பேசவும் அல்லது தட்டச்சு செய்யவும்.'
          : 'Please speak or type a question.'
      );
      return;
    }

    stopListening();
    setState('PROCESSING');
    setTranscript(textToSend);
    setQueryInput(textToSend);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('query_text', textToSend);
      formData.append('language', activeLang);
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
        setIntent(data.nlu_analysis?.intent || 'GENERAL_AGRICULTURE_QUERY');
        setSpokenResponse(data.spoken_response);
        setState('RESPONDING');

        // Play realistic speech in the target language
        const responseLang = data.language || activeLang;
        speakText(data.spoken_response, responseLang);

        if (data.advisory && onAdvisoryReceived) {
          onAdvisoryReceived(data.advisory);
        }
      } else {
        setState('ERROR');
        setErrorMessage(
          activeLang === 'hi'
            ? 'सलाह प्राप्त करने में त्रुटि। कृपया पुनः प्रयास करें।'
            : activeLang === 'ta'
            ? 'ஆலோசனை பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
            : 'Failed to process voice query. Please try again.'
        );
      }
    } catch (err) {
      setState('ERROR');
      setErrorMessage(
        activeLang === 'hi'
          ? 'कनेक्शन त्रुटि। कृपया नेटवर्क जांचें।'
          : activeLang === 'ta'
          ? 'இணைப்பு பிழை. இணைய இணைப்பை சரிபார்க்கவும்.'
          : 'Connection error. Please check your network connection.'
      );
    }
  }, [activeLang, token, stopListening, speakText, onAdvisoryReceived]);

  const startListening = useCallback(() => {
    stopListening();
    setState('LISTENING');
    setErrorMessage('');
    setIsSpeaking(false);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        activeLang === 'hi'
          ? 'आपके ब्राउज़र में आवाज पहचान समर्थित नहीं है। कृपया नीचे प्रश्न टाइप करें।'
          : activeLang === 'ta'
          ? 'உங்கள் உலாவியில் குரல் உள்ளீடு ஆதரிக்கப்படவில்லை. கீழே தட்டச்சு செய்யவும்.'
          : 'Speech recognition is not supported in this browser. Please type your query below.'
      );
      setState('ERROR');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      activeLang === 'hi' ? 'hi-IN' : activeLang === 'ta' ? 'ta-IN' : 'en-IN';

    let capturedText = '';

    recognition.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript + ' ';
        } else {
          interimStr += item[0].transcript;
        }
      }

      const fullSpoken = (finalStr + interimStr).trim();
      if (fullSpoken) {
        capturedText = fullSpoken;
        setQueryInput(fullSpoken);
        setTranscript(fullSpoken);

        // Reset silence auto-submit timer (1.8 seconds of quiet after speech finishes)
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
          if (capturedText.trim().length > 0) {
            sendVoiceQuery(capturedText);
          }
        }, 1800);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage(
          activeLang === 'hi'
            ? 'माइक्रोफ़ोन अनुमति नहीं मिली। कृपया अनुमति दें या नीचे प्रश्न लिखें।'
            : activeLang === 'ta'
            ? 'மைக்ரோஃபோன் அனுமதி தேவை. கீழே கேள்வியை தட்டச்சு செய்யவும்.'
            : 'Microphone access denied. You can type your query below.'
        );
        setState('ERROR');
      }
    };

    recognition.onend = () => {
      if (capturedText.trim().length > 0) {
        sendVoiceQuery(capturedText);
      } else {
        setState('READY');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
      setState('READY');
    }
  }, [activeLang, stopListening, sendVoiceQuery]);

  const handleManualStopOrSend = useCallback(() => {
    stopListening();
    if (queryInput && queryInput.trim().length > 0) {
      sendVoiceQuery(queryInput);
    } else {
      setState('READY');
    }
  }, [queryInput, stopListening, sendVoiceQuery]);

  const quickQuestions = {
    en: [
      { label: '💧 Water advice today', query: 'Should I water my tomato crop today?' },
      { label: '🌦 Rain forecast', query: 'Will it rain in next 24 hours?' },
      { label: '🌱 Leaf spots cure', query: 'How to cure leaf spots and blight in tomato?' },
      { label: '🌾 Fertilizer timing', query: 'When should I apply fertilizer to tomato?' }
    ],
    hi: [
      { label: '💧 पानी की सलाह', query: 'क्या आज टमाटर में पानी देना चाहिए?' },
      { label: '🌦 बारिश का अनुमान', query: 'क्या अगले 24 घंटों में बारिश होगी?' },
      { label: '🌱 पत्तियों पर धब्बे', query: 'टमाटर की पत्तियों पर काले धब्बे का इलाज क्या है?' },
      { label: '🌾 खाद और पोषण', query: 'टमाटर में खाद डालने का सही समय क्या है?' }
    ],
    ta: [
      { label: '💧 தண்ணீர் பாசன ஆலோசனை', query: 'இன்று தக்காளிக்கு தண்ணீர் பாய்ச்சலாமா?' },
      { label: '🌦 மழை முன்னறிவிப்பு', query: 'அடுத்த 24 மணி நேரத்தில் மழை வருமா?' },
      { label: '🌱 இலை கருகல் நோய்', query: 'தக்காளி இலைகளில் கருகல் நோய்க்கு மருந்து என்ன?' },
      { label: '🌾 உர மேலாண்மை', query: 'தக்காளிக்கு உரம் எப்போது இட வேண்டும்?' }
    ]
  };

  // Only return null right before rendering JSX, after all hooks and functions are declared
  if (!isOpen) return null;

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
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 bg-agri-50 text-agri-800 text-xs font-semibold px-3 py-1 rounded-full mb-2 border border-agri-200">
            <Sparkles className="w-3.5 h-3.5 text-agri-600" />
            Multilingual Voice & AI Assistant
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            {activeLang === 'hi'
              ? 'आवाज से खेती संबंधी प्रश्न पूछें'
              : activeLang === 'ta'
              ? 'குரல் மூலம் விவசாய ஆலோசனைகள் கேளுங்கள்'
              : 'Ask Any Crop Advice by Voice'}
          </h3>
        </div>

        {/* Language Selection Pills */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <button
            type="button"
            onClick={() => handleLangSwitch('en')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              activeLang === 'en'
                ? 'bg-agri-600 text-white border-agri-600 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLangSwitch('hi')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              activeLang === 'hi'
                ? 'bg-agri-600 text-white border-agri-600 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            हिंदी (Hindi)
          </button>
          <button
            type="button"
            onClick={() => handleLangSwitch('ta')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              activeLang === 'ta'
                ? 'bg-agri-600 text-white border-agri-600 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            தமிழ் (Tamil)
          </button>
        </div>

        {/* Central Voice Mic Circle */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="relative">
            {state === 'LISTENING' && (
              <>
                <div className="absolute inset-0 rounded-full bg-agri-400 animate-ping opacity-35"></div>
                <div className="absolute -inset-3 rounded-full bg-agri-200 animate-pulse opacity-50"></div>
              </>
            )}
            {state === 'PROCESSING' && (
              <div className="absolute -inset-2 rounded-full border-4 border-amber-400 border-t-transparent animate-spin"></div>
            )}
            <button
              onClick={() => {
                if (state === 'LISTENING') {
                  handleManualStopOrSend();
                } else if (state === 'RESPONDING') {
                  speakText(spokenResponse, activeLang);
                } else {
                  startListening();
                }
              }}
              className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 shadow-lg transition-transform active:scale-95 ${
                state === 'LISTENING'
                  ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                  : state === 'PROCESSING'
                  ? 'bg-amber-500 text-white shadow-amber-500/30'
                  : state === 'RESPONDING'
                  ? 'bg-agri-600 text-white shadow-agri-600/30'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20'
              }`}
            >
              {state === 'LISTENING' ? (
                <MicOff className="w-8 h-8" />
              ) : state === 'PROCESSING' ? (
                <RotateCcw className="w-8 h-8 animate-spin" />
              ) : state === 'RESPONDING' ? (
                <Volume2 className={`w-8 h-8 ${isSpeaking ? 'animate-bounce' : ''}`} />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="mt-3 text-center">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                state === 'LISTENING'
                  ? 'bg-red-100 text-red-700'
                  : state === 'PROCESSING'
                  ? 'bg-amber-100 text-amber-800'
                  : state === 'RESPONDING'
                  ? 'bg-agri-100 text-agri-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {state === 'READY' && (activeLang === 'hi' ? 'बोलने के लिए माइक दबाएं' : activeLang === 'ta' ? 'பேச மைக் அழுத்தவும்' : 'Tap Mic to Speak')}
              {state === 'LISTENING' && (activeLang === 'hi' ? 'सुन रहा है... (रुकने पर स्वतः भेजेगा)' : activeLang === 'ta' ? 'கேட்கிறது... (நிறுத்தினால் அனுப்பும்)' : 'Listening... (auto-submits on pause)')}
              {state === 'PROCESSING' && (activeLang === 'hi' ? 'AI विश्लेषण कर रहा है...' : activeLang === 'ta' ? 'AI பரிசீலிக்கிறது...' : 'AI Analyzing Query...')}
              {state === 'RESPONDING' && (activeLang === 'hi' ? 'सलाह तैयार है' : activeLang === 'ta' ? 'பதில் தயாராக உள்ளது' : 'Advice Ready')}
              {state === 'ERROR' && (activeLang === 'hi' ? 'पुनः प्रयास करें' : activeLang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Please Retry')}
            </span>
          </div>
        </div>

        {/* Live Transcript / Text Box with Edit & Send Button */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {activeLang === 'hi' ? 'आपका प्रश्न (बोलें या यहाँ लिखें):' : activeLang === 'ta' ? 'உங்கள் கேள்வி (பேசவும் அல்லது தட்டச்சு செய்யவும்):' : 'Your Query (speak or type):'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendVoiceQuery(queryInput);
                }
              }}
              placeholder={
                activeLang === 'hi'
                  ? 'जैसे: क्या आज टमाटर में पानी देना चाहिए?'
                  : activeLang === 'ta'
                  ? 'உதாரணம்: இன்று தக்காளிக்கு தண்ணீர் பாய்ச்சலாமா?'
                  : 'e.g. Should I irrigate my tomato crop today?'
              }
              className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-agri-500 focus:border-agri-500"
            />
            <button
              onClick={() => sendVoiceQuery(queryInput)}
              disabled={state === 'PROCESSING' || !queryInput.trim()}
              className="bg-agri-600 hover:bg-agri-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{activeLang === 'hi' ? 'पूछें' : activeLang === 'ta' ? 'கேள்' : 'Ask'}</span>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Response Box */}
        {spokenResponse && (
          <div className="mt-4 p-4 bg-agri-50/80 border border-agri-200 rounded-2xl animate-in fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-agri-900">
                <CheckCircle2 className="w-4 h-4 text-agri-600" />
                <span>{activeLang === 'hi' ? 'AgriEdge AI सलाह:' : activeLang === 'ta' ? 'AgriEdge AI ஆலோசனை:' : 'AgriEdge AI Spoken Advice:'}</span>
              </div>
              <button
                type="button"
                onClick={() => speakText(spokenResponse, activeLang)}
                className="text-xs text-agri-700 hover:text-agri-900 flex items-center gap-1 font-medium bg-white px-2 py-1 rounded-lg border border-agri-200 hover:shadow-sm"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{activeLang === 'hi' ? 'दोबारा सुनें' : activeLang === 'ta' ? 'மீண்டும் கேள்' : 'Replay'}</span>
              </button>
            </div>
            <p className="text-slate-800 text-sm leading-relaxed font-medium">
              {spokenResponse}
            </p>
          </div>
        )}

        {/* 1-Tap Quick Question Chips */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-500 font-medium mb-2">
            {activeLang === 'hi' ? 'या इन प्रश्नों पर टैप करें:' : activeLang === 'ta' ? 'அல்லது விரைவு கேள்விகளை தேர்வு செய்யவும்:' : 'Or tap a quick question:'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions[activeLang]?.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQueryInput(item.query);
                  sendVoiceQuery(item.query);
                }}
                className="text-xs bg-slate-50 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-agri-300 transition text-left"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
