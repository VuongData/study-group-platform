// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ Lưu ý: Vì bạn đang gặp lỗi .env, ta tạm thời Hardcode key vào đây.
// Khi nộp bài nhớ xóa đi hoặc tìm cách fix .env sau nhé.
const API_KEY = "AIzaSyC52b9ca0zGFjj9QSKpGLac_2_xmxHXyjI"; // DÁN KEY GEMINI CỦA BẠN VÀO ĐÂY

const genAI = new GoogleGenerativeAI(API_KEY);

export const askGemini = async (prompt) => {
  try {
    // Sử dụng model Gemini 1.5 Flash (nhanh và rẻ)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lỗi gọi Gemini:", error);
    return "Xin lỗi, AI đang bận hoặc gặp lỗi kết nối. Vui lòng thử lại sau!";
  }
};