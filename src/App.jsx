import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

/* --- 1. IMPORT MODULES --- */
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register'; // 👈 BẮT BUỘC PHẢI CÓ DÒNG NÀY
import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

// Component bảo vệ Route (Chưa đăng nhập -> Đá về Login)
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Component con để xử lý Logic hiển thị AI
const LayoutWithAI = () => {
  const location = useLocation();
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
        {/* --- 2. PUBLIC ROUTES (Ai cũng vào được) --- */}
        <Route path="/login" element={<Login />} />
        
        {/* 👇 QUAN TRỌNG: Thêm dòng này để bấm nút Đăng Ký nó biết đường chạy */}
        <Route path="/register" element={<Register />} /> 
        
        {/* --- 3. PROTECTED ROUTES (Phải đăng nhập) --- */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
        <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
        
        {/* Video Call Routes */}
        <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        
        {/* 4. Route mặc định: Nếu link sai -> Đá về Login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* AI Trợ giảng */}
      <ProtectedRoute>
         <LayoutWithAI /> 
      </ProtectedRoute>

    </AuthProvider>
  )
}

export default App;