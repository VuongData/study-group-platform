import { useState } from "react";
// Bỏ import Link, import ArrowLeft
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase"; 
import { toast } from "react-toastify";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import "./Login.scss"; 

// 👇 Nhận prop onBackToLogin
const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return toast.warning("Vui lòng nhập email!");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Đã gửi link! Kiểm tra email nhé.");
      
      // Gửi xong thì tự động quay về trang login cho tiện
      setTimeout(() => {
        onBackToLogin();
      }, 3000);
      
    } catch (error) {
      console.error(error);
      toast.error("Lỗi: " + error.code);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Dùng chung class container với Login để lấy background
    <div className="login-lamp-container dark-room">
      {/* Dùng chung class login-box để lấy style cái hộp */}
      <div className="login-box" style={{ marginTop: '280px' }}> 
        <div className="header">
          <h2>Quên mật khẩu?</h2>
          <p>Nhập email để nhận link khôi phục.</p>
        </div>

        <form onSubmit={handleResetPassword}>
          <div className="input-group">
            <div className="icon"><Mail size={20}/></div>
            <input 
              type="email" placeholder="Email đăng ký" value={email}
              onChange={(e) => setEmail(e.target.value)} autoFocus
              style={{ paddingLeft: '50px' }} // Fix CSS inline cho nhanh
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : "Gửi link khôi phục"}
          </button>
        </form>

        <div className="footer">
          {/* 👇 Nút quay lại Login */}
          <button 
            onClick={onBackToLogin}
            style={{ 
              background: 'none', border: 'none', color: '#00f7ff', 
              cursor: 'pointer', display: 'flex', alignItems: 'center', 
              gap: '5px', margin: '0 auto', fontSize: '0.95rem'
            }}
          >
            <ArrowLeft size={16} /> Quay lại Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;