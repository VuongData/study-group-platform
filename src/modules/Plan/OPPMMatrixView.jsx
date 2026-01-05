import { useState, useEffect } from "react";
import { db } from "../../services/firebase";
import { 
  collection, onSnapshot, query, where, 
  updateDoc, doc, deleteDoc 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Trash2, Printer, Calendar } from "lucide-react";
import "./OPPMReal.scss"; // Import file CSS in ấn

const OPPMMatrixView = ({ currentRoom }) => {
  const [tasks, setTasks] = useState([]);
  
  // State cấu hình (Ngày tháng & Mục tiêu)
  // Bạn có thể nâng cấp để lưu cái này vào DB (collection oppm_config)
  const [objectives, setObjectives] = useState(["", "", "", "", ""]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");

  // 1. FETCH DỮ LIỆU & SẮP XẾP
  useEffect(() => {
    if (!currentRoom?.id) return;

    // Lọc task theo ID phòng chat hiện tại
    const q = query(
      collection(db, "oppm_tasks"),
      where("roomId", "==", currentRoom.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sắp xếp Client-side theo tên người phụ trách (A -> Z)
      fetchedTasks.sort((a, b) => {
        const nameA = a.owner || "";
        const nameB = b.owner || "";
        return nameA.localeCompare(nameB, 'vi', { sensitivity: 'base' });
      });

      setTasks(fetchedTasks);
    });

    return () => unsubscribe();
  }, [currentRoom]);

  // Toggle chấm tròn/vuông
  const toggleDot = async (taskId, field) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    try {
      await updateDoc(doc(db, "oppm_tasks", taskId), {
        [field]: !task[field] // Đảo ngược giá trị true/false
      });
    } catch (error) {
      console.error("Lỗi update:", error);
    }
  };

  // Xóa task
  const handleDelete = async (taskId) => {
    if(confirm("Bạn chắc chắn muốn xóa công việc này?")) {
      await deleteDoc(doc(db, "oppm_tasks", taskId));
      toast.success("Đã xóa");
    }
  };

  // Tạo mảng 20 tuần/cột thời gian
  const timeColumns = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="matrix-view-container">
      
      {/* --- PHẦN CẤU HÌNH (Sẽ ẩn khi in) --- */}
      <div className="config-panel no-print">
        <div className="top-bar">
           <div className="date-group">
             <Calendar size={18} className="icon"/>
             <strong>Thời gian dự án: </strong>
             <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/>
             <span>đến</span>
             <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/>
           </div>
           <button className="btn-print" onClick={()=>window.print()}>
             <Printer size={18}/> In Bảng
           </button>
        </div>
        
        <div className="objectives-inputs">
           <strong>🎯 5 Mục tiêu Chiến lược:</strong>
           <div className="obj-grid">
             {objectives.map((obj, i) => (
               <input 
                 key={i} 
                 placeholder={`Mục tiêu ${i+1}...`} 
                 value={obj} 
                 onChange={e=>{
                   const newObjs = [...objectives]; 
                   newObjs[i]=e.target.value; 
                   setObjectives(newObjs);
                 }}
               />
             ))}
           </div>
        </div>
      </div>

      {/* --- THANH TIẾN ĐỘ (Sẽ ẩn khi in) --- */}
      <div className="progress-section no-print">
        <div className="prog-header">
          <strong>📈 TIẾN ĐỘ THỰC TẾ</strong>
          <span className="percent">100%</span>
        </div>
        <div className="prog-bar-bg">
          <div className="prog-bar-fill" style={{width: '100%'}}></div>
        </div>
        <p className="note">* Tính trung bình trên 20 cột thời gian có công việc.</p>
      </div>

      {/* --- CÁI BẢNG MA TRẬN (Vùng được in) --- */}
      <div className="oppm-table-wrapper printable-area">
        <table className="oppm-table">
          <thead>
            <tr>
              <th className="col-task">NỘI DUNG CÔNG VIỆC</th>
              <th className="col-owner">PHỤ TRÁCH</th>
              
              {/* 5 Cột Mục tiêu (Vertical Text) */}
              {[1,2,3,4,5].map(i => (
                <th key={`h-obj-${i}`} className="vertical-header">
                  <div className="vertical-text">
                    {objectives[i-1] || `Mục tiêu ${i}`}
                  </div>
                </th>
              ))}

              {/* 20 Cột Thời gian */}
              {timeColumns.map(t => (
                <th key={`h-time-${t}`} className="col-time">{t}</th>
              ))}
              
              <th className="col-action no-print">Xóa</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                {/* Tên Task */}
                <td className="task-name">
                   <span className={`status-dot ${task.status === 'done' ? 'done' : 'pending'}`}></span>
                   {task.title}
                </td>
                
                {/* Người phụ trách (Đã sort A-Z) */}
                <td className="owner-name">{task.owner}</td>

                {/* 5 Ô Vuông (Mục tiêu) */}
                {[1,2,3,4,5].map(i => (
                   <td 
                     key={`obj-${i}`} 
                     className="cell-obj"
                     onClick={() => toggleDot(task.id, `obj_${i}`)}
                   >
                     {task[`obj_${i}`] && <div className="square-dot"></div>}
                   </td>
                ))}

                {/* 20 Ô Tròn (Thời gian) */}
                {timeColumns.map(t => (
                   <td 
                     key={`time-${t}`} 
                     className="cell-dot"
                     onClick={() => toggleDot(task.id, `time_${t}`)}
                   >
                     {task[`time_${t}`] && <div className="circle-dot"></div>}
                   </td>
                ))}

                <td className="col-action no-print">
                   <button onClick={()=>handleDelete(task.id)} className="btn-delete">
                     <Trash2 size={16}/>
                   </button>
                </td>
              </tr>
            ))}
            
            {/* Dòng trống nếu chưa có task */}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="28" style={{padding: 20, fontStyle:'italic', color:'#999'}}>
                  Chưa có công việc nào. Hãy thêm ở form bên trên!
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Chú thích (Luôn hiện để in ra cho chuyên nghiệp) */}
        <div className="legend-container">
           <div className="item"><span className="sq"></span> Mục tiêu (Objectives)</div>
           <div className="item"><span className="ci"></span> Hoàn thành (Done)</div>
           <div className="item"><span className="dot pending"></span> Chờ duyệt</div>
           <div className="item"><span className="dot done"></span> Đã xong</div>
        </div>
      </div>

    </div>
  );
};

export default OPPMMatrixView;