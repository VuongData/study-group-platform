import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 👇 THÊM ĐOẠN NÀY
  css: {
    preprocessorOptions: {
      scss: {
        // Cách A: Chuyển sang trình biên dịch hiện đại (nhanh hơn & hết lỗi)
        api: 'modern-compiler', 
        
        // HOẶC Cách B: Nếu cách A lỗi, hãy dùng dòng dưới để tắt cảnh báo
        // silenceDeprecations: ["legacy-js-api"],
      },
    },
  },
})