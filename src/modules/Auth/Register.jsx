import { useState } from "react";
import { User, Lock, Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react"; 
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "./Register.scss";

// 👇 NHẬN PROP onSwitchToLogin TỪ TRANG CHA
const Register = ({ onSwitchToLogin }) => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!displayName || !email || !password || !confirmPassword) return toast.warning("Nhập đủ thông tin!");
    if (password !== confirmPassword) return toast.error("Mật khẩu không khớp!");
    if (password.length < 6) return toast.error("Mật khẩu > 6 ký tự!");

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: displayName });
      
      const generateKeywords = (name) => {
        const arr = []; let cur = '';
        name.split('').forEach(letter => { cur += letter; arr.push(cur); });
        return arr;
      };

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid, displayName: displayName, email: email,
        photoURL: user.photoURL || null, createdAt: serverTimestamp(),
        searchKeywords: generateKeywords(displayName.toLowerCase())
      });

      toast.success("Đăng ký thành công! Đang đăng nhập...");
      // Không cần navigate, hệ thống AuthContext sẽ tự nhận diện user mới và chuyển vào Dashboard

    } catch (error) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') toast.error("Email đã tồn tại!");
      else toast.error("Lỗi đăng ký!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-lamp-container">
      <div className={`lamp-wrapper ${isPasswordFocused ? 'focus-password' : ''}`}>
        <div className="wire"></div>
        <div className="lamp-head">
          <div className="lamp-face"><div className="eye left"></div><div className="eye right"></div><div className="mouth"></div></div>
          <div className="light-beam"></div>
        </div>
      </div>

      <div className="register-box">
        <div className="header"><h2>Tạo Tài Khoản</h2><p>Tham gia cùng chúng tôi!</p></div>
        <form onSubmit={handleRegister}>
          <div className="input-group"><div className="icon"><User size={20}/></div><input type="text" placeholder="Tên hiển thị" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onFocus={() => setIsPasswordFocused(false)}/></div>
          <div className="input-group"><div className="icon"><Mail size={20}/></div><input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsPasswordFocused(false)}/></div>
          <div className="input-group"><div className="icon"><Lock size={20}/></div><input type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}/></div>
          <div className="input-group"><div className="icon"><CheckCircle size={20}/></div><input type="password" placeholder="Xác nhận mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}/></div>
          <button type="submit" className="btn-register" disabled={loading}>{loading ? <Loader2 className="spin" size={20}/> : <>Đăng ký ngay <ArrowRight size={20}/></>}</button>
        </form>

        {/* 👇 SỬA PHẦN NÀY: NÚT QUAY VỀ LOGIN */}
        <div className="footer">
          Đã có tài khoản? 
          <button 
            onClick={onSwitchToLogin} 
            style={{ 
               background: 'none', border: 'none', color: '#bd34fe', 
               fontWeight: 'bold', cursor: 'pointer', marginLeft: '5px', fontSize: '0.9rem' 
            }}
          >
            Đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;