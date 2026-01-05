/* src/modules/Plan/OPPMDeadlineView.jsx */
import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { Calendar, Check, X, AlertOctagon, CheckCircle, Circle, Clock } from "lucide-react";
import { toast } from "react-toastify";
import "./OPPMDeadlineView.scss";

const OPPMDeadlineView = ({ currentRoom }) => {
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
        // Chấp nhận -> Chuyển sang approved (Sẽ hiện lên Matrix)
        await updateDoc(doc(db, "oppm_tasks", taskId), { approvalStatus: "approved" });
        toast.success("Đã chốt deadline! Task sẽ hiện trên OPPM.");
      } else {
        // Từ chối -> Xóa luôn hoặc chuyển sang rejected (Ẩn đi)
        if(confirm("Hủy bỏ task này? Nó sẽ không xuất hiện trên OPPM.")) {
           await deleteDoc(doc(db, "oppm_tasks", taskId)); // Hoặc update thành 'rejected'
           toast.info("Đã hủy task.");
        }
      }
    } catch (err) { toast.error("Lỗi cập nhật"); }
  };

  const toggleStatus = async (task) => {
    await updateDoc(doc(db, "oppm_tasks", task.id), { status: task.status === 'done' ? 'pending' : 'done' });
  };

  // Phân loại: Tách riêng nhóm CẦN DUYỆT (Pending Approval)
  const pendingApprovalTasks = tasks.filter(t => t.approvalStatus === 'pending');
  // Các task đã duyệt thì chia nhóm theo hạn như cũ
  const approvedTasks = tasks.filter(t => t.approvalStatus === 'approved');

  // Logic chia nhóm cũ (Overdue, Today...) áp dụng cho approvedTasks
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
      
      {/* ⚠️ KHU VỰC CHỜ DUYỆT (QUAN TRỌNG) */}
      {pendingApprovalTasks.length > 0 && (
        <div className="approval-section">
          <h4><AlertOctagon size={20}/> Cần chốt Deadline ({pendingApprovalTasks.length})</h4>
          <p className="hint-text">* Quy tắc 20%: Nếu không chấp nhận, task sẽ bị hủy và không tính vào OPPM.</p>
          <div className="task-grid">
            {pendingApprovalTasks.map(t => (
              <div key={t.id} className="approval-card">
                <div className="info">
                  <strong>{t.title}</strong>
                  <span>👤 {t.owner}</span>
                  <span>📅 {t.deadline?.seconds ? new Date(t.deadline.seconds*1000).toLocaleDateString('vi-VN') : 'Chưa set'}</span>
                </div>
                <div className="actions">
                  <button className="btn-reject" onClick={() => handleApproval(t.id, false)}>
                    <X size={16}/> Hủy
                  </button>
                  <button className="btn-approve" onClick={() => handleApproval(t.id, true)}>
                    <Check size={16}/> Chấp nhận
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DANH SÁCH CÔNG VIỆC ĐÃ DUYỆT (Bình thường) */}
      <div className="approved-lists">
         {/* Render các nhóm Quá hạn, Hôm nay... như code cũ */}
         {/* (Bạn dùng lại hàm renderSection của bài trước nhé) */}
         {grouped.overdue.length > 0 && <div className="list-group danger"><h5>Quá hạn</h5>{grouped.overdue.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
         {grouped.upcoming.length > 0 && <div className="list-group primary"><h5>Sắp tới</h5>{grouped.upcoming.map(t=><TaskItem key={t.id} t={t} toggle={toggleStatus}/>)}</div>}
         {/* ... */}
      </div>
    </div>
  );
};

// Component con hiển thị task đơn giản
const TaskItem = ({t, toggle}) => (
  <div className="task-card-simple">
     <button onClick={()=>toggle(t)} className={t.status}>{t.status==='done'?<CheckCircle/>:<Circle/>}</button>
     <span>{t.title} ({t.owner})</span>
  </div>
);

export default OPPMDeadlineView;