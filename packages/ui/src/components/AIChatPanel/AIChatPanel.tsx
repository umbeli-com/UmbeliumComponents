import { useState, useRef, useEffect } from 'react';
import { X, Send, Zap, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface WorkspaceContext {
  name?: string;
  tone?: string;
  main_objectives?: string[];
  target_audience?: string;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onClearHistory: () => void;
  isLoading?: boolean;
  workspaceContext?: WorkspaceContext | null;
  suggestions?: string[];
  locale?: string;
  translations?: {
    title: string;
    clearHistory: string;
    close: string;
    emptyTitle: string;
    emptyMessage: string;
    inputPlaceholder: string;
    keyboardHint: string;
  };
}

const defaultSuggestions = [
  "💡 Donne-moi 5 idées de posts pour cette semaine",
  "🎯 Analyse ma stratégie actuelle",
  "📊 Comment améliorer mon engagement ?",
  "🎣 Génère des hooks percutants",
];

export function AIChatPanel({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  onClearHistory,
  isLoading = false,
  workspaceContext,
  suggestions = defaultSuggestions,
  locale = 'fr-FR',
  translations,
}: AIChatPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue;
    setInputValue('');
    await onSendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const labels = {
    title: translations?.title || 'Coach IA',
    clearHistory: translations?.clearHistory || 'Effacer l\'historique',
    close: translations?.close || 'Fermer (Esc)',
    emptyTitle: translations?.emptyTitle || 'Comment puis-je t\'aider ?',
    emptyMessage: translations?.emptyMessage || 'Pose-moi des questions sur ta stratégie, tes performances ou tes KPIs.',
    inputPlaceholder: translations?.inputPlaceholder || 'Pose ta question...',
    keyboardHint: translations?.keyboardHint || '⌘K pour ouvrir/fermer',
  };

  return (
    <>
      <div 
        className={`ai-chat-overlay ${isOpen ? 'ai-chat-overlay--visible' : ''}`}
        onClick={onClose}
      />

      <div className={`ai-chat-panel ${isOpen ? 'ai-chat-panel--open' : ''}`}>
        <div className="ai-chat-panel__header">
          <div className="ai-chat-panel__header-left">
            <div className="ai-chat-panel__avatar">
              <Zap size={20} />
            </div>
            <div className="ai-chat-panel__header-info">
              <h3 className="ai-chat-panel__title">{labels.title}</h3>
              {workspaceContext && (
                <span className="ai-chat-panel__subtitle">{workspaceContext.name}</span>
              )}
            </div>
          </div>
          <div className="ai-chat-panel__header-actions">
              <button 
                className="ai-chat-panel__icon-btn"
                onClick={onClearHistory}
                title={labels.clearHistory}
              >
                <Trash2 size={18} />
              </button>
              <button 
                className="ai-chat-panel__icon-btn"
                onClick={onClose}
                title={labels.close}
              >
                <X size={20} />
              </button>
          </div>
        </div>

        <div className="ai-chat-panel__messages">
          {messages.length === 0 ? (
            <div className="ai-chat-panel__empty">
              <div className="ai-chat-panel__empty-icon">
                <Zap size={48} />
              </div>
              <h4>{labels.emptyTitle}</h4>
              <p>{labels.emptyMessage}</p>
              
              <div className="ai-chat-panel__suggestions">
                {suggestions.map((suggestion: string, index: number) => (
                  <button
                    key={index}
                    className="ai-chat-panel__suggestion"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`ai-chat-panel__message ai-chat-panel__message--${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="ai-chat-panel__message-avatar">
                      <Zap size={16} />
                    </div>
                  )}
                  <div className="ai-chat-panel__message-content">
                    <p>{msg.content}</p>
                    <span className="ai-chat-panel__message-time">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="ai-chat-panel__message ai-chat-panel__message--assistant">
                  <div className="ai-chat-panel__message-avatar">
                    <Zap size={16} />
                  </div>
                  <div className="ai-chat-panel__message-content ai-chat-panel__message-content--typing">
                    <span className="ai-chat-panel__dot"></span>
                    <span className="ai-chat-panel__dot"></span>
                    <span className="ai-chat-panel__dot"></span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="ai-chat-panel__input-container">
          <input
            ref={inputRef}
            type="text"
            className="ai-chat-panel__input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={labels.inputPlaceholder}
            disabled={isLoading}
          />
          <button
            className="ai-chat-panel__send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>

        <div className="ai-chat-panel__footer">
          <span>{labels.keyboardHint}</span>
        </div>
      </div>
    </>
  );
}

export default AIChatPanel;
