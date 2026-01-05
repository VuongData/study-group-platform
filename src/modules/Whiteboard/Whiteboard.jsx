import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';
import { 
  Pencil, Type, Eraser, Trash2, Download, 
  Minus, Plus, Palette, MousePointer2 
} from 'lucide-react';
import './Whiteboard.scss';

const Whiteboard = () => {
  // --- STATE ---
  const [tool, setTool] = useState('pen'); // 'pen', 'eraser', 'text'
  const [lines, setLines] = useState([]); // Lưu các nét vẽ
  const [texts, setTexts] = useState([]); // Lưu các đoạn văn bản
  
  // Cấu hình hiện tại
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [fontSize, setFontSize] = useState(20);

  // State xử lý nhập văn bản
  const [isTyping, setIsTyping] = useState(false);
  const [textPos, setTextPos] = useState({ x: 0, y: 0 });
  const [inputValue, setInputValue] = useState("");
  
  const isDrawing = useRef(false);
  const stageRef = useRef(null);
  const textareaRef = useRef(null);

  // --- HÀM VẼ (DRAWING) ---
  const handleMouseDown = (e) => {
    // Nếu đang nhập text thì không vẽ
    if (isTyping) return;

    const pos = e.target.getStage().getPointerPosition();

    // 1. Logic cho Công cụ Text
    if (tool === 'text') {
      setIsTyping(true);
      setTextPos({ x: pos.x, y: pos.y });
      setInputValue("");
      // Đợi render xong textarea thì focus vào
      setTimeout(() => textareaRef.current?.focus(), 100);
      return;
    }

    // 2. Logic cho Bút / Tẩy
    isDrawing.current = true;
    setLines([...lines, { 
      tool, 
      points: [pos.x, pos.y], 
      color: strokeColor, 
      width: strokeWidth 
    }]);
  };

  const handleMouseMove = (e) => {
    // Chỉ vẽ khi đang giữ chuột và không phải tool text
    if (!isDrawing.current || tool === 'text') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    // Cập nhật nét vẽ cuối cùng
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // Thay thế mảng lines (cách này giúp React render lại mượt mà)
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  // --- HÀM XỬ LÝ TEXT INPUT ---
  const handleTextSubmit = () => {
    if (inputValue.trim()) {
      setTexts([
        ...texts,
        {
          x: textPos.x,
          y: textPos.y,
          text: inputValue,
          fontSize: fontSize,
          fill: strokeColor
        }
      ]);
    }
    setIsTyping(false);
    setInputValue("");
  };

  // --- HÀM TIỆN ÍCH ---
  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    const link = document.createElement('a');
    link.download = 'whiteboard-drawing.png';
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    if(confirm("Xóa trắng bảng?")) {
      setLines([]);
      setTexts([]);
    }
  };

  // Xác định kiểu con trỏ chuột
  const getCursorStyle = () => {
    if (tool === 'text') return 'text'; // Chữ I
    if (tool === 'eraser') return 'cell';
    return 'crosshair';
  };

  return (
    <div className="whiteboard-container">
      {/* TOOLBAR */}
      <div className="toolbar">
        <div className="group tools">
          <button className={tool === 'pen' ? 'active' : ''} onClick={() => setTool('pen')} title="Bút vẽ"><Pencil size={20} /></button>
          <button className={tool === 'text' ? 'active' : ''} onClick={() => setTool('text')} title="Nhập văn bản"><Type size={20} /></button>
          <button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} title="Tẩy"><Eraser size={20} /></button>
        </div>

        <div className="divider"></div>

        {/* SETTINGS (Màu sắc, kích thước) */}
        <div className="group settings">
          <div className="color-picker-wrapper" title="Chọn màu">
            <Palette size={20} color={strokeColor}/>
            <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} />
          </div>

          <div className="size-control" title={tool === 'text' ? "Cỡ chữ" : "Độ dày nét"}>
             {tool === 'text' ? <span style={{fontSize: 12}}>Size: {fontSize}</span> : <span style={{fontSize: 12}}>Width: {strokeWidth}</span>}
             <div className="stepper">
                <button onClick={() => tool === 'text' ? setFontSize(s => Math.max(10, s-2)) : setStrokeWidth(s => Math.max(1, s-1))}><Minus size={14}/></button>
                <button onClick={() => tool === 'text' ? setFontSize(s => Math.min(100, s+2)) : setStrokeWidth(s => Math.min(50, s+1))}><Plus size={14}/></button>
             </div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="group actions">
          <button onClick={handleClear} title="Xóa tất cả" className="btn-danger"><Trash2 size={20} /></button>
          <button onClick={handleExport} title="Lưu ảnh"><Download size={20} /></button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div className="canvas-wrapper" style={{ cursor: getCursorStyle() }}>
        <Stage
          width={window.innerWidth - 350} // Trừ đi sidebar (nếu có)
          height={window.innerHeight - 80}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          ref={stageRef}
          className="konva-stage"
        >
          <Layer>
            {/* 1. Render Văn bản đã nhập */}
            {texts.map((text, i) => (
              <Text
                key={i}
                x={text.x}
                y={text.y}
                text={text.text}
                fontSize={text.fontSize}
                fill={text.fill}
                fontFamily="Inter, sans-serif"
              />
            ))}

            {/* 2. Render Nét vẽ */}
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.tool === 'eraser' ? '#ffffff' : line.color}
                strokeWidth={line.width}
                tension={0.5} // Làm mềm nét vẽ
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === 'eraser' ? 'destination-out' : 'source-over'
                }
              />
            ))}
          </Layer>
        </Stage>

        {/* 3. Ô nhập liệu (Input Overlay) */}
        {isTyping && (
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleTextSubmit} // Click ra ngoài là lưu
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            style={{
              position: 'absolute',
              top: textPos.y + 'px',
              left: textPos.x + 'px',
              fontSize: fontSize + 'px',
              color: strokeColor,
              border: '1px dashed #2563eb',
              background: 'transparent',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
              minWidth: '100px',
              minHeight: '1.2em',
              zIndex: 10
            }}
            placeholder="Nhập text..."
          />
        )}
      </div>
    </div>
  );
};

export default Whiteboard;