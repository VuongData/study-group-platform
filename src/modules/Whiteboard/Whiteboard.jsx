import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import { 
  Pencil, Type, Eraser, Trash2, Download, 
  Minus, Plus, Palette, X as CloseIcon, Cloud 
} from 'lucide-react';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, onSnapshot, query, orderBy, 
  deleteDoc, getDocs, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import './Whiteboard.scss';

const Whiteboard = ({ boardId, onClose, title }) => {
  // --- STATE ---
  const [tool, setTool] = useState('pen'); 
  const [elements, setElements] = useState([]); // Lưu cả Line và Text chung 1 mảng để đúng thứ tự lớp
  const [currentLine, setCurrentLine] = useState(null); // Nét đang vẽ dở (chưa lưu DB)

  // Settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [fontSize, setFontSize] = useState(20);

  // Text Input Logic
  const [isTyping, setIsTyping] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef(null);

  const isDrawing = useRef(false);

  // --- 1. REAL-TIME SYNC (Lắng nghe dữ liệu từ Firestore) ---
  useEffect(() => {
    if (!boardId) return;
    
    // Lắng nghe thay đổi trong collection 'elements' của bảng này
    const q = query(collection(db, "whiteboards", boardId, "elements"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedElements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setElements(fetchedElements);
    });

    return () => unsubscribe();
  }, [boardId]);

  // --- 2. DRAWING HANDLERS ---
  const handleMouseDown = (e) => {
    // Nếu đang gõ chữ thì click ra ngoài sẽ là "Lưu chữ" chứ không phải vẽ
    if (isTyping) {
      handleTextSubmit();
      return;
    }

    const pos = e.target.getStage().getPointerPosition();

    // Logic nhập Text
    if (tool === 'text') {
      setIsTyping(true);
      setTextPos({ x: pos.x, y: pos.y });
      setInputValue("");
      // Hack nhẹ: setTimeout để đảm bảo DOM render xong mới focus
      setTimeout(() => textareaRef.current?.focus(), 50); 
      return;
    }

    // Logic Vẽ
    isDrawing.current = true;
    setCurrentLine({
      type: 'line',
      tool,
      points: [pos.x, pos.y],
      color: strokeColor,
      width: strokeWidth
    });
  };

  const handleMouseMove = (e) => {
    // Chỉ vẽ local (optimistic UI) cho mượt, chưa lưu DB
    if (!isDrawing.current || !currentLine) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setCurrentLine(prev => ({
      ...prev,
      points: prev.points.concat([point.x, point.y])
    }));
  };

  const handleMouseUp = async () => {
    if (!isDrawing.current || !currentLine) return;
    isDrawing.current = false;

    // Khi thả chuột -> Lưu nét vẽ vào Firestore
    try {
      await addDoc(collection(db, "whiteboards", boardId, "elements"), {
        ...currentLine,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi lưu nét vẽ:", error);
    } finally {
      setCurrentLine(null); // Reset nét vẽ tạm
    }
  };

  // --- 3. TEXT HANDLERS ---
  const handleTextSubmit = async () => {
    if (inputValue.trim()) {
      try {
        await addDoc(collection(db, "whiteboards", boardId, "elements"), {
          type: 'text',
          text: inputValue,
          x: textPos.x,
          y: textPos.y,
          fontSize: fontSize,
          fill: strokeColor,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Lỗi lưu text:", error);
      }
    }
    setIsTyping(false);
    setInputValue("");
  };

  // --- 4. ACTIONS (Clear, Download) ---
  const handleClear = async () => {
    if(!confirm("Xóa toàn bộ bảng này?")) return;
    try {
      // Clean collection (Xóa từng doc vì Firestore không hỗ trợ xóa collection trực tiếp ở client)
      const batch = writeBatch(db);
      const snap = await getDocs(collection(db, "whiteboards", boardId, "elements"));
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (error) {
      console.error("Lỗi xóa bảng:", error);
    }
  };

  const handleExport = () => {
    const stage = document.querySelector('.konva-stage canvas'); // Lấy canvas DOM thực tế
    if(stage) {
      const uri = stage.toDataURL();
      const link = document.createElement('a');
      link.download = `whiteboard-${Date.now()}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="whiteboard-overlay">
      <div className="whiteboard-container">
        
        {/* Header Bar */}
        <div className="wb-header">
          <span className="wb-title">
            <Cloud size={18} /> {title || "Bảng trắng"}
          </span>
          <button className="btn-close-wb" onClick={onClose}><CloseIcon size={20}/></button>
        </div>

        {/* Toolbar */}
        <div className="wb-toolbar">
          <div className="group tools">
            <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')}><Pencil size={20} /></button>
            <button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')}><Type size={20} /></button>
            <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')}><Eraser size={20} /></button>
          </div>
          <div className="divider"></div>
          <div className="group settings">
            <div className="color-picker-wrapper">
              <Palette size={20} color={strokeColor}/>
              <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
            </div>
            <div className="size-control">
               <button onClick={() => tool === 'text' ? setFontSize(s=>Math.max(10,s-2)) : setStrokeWidth(s=>Math.max(1,s-1))}><Minus size={14}/></button>
               <span>{tool === 'text' ? fontSize : strokeWidth}</span>
               <button onClick={() => tool === 'text' ? setFontSize(s=>Math.min(100,s+2)) : setStrokeWidth(s=>Math.min(50,s+1))}><Plus size={14}/></button>
            </div>
          </div>
          <div className="divider"></div>
          <div className="group actions">
            <button onClick={handleClear} className="btn-danger"><Trash2 size={20} /></button>
            <button onClick={handleExport}><Download size={20} /></button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="canvas-wrapper" style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair' }}>
          <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            className="konva-stage"
          >
            <Layer>
              {/* Background trắng */}
              <Line points={[0,0, 10000,0, 10000,10000, 0,10000]} closed fill="white" />
              
              {/* Render các element đã lưu */}
              {elements.map((el, i) => {
                if (el.type === 'text') {
                  return <Text key={i} {...el} fontFamily="Inter" />;
                }
                return (
                  <Line
                    key={i}
                    points={el.points}
                    stroke={el.tool === 'eraser' ? '#ffffff' : el.color}
                    strokeWidth={el.width}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={el.tool === 'eraser' ? 'destination-out' : 'source-over'}
                  />
                );
              })}

              {/* Render nét đang vẽ (Optimistic UI) */}
              {currentLine && (
                <Line
                  points={currentLine.points}
                  stroke={currentLine.tool === 'eraser' ? '#ffffff' : currentLine.color}
                  strokeWidth={currentLine.width}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={currentLine.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              )}
            </Layer>
          </Stage>

          {/* Ô nhập liệu Text (Overlay HTML) */}
          {isTyping && (
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleTextSubmit} // Click ra ngoài tự lưu
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  handleTextSubmit(); // Enter để lưu
                } 
              }}
              style={{
                position: 'fixed', // Dùng fixed để chắc chắn đè lên
                top: textPos.y + 'px', 
                left: textPos.x + 'px',
                fontSize: fontSize + 'px', 
                color: strokeColor,
                lineHeight: 1,
                border: '1px dashed #2563eb', 
                background: 'rgba(255,255,255,0.8)', 
                outline: 'none', 
                resize: 'none', 
                minWidth: '50px',
                zIndex: 99999 // Z-index cực cao
              }}
              placeholder="Nhập..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;