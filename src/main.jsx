
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles/global.scss' // File style chung (sẽ tạo sau)
console.log("API Key hiện tại:", import.meta.env.VITE_API_KEY);
console.log("Test biến:", import.meta.env.VITE_TEST_VARIABLE);
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)