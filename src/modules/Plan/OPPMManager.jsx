import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy 
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-toastify";
import { Plus, List, Grid, Award, Users } from "lucide-react";

// Import các màn hình con
import OPPMDeadlineView from "./OPPMDeadlineView";
import OPPMMatrixView from "./OPPMMatrixView";
import OPPMScoreView from "./OPPMScoreView";

import "./OPPMManager.scss";

const OPPMManager = () => {
  const { user } = useAuth();
  
  // State điều hướng
  const [activeTab, setActiveTab] = useState("matrix"); // Mặc định vào Ma trận
  
  // State quản lý nhóm
  const [rooms, setRooms] = useState([]); 
  const [selectedRoom, setSelectedRoom] = useState(null); 

  // State form giao việc
  const [taskTitle, setTaskTitle] = useState("");
  const [assignee, setAssignee] = useState(""); 
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Lấy danh sách nhóm chat của User để chọn
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
      
      // Mặc định chọn nhóm đầu tiên nếu chưa chọn
      if (roomList.length > 0 && !selectedRoom) {
        setSelectedRoom(roomList[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Hàm Giao Việc (Có Approval Workflow)
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    // Validate
    if (!selectedRoom) return toast.warning("Vui lòng chọn nhóm trước!");
    if (!taskTitle.trim() || !assignee.trim()) return toast.warning("Nhập thiếu tên việc hoặc người phụ trách!");

    setLoading(true);
    try {
      await addDoc(collection(db, "oppm_tasks"), {
        roomId: selectedRoom.id,       // Gắn task với nhóm đang chọn
        title: taskTitle,
        owner: assignee,
        deadline: deadline ? new Date(deadline) : null,
        
        status: "pending",             // Trạng thái làm việc: Pending / Done
        approvalStatus: "pending",     // 👈 QUAN TRỌNG: Trạng thái duyệt (Pending -> Approved/Rejected)
        
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        logs: [`${user.displayName} đã tạo việc lúc ${new Date().toLocaleString()}`]
      });
      
      toast.success("Đã giao việc! Chờ chốt deadline ở tab Deadline.");
      
      // Reset form
      setTaskTitle(""); 
      setAssignee(""); 
      setDeadline("");
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi tạo công việc");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="oppm-manager">
      
      {/* --- HEADER: SELECT ROOM & TABS --- */}
      <div className="manager-header">
        <div className="room-selector">
          <label><Users size={16}/> Chọn Nhóm:</label>
          <select 
            value={selectedRoom?.id || ""} 
            onChange={(e) => setSelectedRoom(rooms.find(r => r.id === e.target.value))}
          >
            {rooms.length === 0 && <option value="">Chưa có nhóm nào</option>}
            {rooms.map(r => (
              <option key={r.id} value={r.id}>
                {r.name || "Nhóm không tên"}
              </option>
            ))}
          </select>
        </div>

        <div className="tab-buttons">
          <button 
            className={activeTab === 'deadline' ? 'active' : ''} 
            onClick={() => setActiveTab('deadline')}
          >
            <List size={18} /> Deadline
          </button>
          <button 
            className={activeTab === 'matrix' ? 'active' : ''} 
            onClick={() => setActiveTab('matrix')}
          >
            <Grid size={18} /> Ma Trận
          </button>
          <button 
            className={activeTab === 'score' ? 'active' : ''} 
            onClick={() => setActiveTab('score')}
          >
            <Award size={18} /> Bảng Điểm
          </button>
        </div>
      </div>

      {/* --- FORM GIAO VIỆC NHANH --- */}
      <div className="shared-form-container">
        <form className="create-form" onSubmit={handleCreateTask}>
          <div className="input-group">
            <label>Tên công việc</label>
            <input 
              value={taskTitle} 
              onChange={e=>setTaskTitle(e.target.value)} 
              placeholder="Nhập tên task..."
            />
          </div>
          <div className="input-group">
            <label>Người phụ trách</label>
            <input 
              value={assignee} 
              onChange={e=>setAssignee(e.target.value)} 
              placeholder="Nhập tên..."
            />
          </div>
          <div className="input-group">
            <label>Deadline</label>
            <input 
              type="datetime-local" 
              value={deadline} 
              onChange={e=>setDeadline(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Đang lưu..." : <><Plus size={18}/> Thêm</>}
          </button>
        </form>
      </div>

      {/* --- NỘI DUNG CHÍNH (Render theo Tab & Selected Room) --- */}
      <div className="tab-content">
        {selectedRoom ? (
          <>
            {/* Tab 1: Duyệt & Quản lý Deadline */}
            {activeTab === 'deadline' && <OPPMDeadlineView currentRoom={selectedRoom} />}
            
            {/* Tab 2: Ma Trận OPPM (Chỉ hiện task đã approved) */}
            {activeTab === 'matrix' && <OPPMMatrixView currentRoom={selectedRoom} />}
            
            {/* Tab 3: Bảng Điểm 360 độ */}
            {activeTab === 'score' && <OPPMScoreView currentRoom={selectedRoom} />}
          </>
        ) : (
          <div className="no-room">
            <p>👋 Chào bạn, hãy chọn một nhóm chat để bắt đầu lập kế hoạch OPPM!</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default OPPMManager;