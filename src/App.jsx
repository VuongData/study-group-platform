import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

/* --- IMPORT COMPONENTS --- */
// ⚠️ LƯU Ý QUAN TRỌNG: Hãy kiểm tra kỹ tên thư mục là 'Auth' hay 'auth' 
// để sửa dòng import dưới đây cho khớp 100% với tên thư mục thật trên máy.
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register'; 

import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

/* ========================================================= */
/* 🛡️ CÁC COMPONENT BẢO VỆ ROUTE (GUARDS)                 */
/* ========================================================= */

// 1. ProtectedRoute: Chỉ cho phép người ĐÃ đăng nhập vào
// Nếu chưa đăng nhập -> Đá về Login
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// 2. PublicRoute: Chỉ cho phép người CHƯA đăng nhập vào (Login, Register)
// Nếu đã đăng nhập mà cố vào Login -> Đá thẳng vào Dashboard
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return children;
};

// 3. LayoutWithAI: Logic ẩn/hiện trợ lý AI
const LayoutWithAI = () => {
  const location = useLocation();
  // Ẩn AI ở trang chat và video call để tránh che mất nội dung
  const isHidden = location.pathname.startsWith("/chat") || location.pathname.startsWith("/video-call");
  return !isHidden ? <AIAssistant /> : null;
}

// 4. NotFoundDebug: Trang 404 để bắt lỗi (Thay vì redirect ẩn)
const NotFoundDebug = () => {
  const location = useLocation();
  return (
    <div style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', 
      background: '#1a1b26', color: '#fff', fontFamily: 'sans-serif' 
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>⚠️ 404</h1>
      <h2 style={{ color: '#ff4d4f' }}>Không tìm thấy trang này!</h2>
      <p style={{ marginTop: '20px', fontSize: '1.2rem' }}>
        Đường dẫn hiện tại: <code style={{ background: '#333', padding: '5px 10px', borderRadius: '5px', color: '#00f7ff' }}>{location.pathname}</code>
      </p>
      <p style={{ color: '#a0aec0' }}>Nếu bạn đang cố vào trang Đăng ký, hãy kiểm tra lại code import.</p>
      <a href="/login" style={{ marginTop: '30px', color: '#00f7ff', textDecoration: 'underline' }}>Quay về Đăng nhập</a>
    </div>
  );
};

/* ========================================================= */
/* 🚀 MAIN APP COMPONENT                                     */
/* ========================================================= */

function App() {
  return (
    <AuthProvider>
      <ToastContainer theme="colored" autoClose={2000} />
      
      {/* Container bao ngoài để đảm bảo layout */}
      <div className="app-container">
        <Routes>
          {/* --- KHU VỰC PUBLIC (Dành cho khách) --- */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          
          {/* --- KHU VỰC PRIVATE (Dành cho thành viên) --- */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          
          {/* Video Call Routes */}
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* --- ROUTE MẶC ĐỊNH (CATCH-ALL) --- */}
          {/* Thay vì Navigate to="/login", ta hiện trang 404 để debug */}
          <Route path="*" element={<NotFoundDebug />} />
        </Routes>

        {/* AI Assistant (Chỉ hiện khi đã đăng nhập) */}
        <ProtectedRoute>
           <LayoutWithAI /> 
        </ProtectedRoute>
      </div>

    </AuthProvider>
  )
}

export default App;