'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentMessage, BuildingId, Alert } from '@/types';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Building2,
  Cpu,
  Info,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface EcoPilotPanelProps {
  initialPrompt?: string;
  contextAlertId?: string;
  contextBuildingId?: BuildingId;
  alerts: Alert[];
  onRecordFollowUp: (alertId?: string, buildingId?: BuildingId) => void;
  onClearContext?: () => void;
}

export function EcoPilotPanel({
  initialPrompt,
  contextAlertId,
  contextBuildingId,
  alerts,
  onRecordFollowUp,
  onClearContext,
}: EcoPilotPanelProps) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      text: "Hello, I am EcoPilot AI — the campus decarbonization and facility intelligence agent. I continuously evaluate IoT meter streams, predict equipment degradation, and recommend verified conservation protocols. How can I assist your sustainability audit today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 98,
      isRuleBasedFallback: false,
      citations: ['Campus SCADA Substation Gateway', 'ASHRAE 90.1 Energy Standard', 'Campus Submeter Network'],
    },
  ]);

  const [inputQuery, setInputQuery] = useState(initialPrompt || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Voice Speech-to-Text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechPermissionState, setSpeechPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');

  // Text-to-Speech narration state
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt !== inputQuery) {
      setInputQuery(initialPrompt);
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  // Initialize Web Speech API for voice input
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setSpeechSupported(false);
        setSpeechPermissionState('unsupported');
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechPermissionState('granted');
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputQuery(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setSpeechPermissionState('denied');
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const speakText = (text: string) => {
    if (!isTtsEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`[\]]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Speech recognition start failed', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    setErrorMessage(null);
    const userMsg: AgentMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await apiClient.chatWithAgent(text, {
        buildingId: contextBuildingId,
        alertId: contextAlertId,
      });

      if (response.error) {
        setErrorMessage(response.error.message || 'Failed to connect to EcoPilot agent service');
        const fallbackMsg: AgentMessage = {
          id: `ast-err-${Date.now()}`,
          sender: 'assistant',
          text: `Backend connection notice: ${response.error.message}. Please verify the API route is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRuleBasedFallback: true,
          confidence: 0,
        };
        setMessages((prev) => [...prev, fallbackMsg]);
      } else if (response.data) {
        const assistantMsg = response.data;
        setMessages((prev) => [...prev, assistantMsg]);
        speakText(assistantMsg.text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network communication error';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedPrompts = [
    'Why is Engineering Block HVAC compressor drawing high power at night?',
    'Investigate Library basement water consumption spike',
    'What is causing Solar PV Inverter 3 string degradation?',
    'Recommend top 3 high-ROI actions to reduce campus carbon today',
  ];

  return (
    <div className="space-y-4">
      {/* Target Focus Context Banner if launched with specific alert or facility */}
      {(contextAlertId || contextBuildingId) && (
        <div className="p-3 rounded-lg bg-forest-50 border border-forest-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-forest-900 font-medium">
            <Building2 className="h-4 w-4 text-forest-700" />
            <span>
              Target Investigation Scope: <strong className="font-mono uppercase">{contextBuildingId}</strong>
              {contextAlertId && <> • Alert ID: <span className="font-mono font-bold">{contextAlertId}</span></>}
            </span>
          </div>
          {onClearContext && (
            <button
              onClick={onClearContext}
              className="text-[11px] text-charcoal-500 hover:text-charcoal-800 underline"
            >
              Reset Target Context
            </button>
          )}
        </div>
      )}

      {/* Voice Warning if microphone access is blocked */}
      {speechPermissionState === 'denied' && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <MicOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            Microphone access was denied in your browser settings. You can continue typing queries or grant permissions via the browser address bar.
          </span>
        </div>
      )}

      {/* Main Minimalist Assistant Panel */}
      <div className="card-clean flex flex-col h-[650px] overflow-hidden bg-white">
        {/* Assistant Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-forest-800 text-white flex items-center justify-center font-bold">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-charcoal-900">EcoPilot Environmental Assistant</h3>
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="text-[10px] text-emerald-800 font-mono font-medium">SCADA Grounded</span>
              </div>
              <p className="text-[11px] text-charcoal-500">
                Trained on ASHRAE building standards, submeter telemetry & decarbonization protocols.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Speech Narration Toggle */}
            <button
              onClick={() => {
                if (isSpeaking) window.speechSynthesis.cancel();
                setIsTtsEnabled(!isTtsEnabled);
              }}
              title={isTtsEnabled ? 'Mute audio narration' : 'Enable audio narration'}
              className={`p-1.5 rounded border text-xs flex items-center gap-1.5 transition-colors ${
                isTtsEnabled
                  ? 'bg-forest-50 text-forest-800 border-forest-200'
                  : 'bg-white text-charcoal-500 border-gray-300'
              }`}
            >
              {isTtsEnabled ? <Volume2 className="h-3.5 w-3.5 text-forest-700" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline text-[11px]">
                {isTtsEnabled ? 'Voice Active' : 'Muted'}
              </span>
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                    isUser
                      ? 'bg-slate-700 text-white'
                      : 'bg-forest-800 text-white'
                  }`}
                >
                  {isUser ? 'ME' : 'AI'}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1.5 max-w-2xl">
                  <div
                    className={`p-4 rounded-lg text-xs leading-relaxed ${
                      isUser
                        ? 'bg-gray-100 text-charcoal-900 border border-gray-200'
                        : 'bg-white text-charcoal-900 border border-gray-200 shadow-xs'
                    }`}
                  >
                    {/* Explicit AI vs Rule-Based Distinction Badge */}
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {msg.isRuleBasedFallback ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                              <Cpu className="h-3 w-3 text-amber-700" />
                              Rule-Based Expert Engine (Offline Fallback)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200 text-[10px] font-semibold flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 text-forest-700" />
                              EcoPilot AI Reasoning Model (Live SCADA)
                            </span>
                          )}
                        </div>

                        {msg.confidence !== undefined && (
                          <span className="text-[10px] font-mono font-semibold text-charcoal-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            Confidence: {msg.confidence}%
                          </span>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap text-charcoal-800">{msg.text}</div>

                    {/* Verified Telemetry Evidence Section */}
                    {msg.evidence && msg.evidence.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                        <span className="text-[10px] text-charcoal-500 uppercase tracking-wider font-bold block">
                          Verified Telemetry Evidence:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.evidence.map((ev, i) => (
                            <div key={i} className="p-2.5 rounded bg-gray-50 border border-gray-200 text-[11px]">
                              <span className="text-charcoal-500 block">{ev.label}</span>
                              <span className="font-mono text-charcoal-900 font-bold">{ev.value}</span>
                              <span className="text-[10px] text-charcoal-400 block mt-0.5">{ev.context}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Citations List */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-1.5 text-[10px] text-charcoal-500">
                        <span className="font-semibold text-charcoal-600">Referenced:</span>
                        {msg.citations.map((cite, i) => (
                          <span
                            key={i}
                            className="bg-gray-100 px-2 py-0.5 rounded text-charcoal-600 border border-gray-200"
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actionable Recommendations */}
                    {msg.actionableRecommendations && msg.actionableRecommendations.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                        <span className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-forest-700" />
                          Recommended Engineering Protocol ({msg.actionableRecommendations.length})
                        </span>

                        {msg.actionableRecommendations.map((rec) => (
                          <div
                            key={rec.id}
                            className="p-3.5 rounded-lg bg-gray-50/80 border border-forest-200 space-y-2 text-xs"
                          >
                            <div className="flex items-start justify-between">
                              <h5 className="font-bold text-charcoal-900">{rec.title}</h5>
                              <Badge variant={rec.priority}>{rec.priority}</Badge>
                            </div>
                            <p className="text-[11px] text-charcoal-600">{rec.impact}</p>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-charcoal-500 pt-1">
                              <span>Estimated Savings: <strong className="text-forest-800 font-mono">{rec.estimatedSavings}</strong></span>
                              <span>• Complexity: <strong className="text-charcoal-800">{rec.effort}</strong></span>
                            </div>

                            <div className="pt-2">
                              <span className="text-[10px] text-charcoal-500 uppercase font-semibold block mb-1">
                                Action Checklist:
                              </span>
                              <ol className="list-decimal list-inside space-y-1 text-[11px] text-charcoal-700">
                                {rec.steps.map((st) => (
                                  <li key={st.stepNumber}>
                                    <span className="text-charcoal-800 font-medium">{st.instruction}</span>
                                    <span className="text-[10px] text-charcoal-500 block pl-4">↳ Milestone: {st.expectedOutcome}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            <button
                              onClick={() => onRecordFollowUp(contextAlertId, contextBuildingId)}
                              className="w-full mt-2 py-1.5 px-3 rounded bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <FileCheck className="h-3.5 w-3.5 text-white" />
                              Log Verification Follow-Up for this Action
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-charcoal-400 block px-1 font-mono">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2.5 text-xs text-charcoal-600 bg-gray-50 p-3 rounded-lg border border-gray-200 w-fit">
              <LoadingSpinner size="sm" />
              <span>EcoPilot is cross-referencing facility telemetry & baseline anomalies...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Question Chips */}
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-charcoal-500 uppercase flex-shrink-0">
            Suggested:
          </span>
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] bg-white hover:bg-gray-100 text-charcoal-700 border border-gray-300 rounded px-2.5 py-1 flex-shrink-0 transition-colors shadow-xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Minimalist Composer at Bottom */}
        <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-2">
          {/* Microphone button */}
          <button
            onClick={toggleListening}
            disabled={!speechSupported}
            title={
              !speechSupported
                ? 'Speech recognition not supported in this browser'
                : isListening
                ? 'Listening... click to send'
                : 'Speak query'
            }
            className={`p-2 rounded border transition-all ${
              isListening
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                : 'bg-gray-100 text-charcoal-600 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {isListening ? <Mic className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isListening
                ? 'Listening to speech input...'
                : 'Ask EcoPilot about campus telemetry, anomalies, or savings...'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={isLoading}
            className="flex-1 bg-white border border-gray-300 rounded px-3.5 py-2 text-xs text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:border-forest-600"
          />

          {/* Send button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2 rounded bg-forest-800 hover:bg-forest-900 disabled:opacity-40 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
