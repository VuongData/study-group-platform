import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';

// Import trang AuthPage mới tạo
import AuthPage from './modules/Auth/AuthPage';

import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

// Guard: Đã đăng nhập mới được vào trong
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

// Guard: Chưa đăng nhập mới được vào trang Auth
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
          {/* 👇 GỘP CHUNG LOGIN VÀ REGISTER VÀO MỘT ROUTE DUY NHẤT */}
          <Route path="/auth" element={
            <PublicRoute><AuthPage /></PublicRoute>
          } />

          {/* Redirect các đường dẫn cũ về /auth */}
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/register" element={<Navigate to="/auth" replace />} />
          
          {/* Các Route bảo vệ */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* Route 404 về Auth */}
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