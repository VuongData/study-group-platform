import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';

/* --- IMPORT COMPONENTS --- */
// Lưu ý: Kiểm tra kỹ tên file và thư mục (viết hoa/thường)
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register'; 
import Dashboard from './modules/Dashboard/Dashboard';
import ChatRoom from './modules/Chat/ChatRoom';
import OPPMManager from './modules/Plan/OPPMManager';
import ResourceHub from './modules/Resource/ResourceHub';
import VideoRoom from './modules/Meeting/VideoRoom';
import AIAssistant from './modules/AI/AIAssistant';

/* --- LOGIC BẢO VỆ ROUTE --- */
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  // Nếu chưa đăng nhập -> Đá về Login
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

/* --- LOGIC ROUTE CÔNG KHAI (Ngăn người đã đăng nhập quay lại Login/Register) --- */
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  // Nếu đã đăng nhập -> Đá thẳng vào Dashboard (tránh việc user tò mò quay lại trang login)
  if (user) return <Navigate to="/" replace />;
  return children;
};

const LayoutWithAI = () => {
  const location = useLocation();
  // Ẩn AI ở trang chat và video call để đỡ vướng
  const isHidden = location.pathname.startsWith("/chat") || location.pathname.startsWith("/video-call");
  return !isHidden ? <AIAssistant /> : null;
}

/* --- TRANG 404 DEBUG (Để bắt lỗi không tìm thấy trang) --- */
const NotFoundDebug = () => {
  const location = useLocation();
  return (
    <div style={{ padding: 50, color: 'white', textAlign: 'center', background: '#1a1b26', height: '100vh' }}>
      <h1>⚠️ 404 - Lạc đường rồi!</h1>
      <p>Hệ thống không tìm thấy đường dẫn: <code style={{color: '#00f7ff'}}>{location.pathname}</code></p>
      <p>Hãy kiểm tra lại tên file hoặc đường dẫn import trong code.</p>
      <a href="/login" style={{ color: '#00f7ff' }}>Quay về Login</a>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ToastContainer theme="colored" autoClose={2000} />
      
      {/* Thêm một thẻ div bao ngoài để check xem App có mount không */}
      <div className="app-container">
        <Routes>
          {/* ========================================================= */}
          {/* 1. KHU VỰC PUBLIC (Login, Register)                     */}
          {/* Dùng PublicRoute để bọc kỹ hơn                       */}
          {/* ========================================================= */}
          <Route path="/login" element={
            <PublicRoute><Login /></PublicRoute>
          } />
          
          <Route path="/register" element={
            <PublicRoute><Register /></PublicRoute>
          } />
          
          {/* ========================================================= */}
          {/* 2. KHU VỰC PRIVATE (Phải đăng nhập mới vào được)        */}
          {/* ========================================================= */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatRoom /></ProtectedRoute>} />
          <Route path="/oppm" element={<ProtectedRoute><OPPMManager /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><ResourceHub /></ProtectedRoute>} />
          <Route path="/video-call" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          <Route path="/video-call/:roomId" element={<ProtectedRoute><VideoRoom /></ProtectedRoute>} />
          
          {/* ========================================================= */}
          {/* 3. DEBUG MODE: Thay vì Navigate, ta hiện trang 404      */}
          {/* Nếu bạn thấy trang này khi bấm Register -> Lỗi Import*/}
          {/* ========================================================= */}
          <Route path="*" element={<NotFoundDebug />} />
        </Routes>

        <ProtectedRoute>
           <LayoutWithAI /> 
        </ProtectedRoute>
      </div>

    </AuthProvider>
  )
}

export default App;