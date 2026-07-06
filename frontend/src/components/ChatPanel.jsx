import React, { useState, useRef, useEffect } from 'react';
import api from '../api';

export default function ChatPanel({ onInputFocus, refreshTrigger }) { // 1. Added refreshTrigger
  const [messages, setMessages] = useState([
    { role: 'model', text_content: 'Hello! I am HealthSync. How can I help you with your diet and tracking today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 2. NEW FUNCTION: Fetch history from database
  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/chat/history/'); 
      
      // If we have messages in the database, overwrite the default greeting
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  };

  // 3. NEW EFFECT: Runs on load AND whenever refreshTrigger changes
  useEffect(() => {
    fetchChatHistory();
  }, [refreshTrigger]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', text_content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await api.post('/chat/stream/', { text_content: userMessage.text_content });
      const aiMessage = { role: 'model', text_content: response.data.ai_response.text_content };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'model', text_content: 'Sorry, I encountered an error connecting to the server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-slate-50/50 md:bg-white overflow-hidden">
      
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 pt-16 md:pt-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[20px] px-5 py-3.5 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-sm shadow-md shadow-emerald-200/50' 
                : 'bg-white border border-slate-100 text-slate-700 rounded-bl-sm shadow-sm'
            }`}>
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">{msg.text_content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-[20px] rounded-bl-sm px-5 py-4 shadow-sm flex items-center h-10 space-x-1.5">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-75"></div>
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Message Box */}
      <div className="p-3 md:p-4 bg-white border-t border-slate-100 shrink-0 z-10">
        <form onSubmit={handleSend} className="flex bg-slate-50 shadow-inner border border-slate-200 rounded-full p-1.5 items-center focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-300 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={onInputFocus}
            placeholder="Message HealthSync..."
            className="flex-1 px-4 py-2 bg-transparent outline-none text-slate-800 placeholder-slate-400 text-[15px] font-medium"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-full transition-all disabled:opacity-50 disabled:grayscale font-bold ml-2 text-sm tracking-wide shadow-md shadow-emerald-200"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}