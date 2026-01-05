import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowRight } from "lucide-react"; 
import "./Dashboard.scss";

// 👇 1. IMPORT ẢNH TỪ MÁY CỦA BẠN (Đảm bảo đường dẫn đúng nhé)
// Bạn nhớ đổi tên file trong thư mục assets cho khớp với tên dưới đây
import imgChat from "../../assets/dashboard-chat.png";
import imgOppm from "../../assets/dashboard-oppm.png";
import imgDoc from "../../assets/dashboard-doc.png";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const modules = [
    {
      id: 'chat',
      title: "THẢO LUẬN",
      sub: "Chat Room",
      desc: "Trao đổi nhanh dự án.",
      path: "/chat",
      // 👇 2. Gán biến ảnh đã import vào đây
      bgImage: imgChat 
    },
    {
      id: 'oppm',
      title: "KẾ HOẠCH",
      sub: "OPPM Board",
      desc: "Theo dõi tiến độ & deadline.",
      path: "/oppm",
      bgImage: imgOppm
    },
    {
      id: 'resources',
      title: "TÀI NGUYÊN",
      sub: "Documents",
      desc: "Kho lưu trữ tài liệu chung.",
      path: "/resources",
      bgImage: imgDoc
    }
  ];

  return (
    <div className="dashboard-cinematic">
      {/* Background mờ phía sau toàn màn hình */}
      <div className="bg-overlay"></div>

      <div className="content-wrapper">
        <header className="hero-header">
          <div className="welcome-block">
            <span className="sub-greeting">WELCOME BACK</span>
            <h1 className="user-name">{user?.displayName || "Member"}</h1>
            <p className="quote">"Sẵn sàng bứt phá cho đồ án mới chưa?"</p>
          </div>
          
          <button onClick={handleLogout} className="btn-logout-minimal">
            <LogOut size={20} />
            <span>Đăng xuất</span>
          </button>
        </header>

        <div className="cards-section">
          {modules.map((item) => (
            <div 
              key={item.id} 
              className="cinematic-card" 
              onClick={() => navigate(item.path)}
              // 👇 Style này vẫn giữ nguyên, nó sẽ tự nhận ảnh từ biến import
              style={{ backgroundImage: `url(${item.bgImage})` }}
            >
              <div className="card-overlay">
                <div className="card-content">
                  <span className="card-sub">{item.sub}</span>
                  <h3 className="card-title">{item.title}</h3>
                  <div className="hover-reveal">
                    <p>{item.desc}</p>
                    <span className="fake-btn">Truy cập <ArrowRight size={14}/></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;