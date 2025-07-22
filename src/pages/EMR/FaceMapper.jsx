import React, { useRef, useState } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

const FaceMapper = ({ onDrawingComplete }) => {
  const [tool, setTool] = useState('pen');
  const [lines, setLines] = useState([]);
  const [points, setPoints] = useState([]);
  const [tempLine, setTempLine] = useState(null);
  const [image] = useImage('../facediagram.jpg');
  const isDrawing = useRef(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });

  const [labelInput, setLabelInput] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 });

  const inputRef = useRef(null);

  const imageWidth = 400;
  const imageHeight = 400;
  const stageWidth = 400;
  const stageHeight = 400;

  const imageX = (stageWidth - imageWidth) / 2;
  const imageY = (stageHeight - imageHeight) / 2;

  const handleMouseDown = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    if (tool === 'pen') {
      isDrawing.current = true;
      setLines([...lines, { tool: 'pen', points: [pos.x, pos.y] }]);
    } else if (tool === 'point') {
      setLabelPos({ x: pos.x, y: pos.y });
      setShowLabelInput(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else if (tool === 'line') {
      if (!tempLine) {
        setTempLine({ x1: pos.x, y1: pos.y });
      } else {
        const newLine = {
          tool: 'line',
          points: [tempLine.x1, tempLine.y1, pos.x, pos.y]
        };
        const midX = (tempLine.x1 + pos.x) / 2;
        const midY = (tempLine.y1 + pos.y) / 2;
        setLines([...lines, newLine]);
        setTempLine(null);
        setLabelPos({ x: midX, y: midY });
        setShowLabelInput(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool !== 'pen') return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    const updatedLines = [...lines.slice(0, -1), lastLine];
    setLines(updatedLines);
  };

  const handleMouseUp = () => {
    if (isDrawing.current && tool === 'pen') {
        isDrawing.current = false;
        const lastLine = lines[lines.length - 1];
        const lastPoint = lastLine.points.slice(-2); // [x, y]
        setLabelPos({ x: lastPoint[0], y: lastPoint[1] });
        setShowLabelInput(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
  };

  const handleClear = () => {
    setLines([]);
    setPoints([]);
    setTempLine(null);
    setShowLabelInput(false);
    onDrawingComplete({ lines: [], points: [] });
  };

  const handleLabelSubmit = () => {
      const newLabel = labelInput.trim();
        if (!newLabel) {
          setShowLabelInput(false);
          return;
        }
        setHistory([...history, { lines, points }]);
        setRedoStack([]);

        if (tool === 'point') {
         const newPoint = {
           x: Math.round(labelPos.x),
           y: Math.round(labelPos.y),
           label: newLabel
         };
          const updatedPoints = [...points, newPoint];
          setPoints(updatedPoints);
          onDrawingComplete({ lines, points: updatedPoints });
        } else if (tool === 'line' || tool === 'pen') {
          const updatedLines = [...lines];
          const lastIndex = updatedLines.length - 1;

          updatedLines[lastIndex].points = updatedLines[lastIndex].points.map(p => Math.round(p));
          updatedLines[lastIndex].label = newLabel;

          setLines(updatedLines);
          onDrawingComplete({ lines: updatedLines, points });
        }

        setLabelInput('');
        setShowLabelInput(false);
    };

    const handleUndo = () => {
      if (history.length === 0) return;
      const last = history[history.length - 1];
      setRedoStack([{ lines, points }, ...redoStack]);
      setLines(last.lines);
      setPoints(last.points);
      setHistory(history.slice(0, -1));
    };

    const handleRedo = () => {
      if (redoStack.length === 0) return;
      const next = redoStack[0];
      setHistory([...history, { lines, points }]);
      setLines(next.lines);
      setPoints(next.points);
      setRedoStack(redoStack.slice(1));
    };

  return (
      <div style={{ marginTop: '1rem', position: 'relative' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label><strong>Tool:</strong></label>
          <button onClick={() => setTool('pen')} style={{ marginLeft: '1rem' }}>✏️ Pen</button>
          <button onClick={() => setTool('point')} style={{ marginLeft: '0.5rem' }}>📍 Point</button>
          <button onClick={() => setTool('line')} style={{ marginLeft: '0.5rem' }}>📏 Line</button>
          <button onClick={handleClear} style={{ marginLeft: '1rem', color: 'red' }}>🧹 Clear</button>
          <button onClick={handleUndo} style={{ marginLeft: '1rem' }}>↩️ Undo</button>
          <button onClick={handleRedo} style={{ marginLeft: '0.5rem' }}>↪️ Redo</button>
        </div>

        {showLabelInput && (
          <input
            ref={inputRef}
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleLabelSubmit()}
            placeholder="Enter label"
            style={{
              position: 'absolute',
              top: labelPos.y + 60 + 'px',
              left: labelPos.x + 10 + 'px',
              zIndex: 10,
              padding: '4px',
              fontSize: '14px'
            }}
          />
        )}

        <Stage
          width={stageWidth}
          height={stageHeight}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer>
            {image && (
              <KonvaImage image={image} x={imageX} y={imageY} width={imageWidth} height={imageHeight} />
            )}

            {lines.map((line, i) => (
              <React.Fragment key={i}>
                <Line
                  points={line.points}
                  stroke={line.tool === 'line' ? 'blue' : '#df4b26'}
                  strokeWidth={2}
                  tension={0.5}
                  lineCap="round"
                  globalCompositeOperation="source-over"
                />
                {line.label && (
                  <Text
                    text={line.label}
                    x={(line.points[0] + line.points[line.points.length - 2]) / 2 + 10}
                    y={(line.points[1] + line.points[line.points.length - 1]) / 2 - 10}
                    fontSize={14}
                    fill="black"
                  />
                )}
              </React.Fragment>
            ))}
            {points.map((p, i) => (
              <React.Fragment key={`point-${i}`}>
                <Circle
                  x={p.x}
                  y={p.y}
                  radius={5}
                  fill="green"
                  onMouseEnter={() => setTooltip({ visible: true, text: p.label, x: p.x + 10, y: p.y - 10 })}
                  onMouseLeave={() => setTooltip({ visible: false, text: '', x: 0, y: 0 })}
                />
                {p.label && (
                  <Text
                    text={p.label}
                    x={p.x + 8}
                    y={p.y - 10}
                    fontSize={14}
                    fill="black"
                  />
                )}
              </React.Fragment>
            ))}
            {tooltip.visible && (
              <Text
                text={tooltip.text}
                x={tooltip.x}
                y={tooltip.y}
                fontSize={14}
                fill="black"
              />
            )}
          </Layer>
        </Stage>
      </div>
    );
  };

  export default FaceMapper;