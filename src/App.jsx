import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider, useAuth } from './context/AuthContext'

/* --- IMPORT MODULES --- */
import Login from './modules/Auth/Login'
import Register from './modules/Auth/Register' // 👈 Import trang Đăng ký mới
import Dashboard from './modules/Dashboard/Dashboard'
import ChatRoom from './modules/Chat/ChatRoom'
import OPPMManager from './modules/Plan/OPPMManager'
import ResourceHub from './modules/Resource/ResourceHub'
import VideoRoom from './modules/Meeting/VideoRoom'
import AIAssistant from './modules/AI/AIAssistant'

// Component bảo vệ Route (Chưa đăng nhập -> Đá về Login)
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Component con để xử lý Logic hiển thị AI
// (Giúp ẩn AI khi đang ở trong phòng Chat để tránh vướng víu)
const LayoutWithAI = () => {
  const location = useLocation();
  // Nếu đường dẫn bắt đầu bằng /chat thì coi là trang chat
  const isChatPage = location.pathname.startsWith("/chat");

  return (
    <>
      {!isChatPage && <AIAssistant />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer theme="colored" autoClose={2000} />
      
      <Routes>
        {/* --- PUBLIC ROUTES (Không cần đăng nhập) --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} /> {/* 👈 Route Đăng ký */}
        
        {/* --- PROTECTED ROUTES (Phải đăng nhập) --- */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
        <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
        
        {/* Video Call Routes */}
        <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        
        {/* Route không tồn tại -> Về Login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* AI Trợ giảng toàn cục (Chỉ hiển thị khi đã đăng nhập) */}
      <ProtectedRoute>
         <LayoutWithAI /> 
      </ProtectedRoute>

    </AuthProvider>
  )
}

export default App