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

  // When voice transcript updates, fill the textarea
  useEffect(() => {
    if (transcript) {
      setValue(transcript);
    }
  }, [transcript]);

  // Auto-resize textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'; // Max 160px (~5 lines)
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    // If a file is selected, send it as a notice upload
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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
    // Enter sends, Shift+Enter adds a new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = !isLoading && (selectedFile || value.trim());

  return (
    <div className="border-t border-navy-700 bg-navy-900 p-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <form onSubmit={handleSubmit}>
        {/* File preview card */}
        {selectedFile && (
          <NoticePreviewCard file={selectedFile} onRemove={handleRemoveFile} />
        )}

        <div className="flex items-end gap-2 bg-navy-800 border border-navy-600 focus-within:border-saffron-600 rounded-xl px-4 py-3 transition-colors">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎤 Listening... speak your question' : 'Ask a legal question... (Enter to send, Shift+Enter for new line)'}
            className={`flex-1 bg-transparent text-white placeholder-navy-400 resize-none focus:outline-none text-sm leading-relaxed min-h-[24px] max-h-[160px] ${
              isListening ? 'placeholder-red-400' : ''
            }`}
            rows={1}
            disabled={isLoading}
          />

          {/* Button group */}
          <div className="flex items-center gap-2 flex-shrink-0 pb-0.5">
            {/* Upload legal notice */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2 text-navy-400 hover:text-saffron-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg hover:bg-navy-700 transition-colors flex-shrink-0"
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

            {/* Send button */}
            <button
              type="submit"
              disabled={!canSend}
              className="p-2 bg-saffron-600 hover:bg-saffron-700 disabled:bg-navy-700 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
              title="Send query"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Character count warning at limit */}
        {value.length > 1800 && (
          <p className="text-xs text-amber-400 mt-1 text-right">
            {value.length}/2000 characters
          </p>
        )}
      </form>
    </div>
  );
}
