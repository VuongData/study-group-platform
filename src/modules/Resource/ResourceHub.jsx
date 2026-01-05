import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../services/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { 
  Folder, FileText, Image as ImageIcon, Download, 
  Search, Users, MessageCircle, Clock, Grid, List 
} from "lucide-react";
import "./ResourceHub.scss";

const ResourceHub = () => {
  const { user } = useAuth();
  
  // State
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // 'all', 'image', 'document'
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'list'
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Lấy danh sách phòng chat của User
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chat_rooms"), 
      where("members", "array-contains", user.uid), 
      orderBy("updatedAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const roomList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRooms(roomList);
      // Mặc định chọn phòng đầu tiên
      if (roomList.length > 0 && !selectedRoom) {
        setSelectedRoom(roomList[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Lấy File từ phòng đã chọn
  useEffect(() => {
    if (!selectedRoom) return;
    setIsLoading(true);

    // Query messages có fileUrl trong phòng này
    // Lưu ý: Cần index (roomId + createdAt) trong Firestore nếu dữ liệu lớn
    const q = query(
      collection(db, "messages"),
      where("roomId", "==", selectedRoom.id),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fileMsgs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Chỉ lấy tin nhắn có file
        if (data.fileUrl) {
          fileMsgs.push({ id: doc.id, ...data });
        }
      });
      setFiles(fileMsgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  // Helpers
  const getRoomName = (room) => {
    if (room.type === 'group') return room.name;
    const otherId = room.members.find(id => id !== user.uid);
    return `Chat riêng (${otherId?.slice(0, 5)}...)`;
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = (f.fileName || "File").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || f.fileType === activeTab;
    return matchesSearch && matchesTab;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("vi-VN");
  };

  return (
    <div className="resource-hub-container">
      
      {/* SIDEBAR: DANH SÁCH NHÓM */}
      <div className="res-sidebar">
        <div className="res-header">
          <h3>🗂️ Kho Tài Liệu</h3>
          <p className="subtitle">Quản lý file theo nhóm</p>
        </div>
        <div className="room-list">
          {rooms.map(room => (
            <div 
              key={room.id} 
              className={`room-item ${selectedRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => setSelectedRoom(room)}
            >
              <div className="icon">
                {room.type === 'group' ? <Users size={18}/> : <MessageCircle size={18}/>}
              </div>
              <div className="info">
                <span className="name">{getRoomName(room)}</span>
                <span className="type">{room.type === 'group' ? 'Nhóm' : 'Cá nhân'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT: FILE GRID */}
      <div className="res-main">
        {selectedRoom ? (
          <>
            {/* HEADER TOOLBAR */}
            <div className="main-toolbar">
              <div className="title-section">
                <h2>{getRoomName(selectedRoom)}</h2>
                <span className="file-count">{files.length} tệp tin</span>
              </div>
              
              <div className="actions-section">
                <div className="search-box">
                  <Search size={16}/>
                  <input 
                    placeholder="Tìm tên file..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="filter-tabs">
                  <button className={activeTab==='all'?'active':''} onClick={()=>setActiveTab('all')}>Tất cả</button>
                  <button className={activeTab==='image'?'active':''} onClick={()=>setActiveTab('image')}>Ảnh</button>
                  <button className={activeTab==='document'?'active':''} onClick={()=>setActiveTab('document')}>Văn bản</button>
                </div>

                <div className="view-toggle">
                  <button className={viewMode==='grid'?'active':''} onClick={()=>setViewMode('grid')}><Grid size={18}/></button>
                  <button className={viewMode==='list'?'active':''} onClick={()=>setViewMode('list')}><List size={18}/></button>
                </div>
              </div>
            </div>

            {/* FILE DISPLAY AREA */}
            <div className={`file-content-area ${viewMode}`}>
              {isLoading ? (
                <div className="loading">Đang tải tài liệu...</div>
              ) : filteredFiles.length === 0 ? (
                <div className="empty-state">
                  <Folder size={48} />
                  <p>Không có tài liệu nào trong nhóm này.</p>
                </div>
              ) : (
                filteredFiles.map(file => (
                  <div key={file.id} className="file-card">
                    {/* PREVIEW */}
                    <div className="file-preview" onClick={() => window.open(file.fileUrl, '_blank')}>
                      {file.fileType === 'image' ? (
                        <img src={file.fileUrl} alt="preview" />
                      ) : (
                        <div className="doc-icon"><FileText size={40}/></div>
                      )}
                    </div>

                    {/* INFO */}
                    <div className="file-info">
                      <div className="top-row">
                        <span className="file-name" title={file.fileName || "Ảnh"}>
                          {file.fileName || (file.fileType === 'image' ? 'Hình ảnh' : 'Tài liệu')}
                        </span>
                      </div>
                      <div className="meta-row">
                        <span className="sender">
                           <Clock size={12}/> {formatDate(file.createdAt)}
                        </span>
                        <span className="uploader">bởi {file.displayName}</span>
                      </div>
                    </div>
                    
                    {/* DOWNLOAD BUTTON */}
                    <a href={file.fileUrl} target="_blank" rel="noreferrer" className="btn-download" title="Tải xuống">
                      <Download size={16}/>
                    </a>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="no-select">Vui lòng chọn một nhóm để xem tài liệu</div>
        )}
      </div>
    </div>
  );
};

export default ResourceHub;