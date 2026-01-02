import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Download, Trash2, Sliders, Type, Undo, Redo, 
  Wand2, Crop, PenTool, Eraser, 
  Layers, Check, Grid3x3, Palette,
  Menu, XCircle, Layout, Eye, EyeOff, Plus, ArrowUp, ArrowDown
} from 'lucide-react';

// Error ID Generator for White House Grade Logging
const generateErrorId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9).toUpperCase();
  return `SIG-${timestamp}-${random}`;
};

const logError = (code: string, message: string, context?: any) => {
  const errorId = generateErrorId();
  console.error(`[ERROR ${errorId}] [${code}] ${message}`, context || '');
  return errorId;
};

const logWarning = (code: string, message: string, context?: any) => {
  const warnId = generateErrorId();
  console.warn(`[WARN ${warnId}] [${code}] ${message}`, context || '');
  return warnId;
};

const logInfo = (code: string, message: string, context?: any) => {
  const infoId = generateErrorId();
  console.info(`[INFO ${infoId}] [${code}] ${message}`, context || '');
  return infoId;
};

// --- Types ---
type Point = { x: number; y: number; pressure?: number; time?: number };

type Stroke = {
  points: Point[];
  color: string;
  width: number;
  type: 'pen' | 'monoline' | 'brush';
  isEraser?: boolean;
  jitter?: number;
};

type TextObject = {
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  x: number;
  y: number;
};

type LayerType = 'ink' | 'text';

type Layer = {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  data: Stroke[] | TextObject;
};

type GridConfig = {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
  snap: boolean;
};

