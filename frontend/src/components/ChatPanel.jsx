import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

const imageDB = {
  async getDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('HealthSyncDB', 1);
      req.onupgradeneeded = (e) => e.target.result.createObjectStore('images');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async save(id, dataUrl) {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put(dataUrl, id);
      tx.oncomplete = () => resolve();
    });
  },
  async get(id) {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('images', 'readonly');
      const req = tx.objectStore('images').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }
};

const MessageBubble = ({ msg }) => {
  const [imgData, setImgData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isUser = msg.role === 'user';
  
  const imgMatch = msg.text_content?.match(/📸 \[img_(.+)\]/);
  
  useEffect(() => {
    if (imgMatch) {
      setIsLoading(true);
      imageDB.get(imgMatch[1]).then(data => {
        if (data) setImgData(data);
        setIsLoading(false);
      });
    }
  }, [msg.text_content]);

  const displayText = imgMatch ? msg.text_content.replace(imgMatch[0], '').trim() : msg.text_content;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser ? (
        // USER MESSAGE: Understated Grey Bubble
        <div className="max-w-[85%] rounded-[20px] px-5 py-3 bg-white/[0.12] border border-white/[0.05] text-white rounded-br-sm shadow-sm">
          {imgMatch && imgData && !isLoading && (
            <img src={imgData} alt="Uploaded meal" className="rounded-xl mb-2 max-w-full md:max-w-sm object-cover shadow-lg border border-white/[0.1]" />
          )}
          {imgMatch && !imgData && !isLoading && (
            <div className="bg-white/[0.05] px-3 py-2 rounded-lg mb-2 text-sm italic border border-white/[0.05] text-slate-300">
              📸 [Photo viewable on original device]
            </div>
          )}
          {imgMatch && isLoading && (
            <div className="animate-pulse w-full h-32 bg-white/[0.05] rounded-xl mb-2 flex items-center justify-center text-xs opacity-70 text-slate-400">
              Loading image...
            </div>
          )}
          {displayText && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
              {displayText}
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-[95%] py-1 text-slate-200">
           {displayText && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
              {displayText}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default function ChatPanel({ onInputFocus, refreshTrigger, onLogSuccess }) { 
  const [messages, setMessages] = useState([
    { role: 'model', text_content: 'Hello! I am HealthSync. You can type, speak, or upload a photo of your meal and I will track it for you.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/chat/history/'); 
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [refreshTrigger]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const imageId = Date.now().toString(); 
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64data = reader.result;
      await imageDB.save(imageId, base64data); 

      setMessages(prev => [...prev, { role: 'user', text_content: `📸 [img_${imageId}]` }]);

      const formData = new FormData();
      formData.append('image', file);
      formData.append('local_image_id', imageId); 

      try {
        await api.post('/tracker/log/vision/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        await fetchChatHistory(); 
        if (onLogSuccess) onLogSuccess(); 
      } catch (error) {
        setMessages(prev => [...prev, { role: 'model', text_content: "I couldn't process that image. Make sure it's a clear photo of food!" }]);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = null; 
      }
    };
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support voice input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true; 

    recognition.onstart = () => setIsRecording(true);

    recognition.onresult = (event) => {
      const currentTranscript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      setInput(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Mic error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    }

    const userMessage = { role: 'user', text_content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/stream/', { text_content: userMessage.text_content });
      const aiMessage = { role: 'model', text_content: response.data.ai_response.text_content };
      setMessages((prev) => [...prev, aiMessage]);

      if (response.data.meal_logged && onLogSuccess) {
        onLogSuccess();
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', text_content: 'Sorry, I encountered an error connecting to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-[#0a0d10]/85 backdrop-blur-2xl overflow-hidden">
      
      <style>{`
        .dark-scrollbar::-webkit-scrollbar { width: 6px; }
        .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .dark-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .dark-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pt-16 md:pt-6 dark-scrollbar">
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} msg={msg} />
        ))}
        
        {isLoading && (
          <div className="flex justify-start pl-2">
             <div className="flex items-center h-8 space-x-1.5 opacity-50">
               <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></div>
               <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
               <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 md:p-4 bg-transparent border-t border-white/[0.03] shrink-0 z-10">
        <form 
          onSubmit={handleSend} 
          className={`flex shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl border rounded-full p-1.5 items-center transition-all duration-300 ${
            isRecording 
              ? 'bg-amber-500/10 border-amber-500/30 ring-2 ring-amber-500/10' 
              : 'bg-[#13171c]/60 border-white/[0.05] focus-within:ring-1 focus-within:ring-white/[0.1] focus-within:border-white/[0.1]'
          }`}
        >
          {isRecording ? (
            <div className="flex-1 flex items-center px-4 overflow-hidden h-10">
              <div className="flex items-center space-x-1 mr-4 shrink-0">
                <div className="w-1.5 h-4 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-3 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-1.5 h-7 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
                <div className="w-1.5 h-4 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
              <p className="text-amber-400 font-semibold text-sm truncate animate-pulse w-full">
                {input || "Listening..."}
              </p>
            </div>
          ) : (
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={onInputFocus}
              placeholder="Message HealthSync..."
              className="flex-1 px-4 py-2 bg-transparent outline-none text-slate-200 placeholder-slate-600 text-[15px] font-medium h-10"
              disabled={isLoading || isUploading}
            />
          )}

          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            hidden 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
          />

          <button
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading || isRecording}
            className="p-2.5 rounded-full transition-all flex items-center justify-center mr-1 bg-white/[0.03] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 disabled:opacity-50 shrink-0"
            title="Upload Food Image"
          >
            {isUploading ? (
               <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>

          <button
            type="button" 
            onClick={toggleVoiceInput}
            disabled={isLoading || isUploading}
            className={`p-2.5 rounded-full transition-all duration-300 flex items-center justify-center mr-1 shrink-0 disabled:opacity-50 ${
              isRecording
                ? 'bg-amber-500/10 text-amber-400 shadow-inner'
                : 'bg-white/[0.03] text-slate-500 hover:bg-white/[0.08] hover:text-slate-300'
            }`}
            title={isRecording ? "Stop Recording" : "Voice Input"}
          >
            {isRecording ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
              </svg>
            )}
          </button>

          <button
            type="submit"
            disabled={isLoading || !input.trim() || isUploading}
            className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-full transition-all disabled:opacity-30 font-bold text-sm tracking-wide shrink-0 h-10 flex items-center"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}