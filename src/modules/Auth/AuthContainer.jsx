import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import { motion, AnimatePresence } from 'framer-motion'; // (Tùy chọn: Để chuyển cảnh mượt hơn)

const AuthContainer = () => {
  // Logic: Biến trạng thái để xác định đang xem form nào
  // false = Login, true = Register
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Hàm chuyển đổi trạng thái (truyền xuống component con)
  const toggleMode = () => setIsRegisterMode((prev) => !prev);

  return (
    <div className="auth-container-wrapper">
      {/* Logic hiển thị: 
         Chúng ta truyền hàm toggleMode xuống để nút bấm bên trong 
         có thể gọi ngược lên cha để đổi giao diện 
      */}
      
      {isRegisterMode ? (
        // Nếu là mode đăng ký -> Hiện form Register
        // Key giúp React nhận biết đây là element mới để remount (quan trọng cho animation)
        <Register key="register" onSwitchToLogin={toggleMode} />
      ) : (
        // Ngược lại -> Hiện form Login
        <Login key="login" onSwitchToRegister={toggleMode} />
      )}
    </div>
  );
};

export default AuthContainer;