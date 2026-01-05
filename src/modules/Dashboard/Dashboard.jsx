// src/modules/Dashboard/Dashboard.jsx
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { MessageSquare, BarChart2, FolderOpen, LogOut, Clock } from "lucide-react"; // Thêm icon FolderOpen
import "./Dashboard.scss";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="welcome-text">
          <h1>Xin chào, {user?.displayName}! 👋</h1>
          <p>Chào mừng bạn quay trở lại không gian làm việc nhóm.</p>
        </div>
        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={18} /> Đăng xuất
        </button>
      </header>

      <div className="modules-grid">
        {/* Module 1: Chat Room */}
        <div className="module-card chat" onClick={() => navigate("/chat")}>
          <div className="icon-wrapper">
            <MessageSquare size={32} />
          </div>
          <h3>Thảo luận (Chat)</h3>
          <p>Trao đổi nhanh, chém gió và cập nhật tình hình dự án.</p>
        </div>

        {/* Module 2: OPPM (Quản lý tiến độ) */}
        <div className="module-card oppm" onClick={() => navigate("/oppm")}>
          <div className="icon-wrapper">
            <BarChart2 size={32} />
          </div>
          <h3>Kế hoạch (OPPM)</h3>
          <p>Theo dõi tiến độ, deadline và chấm điểm thành viên.</p>
        </div>

        {/* Module 3: Kho Tài Liệu (MỚI) */}
        <div className="module-card resources" onClick={() => navigate("/resources")}>
          <div className="icon-wrapper">
            <FolderOpen size={32} />
          </div>
          <h3>Kho Tài Liệu</h3>
          <p>Lưu trữ link, ebook, source code và tài nguyên dự án.</p>
        </div>

        {/* Module 4: Sắp tới - Meeting Minutes */}
        <div className="module-card meeting coming-soon">
           <div className="icon-wrapper">
             <Clock size={32} />
           </div>
           <h3>Biên bản cuộc họp</h3>
           <p>Lưu trữ nội dung họp & phân công task (Sắp ra mắt).</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;