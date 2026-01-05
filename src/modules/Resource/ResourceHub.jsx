// src/modules/Resource/ResourceHub.jsx
import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, where } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { 
  Folder, FileText, Download, Trash2, Search, Filter, 
  ExternalLink, Clock, User 
} from "lucide-react";
import { toast } from "react-toastify";
import "./ResourceHub.scss";

const ResourceHub = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'File từ Chat', 'Tài liệu học', ...

  // 1. LẤY DỮ LIỆU TỪ FIREBASE
  useEffect(() => {
    // Lấy tất cả tài liệu, sắp xếp mới nhất lên đầu
    const q = query(collection(db, "resources"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setResources(fetchedDocs);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi tải tài liệu:", error);
      setLoading(false);
      // Không toast lỗi ở đây để tránh spam nếu user mất mạng
    });

    return () => unsubscribe();
  }, []);

  // 2. XÓA TÀI LIỆU
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa file này không?")) return;
    try {
      await deleteDoc(doc(db, "resources", id));
      toast.success("Đã xóa tài liệu");
    } catch (error) {
      toast.error("Lỗi khi xóa");
    }
  };

  // 3. LỌC TÀI LIỆU (SEARCH + FILTER)
  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          res.uploadedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterType === 'all' || res.category === filterType;

    return matchesSearch && matchesCategory;
  });

  // Lấy danh sách các Category duy nhất để tạo bộ lọc
  const categories = ['all', ...new Set(resources.map(r => r.category || 'Khác'))];

  // Helper: Chọn icon dựa trên loại file (nếu có đuôi file)
  const getFileIcon = (filename) => {
    if (!filename) return <FileText size={40} color="#95a5a6"/>;
    const ext = filename.split('.').pop().toLowerCase();
    if (['doc', 'docx'].includes(ext)) return <FileText size={40} color="#3498db"/>;
    if (['pdf'].includes(ext)) return <FileText size={40} color="#e74c3c"/>;
    if (['xls', 'xlsx'].includes(ext)) return <FileText size={40} color="#27ae60"/>;
    if (['ppt', 'pptx'].includes(ext)) return <FileText size={40} color="#e67e22"/>;
    if (['zip', 'rar'].includes(ext)) return <Folder size={40} color="#f1c40f"/>;
    return <FileText size={40} color="#95a5a6"/>;
  };

  // Helper: Format thời gian an toàn
  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'Vừa xong';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('vi-VN');
  };

  return (
    <div className="resource-hub-container">
      {/* HEADER */}
      <div className="hub-header">
        <div className="title-section">
          <h1>📂 Kho Tài Liệu</h1>
          <p>Nơi lưu trữ tất cả file, tài liệu học tập và file gửi từ Chat.</p>
        </div>
        
        <div className="search-filter-bar">
          <div className="search-box">
            <Search size={18} />
            <input 
              placeholder="Tìm tên file, người gửi..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
            />
          </div>
          
          <div className="filter-box">
            <Filter size={18} />
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Tất cả danh mục' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENT LIST */}
      <div className="resource-grid">
        {loading && <div className="loading-text">Đang tải tài liệu...</div>}
        
        {!loading && filteredResources.length === 0 && (
          <div className="empty-state">
            <Folder size={64} color="#bdc3c7"/>
            <h3>Chưa có tài liệu nào</h3>
            <p>Hãy gửi file vào nhóm Chat hoặc thêm mới tại đây.</p>
          </div>
        )}

        {filteredResources.map((item) => (
          <div key={item.id} className="resource-card">
            <div className="card-top">
              <span className={`badge ${item.category === 'File từ Chat' ? 'chat-badge' : 'doc-badge'}`}>
                {item.category || 'Tài liệu'}
              </span>
              {/* Chỉ người upload hoặc Admin mới được xóa (Demo: cho xóa hết) */}
              <button className="btn-delete" onClick={() => handleDelete(item.id)} title="Xóa">
                <Trash2 size={16}/>
              </button>
            </div>

            <div className="card-icon">
               {getFileIcon(item.title)}
            </div>

            <div className="card-info">
              <h3 title={item.title}>{item.title || "Không có tên"}</h3>
              <div className="meta-row">
                <span title="Người gửi"><User size={12}/> {item.uploadedBy || "Ẩn danh"}</span>
                <span title="Ngày gửi"><Clock size={12}/> {formatDate(item.createdAt)}</span>
              </div>
            </div>

            <div className="card-actions">
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-download"
              >
                <Download size={16}/> Tải xuống
              </a>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-preview"
                title="Xem trước"
              >
                <ExternalLink size={16}/>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourceHub;