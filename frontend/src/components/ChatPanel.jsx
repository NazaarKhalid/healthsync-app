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
  const [audioData, setAudioData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isUser = msg.role === 'user';
  
  const imgMatch = msg.text_content?.match(/📸 \[img_(.+)\]/);
  const audioMatch = msg.text_content?.match(/🎤 \[audio_(.+)\]/);
  
  useEffect(() => {
    if (imgMatch) {
      setIsLoading(true);
      imageDB.get(imgMatch[1]).then(data => {
        if (data) setImgData(data);
        setIsLoading(false);
      });
    }
    if (audioMatch) {
      imageDB.get(`audio_${audioMatch[1]}`).then(data => {
        if (data) setAudioData(data);
      });
    }
  }, [msg.text_content]);

  let displayText = msg.text_content;
  if (imgMatch) displayText = displayText.replace(imgMatch[0], '').trim();
  if (audioMatch) displayText = displayText.replace(audioMatch[0], '').trim();

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      {isUser ? (
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

          {audioMatch && audioData && (
            <audio 
              src={audioData} 
              controls 
              className="w-full max-w-[220px] h-10 mb-2 outline-none rounded-full bg-white/[0.05]" 
              style={{ filter: 'invert(0.9) hue-rotate(180deg) grayscale(100%)' }} 
            />
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
  const todayStr = new Date().toLocaleDateString('en-CA'); 

  const [messages, setMessages] = useState([]);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const transcriptRef = useRef('');
  const fileInputRef = useRef(null);
  const cancelRef = useRef(false);

  const fetchChatHistory = async () => {
    try {
      const response = await api.get(`/chat/history/?t=${new Date().getTime()}`); 
      if (response.data) {
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
  }, [messages, selectedDate]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const imageId = Date.now().toString(); 
    const currentISO = new Date().toISOString();
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async () => {
      const base64data = reader.result;
      await imageDB.save(imageId, base64data); 

      setMessages(prev => [...prev, { role: 'user', text_content: `📸 [img_${imageId}]`, timestamp: currentISO }]);

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
        setMessages(prev => [...prev, { role: 'model', text_content: "I couldn't process that image. Make sure it's a clear photo of food!", timestamp: new Date().toISOString() }]);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = null; 
      }
    };
  };

  const cancelRecording = () => {
    cancelRef.current = true;
    recognitionRef.current?.stop();
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setInput('');
    transcriptRef.current = '';
  };

  const toggleVoiceInput = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support voice input.");
      return;
    }

    try {
      cancelRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptRef.current = '';
      setInput('');

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        stream.getTracks().forEach(track => track.stop()); 

        if (cancelRef.current) {
          cancelRef.current = false;
          return; 
        }

        const finalTranscript = transcriptRef.current.trim();
        if (!finalTranscript && audioChunksRef.current.length === 0) return;

        setIsLoading(true);
        const audioId = Date.now().toString();
        const currentISO = new Date().toISOString();

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          await imageDB.save(`audio_${audioId}`, base64Audio);

          const textWithTag = `🎤 [audio_${audioId}]\n${finalTranscript}`;
          
          const userMessage = { role: 'user', text_content: textWithTag, timestamp: currentISO };
          setMessages((prev) => [...prev, userMessage]);
          setInput('');
          transcriptRef.current = '';

          const formData = new FormData();
          formData.append('audio', audioBlob, 'voice_message.webm');
          formData.append('text_content', textWithTag);

          try {
            const response = await api.post('/chat/stream/', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            await fetchChatHistory();
            if (response.data.meal_logged && onLogSuccess) onLogSuccess();
          } catch (error) {
            setMessages((prev) => [...prev, { role: 'model', text_content: 'Sorry, I encountered an error sending the audio.', timestamp: new Date().toISOString() }]);
          } finally {
            setIsLoading(false);
          }
        };
      };

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true; 
      recognition.interimResults = true; 

      recognition.onstart = () => setIsRecording(true);

      recognition.onresult = (event) => {
        const currentTranscript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setInput(currentTranscript);
        transcriptRef.current = currentTranscript; 
      };

      recognition.onerror = (event) => {
        console.error("Mic error:", event.error);
        setIsRecording(false);
      };

      mediaRecorder.start();
      recognition.start();

    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Please allow microphone access to use voice recording.");
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    if (isRecording) {
      toggleVoiceInput();
      return;
    }

    const currentISO = new Date().toISOString();
    const userMessage = { role: 'user', text_content: input, timestamp: currentISO };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/stream/', { text_content: userMessage.text_content });
      await fetchChatHistory();
      if (response.data.meal_logged && onLogSuccess) onLogSuccess();
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', text_content: 'Sorry, I encountered an error connecting to the server.', timestamp: new Date().toISOString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Process Messages Grouped By Date
  const groupedMessages = messages.reduce((acc, msg) => {
    const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('en-CA') : todayStr;
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(msg);
    return acc;
  }, {});

  // Ensure 'Today' always exists so user can log freely
  if (!groupedMessages[todayStr]) {
    groupedMessages[todayStr] = [{
      role: 'model',
      text_content: 'Hello! I am HealthSync. You can type, speak, or upload a photo of your meal and I will track it for you.',
      timestamp: new Date().toISOString()
    }];
  }

  const sortedDates = Object.keys(groupedMessages).sort().reverse();
  const currentViewMessages = groupedMessages[selectedDate] || [];
  const isReadOnly = selectedDate !== todayStr;

  return (
    <div className="flex flex-col h-full w-full relative bg-[#0a0d10]/85 backdrop-blur-2xl overflow-hidden">
      
      {/* NEW: Hamburger History Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="absolute top-4 left-4 md:top-5 md:left-5 z-20 p-2.5 bg-[#13171c]/80 hover:bg-white/[0.1] border border-white/[0.1] rounded-xl text-slate-300 transition-colors shadow-lg backdrop-blur-md"
        title="View Chat History"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* NEW: Sidebar Drawer Overlay */}
      <div className={`absolute inset-0 z-30 transition-transform duration-300 flex ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="w-64 bg-[#13171c]/95 backdrop-blur-3xl border-r border-white/[0.08] shadow-2xl flex flex-col h-full">
          <div className="p-5 border-b border-white/[0.05] flex justify-between items-center">
            <h3 className="font-bold text-slate-200">Chat History</h3>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {sortedDates.map(date => (
              <button
                key={date}
                onClick={() => { setSelectedDate(date); setIsSidebarOpen(false); }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  selectedDate === date 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 border border-transparent'
                }`}
              >
                {date === todayStr ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-black/40 backdrop-blur-sm cursor-pointer" onClick={() => setIsSidebarOpen(false)}></div>
      </div>

      <style>{`
        .dark-scrollbar::-webkit-scrollbar { width: 6px; }
        .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .dark-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .dark-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.1); }
      `}</style>

      {/* Main Chat Display */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pt-20 dark-scrollbar">
        {isReadOnly && (
           <div className="flex justify-center mb-4">
             <span className="px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-bold text-slate-400 uppercase tracking-widest">
               Read Only History
             </span>
           </div>
        )}

        {currentViewMessages.map((msg, idx) => (
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

      {/* Dynamic Input Area */}
      <div className="p-3 md:p-4 bg-transparent border-t border-white/[0.03] shrink-0 z-10">
        {isReadOnly ? (
          <div className="flex items-center justify-center h-12 bg-white/[0.02] border border-white/[0.05] rounded-full text-slate-500 text-sm font-medium">
            Viewing past history. Switch to Today to chat.
          </div>
        ) : (
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
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); cancelRecording(); }}
                  className="p-1.5 mr-3 rounded-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all shrink-0"
                  title="Cancel Recording"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

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
              disabled={isLoading || (!input.trim() && !isRecording) || isUploading}
              className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 rounded-full transition-all disabled:opacity-30 font-bold text-sm tracking-wide shrink-0 h-10 flex items-center"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}