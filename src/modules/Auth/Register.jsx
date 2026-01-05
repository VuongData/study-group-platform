import { useState } from "react";
import { useAuth } from "../../context/AuthContext"; // Đảm bảo đường dẫn đúng
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react"; 
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../services/firebase"; // Import auth và db
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "./Register.scss"; // File style riêng cho Register

const Register = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // State hiệu ứng đèn (giống Login)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Validate cơ bản
    if (!displayName || !email || !password || !confirmPassword) {
      return toast.warning("Vui lòng nhập đủ thông tin!");
    }

    // 2. Kiểm tra mật khẩu trùng khớp
    if (password !== confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp!");
    }

    if (password.length < 6) {
      return toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
    }

    setLoading(true);

    try {
      // 3. Tạo tài khoản với Firebase Auth
      // Nếu email đã có (kể cả Google), dòng này sẽ throw lỗi 'auth/email-already-in-use'
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Cập nhật tên hiển thị (DisplayName)
      await updateProfile(user, {
        displayName: displayName
      });

      // 5. Lưu thông tin user vào Firestore (để sau này tìm kiếm bạn bè)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: email,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        searchKeywords: generateKeywords(displayName.toLowerCase()) // Hàm phụ để tìm kiếm (tùy chọn)
      });

      toast.success("Đăng ký thành công! Chào mừng bạn 🎉");
      navigate("/"); // Chuyển thẳng vào Dashboard

    } catch (error) {
      console.error("Lỗi đăng ký:", error.code);
      
      // 6. Xử lý lỗi trùng Email theo yêu cầu của bạn
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email này đã được đăng ký tài khoản!");
      } else if (error.code === 'auth/invalid-email') {
        toast.error("Email không hợp lệ!");
      } else {
        toast.error("Đăng ký thất bại. Thử lại sau!");
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm tạo từ khóa tìm kiếm đơn giản (để tìm bạn bè theo tên)
  const generateKeywords = (name) => {
    const arr = [];
    let cur = '';
    name.split('').forEach(letter => {
      cur += letter;
      arr.push(cur);
    });
    return arr;
  };

  return (
    <div className="register-lamp-container">
      {/* --- PHẦN ĐÈN (CSS ART - GIỮ NGUYÊN TỪ LOGIN) --- */}
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

      {/* --- FORM ĐĂNG KÝ --- */}
      <div className="register-box">
        <div className="header">
          <h2>Tạo Tài Khoản</h2>
          <p>Tham gia cùng chúng tôi ngay hôm nay!</p>
        </div>

        <form onSubmit={handleRegister}>
          
          {/* Tên hiển thị */}
          <div className="input-group">
            <div className="icon"><User size={20}/></div>
            <input 
              type="text" placeholder="Tên hiển thị của bạn" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          {/* Email */}
          <div className="input-group">
            <div className="icon"><Mail size={20}/></div>
            <input 
              type="email" placeholder="Email đăng nhập" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          {/* Mật khẩu */}
          <div className="input-group">
            <div className="icon"><Lock size={20}/></div>
            <input 
              type="password" placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)} // Đèn sợ hãi khi nhập pass
              onBlur={() => setIsPasswordFocused(false)}
            />
          </div>

          {/* Xác nhận mật khẩu */}
          <div className="input-group">
            <div className="icon"><CheckCircle size={20}/></div>
            <input 
              type="password" placeholder="Xác nhận mật khẩu" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)} // Đèn sợ hãi khi nhập pass
              onBlur={() => setIsPasswordFocused(false)}
            />
          </div>

          <button type="submit" className="btn-register" disabled={loading}>
            {loading ? <Loader2 className="spin" size={20}/> : <>Đăng ký ngay <ArrowRight size={20}/></>}
          </button>
        </form>

        <div className="footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;