import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react"; 
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "./Register.scss";

const Register = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // --- STATE HIỆU ỨNG ĐÈN (Mới thêm) ---
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isLampOn, setIsLampOn] = useState(true); // Trạng thái đèn
  const [isPulling, setIsPulling] = useState(false); // Trạng thái kéo dây
  
  const navigate = useNavigate();

  // --- HÀM KÉO DÂY (Giống Login) ---
  const toggleLamp = () => {
    setIsPulling(true);
    setTimeout(() => setIsLampOn(prev => !prev), 300);
    setTimeout(() => setIsPulling(false), 600);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!displayName || !email || !password || !confirmPassword) {
      return toast.warning("Vui lòng nhập đủ thông tin!");
    }
    if (password !== confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp!");
    }
    if (password.length < 6) {
      return toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: displayName });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: displayName,
        email: email,
        photoURL: user.photoURL || null,
        createdAt: serverTimestamp(),
        searchKeywords: generateKeywords(displayName.toLowerCase())
      });

      toast.success("Đăng ký thành công! Chào mừng bạn 🎉");
      navigate("/");

    } catch (error) {
      console.error("Lỗi đăng ký:", error.code);
      if (error.code === 'auth/email-already-in-use') {
        toast.error("Email này đã được đăng ký!");
      } else {
        toast.error("Đăng ký thất bại. Thử lại sau!");
      }
    } finally {
      setLoading(false);
    }
  };

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
    // Thêm class dark-room khi tắt đèn
    <div className={`register-lamp-container ${!isLampOn ? 'dark-room' : ''}`}>
      
      {/* --- PHẦN ĐÈN (Đã thêm dây kéo & logic tắt) --- */}
      <div className={`lamp-wrapper ${isPasswordFocused ? 'focus-password' : ''} ${!isLampOn ? 'lamp-off' : ''}`}>
        <div className="wire"></div>
        <div className="lamp-head">
          <div className="lamp-face">
            <div className="eye left"></div>
            <div className="eye right"></div>
            <div className="mouth"></div>
          </div>
          <div className="light-beam"></div>

          {/* 👇 DÂY KÉO CÔNG TẮC 👇 */}
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

      {/* --- FORM ĐĂNG KÝ --- */}
      <div className="register-box">
        <div className="header">
          <h2>Tạo Tài Khoản</h2>
          <p>Tham gia cùng chúng tôi ngay hôm nay!</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <div className="icon"><User size={20}/></div>
            <input 
              type="text" placeholder="Tên hiển thị" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          <div className="input-group">
            <div className="icon"><Mail size={20}/></div>
            <input 
              type="email" placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setIsPasswordFocused(false)} 
            />
          </div>

          <div className="input-group">
            <div className="icon"><Lock size={20}/></div>
            <input 
              type="password" placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
            />
          </div>

          <div className="input-group">
            <div className="icon"><CheckCircle size={20}/></div>
            <input 
              type="password" placeholder="Xác nhận mật khẩu" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setIsPasswordFocused(true)}
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