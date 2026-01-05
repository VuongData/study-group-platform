import { useState } from "react";
import { useAuth } from "../context/AuthContext"; // Đường dẫn tuỳ vào project của bạn
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, ArrowRight, Loader2 } from "lucide-react"; // Icon
import { toast } from "react-toastify";
import "./Login.scss";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false); // State để chỉnh đèn

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.warning("Vui lòng nhập đủ thông tin!");
    
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Đăng nhập thành công! 💡");
      navigate("/"); // Chuyển về Dashboard
    } catch (error) {
      console.error(error);
      toast.error("Sai email hoặc mật khẩu!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-lamp-container">
      {/* --- PHẦN 1: CHIẾC ĐÈN (CSS ART) --- */}
      <div className={`lamp-wrapper ${isPasswordFocused ? 'focus-password' : ''}`}>
        <div className="wire"></div>
        <div className="lamp-head">
          <div className="lamp-face">
            <div className="eye left"></div>
            <div className="eye right"></div>
            <div className="mouth"></div>
          </div>
          <div className="light-beam"></div>
        </div>
      </div>

      {/* --- PHẦN 2: FORM --- */}
      <div className="login-box">
        <div className="header">
          <h2>Welcome Back!</h2>
          <p>Đăng nhập để tiếp tục quản lý nhóm</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <div className="icon"><User size={20}/></div>
            <input 
              type="email" 
              placeholder="Email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              // Khi nhập email -> Đèn sáng bình thường
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          <div className="input-group">
            <div className="icon"><Lock size={20}/></div>
            <input 
              type="password" 
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              // Khi nhập pass -> Đèn tắt/tối đi (Hiệu ứng ngộ nghĩnh)
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

        <div className="footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;