import { useState, useEffect, useMemo } from "react";
import { db } from "../../services/firebase";
import { 
  collection, onSnapshot, query, where, updateDoc, doc, deleteDoc, setDoc, getDoc 
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Printer, Calendar } from "lucide-react";
import "./OPPMReal.scss";

const OPPMMatrixView = ({ currentRoom }) => {
  const [tasks, setTasks] = useState([]);
  
  // State cấu hình (Ngày tháng & Mục tiêu)
  const [objectives, setObjectives] = useState(["", "", "", "", ""]);
  const [projStartDate, setProjStartDate] = useState("2025-01-01");
  const [projEndDate, setProjEndDate] = useState("2025-12-31");

  // 1. Fetch Tasks (Giữ nguyên)
  useEffect(() => {
    if (!currentRoom?.id) return;
    const q = query(collection(db, "oppm_tasks"), where("roomId", "==", currentRoom.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => (a.owner || "").localeCompare(b.owner || "", 'vi'));
      setTasks(fetched);
    });
    return () => unsubscribe();
  }, [currentRoom]);

  // 2. Fetch Config (Ngày dự án & Mục tiêu) từ Firebase
  useEffect(() => {
    if (!currentRoom?.id) return;
    // Xem sự thay đổi của file cấu hình phòng này
    const configRef = doc(db, "oppm_configs", currentRoom.id);
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startDate) setProjStartDate(data.startDate);
        if (data.endDate) setProjEndDate(data.endDate);
        if (data.objectives && Array.isArray(data.objectives)) setObjectives(data.objectives);
      }
    });

    return () => unsubscribe();
  }, [currentRoom]);

  // 3. Hàm lưu Config lên Firebase
  const saveConfig = async (field, value) => {
    try {
      // Dùng setDoc với { merge: true } để tạo mới nếu chưa có, hoặc cập nhật nếu đã có
      await setDoc(doc(db, "oppm_configs", currentRoom.id), {
        [field]: value
      }, { merge: true });
    } catch (error) {
      console.error("Lỗi lưu cấu hình:", error);
      toast.error("Không lưu được cấu hình");
    }
  };

  // Logic cập nhật chấm Mục tiêu
  const toggleObjective = async (taskId, index) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateDoc(doc(db, "oppm_tasks", taskId), { [`obj_${index}`]: !task[`obj_${index}`] });
  };

  
  const timeSlices = useMemo(() => {
    const start = new Date(projStartDate).getTime();
    const end = new Date(projEndDate).getTime();
    const totalDuration = end - start;
    if (totalDuration <= 0) return [];
    const step = totalDuration / 20; 
    return Array.from({ length: 20 }, (_, i) => ({
      index: i + 1,
      rangeStart: start + (i * step),
      rangeEnd: start + ((i + 1) * step)
    }));
  }, [projStartDate, projEndDate]);

  const isTaskActiveInColumn = (task, column) => {
    if (!task.startDate || !task.endDate) return false;
    const tStart = new Date(task.startDate).getTime();
    const tEnd = new Date(task.endDate).getTime();
    return (tStart < column.rangeEnd) && (tEnd > column.rangeStart);
  };

  const getColumnStats = (column) => {
    const activeTasks = tasks.filter(t => isTaskActiveInColumn(t, column));
    const totalActive = activeTasks.length;
    if (totalActive === 0) return { label: "", className: "" };
    const doneCount = activeTasks.filter(t => t.status === 'done').length;
    let className = "text-warning"; 
    if (doneCount === totalActive) className = "text-success"; 
    else if (doneCount === 0) className = "text-danger";
    return { label: `${doneCount}/${totalActive}`, className };
  };

  const totalProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((doneTasks / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className="matrix-view-container">
      {/* Cấu hình */}
      <div className="config-panel no-print">
        <div className="top-bar">
           <div className="date-group">
             <Calendar size={18} className="icon"/>
             <strong>Dự án bắt đầu: </strong>
             <input 
               type="date" 
               value={projStartDate} 
               onChange={e => {
                 setProjStartDate(e.target.value); // Update UI ngay
                 saveConfig('startDate', e.target.value); // Lưu DB
               }}
             />
             <strong> Kết thúc: </strong>
             <input 
               type="date" 
               value={projEndDate} 
               onChange={e => {
                 setProjEndDate(e.target.value); // Update UI ngay
                 saveConfig('endDate', e.target.value); // Lưu DB
               }}
             />
           </div>
           <button className="btn-print" onClick={()=>window.print()}><Printer size={18}/> In Bảng</button>
        </div>
        
        <div className="objectives-inputs">
           <strong>🎯 5 Mục tiêu Chiến lược:</strong>
           <div className="obj-grid">
             {objectives.map((obj, i) => (
               <input 
                 key={i} 
                 placeholder={`Mục tiêu ${i+1}...`} 
                 value={obj} 
                 onChange={e => {
                   const n = [...objectives]; 
                   n[i] = e.target.value; 
                   setObjectives(n);
                 }}
                 // 👇 QUAN TRỌNG: Lưu khi click ra ngoài (onBlur) để tránh spam DB khi đang gõ
                 onBlur={() => saveConfig('objectives', objectives)}
               />
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
                
                {[1,2,3,4,5].map(i => (
                   <td key={`obj-${i}`} className="cell-obj" onClick={() => toggleObjective(task.id, i)}>
                     {task[`obj_${i}`] && <div className="square-dot"></div>}
                   </td>
                ))}

                {timeSlices.map(col => {
                   const active = isTaskActiveInColumn(task, col);
                   const dotClass = task.status === 'done' ? 'circle-dot' : 'circle-dot-red'; 
                   return (
                     <td key={`time-${col.index}`} className="cell-dot-auto">
                       {active && <div className={dotClass}></div>}
                     </td>
                   );
                })}
              </tr>
            ))}

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
            </tr>
          </tbody>
        </table>

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