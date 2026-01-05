import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import { 
  Pencil, Type, Eraser, Trash2, Download, 
  Minus, Plus, Palette, X as CloseIcon, Cloud 
} from 'lucide-react';
import { db } from '../../services/firebase';
import { 
  collection, addDoc, onSnapshot, query, 
  deleteDoc, getDocs, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { toast } from "react-toastify";
import './Whiteboard.scss';

const Whiteboard = ({ boardId, onClose, title }) => {
  // --- STATE ---
  const [tool, setTool] = useState('pen'); 
  const [elements, setElements] = useState([]); // Danh sách nét vẽ từ DB
  const [currentLine, setCurrentLine] = useState(null); // Nét đang vẽ dở

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

  // --- 1. REAL-TIME SYNC ---
  useEffect(() => {
    if (!boardId) return;
    
    // 👇 FIX: Bỏ orderBy("createdAt") để tránh lỗi thiếu Index của Firebase
    // Chúng ta sẽ sắp xếp ở client (bên dưới)
    const q = query(collection(db, "whiteboards", boardId, "elements"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedElements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sắp xếp thủ công theo thời gian để nét vẽ sau đè lên nét trước
      fetchedElements.sort((a, b) => {
        const t1 = a.createdAt?.seconds || 0;
        const t2 = b.createdAt?.seconds || 0;
        return t1 - t2;
      });
      
      setElements(fetchedElements);
    }, (error) => {
      console.error("Lỗi tải bảng vẽ:", error);
    });

    return () => unsubscribe();
  }, [boardId]);

  // --- 2. DRAWING HANDLERS ---
  const handleMouseDown = (e) => {
    if (isTyping) {
      handleTextSubmit(); // Nếu đang gõ text mà click ra ngoài -> Lưu text
      return;
    }

    const pos = e.target.getStage().getPointerPosition();

    // Logic nhập Text
    if (tool === 'text') {
      setIsTyping(true);
      setTextPos({ x: pos.x, y: pos.y });
      setInputValue("");
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
    if (!isDrawing.current || !currentLine) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Cập nhật nét vẽ tạm thời (mượt mà)
    setCurrentLine(prev => ({
      ...prev,
      points: prev.points.concat([point.x, point.y])
    }));
  };

  const handleMouseUp = async () => {
    if (!isDrawing.current || !currentLine) return;
    isDrawing.current = false;

    // 👇 OPTIMISTIC UPDATE: Đẩy nét vẽ vào mảng hiển thị NGAY LẬP TỨC
    // Để người dùng thấy nét vẽ không bị mất trong lúc chờ Server phản hồi
    const tempElement = { ...currentLine, createdAt: { seconds: Date.now()/1000 } };
    setElements(prev => [...prev, tempElement]); 
    
    const lineToSave = { ...currentLine };
    setCurrentLine(null); // Reset nét tạm

    // Gửi lên Server
    try {
      await addDoc(collection(db, "whiteboards", boardId, "elements"), {
        ...lineToSave,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Lỗi lưu nét vẽ:", error);
      toast.error("Không lưu được nét vẽ!");
    }
  };

  // --- 3. TEXT HANDLERS ---
  const handleTextSubmit = async () => {
    if (inputValue.trim()) {
      const newText = {
        type: 'text',
        text: inputValue,
        x: textPos.x,
        y: textPos.y,
        fontSize: fontSize,
        fill: strokeColor,
      };

      // Optimistic Update cho Text
      setElements(prev => [...prev, { ...newText, createdAt: { seconds: Date.now()/1000 } }]);
      
      try {
        await addDoc(collection(db, "whiteboards", boardId, "elements"), {
          ...newText,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Lỗi lưu text:", error);
      }
    }
    setIsTyping(false);
    setInputValue("");
  };

  // --- 4. ACTIONS ---
  const handleClear = async () => {
    if(!confirm("Xóa toàn bộ bảng này?")) return;
    try {
      const batch = writeBatch(db);
      const snap = await getDocs(collection(db, "whiteboards", boardId, "elements"));
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      setElements([]); // Xóa local ngay cho mượt
    } catch (error) {
      console.error("Lỗi xóa bảng:", error);
    }
  };

  const handleExport = () => {
    const stage = document.querySelector('.konva-stage canvas');
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
        {/* Header */}
        <div className="wb-header">
          <span className="wb-title"><Cloud size={18} /> {title || "Bảng trắng"}</span>
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

        {/* Canvas */}
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
              <Line points={[0,0, 10000,0, 10000,10000, 0,10000]} closed fill="white" />
              
              {/* Render danh sách elements */}
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

              {/* Render nét đang vẽ dở */}
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

          {/* Input Text */}
          {isTyping && (
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
              style={{
                position: 'fixed', 
                top: textPos.y + 'px', left: textPos.x + 'px',
                fontSize: fontSize + 'px', color: strokeColor, lineHeight: 1,
                border: '1px dashed #2563eb', background: 'rgba(255,255,255,0.8)', 
                outline: 'none', resize: 'none', minWidth: '50px', zIndex: 99999
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