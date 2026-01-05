import { useState, useEffect, useMemo } from "react";
import { db } from "../../services/firebase";
import { collection, onSnapshot, query, where, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { Printer, Calendar, Trash2 } from "lucide-react";
import "./OPPMReal.scss";

const OPPMMatrixView = ({ currentRoom }) => {
  const [tasks, setTasks] = useState([]);
  const [objectives, setObjectives] = useState(["", "", "", "", ""]);
  
  // Cấu hình thời gian TỔNG CỦA DỰ ÁN (Project Duration)
  // Mặc định lấy năm nay, hoặc bạn có thể lưu vào DB
  const [projStartDate, setProjStartDate] = useState("2025-01-01");
  const [projEndDate, setProjEndDate] = useState("2025-12-31");

  // 1. Fetch dữ liệu
  useEffect(() => {
    if (!currentRoom?.id) return;
    const q = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort A-Z owner
      fetched.sort((a, b) => (a.owner || "").localeCompare(b.owner || "", 'vi'));
      setTasks(fetched);
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // 2. Logic cập nhật chấm Mục tiêu (Cột 1-5 vẫn là thủ công)
  const toggleObjective = async (taskId, index) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(doc(db, "oppm_tasks", taskId), { [`obj_${index}`]: !task[`obj_${index}`] });
  };
  
  const handleDelete = async (id) => {
    if(confirm("Xóa task này?")) await deleteDoc(doc(db, "oppm_tasks", id));
  };

  // =================================================================================
  // 🧠 LOGIC TÍNH TOÁN 20 CỘT TỰ ĐỘNG
  // =================================================================================
  
  const timeSlices = useMemo(() => {
    const start = new Date(projStartDate).getTime();
    const end = new Date(projEndDate).getTime();
    const totalDuration = end - start;
    
    // Nếu ngày sai, trả về mảng rỗng
    if (totalDuration <= 0) return [];

    const step = totalDuration / 20; // Chia làm 20 phần
    
    // Tạo mảng 20 khoảng thời gian
    return Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      rangeStart: start + (i * step),
      rangeEnd: start + ((i + 1) * step)
    }));
  }, [projStartDate, projEndDate]);

  // Kiểm tra Task có nằm trong Cột thời gian X không
  const isTaskActiveInColumn = (task, column) => {
    if (!task.startDate || !task.endDate) return false;
    const tStart = new Date(task.startDate).getTime();
    const tEnd = new Date(task.endDate).getTime();
    
    // Logic giao nhau (Overlap): Start của cái này < End của cái kia AND End của cái này > Start của cái kia
    return (tStart < column.rangeEnd) && (tEnd > column.rangeStart);
  };

  // Tính số liệu cho Hàng Tổng Kết (Summary Row)
  const getColumnStats = (column) => {
    // 1. Lọc ra các task ĐANG CHẠY trong cột này
    const activeTasks = tasks.filter(t => isTaskActiveInColumn(t, column));
    const totalActive = activeTasks.length;

    if (totalActive === 0) return { label: "", className: "" };

    // 2. Đếm số task đã xong (status === 'done')
    // Quan trọng: Chỉ đếm những task đang active trong cột này mà đã xong
    const doneCount = activeTasks.filter(t => t.status === 'done').length;

    // 3. Quy định màu sắc hiển thị
    // doneCount/totalActive. Ví dụ: 2/3
    let className = "text-warning"; // Mặc định vàng
    if (doneCount === totalActive) className = "text-success"; // Xanh (Xong hết)
    else if (doneCount === 0) className = "text-danger"; // Đỏ (Chưa xong cái nào)

    return { 
      label: `${doneCount}/${totalActive}`, 
      className 
    };
  };

  // Tính tiến độ chung toàn dự án
  const totalProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((doneTasks / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className="matrix-view-container">
      {/* Cấu hình thời gian dự án */}
      <div className="config-panel no-print">
        <div className="top-bar">
           <div className="date-group">
             <Calendar size={18} className="icon"/>
             <strong>Dự án bắt đầu: </strong>
             <input type="date" value={projStartDate} onChange={e=>setProjStartDate(e.target.value)}/>
             <strong> Kết thúc: </strong>
             <input type="date" value={projEndDate} onChange={e=>setProjEndDate(e.target.value)}/>
           </div>
           <button className="btn-print" onClick={()=>window.print()}><Printer size={18}/> In Bảng</button>
        </div>
        <div className="objectives-inputs">
           <strong>🎯 5 Mục tiêu Chiến lược:</strong>
           <div className="obj-grid">
             {objectives.map((obj, i) => (
               <input key={i} placeholder={`Mục tiêu ${i+1}...`} value={obj} onChange={e=>{const n=[...objectives]; n[i]=e.target.value; setObjectives(n)}}/>
             ))}
           </div>
        </div>
      </div>

      <div className="progress-section no-print">
        <div className="prog-header"><strong>📈 TIẾN ĐỘ CHUNG</strong><span className="percent">{totalProgress}%</span></div>
        <div className="prog-bar-bg"><div className="prog-bar-fill" style={{width: `${totalProgress}%`}}></div></div>
      </div>

      <div className="oppm-table-wrapper printable-area">
        <table className="oppm-table">
          <thead>
            <tr>
              <th className="col-task">NỘI DUNG CÔNG VIỆC</th>
              <th className="col-owner">PHỤ TRÁCH</th>
              {/* 5 Cột Mục tiêu */}
              {[1,2,3,4,5].map(i => (
                <th key={`h-obj-${i}`} className="vertical-header">
                  <div className="vertical-text">{objectives[i-1] || `Mục tiêu ${i}`}</div>
                </th>
              ))}
              {/* 20 Cột Thời gian */}
              {timeSlices.map(col => (
                <th key={`h-time-${col.index}`} className="col-time" title={new Date(col.rangeStart).toLocaleDateString()}>
                  {col.index}
                </th>
              ))}
              <th className="col-action no-print"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td className="task-name">
                   <span className={`status-dot ${task.status === 'done' ? 'done' : 'pending'}`}></span>
                   {task.title}
                </td>
                <td className="owner-name">{task.owner}</td>
                
                {/* 5 Ô Vuông (Thủ công) */}
                {[1,2,3,4,5].map(i => (
                   <td key={`obj-${i}`} className="cell-obj" onClick={() => toggleObjective(task.id, i)}>
                     {task[`obj_${i}`] && <div className="square-dot"></div>}
                   </td>
                ))}

                {/* 20 Ô Tròn (TỰ ĐỘNG) */}
                {timeSlices.map(col => {
                   const active = isTaskActiveInColumn(task, col);
                   // Nếu active và done -> Xanh. Active và chưa done -> Đỏ.
                   const dotClass = task.status === 'done' ? 'circle-dot' : 'circle-dot-red'; 
                   
                   return (
                     <td key={`time-${col.index}`} className="cell-dot-auto">
                       {active && <div className={dotClass}></div>}
                     </td>
                   );
                })}

                <td className="col-action no-print">
                   <button onClick={()=>handleDelete(task.id)} className="btn-delete"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}

            {/* Hàng Tổng Kết */}
            <tr className="summary-row">
              <td colSpan={7} style={{textAlign: 'right', paddingRight: 10, fontWeight:'bold', color: '#64748b'}}>
                📊 Tỉ lệ hoàn thành:
              </td>
              {timeSlices.map(col => {
                const stats = getColumnStats(col);
                return (
                  <td key={`sum-${col.index}`} className="summary-cell">
                    <span className={stats.className}>{stats.label}</span>
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tbody>
        </table>

        {/* Chú thích */}
        <div className="legend-container">
           <div className="item"><span className="sq"></span> Mục tiêu</div>
           <div className="item"><div className="circle-dot"></div> Hoàn thành (100%)</div>
           <div className="item"><div className="circle-dot-red"></div> Chưa xong (0%)</div>
        </div>
      </div>
    </div>
  );
};

export default OPPMMatrixView;