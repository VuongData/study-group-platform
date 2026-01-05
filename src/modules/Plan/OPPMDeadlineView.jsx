import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext"; // 👈 1. Import Auth để biết ai đang xem
import { Calendar, Check, X, AlertOctagon, CheckCircle, Circle, Clock, Hourglass } from "lucide-react";
import { toast } from "react-toastify";
import "./OPPMDeadlineView.scss";

const OPPMDeadlineView = ({ currentRoom }) => {
  const { user } = useAuth(); // 👈 2. Lấy thông tin user hiện tại
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!currentRoom?.id) return;
    const q = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // HÀM XỬ LÝ DUYỆT / TỪ CHỐI
  const handleApproval = async (taskId, isApproved) => {
    try {
      if (isApproved) {
        await updateDoc(doc(db, "oppm_tasks", taskId), { approvalStatus: "approved" });
        toast.success("Đã nhận việc! Task sẽ hiện trên OPPM.");
      } else {
        if(confirm("Bạn từ chối nhận task này? Nó sẽ bị xóa.")) {
           await deleteDoc(doc(db, "oppm_tasks", taskId));
           toast.info("Đã từ chối task.");
        }
      }
    } catch (err) { toast.error("Lỗi cập nhật"); }
  };

  const toggleStatus = async (task) => {
    await updateDoc(doc(db, "oppm_tasks", task.id), { status: task.status === 'done' ? 'pending' : 'done' });
  };

  const pendingApprovalTasks = tasks.filter(t => t.approvalStatus === 'pending');
  const approvedTasks = tasks.filter(t => t.approvalStatus === 'approved');

  const groupTasks = () => {
    const today = new Date(); today.setHours(0,0,0,0);
    const groups = { overdue: [], today: [], upcoming: [], done: [] };
    approvedTasks.forEach(task => {
      if (task.status === 'done') { groups.done.push(task); return; }
      const d = task.deadline?.seconds ? new Date(task.deadline.seconds * 1000) : new Date();
      d.setHours(0,0,0,0);
      if (d < today) groups.overdue.push(task);
      else if (d.getTime() === today.getTime()) groups.today.push(task);
      else groups.upcoming.push(task);
    });
    return groups;
  };
  const grouped = groupTasks();

  return (
    <div className="deadline-view-container">
      
      {/* ⚠️ KHU VỰC CHỜ DUYỆT (PENDING) */}
      {pendingApprovalTasks.length > 0 && (
        <div className="approval-section">
          <h4><AlertOctagon size={20}/> Cần xác nhận ({pendingApprovalTasks.length})</h4>
          <p className="hint-text">* Chỉ người được giao việc mới có quyền Chấp nhận hoặc Từ chối.</p>
          
          <div className="task-grid">
            {pendingApprovalTasks.map(t => {
              // 👇 LOGIC QUAN TRỌNG: Kiểm tra xem user hiện tại có phải là chủ task không
              const isMyTask = user.displayName === t.owner;

              return (
                <div key={t.id} className={`approval-card ${!isMyTask ? 'readonly' : ''}`}>
                  <div className="info">
                    <strong>{t.title}</strong>
                    <span className="assignee-badge">👤 {t.owner}</span>
                    <span>📅 {t.deadline?.seconds ? new Date(t.deadline.seconds*1000).toLocaleDateString('vi-VN') : 'Chưa set'}</span>
                  </div>
                  
                  <div className="actions">
                    {isMyTask ? (
                      // Nếu đúng là TÔI -> Hiện nút bấm
                      <>
                        <button className="btn-reject" onClick={() => handleApproval(t.id, false)}>
                          <X size={16}/> Từ chối
                        </button>
                        <button className="btn-approve" onClick={() => handleApproval(t.id, true)}>
                          <Check size={16}/> Nhận việc
                        </button>
                      </>
                    ) : (
                      // Nếu là NGƯỜI KHÁC -> Hiện thông báo đợi
                      <div className="waiting-status">
                        <Hourglass size={14} className="spin-slow"/> 
                        <span>Đợi {t.owner} phản hồi...</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DANH SÁCH ĐÃ DUYỆT (GIỮ NGUYÊN) */}
      <div className="approved-lists">
         {grouped.overdue.length > 0 && <div className="list-group danger"><h5>Quá hạn</h5>{grouped.overdue.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
         {grouped.today.length > 0 && <div className="list-group warning"><h5>Hôm nay</h5>{grouped.today.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
         {grouped.upcoming.length > 0 && <div className="list-group primary"><h5>Sắp tới</h5>{grouped.upcoming.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
         {grouped.done.length > 0 && <div className="list-group success"><h5>Đã xong</h5>{grouped.done.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
      </div>
    </div>
  );
};

const TaskItem = ({t, toggle}) => (
  <div className="task-card-simple">
     <button onClick={()=>toggle(t)} className={t.status}>{t.status==='done'?<CheckCircle size={18}/>:<Circle size={18}/>}</button>
     <div className="t-content">
       <span className="t-title">{t.title}</span>
       <span className="t-owner">{t.owner}</span>
     </div>
  </div>
);

export default OPPMDeadlineView;