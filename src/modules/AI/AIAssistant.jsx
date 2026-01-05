// src/modules/AI/AIAssistant.jsx
import { useState, useRef, useEffect } from "react";
import OpenAI from "openai"; // 👈 Dùng thư viện OpenAI để gọi DeepSeek
import { MessageSquare, X, Send, Loader2, Bot, Sparkles } from "lucide-react";
import "./AIAssistant.scss";

const AIAssistant = ({ isInline = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Chào bạn! Mình là DeepSeek AI. Mình có thể giúp gì cho bài tập của bạn hôm nay? 🚀" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll xuống cuối
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1. Kiểm tra Key
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: "assistant", content: "Lỗi: Chưa có API Key DeepSeek trong file .env!" }]);
      return;
    }

    // 2. Thêm tin nhắn user vào list
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // 3. Khởi tạo Client DeepSeek
      const openai = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true // Bắt buộc khi chạy ở Frontend React
      });

      // 4. Gọi API
      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "Bạn là một trợ lý học tập thông minh, vui tính. Hãy trả lời ngắn gọn, format đẹp (dùng Markdown) và dùng emoji. Bạn hỗ trợ sinh viên giải bài tập và code." 
          },
          ...messages, // Gửi kèm lịch sử chat cũ
          userMsg
        ],
        model: "deepseek-chat", // Model V3 mới nhất
        temperature: 0.7,
      });

      // 5. Lấy phản hồi
      const aiResponse = completion.choices[0].message.content;
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiResponse }
      ]);

    } catch (error) {
      console.error("DeepSeek Error:", error);
      let errorMsg = "Xin lỗi, DeepSeek đang bị quá tải hoặc hết tiền. 😢";
      if (error.message.includes("401")) errorMsg = "Sai API Key rồi bạn ơi!";
      
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- GIAO DIỆN (Giữ nguyên style cũ) ---
  const renderContent = () => (
    <>
      <div className="ai-header">
        <div className="ai-title"><Bot size={20}/> <span>DeepSeek Assistant</span></div>
        <button onClick={() => setIsOpen(false)}><X size={18}/></button>
      </div>
      <div className="ai-body">
        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-msg ${msg.role}`}>
            {msg.role === 'assistant' && <div className="ai-avatar"><Bot size={16}/></div>}
            <div className="msg-bubble">{msg.content}</div>
          </div>
        ))}
        {isLoading && <div className="ai-loading"><Loader2 className="spin" size={16}/> DeepSeek đang suy nghĩ...</div>}
        <div ref={messagesEndRef}></div>
      </div>
      <form onSubmit={handleSendMessage} className="ai-input">
        <input 
          placeholder="Hỏi DeepSeek gì đó..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          autoFocus
        />
        <button type="submit" disabled={isLoading}><Send size={16}/></button>
      </form>
    </>
  );

  if (isInline) {
    return (
      <>
        <button className="btn-icon ai-trigger" onClick={() => setIsOpen(true)} title="Hỏi DeepSeek AI">
          <Sparkles size={20} color="#8e44ad" />
        </button>
        {isOpen && (
          <div className="ai-modal-overlay" onClick={() => setIsOpen(false)}>
            <div className="ai-window inline-mode" onClick={(e) => e.stopPropagation()}>
               {renderContent()}
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={`ai-assistant-container ${isOpen ? "open" : "closed"}`}>
      {!isOpen && (
        <button className="ai-toggle-btn" onClick={() => setIsOpen(true)}>
          <Bot size={28} />
        </button>
      )}
      {isOpen && <div className="ai-window">{renderContent()}</div>}
    </div>
  );
};

export default AIAssistant;