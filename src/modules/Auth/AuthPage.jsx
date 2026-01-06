import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword'; // Import thêm file này

const AuthPage = () => {
  // Thay vì true/false, ta dùng string để quản lý 3 trạng thái:
  // 'login' | 'register' | 'forgot'
  const [view, setView] = useState('login');

  return (
    <>
      {/* TRƯỜNG HỢP 1: ĐĂNG KÝ */}
      {view === 'register' && (
        <Register 
          onSwitchToLogin={() => setView('login')} 
        />
      )}

      {/* TRƯỜNG HỢP 2: QUÊN MẬT KHẨU */}
      {view === 'forgot' && (
        <ForgotPassword 
          onBackToLogin={() => setView('login')} 
        />
      )}

      {/* TRƯỜNG HỢP 3: ĐĂNG NHẬP (Mặc định) */}
      {view === 'login' && (
        <Login 
          onSwitchToRegister={() => setView('register')}
          onSwitchToForgot={() => setView('forgot')} // Truyền thêm hàm chuyển sang quên pass
        />
      )}
    </>
  );
};

export default AuthPage;