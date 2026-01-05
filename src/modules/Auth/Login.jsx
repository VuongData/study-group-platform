import { useState } from "react";
// Đảm bảo đường dẫn import đúng với cấu trúc dự án của bạn
import { useAuth } from "../../context/AuthContext"; 
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, ArrowRight, Loader2 } from "lucide-react"; 
import { toast } from "react-toastify";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../services/firebase"; 
import "./Login.scss";

// Icon Google (SVG)
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // State hiệu ứng đèn
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLampOn, setIsLampOn] = useState(true); // Trạng thái Bật/Tắt đèn
  const [isPulling, setIsPulling] = useState(false); // Trạng thái đang kéo dây

  const { login } = useAuth();
  const navigate = useNavigate();

  // --- Xử lý kéo dây đèn ---
  const toggleLamp = () => {
    setIsPulling(true); // Kích hoạt animation kéo xuống
    
    // Đợi dây kéo xuống hết rồi mới tắt/bật đèn (cho thật)
    setTimeout(() => {
      setIsLampOn(prev => !prev);
    }, 300);

    // Reset dây về vị trí cũ
    setTimeout(() => {
      setIsPulling(false);
    }, 600);
  };

  // --- Xử lý đăng nhập ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.warning("Vui lòng nhập đủ thông tin!");
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Đăng nhập thành công! 💡");
      navigate("/"); 
    } catch (error) {
      console.error(error);
      toast.error("Sai email hoặc mật khẩu!");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Chào mừng bạn! (Google)");
      navigate("/");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi đăng nhập Google");
    }
  };

  return (
    // Thêm class 'dark-room' nếu đèn tắt để làm tối cả phòng
    <div className={`login-lamp-container ${!isLampOn ? 'dark-room' : ''}`}>
      
      {/* --- PHẦN ĐÈN (CSS ART) --- */}
      <div className={`lamp-wrapper ${isPasswordFocused ? 'focus-password' : ''} ${!isLampOn ? 'lamp-off' : ''}`}>
        <div className="wire"></div>
        <div className="lamp-head">
          <div className="lamp-face">
            <div className="eye left"></div>
            <div className="eye right"></div>
            <div className="mouth"></div>
          </div>
          <div className="light-beam"></div>

          {/* 👇 DÂY KÉO (PULL STRING) MỚI 👇 */}
          <div 
            className={`pull-string ${isPulling ? 'pull-action' : ''}`} 
            onClick={toggleLamp}
            title="Kéo dây để tắt/bật đèn"
          >
            <div className="string-line"></div>
            <div className="string-knob"></div>
          </div>

        </div>
      </div>

      {/* --- FORM ĐĂNG NHẬP --- */}
      <div className="login-box">
        <div className="header">
          <h2>Welcome Back!</h2>
          <p>Đăng nhập để tiếp tục quản lý nhóm</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <div className="icon"><User size={20}/></div>
            <input 
              type="email" placeholder="Email của bạn" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          <div className="input-group">
            <div className="icon"><Lock size={20}/></div>
            <input 
              type="password" placeholder="Mật khẩu" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
            />
          </div>

          <div className="forgot-pass">
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : <>Đăng nhập <ArrowRight size={20}/></>}
          </button>
        </form>

        <div className="divider">
          <span>Hoặc tiếp tục với</span>
        </div>

        <div className="social-login">
          <button className="btn-social google" onClick={handleGoogleLogin}>
            <GoogleIcon /> Đăng nhập bằng Google
          </button>
        </div>

        <div className="footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;