import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

/* --- IMPORT CÁC MODULE --- */
// Lưu ý: Kiểm tra kỹ folder 'Auth' hay 'auth' trên máy bạn nhé
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register'; 

import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

/* ========================================================= */
/* 🛠️ ĐỊNH NGHĨA CÁC ROUTE GUARD (NGAY TẠI ĐÂY)           */
/* ========================================================= */

// 1. ProtectedRoute: Đã đăng nhập mới được vào
// Nếu chưa -> Đá về Login
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  // Logic: Nếu không có user, chuyển hướng ngay lập tức
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// 2. PublicRoute: Chỉ dành cho người CHƯA đăng nhập (Login/Register)
// Nếu đã đăng nhập mà cố vào -> Đá về Dashboard
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// 3. LayoutWithAI: Logic ẩn hiện trợ lý ảo
const LayoutWithAI = () => {
  const location = useLocation();
  const isHidden = location.pathname.startsWith("/chat") || location.pathname.startsWith("/video-call");
  return !isHidden ? <AIAssistant /> : null;
}

/* ========================================================= */
/* 🚀 MAIN APP                                               */
/* ========================================================= */

function App() {
  return (
    <AuthProvider>
      <ToastContainer theme="colored" autoClose={2000} />
      
      <div className="app-container">
        <Routes>
          {/* --- KHU VỰC PUBLIC --- */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          
          {/* --- KHU VỰC PRIVATE --- */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* --- ROUTE 404/FALLBACK --- */}
          {/* Nếu gõ lung tung, thay vì báo lỗi, ta đưa về Login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>

        {/* AI Assistant - Chỉ hiện khi đã đăng nhập */}
        <ProtectedRoute>
           <LayoutWithAI /> 
        </ProtectedRoute>
      </div>
    </AuthProvider>
  )
}

export default App;