
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/global.scss'
console.log("Chào mừng thầy cô và các bạn đến với đề tài nhóm 5 môn Lập trình Web");
console.log("Nhóm 5 gồm: Trần Thiện Vương, Nguyễn Vũ Huy Bảo, Nguyễn Thanh Cường");
console.log("Đề tài nhóm là: Tạo ra trang web với các tính năng nổi bật cho đồ án nhóm");
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)