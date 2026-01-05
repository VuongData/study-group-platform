import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import { 
  Pencil, Type, Eraser, Trash2, Download, 
  Minus, Plus, Palette, Send, X as CloseIcon 
} from 'lucide-react';
import './Whiteboard.scss';

const Whiteboard = ({ onClose, onSendToChat }) => {
  // --- STATE ---
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'text'
  const [lines, setLines] = useState([]);
  const [texts, setTexts] = useState([]);
  
  // Settings
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [fontSize, setFontSize] = useState(20);

  // Text Input State
  const [isTyping, setIsTyping] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputValue, setInputValue] = useState("");
  
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const textareaRef = useRef(null);

  // --- DRAWING HANDLERS ---
  const handleMouseDown = (e) => {
    if (isTyping) return;
    const pos = e.target.getStage().getPointerPosition();

    if (tool === 'text') {
      setIsTyping(true);
      setTextPos({ x: pos.x, y: pos.y });
      setInputValue("");
      setTimeout(() => textareaRef.current?.focus(), 100);
      return;
    }

    isDrawing.current = true;
    setLines([...lines, { tool, points: [pos.x, pos.y], color: strokeColor, width: strokeWidth }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool === 'text') return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => { isDrawing.current = false; };

  // --- TEXT HANDLERS ---
  const handleTextSubmit = () => {
    if (inputValue.trim()) {
      setTexts([...texts, { x: textPos.x, y: textPos.y, text: inputValue, fontSize: fontSize, fill: strokeColor }]);
    }
    setIsTyping(false); setInputValue("");
  };

  // --- ACTIONS ---
  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSend = () => {
    if (lines.length === 0 && texts.length === 0) return alert("Bảng trắng đang trống!");
    const dataUrl = stageRef.current.toDataURL();
    onSendToChat(dataUrl); // Gửi ảnh về ChatRoom
  };

  return (
    <div className="whiteboard-overlay">
      <div className="whiteboard-container">
        
        {/* Nút đóng */}
        <button className="btn-close-wb" onClick={onClose} title="Đóng bảng"><CloseIcon size={24}/></button>

        {/* TOOLBAR */}
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
               <div className="stepper">
                  <button onClick={() => tool === 'text' ? setFontSize(s=>Math.max(10,s-2)) : setStrokeWidth(s=>Math.max(1,s-1))}><Minus size={14}/></button>
                  <span style={{fontSize: 12, width: 20, textAlign:'center'}}>{tool === 'text' ? fontSize : strokeWidth}</span>
                  <button onClick={() => tool === 'text' ? setFontSize(s=>Math.min(100,s+2)) : setStrokeWidth(s=>Math.min(50,s+1))}><Plus size={14}/></button>
               </div>
            </div>
          </div>
          <div className="divider"></div>
          <div className="group actions">
            <button onClick={() => {if(confirm("Xóa hết?")) {setLines([]); setTexts([])}}} className="btn-danger"><Trash2 size={20} /></button>
            <button onClick={handleExport} title="Tải về máy"><Download size={20} /></button>
            {/* Nút gửi vào nhóm */}
            <button onClick={handleSend} className="btn-primary" title="Gửi vào nhóm"><Send size={20} /> Gửi</button>
          </div>
        </div>

        {/* CANVAS */}
        <div className="canvas-wrapper" style={{ cursor: tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : 'crosshair' }}>
          <Stage
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            ref={stageRef}
          >
            <Layer>
              <React.Fragment>
                <div style={{background: 'white', width: '10000px', height: '10000px', position:'absolute'}} />
              </React.Fragment>
              {/* Nền trắng (Hack: Vẽ một hình chữ nhật trắng lớn làm nền nếu muốn xuất ảnh không bị trong suốt) */}
              <Line points={[0,0, 10000,0, 10000,10000, 0,10000]} closed fill="white" />
              
              {texts.map((t, i) => <Text key={i} {...t} fontFamily="Inter" />)}
              {lines.map((l, i) => (
                <Line
                  key={i}
                  points={l.points}
                  stroke={l.tool === 'eraser' ? '#ffffff' : l.color}
                  strokeWidth={l.width}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={l.tool === 'eraser' ? 'destination-out' : 'source-over'}
                />
              ))}
            </Layer>
          </Stage>
          {isTyping && (
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleTextSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); } }}
              style={{
                position: 'absolute', top: textPos.y + 'px', left: textPos.x + 'px',
                fontSize: fontSize + 'px', color: strokeColor,
                border: '1px dashed #2563eb', background: 'transparent', outline: 'none', resize: 'none', minWidth: '100px',
                zIndex: 100
              }}
              placeholder="Nhập..."
              autoFocus
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;