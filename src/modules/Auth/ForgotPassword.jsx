import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../services/firebase"; // Nhớ trỏ đúng đường dẫn firebase
import { toast } from "react-toastify";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import "./Login.scss"; // Tận dụng luôn CSS của trang Login cho đẹp

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!email) return toast.warning("Vui lòng nhập email của bạn!");

    setLoading(true);
    try {
      // Hàm này của Firebase sẽ gửi 1 email chứa link reset pass
      await sendPasswordResetEmail(auth, email);
      
      toast.success("Đã gửi link khôi phục! Hãy kiểm tra hộp thư đến (hoặc Spam).");
      setEmail(""); // Xóa ô nhập cho sạch
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/user-not-found') {
        toast.error("Email này chưa đăng ký tài khoản nào!");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Email không hợp lệ!");
      } else {
        toast.error("Có lỗi xảy ra, vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-lamp-container dark-room">
      {/* Không cần hiện đèn ở trang này cho đỡ rối, hoặc giữ tùy bạn */}
      
      <div className="login-box" style={{ marginTop: '100px' }}> {/* Style inline chỉnh riêng cho trang này */}
        <div className="header">
          <h2>Quên mật khẩu?</h2>
          <p>Nhập email để nhận đường dẫn đặt lại mật khẩu mới.</p>
        </div>

        <form onSubmit={handleResetPassword}>
          <div className="input-group">
            <div className="icon"><Mail size={20}/></div>
            <input 
              type="email" 
              placeholder="Nhập email của bạn" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : "Gửi link khôi phục"}
          </button>
        </form>

        <div className="footer">
          <Link to="/auth" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', textDecoration: 'none', color: '#00f7ff' }}>
            <ArrowLeft size={16} /> Quay lại Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;