import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, X, Sparkles, CheckCircle2, AlertCircle, RotateCcw, Languages } from 'lucide-react';
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
  const [transcript, setTranscript] = useState<string>('');
  const [spokenResponse, setSpokenResponse] = useState<string>('');
  const [intent, setIntent] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  // Sync modal language with app language preference
  useEffect(() => {
    setActiveLang(language);
  }, [language]);

  // Load available system voices for realistic speech synthesis
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

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setState('READY');
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
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakText = (text: string, langCode: string) => {
    if (!('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLocale = langCode === 'hi' ? 'hi-IN' : langCode === 'ta' ? 'ta-IN' : 'en-IN';
    utterance.lang = targetLocale;
    utterance.rate = 0.92; // Slightly relaxed, highly intelligible pacing for agricultural instruction
    utterance.pitch = 1.0;

    // Find the most natural / realistic voice for this language
    if (voices.length > 0) {
      const langMatches = voices.filter((v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith(langCode)
      );

      // Prioritize neural / natural / Google / Edge online voices
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

  const startListening = () => {
    setState('LISTENING');
    setTranscript('');
    setSpokenResponse('');
    setErrorMessage('');
    setIsSpeaking(false);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang =
        activeLang === 'hi' ? 'hi-IN' : activeLang === 'ta' ? 'ta-IN' : 'en-IN';

      let finalCapturedText = '';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        finalCapturedText = currentText;
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage(
            activeLang === 'hi'
              ? 'माइक्रोफ़ोन अनुमति नहीं मिली। कृपया अनुमति दें या नीचे दिए गए विकल्पों पर टैप करें।'
              : activeLang === 'ta'
              ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. கீழே உள்ள கேள்விகளை தேர்வு செய்யவும்.'
              : 'Microphone access denied. You can select sample questions below.'
          );
          setState('ERROR');
        } else if (event.error === 'no-speech') {
          triggerFallback();
        }
      };

      recognition.onend = () => {
        if (finalCapturedText && finalCapturedText.trim().length > 0) {
          sendVoiceQuery(finalCapturedText);
        } else {
          triggerFallback();
        }
      };

      try {
        recognition.start();
      } catch (e) {
        triggerFallback();
      }
    } else {
      triggerFallback();
    }
  };

  const triggerFallback = () => {
    const defaultQuery =
      activeLang === 'hi'
        ? 'क्या आज टमाटर की फसल में पानी देना चाहिए?'
        : activeLang === 'ta'
        ? 'இன்று தக்காளிக்கு தண்ணீர் பாய்ச்சலாமா?'
        : 'Should I water my tomato crop today?';

    setTranscript(defaultQuery);
    sendVoiceQuery(defaultQuery);
  };

  const sendVoiceQuery = async (queryText: string) => {
    setState('PROCESSING');
    try {
      const formData = new FormData();
      formData.append('query_text', queryText);
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
            ? 'आवाज सलाह प्राप्त करने में त्रुटि। कृपया पुनः प्रयास करें।'
            : activeLang === 'ta'
            ? 'குரல் ஆலோசனையை பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
            : 'Failed to process voice query. Please try again.'
        );
      }
    } catch (err) {
      setState('ERROR');
      setErrorMessage(
        activeLang === 'hi'
          ? 'नेटवर्क कनेक्शन त्रुटि। कृपया इंटरनेट जांचें।'
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
      { label: '🌱 Leaf spots cure', query: 'How to cure leaf spots and blight in tomato?' }
    ],
    hi: [
      { label: '💧 पानी की सलाह', query: 'क्या आज टमाटर में पानी देना चाहिए?' },
      { label: '🌦 बारिश का अनुमान', query: 'क्या अगले 24 घंटों में बारिश होगी?' },
      { label: '🌱 पत्तियों पर धब्बे', query: 'टमाटर की पत्तियों पर काले धब्बे का इलाज क्या है?' }
    ],
    ta: [
      { label: '💧 தண்ணீர் பாசன ஆலோசனை', query: 'இன்று தக்காளிக்கு தண்ணீர் பாய்ச்சலாமா?' },
      { label: '🌦 மழை முன்னறிவிப்பு', query: 'அடுத்த 24 மணி நேரத்தில் மழை வருமா?' },
      { label: '🌱 இலை கருகல் நோய்', query: 'தக்காளி இலைகளில் கருகல் நோய்க்கு மருந்து என்ன?' }
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
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 bg-agri-50 text-agri-800 text-xs font-semibold px-3 py-1 rounded-full mb-2 border border-agri-200">
            <Sparkles className="w-3.5 h-3.5 text-agri-600" />
            Multilingual Voice Assistant
          </div>
          <h2 className="text-xl font-bold text-slate-900">Ask AgriEdge</h2>
          
          {/* Language Selector Pills */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
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
        <div className="flex flex-col items-center justify-center py-4">
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

          <p className="mt-4 font-bold text-sm tracking-wide text-slate-700">
            {state === 'READY' && (activeLang === 'hi' ? 'बोलने के लिए माइक दबाएं' : activeLang === 'ta' ? 'பேச மைக்கை அழுத்தவும்' : 'Tap Microphone to Speak')}
            {state === 'LISTENING' && (activeLang === 'hi' ? 'आपकी बात सुन रहे हैं...' : activeLang === 'ta' ? 'உங்களை கவனிக்கிறது...' : 'Listening to your query...')}
            {state === 'PROCESSING' && (activeLang === 'hi' ? 'कृषि सलाह तैयार हो रही है...' : activeLang === 'ta' ? 'ஆலோசனை தயாராகிறது...' : 'Analyzing crop intelligence...')}
            {state === 'RESPONDING' && (activeLang === 'hi' ? 'एग्रीएज बोल रहा है' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் பேசுகிறது' : 'AgriEdge Speaking')}
            {state === 'ERROR' && (activeLang === 'hi' ? 'कृपया पुनः प्रयास करें' : activeLang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Try again')}
          </p>
        </div>

        {/* Query & Response Display */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-3 min-h-[75px] flex flex-col justify-center">
          {transcript ? (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">
                {activeLang === 'hi' ? 'आपने पूछा:' : activeLang === 'ta' ? 'உங்கள் கேள்வி:' : 'You asked:'}
              </p>
              <p className="text-sm font-semibold text-slate-900 italic">"{transcript}"</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              {activeLang === 'hi'
                ? 'माइक दबाकर बोलें: "क्या आज पानी देना चाहिए?", या नीचे दिए प्रश्नों पर टैप करें।'
                : activeLang === 'ta'
                ? 'மைக்கை அழுத்தி பேசவும்: "இன்று தண்ணீர் பாய்ச்சலாமா?", அல்லது கீழே உள்ளதை தேர்வு செய்யவும்.'
                : 'Tap mic or click quick chips below to get irrigation, rain, or disease advice.'}
            </p>
          )}

          {intent && (
            <div className="mt-2 inline-flex items-center gap-1 bg-agri-100 text-agri-800 text-[11px] font-semibold px-2 py-0.5 rounded w-max">
              <CheckCircle2 className="w-3 h-3 text-agri-600" />
              Intent: {intent}
            </div>
          )}
        </div>

        {/* Spoken Advice Display & Replay Button */}
        {spokenResponse && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 mb-3">
            <div className="flex items-center justify-between text-emerald-800 font-bold text-xs mb-1.5">
              <span className="flex items-center gap-1.5">
                <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-emerald-600 animate-bounce' : 'text-emerald-600'}`} />
                {activeLang === 'hi' ? 'एग्रीएज आवाज सलाह:' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் குரல் ஆலோசனை:' : 'AgriEdge Spoken Advisory:'}
              </span>

              <button
                onClick={() => speakText(spokenResponse, activeLang)}
                className="flex items-center gap-1 text-[11px] bg-white px-2 py-1 rounded-lg border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition font-semibold"
                title="Replay Voice Audio"
              >
                <RotateCcw className="w-3 h-3" />
                {activeLang === 'hi' ? 'दोबारा सुनें' : activeLang === 'ta' ? 'மீண்டும் கேள்' : 'Replay Voice'}
              </button>
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

        {/* Quick Question Chips for Selected Language */}
        <div className="flex flex-wrap gap-1.5 justify-center pt-1 border-t border-slate-100">
          {(quickQuestions[activeLang] || quickQuestions.en).map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setTranscript(chip.query);
                sendVoiceQuery(chip.query);
              }}
              className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-800 text-slate-700 px-3 py-1 rounded-full border border-slate-200 transition font-medium"
            >
              {chip.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};
