import { useState } from 'react';
import Login from './Login';
import Register from './Register';

const AuthPage = () => {
  // false = Hiện Login, true = Hiện Register
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  return (
    <>
      {isRegisterMode ? (
        // Hiện form Đăng ký, truyền hàm để quay về Login
        <Register onSwitchToLogin={() => setIsRegisterMode(false)} />
      ) : (
        // Hiện form Đăng nhập, truyền hàm để sang Đăng ký
        <Login onSwitchToRegister={() => setIsRegisterMode(true)} />
      )}
    </>
  );
};

export default AuthPage;