const SignatureMakerPro = () => {
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- State: Data Model (Vector Layers) ---
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'layer-1', name: 'Ink Layer 1', type: 'ink', visible: true, locked: false, data: [] }
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('layer-1');
  
  // History
  const [history, setHistory] = useState<Layer[][]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [maxHistorySteps] = useState(30);

  // --- State: Tools ---
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [eraserWidth, setEraserWidth] = useState(20);
  const [penType, setPenType] = useState<'pen' | 'monoline' | 'brush'>('pen');
  const [jitter, setJitter] = useState(0);
  
  // --- State: Canvas Settings ---
  const [backgroundColor, setBackgroundColor] = useState<string>('transparent');
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [isTrimmed, setIsTrimmed] = useState(true);
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    enabled: false,
    size: 40,
    color: '#94a3b8',
    opacity: 0.2,
    snap: false
  });
  
  // --- State: Text Mode ---
  const [activeTab, setActiveTab] = useState<'draw' | 'type' | 'layers' | 'settings'>('draw');
  const [textInput, setTextInput] = useState('');
  const [fontFamily, setFontFamily] = useState('Great Vibes');
  const [fontSize, setFontSize] = useState(60);

  // --- State: UI ---
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Temporary stroke storage during interaction
  const currentStroke = useRef<Point[]>([]);

  // 1. Render Engine (Vector)
  // ----------------------------------------------------------------
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      logError('RENDER_001', 'Canvas ref is null during render');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logError('RENDER_002', 'Failed to get 2D context from canvas');
      return;
    }

    try {
      logInfo('RENDER_100', 'Starting canvas render', { layerCount: layers.length });
      
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // --- Render Layers ---
      layers.forEach((layer, index) => {
        if (!layer.visible) {
          logInfo('RENDER_101', `Skipping hidden layer: ${layer.name}`);
          return;
        }

        if (layer.type === 'ink') {
          const strokes = layer.data as Stroke[];
          
          ctx.save();
          strokes.forEach((stroke, strokeIndex) => {
            if (stroke.points.length < 1) {
              logWarning('RENDER_201', `Empty stroke at index ${strokeIndex} in layer ${layer.name}`);
              return;
            }
            
            try {
              ctx.beginPath();
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              
              if (stroke.isEraser) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = stroke.width;
                ctx.strokeStyle = 'rgba(0,0,0,1)';
              } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.width;
              }

              // Draw Stroke
              if (stroke.points.length < 3) {
                const p = stroke.points[0];
                ctx.fillStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : stroke.color;
                ctx.arc(p.x, p.y, stroke.width / 2, 0, Math.PI * 2);
                ctx.fill();
              } else {
                ctx.beginPath();
                ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                
                for (let i = 1; i < stroke.points.length - 1; i++) {
                  const p0 = stroke.points[i];
                  const p1 = stroke.points[i+1];
                  const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
                  
                  let jx = 0, jy = 0;
                  if (stroke.jitter && stroke.jitter > 0) {
                    jx = (Math.random() - 0.5) * stroke.jitter;
                    jy = (Math.random() - 0.5) * stroke.jitter;
                  }
                  
                  ctx.quadraticCurveTo(p0.x + jx, p0.y + jy, mid.x + jx, mid.y + jy);
                }
                
                const last = stroke.points[stroke.points.length - 1];
                ctx.lineTo(last.x, last.y);
                ctx.stroke();
              }
            } catch (error) {
              logError('RENDER_301', `Failed to render stroke ${strokeIndex}`, error);
            }
          });
          ctx.restore();
        } 
        else if (layer.type === 'text') {
          const textObj = layer.data as TextObject;
          try {
            ctx.save();
            ctx.font = `${textObj.fontSize}px "${textObj.fontFamily}"`;
            ctx.fillStyle = textObj.color;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(textObj.text, textObj.x, textObj.y);
            ctx.restore();
            logInfo('RENDER_102', `Rendered text layer: ${layer.name}`);
          } catch (error) {
            logError('RENDER_302', `Failed to render text layer ${layer.name}`, error);
          }
        }
      });
      
      logInfo('RENDER_103', 'Canvas render completed successfully');
    } catch (error) {
      logError('RENDER_999', 'Critical error during canvas render', error);
    }
  }, [layers]);

  // Init Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas) {
      logError('INIT_001', 'Canvas element not found during initialization');
      return;
    }
    
    if (!container) {
      logError('INIT_002', 'Container element not found during initialization');
      return;
    }

    try {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 2;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      logInfo('INIT_100', 'Canvas initialized', { 
        width: canvas.width, 
        height: canvas.height, 
        dpr 
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        renderCanvas();
        logInfo('INIT_101', 'Canvas context scaled and rendered');
      } else {
        logError('INIT_003', 'Failed to get canvas 2D context');
      }
    } catch (error) {
      logError('INIT_999', 'Critical error during canvas initialization', error);
    }
  }, [renderCanvas]);

  // 2. History System
  // ----------------------------------------------------------------
  const saveHistory = useCallback(() => {
    try {
      const snapshot = JSON.parse(JSON.stringify(layers));
      setHistory(prev => {
        const newHistory = prev.slice(0, historyStep + 1);
        if (newHistory.length >= maxHistorySteps) {
          newHistory.shift();
          logInfo('HISTORY_100', 'History buffer full, removing oldest entry');
        }
        return [...newHistory, snapshot];
      });
      setHistoryStep(prev => Math.min(prev + 1, maxHistorySteps - 1));
      logInfo('HISTORY_101', 'History state saved', { step: historyStep + 1 });
    } catch (error) {
      logError('HISTORY_001', 'Failed to save history state', error);
    }
  }, [layers, historyStep, maxHistorySteps]);

  // Initial history save
  useEffect(() => {
    if (history.length === 0 && layers.length > 0) {
      saveHistory();
      logInfo('HISTORY_102', 'Initial history state created');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const undo = () => {
    if (historyStep > 0) {
      try {
        const prevStep = historyStep - 1;
        setLayers(JSON.parse(JSON.stringify(history[prevStep])));
        setHistoryStep(prevStep);
        logInfo('HISTORY_103', `Undo performed, step: ${prevStep}`);
      } catch (error) {
        logError('HISTORY_002', 'Failed to perform undo', error);
      }
    } else {
      logWarning('HISTORY_201', 'Cannot undo, already at oldest state');
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      try {
        const nextStep = historyStep + 1;
        setLayers(JSON.parse(JSON.stringify(history[nextStep])));
        setHistoryStep(nextStep);
        logInfo('HISTORY_104', `Redo performed, step: ${nextStep}`);
      } catch (error) {
        logError('HISTORY_003', 'Failed to perform redo', error);
      }
    } else {
      logWarning('HISTORY_202', 'Cannot redo, already at newest state');
    }
  };

  // 3. Tool Logic (Input Handling)
  // ----------------------------------------------------------------
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) {
      logError('INPUT_001', 'Canvas ref null in getCoordinates');
      return { x: 0, y: 0 };
    }
    
    try {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      // Grid Snap
      if (gridConfig.enabled && gridConfig.snap) {
        const s = gridConfig.size;
        x = Math.round(x / s) * s;
        y = Math.round(y / s) * s;
        logInfo('INPUT_100', 'Coordinates snapped to grid', { x, y });
      }

      return { x, y, time: Date.now() };
    } catch (error) {
      logError('INPUT_002', 'Failed to calculate coordinates', error);
      return { x: 0, y: 0 };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const activeLayer = layers.find(l => l.id === activeLayerId);
    
    if (!activeLayer) {
      logError('DRAW_001', `Active layer not found: ${activeLayerId}`);
      return;
    }
    
    if (activeLayer.type !== 'ink') {
      logWarning('DRAW_201', `Cannot draw on non-ink layer: ${activeLayer.type}`);
      return;
    }
    
    if (activeLayer.locked) {
      logWarning('DRAW_202', `Layer is locked: ${activeLayer.name}`);
      return;
    }
    
    if (!activeLayer.visible) {
      logWarning('DRAW_203', `Layer is hidden: ${activeLayer.name}`);
      return;
    }

    try {
      e.preventDefault();
      setIsDrawing(true);
      
      const point = getCoordinates(e);
      currentStroke.current = [point];
      
      logInfo('DRAW_100', 'Drawing started', { 
        tool, 
        layer: activeLayer.name,
        point 
      });
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        const w = tool === 'eraser' ? eraserWidth : strokeWidth;
        ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color;
        if (tool !== 'eraser') {
          ctx.fillRect(point.x, point.y, 1, 1);
        }
      }
    } catch (error) {
      logError('DRAW_002', 'Failed to start drawing', error);
    }
  };

  const drawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    try {
      e.preventDefault();
      const point = getCoordinates(e);
      const points = currentStroke.current;
      points.push(point);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && points.length > 2) {
        const p0 = points[points.length - 2];
        const p1 = points[points.length - 1];
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const prevMid = points.length > 3 
          ? { x: (points[points.length-3].x + p0.x)/2, y: (points[points.length-3].y + p0.y)/2 } 
          : p0;

        ctx.beginPath();
        ctx.moveTo(prevMid.x, prevMid.y);
        ctx.quadraticCurveTo(p0.x, p0.y, mid.x, mid.y);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.lineWidth = eraserWidth;
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.lineWidth = calculateWidth(points);
          ctx.strokeStyle = color;
        }
        
        ctx.stroke();
      }
    } catch (error) {
      logError('DRAW_003', 'Error during draw move', error);
    }
  };

  const calculateWidth = (points: Point[]) => {
    if (penType === 'monoline') return strokeWidth;
    
    try {
      const p1 = points[points.length - 1];
      const p2 = points[points.length - 2];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const maxDist = 10;
      const normalized = Math.min(dist, maxDist) / maxDist;
      const variance = penType === 'brush' ? 0.6 : 0.3;
      return strokeWidth * (1 - (normalized * variance));
    } catch (error) {
      logError('DRAW_004', 'Error calculating stroke width', error);
      return strokeWidth;
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    try {
      setIsDrawing(false);
      
      const newStroke: Stroke = {
        points: [...currentStroke.current],
        color: color,
        width: tool === 'eraser' ? eraserWidth : strokeWidth,
        type: penType,
        isEraser: tool === 'eraser',
        jitter: tool === 'eraser' ? 0 : jitter
      };

      logInfo('DRAW_101', 'Drawing stopped, committing stroke', {
        pointCount: newStroke.points.length,
        tool,
        isEraser: newStroke.isEraser
      });

      setLayers(prev => prev.map(l => {
        if (l.id === activeLayerId && l.type === 'ink') {
          return { ...l, data: [...(l.data as Stroke[]), newStroke] };
        }
        return l;
      }));

      setTimeout(saveHistory, 0);
    } catch (error) {
      logError('DRAW_005', 'Failed to stop drawing and save stroke', error);
    }
  };

  // 4. Layer Management
  // ----------------------------------------------------------------
  const addLayer = (type: LayerType) => {
    try {
      const newId = `layer-${Date.now()}`;
      const newLayer: Layer = {
        id: newId,
        name: type === 'ink' ? `Ink Layer ${layers.length + 1}` : `Text Layer ${layers.length + 1}`,
        type,
        visible: true,
        locked: false,
        data: type === 'ink' ? [] : { 
          text: 'Signature', 
          x: 400, y: 200, 
          fontFamily: 'Great Vibes', 
          fontSize: 60, 
          color: '#000000' 
        }
      };
      
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newId);
      saveHistory();
      
      logInfo('LAYER_100', `Added new ${type} layer`, { id: newId, name: newLayer.name });
    } catch (error) {
      logError('LAYER_001', 'Failed to add layer', error);
    }
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) {
      logWarning('LAYER_201', 'Cannot delete last remaining layer');
      return;
    }
    
    try {
      setLayers(prev => prev.filter(l => l.id !== id));
      if (activeLayerId === id) {
        setActiveLayerId(layers[0].id);
      }
      saveHistory();
      logInfo('LAYER_101', `Deleted layer: ${id}`);
    } catch (error) {
      logError('LAYER_002', 'Failed to delete layer', error);
    }
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    try {
      if (direction === 'up' && index < layers.length - 1) {
        const newLayers = [...layers];
        [newLayers[index], newLayers[index + 1]] = [newLayers[index + 1], newLayers[index]];
        setLayers(newLayers);
        saveHistory();
        logInfo('LAYER_102', `Moved layer up from index ${index}`);
      } else if (direction === 'down' && index > 0) {
        const newLayers = [...layers];
        [newLayers[index], newLayers[index - 1]] = [newLayers[index - 1], newLayers[index]];
        setLayers(newLayers);
        saveHistory();
        logInfo('LAYER_103', `Moved layer down from index ${index}`);
      } else {
        logWarning('LAYER_202', `Cannot move layer ${direction}, out of bounds`);
      }
    } catch (error) {
      logError('LAYER_003', 'Failed to move layer', error);
    }
  };

  const toggleVisible = (id: string) => {
    try {
      setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
      logInfo('LAYER_104', `Toggled visibility for layer: ${id}`);
    } catch (error) {
      logError('LAYER_004', 'Failed to toggle layer visibility', error);
    }
  };

  // 5. Text Handling
  // ----------------------------------------------------------------
  const addTextToCanvas = () => {
    if (!textInput.trim()) {
      logWarning('TEXT_201', 'Cannot add empty text');
      return;
    }
    
    try {
      const newId = `layer-${Date.now()}`;
      const newLayer: Layer = {
        id: newId,
        name: `Text: ${textInput.substring(0, 10)}...`,
        type: 'text',
        visible: true,
        locked: false,
        data: {
          text: textInput,
          x: canvasRef.current ? canvasRef.current.width / (window.devicePixelRatio||2) / 2 : 200,
          y: canvasRef.current ? canvasRef.current.height / (window.devicePixelRatio||2) / 2 : 100,
          fontFamily,
          fontSize,
          color
        }
      };
      
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newId);
      setTextInput('');
      saveHistory();
      
      logInfo('TEXT_100', 'Added text layer', { text: textInput, id: newId });
    } catch (error) {
      logError('TEXT_001', 'Failed to add text layer', error);
    }
  };

  const handleTextEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTextToCanvas();
    }
  };

  // 6. Download Logic
  // ----------------------------------------------------------------
  const getExportCanvas = () => {
    const originalCanvas = canvasRef.current;
    if (!originalCanvas) {
      logError('EXPORT_001', 'Original canvas not found for export');
      return null;
    }

    try {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = originalCanvas.width;
      exportCanvas.height = originalCanvas.height;
      const ctx = exportCanvas.getContext('2d');
      
      if (!ctx) {
        logError('EXPORT_002', 'Failed to get export canvas context');
        return null;
      }

      // 1. Draw Background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor === 'custom' ? customBgColor : backgroundColor;
        ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        logInfo('EXPORT_100', 'Background applied', { color: backgroundColor });
      }

      // 2. Draw content
      ctx.drawImage(originalCanvas, 0, 0);
      
      logInfo('EXPORT_101', 'Export canvas prepared');
      return exportCanvas;
    } catch (error) {
      logError('EXPORT_003', 'Failed to create export canvas', error);
      return null;
    }
  };

  const download = (format: 'png' | 'jpg') => {
    try {
      const canvas = getExportCanvas();
      if (!canvas) {
        logError('EXPORT_004', 'No canvas available for download');
        return;
      }

      const link = document.createElement('a');
      link.download = `signature.${format}`;
      link.href = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
      link.click();
      
      logInfo('EXPORT_102', `Downloaded signature as ${format.toUpperCase()}`);
    } catch (error) {
      logError('EXPORT_005', 'Failed to download signature', error);
    }
  };

  // --- UI Components ---
  const inkColors = ['#000000', '#1e293b', '#2563eb', '#dc2626', '#16a34a', '#9333ea'];
  const bgColors = [
    { id: 'transparent', label: 'None', val: 'transparent' },
    { id: 'white', label: 'White', val: '#ffffff' },
    { id: 'paper', label: 'Paper', val: '#f8fafc' },
    { id: 'dark', label: 'Dark', val: '#1e293b' },
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* Animated Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-4 z-30 relative">
        <div className="flex items-center gap-3">
           <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
              {showMobileMenu ? <XCircle /> : <Menu />}
           </button>
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <Wand2 className="text-white relative z-10" size={18} />
           </div>
           <span className="font-bold text-xl hidden xs:block bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Signature Studio</span>
        </div>
        
        <div className="flex items-center gap-2">
           <button onClick={undo} disabled={historyStep <= 0} className="p-2.5 hover:bg-white/10 rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95"><Undo size={18} /></button>
           <button onClick={redo} disabled={historyStep >= history.length - 1} className="p-2.5 hover:bg-white/10 rounded-xl disabled:opacity-30 transition-all hover:scale-105 active:scale-95"><Redo size={18} /></button>
           <div className="w-px h-6 bg-white/10 mx-2" />
           <button onClick={() => { setLayers([{ id: 'l1', name: 'Ink Layer 1', type: 'ink', visible: true, locked: false, data: [] }]); saveHistory(); }} className="flex items-center gap-2 px-4 py-2 hover:bg-red-500/20 bg-red-500/10 text-red-400 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95 border border-red-500/20">
             <Trash2 size={16} /> <span className="hidden sm:inline">Reset</span>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Sidebar Container */}
        <div className={`
            absolute inset-y-0 left-0 z-20 w-80 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-in-out
            md:relative md:transform-none md:flex flex-col shadow-2xl
            ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}
        `}>
           {/* Sidebar Tabs */}
           <div className="flex border-b border-white/10 bg-slate-950/50">
              {[
                { id: 'draw', icon: PenTool, label: 'Draw' },
                { id: 'type', icon: Type, label: 'Type' },
                { id: 'layers', icon: Layers, label: 'Layers' },
                { id: 'settings', icon: Layout, label: 'Grid' },
              ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] font-semibold transition-all relative group ${activeTab === tab.id ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <tab.icon size={18} className="transition-transform group-hover:scale-110" />
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>}
                 </button>
              ))}
           </div>

           {/* Sidebar Content */}
           <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              
              {/* DRAW TAB */}
              {activeTab === 'draw' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                   {/* Tools */}
                   <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                      <button 
                        onClick={() => { setTool('pen'); logInfo('TOOL_100', 'Switched to pen tool'); }}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${tool === 'pen' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                         <PenTool size={16} /> Pen
                      </button>
                      <button 
                        onClick={() => { setTool('eraser'); logInfo('TOOL_101', 'Switched to eraser tool'); }}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${tool === 'eraser' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white/5'}`}
                      >
                         <Eraser size={16} /> Eraser
                      </button>
                   </div>

                   {/* Ink Color */}
                   <div className="space-y-3">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Palette size={12} className="text-indigo-400" /> Ink Color
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {inkColors.map(c => (
                            <button key={c} onClick={() => { setColor(c); logInfo('COLOR_100', 'Color changed', { color: c }); }} className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:border-white/20'}`} style={{ backgroundColor: c }}>
                                {color === c && <Check size={14} className="m-auto text-white drop-shadow-lg" />}
                            </button>
                        ))}
                         <div className="relative group">
                            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); logInfo('COLOR_101', 'Custom color selected', { color: e.target.value }); }} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"><Palette size={16} className="text-white"/></div>
                        </div>
                      </div>
                   </div>

                   {/* Pen Physics */}
                   <div className="space-y-4 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Sliders size={12} className="text-indigo-400" /> Physics
                      </label>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs"><span className="text-slate-400">Size</span><span className="font-bold text-indigo-400">{tool === 'eraser' ? eraserWidth : strokeWidth}px</span></div>
                        <div className="relative">
                          <input 
                             type="range" min="1" max={tool === 'eraser' ? 50 : 20} 
                             value={tool === 'eraser' ? eraserWidth : strokeWidth} 
                             onChange={(e) => { 
                               const val = +e.target.value;
                               if (tool === 'eraser') {
                                 setEraserWidth(val);
                                 logInfo('PHYSICS_100', 'Eraser width changed', { width: val });
                               } else {
                                 setStrokeWidth(val);
                                 logInfo('PHYSICS_101', 'Stroke width changed', { width: val });
                               }
                             }} 
                             className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer"
                          />
                          <div className="absolute -top-1 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full pointer-events-none" style={{width: `${((tool === 'eraser' ? eraserWidth : strokeWidth) / (tool === 'eraser' ? 50 : 20)) * 100}%`}}></div>
                        </div>
                      </div>

                      {tool === 'pen' && (
                        <>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs"><span className="text-slate-400">Jitter (Roughness)</span><span className="font-bold text-indigo-400">{jitter}</span></div>
                                <div className="relative">
                                  <input type="range" min="0" max="10" value={jitter} onChange={(e) => { setJitter(+e.target.value); logInfo('PHYSICS_102', 'Jitter changed', { jitter: +e.target.value }); }} className="w-full h-2 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer" />
                                  <div className="absolute -top-1 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full pointer-events-none" style={{width: `${(jitter / 10) * 100}%`}}></div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-2">
                                {(['pen', 'brush', 'monoline'] as const).map(t => (
                                    <button key={t} onClick={() => { setPenType(t); logInfo('PHYSICS_103', 'Pen type changed', { type: t }); }} className={`py-1.5 rounded text-[10px] uppercase font-bold border transition-all ${penType === t ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>{t}</button>
                                ))}
                            </div>
                        </>
                      )}
                   </div>
                </div>
              )}

              {/* TYPE TAB */}
              {activeTab === 'type' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Signature Text</label>
                          <input 
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            onKeyDown={handleTextEnter}
                            placeholder="Type Name & Press Enter"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-indigo-500"
                          />
                          <p className="text-[10px] text-slate-500">Press Enter to place on canvas</p>
                      </div>
                      
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase">Font</label>
                          <div className="grid grid-cols-1 gap-2">
                              {['Great Vibes', 'Dancing Script', 'Sacramento', 'Caveat', 'Monsieur La Doulaise'].map(f => (
                                  <button key={f} onClick={() => { setFontFamily(f); logInfo('FONT_100', 'Font changed', { font: f }); }} className={`p-3 rounded-lg border text-left flex justify-between items-center transition-all ${fontFamily === f ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-600'}`}>
                                      <span style={{ fontFamily: f }} className="text-xl">Sign Here</span>
                                      {fontFamily === f && <Check size={14} className="text-indigo-400"/>}
                                  </button>
                              ))}
                          </div>
                      </div>
                      
                      <button onClick={addTextToCanvas} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95">Add Text Layer</button>
                  </div>
              )}

              {/* LAYERS TAB */}
              {activeTab === 'layers' && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase">Layers</label>
                        <button onClick={() => addLayer('ink')} className="text-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 rounded-lg flex gap-1 items-center font-semibold shadow-lg transition-all hover:scale-105"><Plus size={10}/> Add Ink</button>
                     </div>
                     <div className="space-y-2">
                         {[...layers].reverse().map((layer, reverseIndex) => {
                             const index = layers.length - 1 - reverseIndex;
                             return (
                                 <div key={layer.id} onClick={() => { setActiveLayerId(layer.id); logInfo('LAYER_105', 'Active layer changed', { id: layer.id, name: layer.name }); }} className={`group p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${activeLayerId === layer.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-600'}`}>
                                     <button onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }} className="text-slate-400 hover:text-white">
                                         {layer.visible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                     </button>
                                     <div className="flex-1 truncate">
                                         <div className="text-sm font-medium">{layer.name}</div>
                                         <div className="text-[10px] text-slate-500 uppercase">{layer.type}</div>
                                     </div>
                                     <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button onClick={(e) => { e.stopPropagation(); moveLayer(index, 'up'); }} className="hover:text-white text-slate-500"><ArrowUp size={10}/></button>
                                         <button onClick={(e) => { e.stopPropagation(); moveLayer(index, 'down'); }} className="hover:text-white text-slate-500"><ArrowDown size={10}/></button>
                                     </div>
                                     <button onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-slate-500 hover:text-red-400"><Trash2 size={14}/></button>
                                 </div>
                             );
                         })}
                     </div>
                 </div>
              )}

              {/* GRID SETTINGS TAB */}
              {activeTab === 'settings' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase">Background</label>
                          <div className="grid grid-cols-4 gap-2">
                              {bgColors.map(bg => (
                                  <button key={bg.id} onClick={() => { setBackgroundColor(bg.val); if(bg.id==='white') setCustomBgColor('#ffffff'); logInfo('BG_100', 'Background changed', { bg: bg.id }); }} className={`aspect-square rounded border flex items-center justify-center transition-all ${backgroundColor === bg.val ? 'border-indigo-500' : 'border-slate-700 hover:border-slate-600'}`}>
                                      <div className="w-4 h-4 rounded-full border border-slate-500" style={{background: bg.val === 'transparent' ? 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 10px 10px' : bg.val}}/>
                                  </button>
                              ))}
                              <div className="relative aspect-square rounded border border-slate-700 flex items-center justify-center hover:border-slate-600 transition-all">
                                  <input type="color" value={customBgColor} onChange={e => { setCustomBgColor(e.target.value); setBackgroundColor('custom'); logInfo('BG_101', 'Custom background color', { color: e.target.value }); }} className="absolute inset-0 opacity-0 cursor-pointer"/>
                                  <div className="w-4 h-4 rounded-full" style={{background: customBgColor}}/>
                              </div>
                          </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-white/5">
                          <div className="flex items-center justify-between">
                              <label className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center"><Grid3x3 size={12}/> Grid Guide</label>
                              <button onClick={() => { setGridConfig(p => ({...p, enabled: !p.enabled})); logInfo('GRID_100', 'Grid toggled', { enabled: !gridConfig.enabled }); }} className={`w-8 h-4 rounded-full transition-colors relative ${gridConfig.enabled ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                                  <div className={`w-2 h-2 bg-white rounded-full absolute top-1 transition-all ${gridConfig.enabled ? 'left-5' : 'left-1'}`}/>
                              </button>
                          </div>
                          
                          {gridConfig.enabled && (
                              <div className="space-y-3 pl-2 border-l-2 border-slate-700">
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-400"><span>Size</span><span>{gridConfig.size}px</span></div>
                                      <input type="range" min="10" max="100" value={gridConfig.size} onChange={e => setGridConfig(p => ({...p, size: +e.target.value}))} className="w-full h-1 bg-slate-700 rounded-full"/>
                                  </div>
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-slate-400"><span>Opacity</span><span>{(gridConfig.opacity*100).toFixed(0)}%</span></div>
                                      <input type="range" min="0.1" max="1" step="0.1" value={gridConfig.opacity} onChange={e => setGridConfig(p => ({...p, opacity: +e.target.value}))} className="w-full h-1 bg-slate-700 rounded-full"/>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <input type="checkbox" checked={gridConfig.snap} onChange={e => { setGridConfig(p => ({...p, snap: e.target.checked})); logInfo('GRID_101', 'Snap to grid toggled', { snap: e.target.checked }); }} className="rounded bg-slate-700 border-none text-indigo-500"/>
                                      <span className="text-xs text-slate-300">Snap to Grid</span>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              )}
           </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 bg-gradient-to-br from-slate-950 to-slate-900 relative flex flex-col">
           <div className="flex-1 p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
              {/* Decorative elements */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500 rounded-full blur-3xl"></div>
              </div>
              
              <div 
                 ref={containerRef}
                 className="relative w-full max-w-3xl aspect-[2/1] bg-white rounded-2xl shadow-2xl shadow-indigo-500/10 overflow-hidden cursor-crosshair group ring-1 ring-white/20 hover:ring-indigo-500/30 transition-all z-10"
                 style={{ 
                    backgroundColor: backgroundColor === 'transparent' ? '#ffffff' : (backgroundColor === 'custom' ? customBgColor : backgroundColor),
                    backgroundImage: backgroundColor === 'transparent' ? 'radial-gradient(#cbd5e1 1px, transparent 1px)' : 'none',
                    backgroundSize: '20px 20px',
                 }}
              >
                 {/* Grid Overlay */}
                 {gridConfig.enabled && (
                     <div className="absolute inset-0 pointer-events-none z-0"
                          style={{
                              backgroundImage: `linear-gradient(to right, ${gridConfig.color} 1px, transparent 1px), linear-gradient(to bottom, ${gridConfig.color} 1px, transparent 1px)`,
                              backgroundSize: `${gridConfig.size}px ${gridConfig.size}px`,
                              opacity: gridConfig.opacity
                          }}
                     />
                 )}
                 {backgroundColor === 'transparent' && <div className="absolute inset-0 bg-white/60 pointer-events-none z-0" />}
                 
                 <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={drawMove}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={drawMove}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 touch-none z-10 w-full h-full"
                 />
              </div>
           </div>

           {/* Footer Toolbar */}
           <div className="bg-slate-900/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <button onClick={() => { setIsTrimmed(!isTrimmed); logInfo('TRIM_100', 'Auto-trim toggled', { enabled: !isTrimmed }); }} className={`text-xs font-semibold flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isTrimmed ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-slate-500 border-slate-700 hover:border-slate-600'}`}>
                  <Crop size={14} /> Auto-Trim {isTrimmed && <Check size={12} />}
              </button>
              <div className="flex gap-3 w-full sm:w-auto">
                 <button onClick={() => download('png')} className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:scale-105 active:scale-95">
                   <Download size={16}/> Download PNG
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SignatureMakerPro;
