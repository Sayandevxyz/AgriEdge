import React, { useState, useEffect, useRef } from 'react';
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

  // Sync with app language
  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  // Load voices for realistic TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const loaded = window.speechSynthesis.getVoices();
        if (loaded && loaded.length > 0) {
          setVoices(loaded);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setState('READY');
      setQueryInput('');
      setTranscript('');
      setSpokenResponse('');
      setIntent('');
      setErrorMessage('');
      setIsSpeaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLangSwitch = (lang: LanguageCode) => {
    setActiveLang(lang);
    setLanguage(lang);
    stopListening();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setErrorMessage('');
  };

  const speakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window) || !text) return;

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
  };

  const stopListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const startListening = () => {
    stopListening();
    setState('LISTENING');
    setErrorMessage('');
    setIsSpeaking(false);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
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
      if (state === 'LISTENING' && capturedText.trim().length > 0) {
        sendVoiceQuery(capturedText);
      } else if (state === 'LISTENING') {
        setState('READY');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
      setState('READY');
    }
  };

  const handleManualStopOrSend = () => {
    stopListening();
    if (queryInput && queryInput.trim().length > 0) {
      sendVoiceQuery(queryInput);
    } else {
      setState('READY');
    }
  };

  const sendVoiceQuery = async (queryText: string) => {
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
  };

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
          <h2 className="text-xl font-bold text-slate-900">Ask AgriEdge</h2>
          
          {/* Language Selector Pills */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <button
              onClick={() => handleLangSwitch('en')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                activeLang === 'en'
                  ? 'bg-agri-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              English
            </button>
            <button
              onClick={() => handleLangSwitch('hi')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                activeLang === 'hi'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              हिंदी (Hindi)
            </button>
            <button
              onClick={() => handleLangSwitch('ta')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                activeLang === 'ta'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              தமிழ் (Tamil)
            </button>
          </div>
        </div>

        {/* Central Animated Mic Button */}
        <div className="flex flex-col items-center justify-center py-3">
          <button
            onClick={state === 'LISTENING' ? handleManualStopOrSend : startListening}
            disabled={state === 'PROCESSING'}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              state === 'LISTENING'
                ? 'bg-rose-500 text-white animate-pulse scale-110 shadow-rose-500/40 ring-8 ring-rose-100'
                : state === 'PROCESSING'
                ? 'bg-amber-500 text-white animate-spin shadow-amber-500/30'
                : 'bg-gradient-to-tr from-agri-700 to-agri-500 text-white hover:scale-105 shadow-agri-700/30 ring-8 ring-agri-50'
            }`}
          >
            {state === 'LISTENING' ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </button>

          <p className="mt-3 font-bold text-xs tracking-wide text-slate-700">
            {state === 'READY' && (activeLang === 'hi' ? 'बोलने के लिए माइक दबाएं' : activeLang === 'ta' ? 'பேச மைக்கை அழுத்தவும்' : 'Tap Mic to Speak')}
            {state === 'LISTENING' && (activeLang === 'hi' ? 'सुन रहे हैं... (रोकने के लिए दोबारा दबाएं)' : activeLang === 'ta' ? 'கவனிக்கிறது... (நிறுத்த மீண்டும் அழுத்தவும்)' : 'Listening... (Tap to stop & submit)')}
            {state === 'PROCESSING' && (activeLang === 'hi' ? 'कृषि सलाह तैयार हो रही है...' : activeLang === 'ta' ? 'ஆலோசனை தயாராகிறது...' : 'Analyzing crop intelligence...')}
            {state === 'RESPONDING' && (activeLang === 'hi' ? 'एग्रीएज बोल रहा है' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் பேசுகிறது' : 'AgriEdge Speaking')}
            {state === 'ERROR' && (activeLang === 'hi' ? 'पुनः प्रयास करें' : activeLang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Try again')}
          </p>
        </div>

        {/* Live Editable Text Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendVoiceQuery(queryInput);
          }}
          className="relative mb-3"
        >
          <input
            type="text"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder={
              activeLang === 'hi'
                ? 'माइक से बोलें या प्रश्न यहाँ टाइप करें...'
                : activeLang === 'ta'
                ? 'மைக்கில் பேசவும் அல்லது கேள்வியை இங்கே தட்டச்சு செய்யவும்...'
                : 'Speak with mic or type your crop question here...'
            }
            className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-agri-600 bg-slate-50/50"
          />
          <button
            type="submit"
            disabled={!queryInput.trim() || state === 'PROCESSING'}
            className="absolute right-1.5 top-1.5 p-1.5 bg-agri-700 hover:bg-agri-800 disabled:opacity-40 text-white rounded-lg transition"
            title="Submit Query"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Spoken Advice Display & Replay Button */}
        {spokenResponse && (
          <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 mb-3 animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-800 font-bold text-xs mb-1">
              <span className="flex items-center gap-1.5">
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-600 animate-bounce' : 'text-emerald-600'}`} />
                {activeLang === 'hi' ? 'एग्रीएज आवाज सलाह:' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் குரல் ஆலோசனை:' : 'AgriEdge Spoken Advisory:'}
              </span>

              <button
                type="button"
                onClick={() => speakText(spokenResponse, activeLang)}
                className="flex items-center gap-1 text-[11px] bg-white px-2 py-0.5 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition font-semibold shadow-2xs"
                title="Replay Voice Audio"
              >
                <RotateCcw className="w-3 h-3" />
                {activeLang === 'hi' ? 'दोबारा सुनें' : activeLang === 'ta' ? 'மீண்டும் கேள்' : 'Replay'}
              </button>
            </div>

            <p className="text-xs text-emerald-950 leading-relaxed font-medium">
              {spokenResponse}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-rose-50 text-rose-800 p-2.5 rounded-xl border border-rose-200 text-xs flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Question Chips for Selected Language */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1.5">
            {activeLang === 'hi' ? '⚡ त्वरित प्रश्न (टैप करें)' : activeLang === 'ta' ? '⚡ விரைவு வினாக்கள்' : '⚡ Quick Questions'}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {(quickQuestions[activeLang] || quickQuestions.en).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQueryInput(chip.query);
                  sendVoiceQuery(chip.query);
                }}
                className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 transition font-medium"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
