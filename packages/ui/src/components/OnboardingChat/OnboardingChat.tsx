import { useState, useRef, useEffect } from 'react';
import { Send, ArrowRight } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface OnboardingData {
  branding_type?: string;
  content_style?: string;
  tone?: string;
  target_audience?: string;
  main_objectives?: string[];
  content_themes?: string[];
  preferred_hooks?: string[];
  preferred_ctas?: string[];
  conversion_goals?: string[];
  industry?: string;
  unique_value_proposition?: string;
}

interface OnboardingChatProps {
  workspaceId: string;
  workspaceName: string;
  onComplete: (data: OnboardingData) => void;
  onContinue: () => void;
  onSendMessage: (message: string, chatHistory: ChatMessage[], language: 'fr' | 'en') => Promise<{
    message: string;
    isComplete: boolean;
    extractedData: OnboardingData | null;
  }>;
  language?: 'fr' | 'en';
  translations?: {
    fallbackGreeting?: string;
    inputPlaceholder?: string;
    continue?: string;
    errorMessage?: string;
  };
}

const MAX_STEPS = 5;

const defaultTranslations = {
  fallbackGreeting: 'Bonjour ! Je suis votre assistant. Parlez-moi de votre projet.',
  inputPlaceholder: 'Tapez votre message...',
  continue: 'Continuer',
  errorMessage: 'Une erreur est survenue. Veuillez réessayer.',
};

export function OnboardingChat({ 
  workspaceName, 
  onComplete, 
  onContinue, 
  onSendMessage,
  language = 'fr',
  translations = {}
}: OnboardingChatProps) {
  const t = { ...defaultTranslations, ...translations };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_extractedData, setExtractedData] = useState<OnboardingData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userMessageCount = messages.filter(m => m.role === 'user').length;
  const progress = Math.min((userMessageCount / MAX_STEPS) * 100, isComplete ? 100 : 90);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const startConversation = async () => {
      setIsTyping(true);
      try {
        const response = await onSendMessage('', [], language);
        setMessages([{
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString(),
        }]);
      } catch (err) {
        console.error('Failed to start conversation:', err);
        const fallback = t.fallbackGreeting?.replace('{workspaceName}', workspaceName) || t.fallbackGreeting;
        setMessages([{
          role: 'assistant',
          content: fallback || '',
          timestamp: new Date().toISOString(),
        }]);
      } finally {
        setIsTyping(false);
      }
    };
    startConversation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const cleanMessageForDisplay = (content: string): string => {
    let cleaned = content.replace('[ONBOARDING_COMPLETE]', '').trim();
    cleaned = cleaned.replace(/```json[\s\S]*?```/g, '').trim();
    return cleaned;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await onSendMessage(userMessage.content, messages, language);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.isComplete && response.extractedData) {
        setIsComplete(true);
        setExtractedData(response.extractedData);
        onComplete(response.extractedData);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t.errorMessage || '',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`onboarding-chat ${isComplete ? 'onboarding-chat--complete' : ''}`}>
      <div className="onboarding-chat__progress">
        <div 
          className="onboarding-chat__progress-bar" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="onboarding-chat__messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`onboarding-chat__bubble onboarding-chat__bubble--${msg.role}`}
          >
            {msg.role === 'assistant' && (
              <div className="onboarding-chat__avatar">
                <span>S</span>
              </div>
            )}
            <div className="onboarding-chat__content">
              <p>{cleanMessageForDisplay(msg.content)}</p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="onboarding-chat__bubble onboarding-chat__bubble--assistant">
            <div className="onboarding-chat__avatar">
              <span>S</span>
            </div>
            <div className="onboarding-chat__content onboarding-chat__content--typing">
              <span className="onboarding-chat__dot"></span>
              <span className="onboarding-chat__dot"></span>
              <span className="onboarding-chat__dot"></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {!isComplete && (
        <div className="onboarding-chat__input-container">
          <input
            ref={inputRef}
            type="text"
            className="onboarding-chat__input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.inputPlaceholder}
            disabled={isLoading}
          />
          <button
            className="onboarding-chat__send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
      )}

      {isComplete && (
        <div className="onboarding-chat__complete-container">
          <button className="onboarding-chat__continue" onClick={onContinue}>
            <span>{t.continue}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

export default OnboardingChat;
