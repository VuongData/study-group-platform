// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom' // 👈 Import useLocation
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider, useAuth } from './context/AuthContext'

import Login from './modules/Auth/Login'
import Dashboard from './modules/Dashboard/Dashboard'
import ChatRoom from './modules/Chat/ChatRoom'
import OPPMManager from './modules/Plan/OPPMManager'
import ResourceHub from './modules/Resource/ResourceHub'
import VideoRoom from './modules/Meeting/VideoRoom'
import AIAssistant from './modules/AI/AIAssistant'

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
};

// Component con để xử lý Logic hiển thị AI
const LayoutWithAI = () => {
  const location = useLocation();
  // Ẩn AI toàn cục nếu đang ở trang /chat (vì trang chat đã có nút riêng trên header)
  const isChatPage = location.pathname === "/chat";

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
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
        <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
        <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
        
        <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* AI Trợ giảng toàn cục (Được kiểm soát hiển thị) */}
      <ProtectedRoute>
         <LayoutWithAI /> 
      </ProtectedRoute>

    </AuthProvider>
  )
}

export default App