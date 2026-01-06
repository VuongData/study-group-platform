import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import các Module
import AuthPage from './modules/Auth/AuthPage';
import ForgotPassword from './modules/Auth/ForgotPassword'; // Nhớ import trang này

import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

// Guard: Chỉ cho phép người ĐÃ đăng nhập
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

// Guard: Chỉ cho phép người CHƯA đăng nhập (Khách)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

const LayoutWithAI = () => {
  const location = useLocation();
  const isHidden = location.pathname.startsWith("/chat") || location.pathname.startsWith("/video-call");
  return !isHidden ? <AIAssistant /> : null;
}

function App() {
  return (
    <AuthProvider>
      <ToastContainer theme="colored" autoClose={2000} />
      <div className="app-container">
        <Routes>
          {/* --- KHU VỰC PUBLIC (Khách) --- */}
          
          {/* Route tổng hợp Login/Register */}
          <Route path="/auth" element={
            <PublicRoute><AuthPage /></PublicRoute>
          } />

          {/* Route Quên mật khẩu riêng biệt */}
          <Route path="/forgot-password" element={
            <PublicRoute><ForgotPassword /></PublicRoute>
          } />

          {/* Redirect các link cũ */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* --- KHU VỰC PRIVATE (Thành viên) --- */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* Route mặc định: Về Auth nếu không tìm thấy */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>

        <ProtectedRoute>
           <LayoutWithAI /> 
        </ProtectedRoute>
      </div>
    </AuthProvider>
  )
}

export default App;