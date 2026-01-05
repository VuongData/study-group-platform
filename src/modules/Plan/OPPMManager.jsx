import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, getDoc, doc 
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
  const [activeTab, setActiveTab] = useState("matrix");
  
  // State quản lý nhóm
  const [rooms, setRooms] = useState([]); 
  const [selectedRoom, setSelectedRoom] = useState(null); 
  
  // State danh sách thành viên trong nhóm (Để hiển thị trong Dropdown)
  const [roomMembers, setRoomMembers] = useState([]); 

  // State form giao việc
  const [taskTitle, setTaskTitle] = useState("");
  const [assignee, setAssignee] = useState(""); // Lưu tên người được chọn
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Lấy danh sách nhóm chat của User
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
      
      if (roomList.length > 0 && !selectedRoom) {
        setSelectedRoom(roomList[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 2. 👇 LOGIC MỚI: Lấy chi tiết thành viên khi chọn nhóm (để nạp vào Dropdown)
  useEffect(() => {
    const fetchMembers = async () => {
      if (!selectedRoom?.members) {
        setRoomMembers([]);
        return;
      }

      try {
        // Lấy thông tin chi tiết từng user trong mảng members
        const promises = selectedRoom.members.map(uid => getDoc(doc(db, "users", uid)));
        const snapshots = await Promise.all(promises);
        
        const membersData = snapshots.map(snap => {
          if (snap.exists()) {
            return { uid: snap.id, ...snap.data() };
          }
          return null;
        }).filter(item => item !== null); // Lọc bỏ user lỗi

        setRoomMembers(membersData);
      } catch (error) {
        console.error("Lỗi lấy thành viên:", error);
      }
    };

    fetchMembers();
    // Reset assignee khi đổi phòng để tránh chọn nhầm người phòng khác
    setAssignee(""); 
  }, [selectedRoom]);

  // 3. Hàm Giao Việc
  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    if (!selectedRoom) return toast.warning("Vui lòng chọn nhóm trước!");
    if (!taskTitle.trim() || !assignee) return toast.warning("Nhập thiếu tên việc hoặc người phụ trách!");

    setLoading(true);
    try {
      await addDoc(collection(db, "oppm_tasks"), {
        roomId: selectedRoom.id,
        title: taskTitle,
        owner: assignee, // Lưu tên người được chọn từ Dropdown
        deadline: deadline ? new Date(deadline) : null,
        
        status: "pending",
        approvalStatus: "pending",
        
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        logs: [`${user.displayName} đã tạo việc lúc ${new Date().toLocaleString()}`]
      });
      
      toast.success("Đã gửi yêu cầu! Chờ thành viên chốt deadline.");
      
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
      
      {/* HEADER */}
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
          <button className={activeTab === 'deadline' ? 'active' : ''} onClick={() => setActiveTab('deadline')}>
            <List size={18} /> Deadline
          </button>
          <button className={activeTab === 'matrix' ? 'active' : ''} onClick={() => setActiveTab('matrix')}>
            <Grid size={18} /> Ma Trận
          </button>
          <button className={activeTab === 'score' ? 'active' : ''} onClick={() => setActiveTab('score')}>
            <Award size={18} /> Bảng Điểm
          </button>
        </div>
      </div>

      {/* FORM GIAO VIỆC */}
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
          
          {/* 👇 THAY INPUT TEXT BẰNG SELECT */}
          <div className="input-group">
            <label>Người phụ trách</label>
            <select 
              value={assignee} 
              onChange={e=>setAssignee(e.target.value)}
              className="assignee-select" // Bạn có thể thêm class này vào SCSS nếu muốn style thêm
            >
              <option value="">-- Chọn thành viên --</option>
              {roomMembers.map(mem => (
                <option key={mem.uid} value={mem.displayName}>
                  {mem.displayName} {mem.uid === user.uid ? "(Bạn)" : ""}
                </option>
              ))}
            </select>
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

      {/* NỘI DUNG CHÍNH */}
      <div className="tab-content">
        {selectedRoom ? (
          <>
            {activeTab === 'deadline' && <OPPMDeadlineView currentRoom={selectedRoom} />}
            {activeTab === 'matrix' && <OPPMMatrixView currentRoom={selectedRoom} />}
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