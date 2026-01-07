// src/services/aiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyC52b9ca0zGFjj9QSKpGLac_2_xmxHXyjI"; 
const genAI = new GoogleGenerativeAI(API_KEY);

export const askGemini = async (prompt) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Lỗi gọi Gemini:", error);
    return "Xin lỗi, AI đang bận hoặc gặp lỗi kết nối. Vui lòng thử lại sau!";
  }
};