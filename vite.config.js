import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 👇 THÊM ĐOẠN NÀY ĐỂ SỬA LỖI
  resolve: {
    dedupe: ['react', 'react-dom'], // Ép Vite dùng 1 bản duy nhất
  },
})