// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";
import { toast } from "react-toastify";

// 1. Tạo Context (Kho chứa dữ liệu chung)
const AuthContext = createContext();

// 2. Custom Hook để các component con dễ dàng gọi dữ liệu
// Thay vì dùng useContext(AuthContext) dài dòng, ta chỉ cần gọi useAuth()
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Provider (Nhà cung cấp dữ liệu)
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Hàm đăng nhập Google
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("Đăng nhập thành công! 🚀");
    } catch (error) {
      toast.error("Lỗi đăng nhập: " + error.message);
    }
  };

  // Hàm đăng xuất
  const logout = async () => {
    try {
      await signOut(auth);
      toast.info("Đã đăng xuất 👋");
    } catch (error) {
      toast.error("Lỗi đăng xuất");
    }
  };

  // Lắng nghe trạng thái user (Real-time Listener)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false); // Đã tải xong thông tin user
    });
    return () => unsubscribe(); // Cleanup function (Hủy lắng nghe khi unmount)
  }, []);

  // Dữ liệu muốn chia sẻ cho toàn App
  const value = {
    user,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} {/* Chỉ hiển thị App khi đã check xong user */}
    </AuthContext.Provider>
  );
};