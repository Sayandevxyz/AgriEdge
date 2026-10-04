import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Send,
  Trash2,
  User,
  Radio
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageCode } from '../types';

interface VoiceQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdvisoryReceived?: (advisory: any) => void;
}

type VoiceState = 'READY' | 'LISTENING' | 'PROCESSING' | 'RESPONDING' | 'ERROR';

interface ChatMessage {
  id: string;
  sender: 'farmer' | 'agriedge';
  text: string;
  intent?: string;
  timestamp: Date;
}

const WELCOME_MESSAGES: Record<LanguageCode, string> = {
  en: "Welcome to AgriEdge App! How can I help you with your crops today? Tap the microphone to speak or type any question.",
  hi: "एग्रीएज ऐप में आपका स्वागत है! आज आपकी फसलों के लिए मैं क्या सहायता कर सकता हूँ? पूछने के लिए माइक दबाएं या प्रश्न लिखें।",
  ta: "அக்ரிஎட்ஜ் செயலிக்கு நல்வரவு! உங்கள் பயிர்களுக்கு இன்று என்ன உதவி தேவை? கேட்க மைக்கை அழுத்தவும் அல்லது தட்டச்சு செய்யவும்."
};

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
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasSpokenWelcomeRef = useRef<boolean>(false);
  const latestSpokenRef = useRef<string>('');
  const hasAutoSubmittedRef = useRef<boolean>(false);

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
        // Ignore stop errors
      }
    }
  }, []);

  // Sync with app language
  useEffect(() => {
    if (language) {
      setActiveLang(language);
    }
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

  // Text-to-speech speaker
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
      utterance.onend = () => {
        setIsSpeaking(false);
        setState('READY');
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setState('READY');
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeaking(false);
      setState('READY');
    }
  }, [voices]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, state]);

  // Welcome message initialization when modal opens or language changes
  useEffect(() => {
    if (isOpen) {
      const welcomeText = WELCOME_MESSAGES[activeLang] || WELCOME_MESSAGES.en;
      
      setMessages((prev) => {
        // If there are no questions asked by the farmer yet, show ONLY the welcome message for activeLang!
        const hasFarmerQuestions = prev.some((m) => m.sender === 'farmer');
        if (!hasFarmerQuestions) {
          return [
            {
              id: 'welcome-' + activeLang,
              sender: 'agriedge',
              text: welcomeText,
              timestamp: new Date()
            }
          ];
        }
        return prev;
      });

      // Speak welcome greeting aloud on opening
      if (!hasSpokenWelcomeRef.current) {
        hasSpokenWelcomeRef.current = true;
        setTimeout(() => {
          speakText(welcomeText, activeLang);
        }, 350);
      }
    } else {
      // Reset when modal closes
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
      setState('READY');
      setQueryInput('');
      setErrorMessage('');
      setIsSpeaking(false);
      hasSpokenWelcomeRef.current = false;
      latestSpokenRef.current = '';
      hasAutoSubmittedRef.current = false;
    }

    return () => {
      stopListening();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, [isOpen, activeLang, speakText, stopListening]);

  // Switch language: Replaces the introduction greeting with ONLY the selected language
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

    const welcomeText = WELCOME_MESSAGES[lang] || WELCOME_MESSAGES.en;
    const newWelcomeMsg: ChatMessage = {
      id: 'welcome-' + lang,
      sender: 'agriedge',
      text: welcomeText,
      timestamp: new Date()
    };

    setMessages((prev) => {
      // Filter out any previous welcome/introduction greetings
      const farmerMessages = prev.filter((m) => m.sender === 'farmer');
      if (farmerMessages.length === 0) {
        // No questions asked yet: show strictly the chosen language's introduction
        return [newWelcomeMsg];
      }
      // If questions were asked, keep conversation but replace initial welcome
      const nonWelcome = prev.filter((m) => !m.id.startsWith('welcome-') && !m.id.startsWith('lang-switch-'));
      return [newWelcomeMsg, ...nonWelcome];
    });

    speakText(welcomeText, lang);
  }, [setLanguage, stopListening, speakText]);

  // Submit voice or text query (Multi-turn enabled)
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
      setState('READY');
      return;
    }

    stopListening();
    setState('PROCESSING');
    setQueryInput('');
    setErrorMessage('');

    // Add user question to conversation list
    const userMsg: ChatMessage = {
      id: 'farmer-' + Date.now(),
      sender: 'farmer',
      text: textToSend,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const formData = new FormData();
      formData.append('query_text', textToSend);
      formData.append('language', activeLang);

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
        const spokenAnswer = data.spoken_response || 'AgriEdge advisory generated successfully.';

        // Add assistant response to conversation list
        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          sender: 'agriedge',
          text: spokenAnswer,
          intent: data.nlu_analysis?.intent,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, aiMsg]);

        setState('RESPONDING');

        // Play realistic speech in the target language
        const responseLang = data.language || activeLang;
        speakText(spokenAnswer, responseLang);

        if (data.advisory && onAdvisoryReceived) {
          onAdvisoryReceived(data.advisory);
        }
      } else {
        setState('ERROR');
        const errText =
          activeLang === 'hi'
            ? 'सलाह प्राप्त करने में त्रुटि। कृपया पुनः प्रयास करें।'
            : activeLang === 'ta'
            ? 'ஆலோசனை பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
            : 'Failed to process voice query. Please try again.';
        setErrorMessage(errText);
      }
    } catch (err) {
      setState('ERROR');
      const connErr =
        activeLang === 'hi'
          ? 'कनेक्शन त्रुटि। कृपया नेटवर्क जांचें।'
          : activeLang === 'ta'
          ? 'இணைப்பு பிழை. இணைய இணைப்பை சரிபார்க்கவும்.'
          : 'Connection error. Please check your network connection.';
      setErrorMessage(connErr);
    }
  }, [activeLang, token, stopListening, speakText, onAdvisoryReceived]);

  // Automatic voice question submission - NO NEED TO CLICK SEND BUTTON
  const submitVoiceQueryAutomatically = useCallback((forcedText?: string) => {
    if (hasAutoSubmittedRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }

    const textToSubmit = (forcedText || latestSpokenRef.current || queryInput || '').trim();
    if (textToSubmit.length > 0) {
      hasAutoSubmittedRef.current = true;
      sendVoiceQuery(textToSubmit);
    } else {
      setState('READY');
    }
  }, [queryInput, sendVoiceQuery]);

  // Continuous speech recognition with automatic transmission
  const startListening = useCallback(() => {
    stopListening();
    setState('LISTENING');
    setErrorMessage('');
    setIsSpeaking(false);
    latestSpokenRef.current = '';
    hasAutoSubmittedRef.current = false;

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

    recognition.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';
      let hasFinal = false;

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript + ' ';
          hasFinal = true;
        } else {
          interimStr += item[0].transcript;
        }
      }

      const fullSpoken = (finalStr + interimStr).trim();
      if (fullSpoken) {
        latestSpokenRef.current = fullSpoken;
        setQueryInput(fullSpoken);

        // Auto-send trigger:
        // As soon as user speaks and pauses, automatically submit question to AI!
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const timeoutMs = hasFinal ? 900 : 1300;

        silenceTimerRef.current = setTimeout(() => {
          submitVoiceQueryAutomatically(fullSpoken);
        }, timeoutMs);
      }
    };

    // When the browser detects silence / end of speech
    recognition.onspeechend = () => {
      if (latestSpokenRef.current.trim().length > 0) {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          submitVoiceQueryAutomatically();
        }, 500);
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
      // If recognition ends and we haven't submitted yet, automatically send to AI!
      if (!hasAutoSubmittedRef.current && latestSpokenRef.current.trim().length > 0) {
        submitVoiceQueryAutomatically();
      } else if (!hasAutoSubmittedRef.current) {
        setState('READY');
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error:', e);
      setState('READY');
    }
  }, [activeLang, stopListening, submitVoiceQueryAutomatically]);

  const clearChatHistory = () => {
    stopListening();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const welcomeText = WELCOME_MESSAGES[activeLang] || WELCOME_MESSAGES.en;
    setMessages([
      {
        id: 'welcome-' + activeLang,
        sender: 'agriedge',
        text: welcomeText,
        timestamp: new Date()
      }
    ]);
    setState('READY');
    setQueryInput('');
    setErrorMessage('');
    latestSpokenRef.current = '';
    hasAutoSubmittedRef.current = false;
  };

  const quickQuestions = {
    en: [
      { label: '💧 Irrigation advice', query: 'Should I irrigate my field today?' },
      { label: '🌦 Rain forecast', query: 'Will it rain in the next 24 hours?' },
      { label: '🌾 Wheat & Rice fertilizer', query: 'What is the best fertilizer timing for wheat and rice?' },
      { label: '🌱 Leaf spots & blight cure', query: 'How to cure fungal leaf spots and blight?' }
    ],
    hi: [
      { label: '💧 सिंचाई सलाह', query: 'क्या आज खेत में पानी देना चाहिए?' },
      { label: '🌦 बारिश का अनुमान', query: 'क्या अगले 24 घंटों में बारिश होगी?' },
      { label: '🌾 गेहूं और धान में खाद', query: 'गेहूं और धान में खाद डालने का सही समय क्या है?' },
      { label: '🌱 पत्तियों के रोग', query: 'फसल की पत्तियों पर पीले धब्बे और झुलसा का क्या इलाज है?' }
    ],
    ta: [
      { label: '💧 பாசன ஆலோசனை', query: 'இன்று பயிர்களுக்கு தண்ணீர் பாய்ச்சலாமா?' },
      { label: '🌦 மழை முன்னறிவிப்பு', query: 'அடுத்த 24 மணி நேரத்தில் மழை வருமா?' },
      { label: '🌾 நெல் & கோதுமை உரம்', query: 'நெல் மற்றும் கோதுமைக்கு உரம் எப்போது இட வேண்டும்?' },
      { label: '🌱 இலை கருகல் நோய்', query: 'பயிர்களில் இலை கருகல் நோய்க்கு சிறந்த மருந்து என்ன?' }
    ]
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative border border-slate-100 max-h-[92vh] flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Title, Clear Chat & Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-agri-100 flex items-center justify-center text-agri-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {activeLang === 'hi' ? 'एग्रीएज वॉयस चैट' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் குரல் உரையாடல்' : 'AgriEdge Voice Assistant'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeLang === 'hi' ? 'आवाज से पूछें — रुकते ही सवाल अपने आप चला जाएगा' : activeLang === 'ta' ? 'பேசியதும் தானாகவே AIக்கு செல்லும்' : 'Voice auto-sends to AI on speech finish'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 1 && (
              <button
                type="button"
                onClick={clearChatHistory}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                title="Restart conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Language Selection Pills - Shows ONLY chosen language */}
        <div className="flex items-center justify-center gap-2 my-2.5 shrink-0">
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

        {/* Scrollable Conversation Thread */}
        <div className="flex-1 overflow-y-auto max-h-[46vh] sm:max-h-[50vh] pr-1 space-y-3 py-2">
          {messages.map((msg) => {
            const isFarmer = msg.sender === 'farmer';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isFarmer ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                {!isFarmer && (
                  <div className="w-7 h-7 rounded-full bg-agri-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    isFarmer
                      ? 'bg-agri-700 text-white rounded-br-xs'
                      : 'bg-slate-100 text-slate-900 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{msg.text}</p>

                  {!isFarmer && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        AgriEdge AI
                      </span>
                      <button
                        type="button"
                        onClick={() => speakText(msg.text, activeLang)}
                        className="text-[11px] font-semibold text-agri-700 hover:text-agri-900 flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 hover:shadow-2xs transition"
                        title="Play audio aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>{activeLang === 'hi' ? 'सुनें' : activeLang === 'ta' ? 'கேள்' : 'Listen'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {isFarmer && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Processing Indicator */}
          {state === 'PROCESSING' && (
            <div className="flex gap-2.5 justify-start animate-in fade-in">
              <div className="w-7 h-7 rounded-full bg-agri-600 text-white flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-slate-100 text-slate-600 rounded-2xl p-3 text-xs font-semibold flex items-center gap-2 border border-slate-200">
                <div className="w-2 h-2 rounded-full bg-agri-600 animate-ping"></div>
                <span>
                  {activeLang === 'hi' ? 'उत्तर तैयार हो रहा है...' : activeLang === 'ta' ? 'பதில் தயாராகிறது...' : 'Analyzing crop intelligence...'}
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="my-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Interactive Controls & Input Bar */}
        <div className="pt-2 border-t border-slate-100 shrink-0 space-y-2.5">
          
          {/* Centered Voice Mic Button with Auto-Send Trigger */}
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              {state === 'LISTENING' && (
                <>
                  <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-35"></div>
                  <div className="absolute -inset-2.5 rounded-full bg-red-200 animate-pulse opacity-50"></div>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  if (state === 'LISTENING') {
                    // Tap to stop and send immediately
                    submitVoiceQueryAutomatically();
                  } else {
                    startListening();
                  }
                }}
                className={`w-14 h-14 rounded-full flex items-center justify-center relative z-10 shadow-md transition-all active:scale-95 ${
                  state === 'LISTENING'
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30'
                    : state === 'PROCESSING'
                    ? 'bg-amber-500 text-white shadow-amber-500/30'
                    : 'bg-agri-700 hover:bg-agri-800 text-white shadow-agri-700/25'
                }`}
                title={state === 'LISTENING' ? 'Tap to finish & send now' : 'Tap to speak question'}
              >
                {state === 'LISTENING' ? (
                  <MicOff className="w-6 h-6 animate-pulse" />
                ) : (
                  <Mic className="w-6 h-6" />
                )}
              </button>
            </div>

            <div className="text-left">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                  state === 'LISTENING'
                    ? 'bg-red-100 text-red-700'
                    : state === 'PROCESSING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-agri-100 text-agri-800'
                }`}
              >
                {state === 'LISTENING' && <Radio className="w-3 h-3 text-red-600 animate-pulse" />}
                {state === 'READY' && (activeLang === 'hi' ? 'बोलने के लिए माइक दबाएं' : activeLang === 'ta' ? 'பேச மைக் அழுத்தவும்' : 'Tap Mic to Speak')}
                {state === 'LISTENING' && (activeLang === 'hi' ? 'सुन रहा है... (रुकते ही अपने आप भेजेगा)' : activeLang === 'ta' ? 'கேட்கிறது... (பேசியதும் தானாகவே அனுப்பும்)' : 'Listening... (Auto-sends when done)')}
                {state === 'PROCESSING' && (activeLang === 'hi' ? 'AI सोच रहा है...' : activeLang === 'ta' ? 'AI சிந்திக்கிறது...' : 'AI Thinking...')}
                {state === 'RESPONDING' && (activeLang === 'hi' ? 'एग्रीएज बोल रहा है' : activeLang === 'ta' ? 'அக்ரிஎட்ஜ் பேசுகிறது' : 'Speaking advice')}
                {state === 'ERROR' && (activeLang === 'hi' ? 'पुनः प्रयास करें' : activeLang === 'ta' ? 'மீண்டும் முயற்சிக்கவும்' : 'Please retry')}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {activeLang === 'hi'
                  ? 'बोलते ही सवाल अपने आप AI को चला जाएगा — सेंड बटन दबाने की जरूरत नहीं।'
                  : activeLang === 'ta'
                  ? 'பேசியதும் கேள்வி தானாகவே AIக்கு செல்லும் — அனுப்பும் பட்டனை அழுத்த தேவையில்லை.'
                  : 'Question sends automatically when you finish speaking — no send button needed.'}
              </p>
            </div>
          </div>

          {/* Text Input with Optional Manual Send */}
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
                  ? 'अपना प्रश्न बोलें (माइक से) या यहाँ लिखें...'
                  : activeLang === 'ta'
                  ? 'கேள்வியை பேசவும் (மைக்) அல்லது தட்டச்சு செய்யவும்...'
                  : 'Speak question (Mic) or type here...'
              }
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-agri-500 bg-slate-50/50"
            />
            <button
              type="button"
              onClick={() => sendVoiceQuery(queryInput)}
              disabled={state === 'PROCESSING' || !queryInput.trim()}
              className="bg-agri-700 hover:bg-agri-800 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              title="Send written query"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{activeLang === 'hi' ? 'पूछें' : activeLang === 'ta' ? 'அனுப்பு' : 'Ask'}</span>
            </button>
          </div>

          {/* 1-Tap Quick Questions Chips */}
          <div className="pt-1 flex flex-wrap gap-1.5">
            {quickQuestions[activeLang]?.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => sendVoiceQuery(item.query)}
                className="text-[11px] bg-slate-100 hover:bg-agri-50 hover:text-agri-900 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition text-left font-medium"
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
