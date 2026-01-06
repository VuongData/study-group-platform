import { useState } from "react";
// Import các icons cần thiết
import { User, Lock, Mail, ArrowRight, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react"; 
import { toast } from "react-toastify";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "./Register.scss";

// Nhận props điều hướng từ cha
const Register = ({ onSwitchToLogin }) => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // State quản lý 2 ô mật khẩu riêng biệt
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      // Logic xử lý tiếp theo do AuthContext lo

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
          <div className="input-group">
            <div className="icon"><User size={20}/></div>
            <input type="text" placeholder="Tên hiển thị" value={displayName} onChange={(e) => setDisplayName(e.target.value)} onFocus={() => setIsPasswordFocused(false)}/>
          </div>
          <div className="input-group">
            <div className="icon"><Mail size={20}/></div>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsPasswordFocused(false)}/>
          </div>
          
          {/* Ô Mật khẩu 1 */}
          <div className="input-group">
            <div className="icon"><Lock size={20}/></div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}
            />
            <button type="button" className="btn-toggle-password" tabIndex="-1" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
          </div>

          {/* Ô Mật khẩu 2 (Xác nhận) */}
          <div className="input-group">
            <div className="icon"><CheckCircle size={20}/></div>
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Xác nhận mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} onBlur={() => setIsPasswordFocused(false)}
            />
            <button type="button" className="btn-toggle-password" tabIndex="-1" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
              {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
            </button>
          </div>

          <button type="submit" className="btn-register" disabled={loading}>{loading ? <Loader2 className="spin" size={20}/> : <>Đăng ký ngay <ArrowRight size={20}/></>}</button>
        </form>

        <div className="footer">
          Đã có tài khoản? 
          <button onClick={onSwitchToLogin}>Đăng nhập</button>
        </div>
      </div>
    </div>
  );
};

export default Register;