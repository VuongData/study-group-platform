import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

/* --- IMPORT CÁC MODULE --- */
// 👇 QUAN TRỌNG: Chỉ import AuthPage, không import Login/Register lẻ tẻ ở đây nữa
import AuthPage from './modules/Auth/AuthPage'; 

import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

/* ========================================================= */
/* 🛡️ CÁC COMPONENT BẢO VỆ ROUTE (GUARDS)                 */
/* ========================================================= */

// 1. ProtectedRoute: Chỉ cho phép người ĐÃ đăng nhập
// Nếu chưa đăng nhập -> Đá về trang Auth
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

// 2. PublicRoute: Chỉ cho phép người CHƯA đăng nhập
// Nếu đã đăng nhập -> Đá vào Dashboard (tránh lặp lại login)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

// 3. Logic ẩn hiện AI Assistant
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
          {/* ========================================================= */}
          {/* KHU VỰC PUBLIC (Khách)                                  */}
          {/* ========================================================= */}
          
          {/* 👇 Route duy nhất xử lý Login/Register/Forgot Pass */}
          <Route path="/auth" element={
            <PublicRoute><AuthPage /></PublicRoute>
          } />

          {/* Redirect các đường dẫn cũ về /auth để tránh lỗi 404 */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/auth" replace />} />
          
          {/* ========================================================= */}
          {/* KHU VỰC PRIVATE (Thành viên)                            */}
          {/* ========================================================= */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* Route Catch-all: Gõ linh tinh thì về Auth */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
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