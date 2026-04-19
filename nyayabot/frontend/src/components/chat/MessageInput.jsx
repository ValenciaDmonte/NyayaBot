/**
 * components/chat/MessageInput.jsx
 *
 * Text input area + send button + voice input button.
 *
 * WHY auto-resize textarea:
 * Legal questions can be multiple sentences. A fixed-height input
 * forces users to scroll inside the textarea — bad UX.
 *
 * WHY not auto-submit after voice recognition:
 * Legal questions must be reviewed before sending. A voice transcription
 * error (common with Indian names + legal terms) could corrupt the query.
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip } from 'lucide-react';
import VoiceInputButton from '../ui/VoiceInputButton';
import NoticePreviewCard from './NoticePreviewCard';

export default function MessageInput({ onSend, onNoticeUpload, isLoading, speechHooks }) {
  const [value, setValue] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const { isListening, startListening, stopListening, transcript, clearTranscript, inputSupported } =
    speechHooks || {};

  useEffect(() => {
    if (transcript) setValue(transcript);
  }, [transcript]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (selectedFile) {
      onNoticeUpload?.(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    clearTranscript?.();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = !isLoading && (selectedFile || value.trim());

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800
                    bg-white dark:bg-zinc-950 p-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit}>
        {selectedFile && (
          <NoticePreviewCard file={selectedFile} onRemove={handleRemoveFile} />
        )}

        <div className="flex items-end gap-2
                        bg-zinc-50 dark:bg-zinc-900
                        border border-zinc-200 dark:border-zinc-700
                        focus-within:border-gold-500 dark:focus-within:border-gold-500
                        rounded-xl px-4 py-3 transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? '🎤 Listening... speak your question'
                : 'Ask a legal question... (Enter to send, Shift+Enter for new line)'
            }
            className={`flex-1 bg-transparent
                        text-zinc-900 dark:text-zinc-100
                        placeholder-zinc-400 dark:placeholder-zinc-500
                        resize-none focus:outline-none text-sm leading-relaxed
                        min-h-[24px] max-h-[160px]
                        ${isListening ? 'placeholder-red-400' : ''}`}
            rows={1}
            disabled={isLoading}
          />

          <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-zinc-400 dark:text-zinc-500
                         hover:text-gold-600 dark:hover:text-gold-400
                         disabled:opacity-40 disabled:cursor-not-allowed
                         rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Upload a legal notice (PDF or image)"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <VoiceInputButton
              isListening={isListening}
              onStart={startListening}
              onStop={stopListening}
              isSupported={inputSupported}
            />

            <button
              type="submit"
              disabled={!canSend}
              className="p-2 bg-gold-500 hover:bg-gold-400
                         disabled:bg-zinc-200 dark:disabled:bg-zinc-800
                         disabled:cursor-not-allowed
                         rounded-lg transition-colors flex-shrink-0"
              title="Send query"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white dark:text-white" />
              )}
            </button>
          </div>
        </div>

        {value.length > 1800 && (
          <p className="text-xs text-amber-500 mt-1 text-right">
            {value.length}/2000 characters
          </p>
        )}
      </form>
    </div>
  );
}
