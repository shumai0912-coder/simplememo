import { useState, useCallback, useEffect, useRef } from 'react'
import { Tldraw, Editor, GeoShapeGeoStyle, createShapeId, exportAs } from 'tldraw'
import { 
  MousePointer2, Hand, Pencil, Eraser, Square, Circle, ArrowUpRight, Type, Undo2, Redo2,
  FileText, Check, ZoomIn, ZoomOut, Maximize, Sigma, Sun, Moon, Download, Grid3X3
} from 'lucide-react'
import { clsx } from 'clsx'
import { useNoteStore } from './store/useNoteStore'
import { NoteExplorer } from './components/NoteExplorer'
import { MathShapeUtil } from './components/MathShapeUtil'

const FONTS = [
  { name: 'サンセリフ', value: 'sans' },
  { name: 'セリフ', value: 'serif' },
  { name: 'モノスペース', value: 'mono' },
  { name: '手書き', value: 'draw' },
]

const customShapes = [MathShapeUtil]

function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [activeTool, setActiveTool] = useState('select')
  const [showExplorer, setShowExplorer] = useState(true)
  const [showFontPicker, setShowFontPicker] = useState(false)
  const [currentFont, setCurrentFont] = useState('sans')
  const [zoomLevel, setZoomLevel] = useState(100)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('thinkspace-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [paperStyle, setPaperStyle] = useState<'plain' | 'grid' | 'dots' | 'ruled'>(() => {
    const saved = localStorage.getItem('thinkspace-paper-style')
    return (saved as 'plain' | 'grid' | 'dots' | 'ruled') || 'plain'
  })
  const [showPaperPicker, setShowPaperPicker] = useState(false)

  const { activeNoteId } = useNoteStore()

  useEffect(() => {
    localStorage.setItem('thinkspace-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (editor) {
      editor.user.updateUserPreferences({
        colorScheme: theme
      })
    }
  }, [theme, editor])

  useEffect(() => {
    localStorage.setItem('thinkspace-paper-style', paperStyle)
  }, [paperStyle])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const handleMount = useCallback((editor: Editor) => {
    setEditor(editor)
    // Apply initial theme preferences after mount
    editor.user.updateUserPreferences({
      colorScheme: theme
    })
  }, [theme])

  // Robust Shift + Scroll Zoom (Blocking Horizontal Panning)
  useEffect(() => {
    const container = containerRef.current
    if (!container || !editor) return

    const handleNativeWheel = (e: WheelEvent) => {
      if (e.shiftKey) {
        e.preventDefault()
        e.stopImmediatePropagation()
        
        const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX
        const rect = container.getBoundingClientRect()
        
        const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }

        if (delta < 0) {
          editor.zoomIn(point as any, { animation: { duration: 120 } })
        } else {
          editor.zoomOut(point as any, { animation: { duration: 120 } })
        }
      }
    }

    container.addEventListener('wheel', handleNativeWheel, { passive: false, capture: true })
    
    return () => {
      container.removeEventListener('wheel', handleNativeWheel, { capture: true })
    }
  }, [editor])

  // Sync Logic (Selection & Zoom Display)
  useEffect(() => {
    if (!editor) return
    
    const updateState = () => {
      const selectedShapes = editor.getSelectedShapes()
      const isTextSelected = selectedShapes.some(s => s.type === 'text' || s.type === 'geo')
      setShowFontPicker(isTextSelected)
      if (isTextSelected) {
        const textShape = selectedShapes.find(s => s.type === 'text' || s.type === 'geo')
        if (textShape && 'font' in textShape.props) {
          setCurrentFont(textShape.props.font as string)
        }
      }
      setZoomLevel(Math.round(editor.getZoomLevel() * 100))
    }

    editor.on('change', updateState)
    return () => {
      editor.off('change', updateState)
    }
  }, [editor])

  const selectTool = (toolId: string, geoType?: any) => {
    if (!editor) return
    editor.setCurrentTool(toolId)
    if (toolId === 'geo' && geoType) {
      editor.setStyleForNextShapes(GeoShapeGeoStyle, geoType)
    }
    setActiveTool(geoType ? `geo-${geoType}` : toolId)
  }

  const changeFont = (font: string) => {
    if (!editor) return
    editor.updateShapes(
      editor.getSelectedShapes().map(shape => ({
        ...shape,
        props: { ...shape.props, font } as any
      }))
    )
    setCurrentFont(font)
  }

  const createMathShape = () => {
    if (!editor) return
    const bounds = editor.getViewportPageBounds()
    const x = bounds.center.x - 120
    const y = bounds.center.y - 40
    
    const id = createShapeId()
    editor.createShape({
      id,
      type: 'math',
      x,
      y,
      props: {
        w: 240,
        h: 80,
        formula: 'f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx'
      }
    })
    
    editor.select(id)
    editor.setEditingShape(id)
    setActiveTool('select')
    editor.setCurrentTool('select')
  }

  const handleExport = async (format: 'png' | 'svg') => {
    if (!editor) return
    let shapeIds = editor.getSelectedShapeIds()
    if (shapeIds.length === 0) {
      shapeIds = Array.from(editor.getCurrentPageShapeIds())
    }
    if (shapeIds.length === 0) {
      alert('エクスポートするオブジェクトがキャンバスにありません。')
      return
    }
    
    try {
      await exportAs(editor, shapeIds, format, `thinkspace-export-${Date.now()}`)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  return (
    <div className="thinkspace-container" style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      backgroundColor: 'var(--bg-app, #f8fafc)',
      overflow: 'hidden' 
    }}>
      {/* Sidebar Explorer */}
      {showExplorer && <NoteExplorer />}

      {/* Main Content Area */}
      <div 
        ref={containerRef}
        className={clsx('canvas-wrapper', activeTool === 'draw' && 'cursor-pen', `paper-${paperStyle}`)}
        style={{ flex: 1, position: 'relative', height: '100%' }}
      >
        <Tldraw 
          key={activeNoteId}
          inferDarkMode={false}
          persistenceKey={`thinkspace-app-${activeNoteId}`}
          hideUi={true}
          onMount={handleMount}
          shapeUtils={customShapes}
        />

        {/* Top-Right Control Bar (Theme & Export & Font Picker) */}
        <div style={{
          position: 'absolute', top: '24px', right: '24px',
          display: 'flex', gap: '8px', pointerEvents: 'none', alignItems: 'center'
        }}>
          {/* Floating Font Picker */}
          {showFontPicker && (
            <div className="glass-panel" style={{ 
              padding: '6px', display: 'flex', gap: '4px', pointerEvents: 'auto', animation: 'slideIn 0.2s ease-out'
            }}>
              {FONTS.map(font => (
                <button 
                  key={font.value}
                  className={clsx('nav-icon', currentFont === font.value && 'active')} 
                  style={{ fontSize: '13px', fontWeight: 600, width: 'auto', padding: '8px 14px', gap: '6px' }}
                  onClick={() => changeFont(font.value)}
                >
                  {currentFont === font.value && <Check size={14} />}
                  {font.name}
                </button>
              ))}
            </div>
          )}

          {/* Floating Paper Picker */}
          {showPaperPicker && (
            <div className="glass-panel" style={{ 
              padding: '6px', display: 'flex', gap: '4px', pointerEvents: 'auto', animation: 'slideIn 0.2s ease-out'
            }}>
              {[
                { name: '無地', value: 'plain' },
                { name: '方眼', value: 'grid' },
                { name: 'ドット', value: 'dots' },
                { name: '罫線', value: 'ruled' }
              ].map(style => (
                <button 
                  key={style.value}
                  className={clsx('nav-icon', paperStyle === style.value && 'active')} 
                  style={{ fontSize: '13px', fontWeight: 600, width: 'auto', padding: '8px 14px', gap: '6px' }}
                  onClick={() => {
                    setPaperStyle(style.value as any)
                    setShowPaperPicker(false)
                  }}
                >
                  {paperStyle === style.value && <Check size={14} />}
                  {style.name}
                </button>
              ))}
            </div>
          )}

          {/* Theme & Export Panel */}
          <div className="glass-panel" style={{
            padding: '6px', display: 'flex', gap: '4px', pointerEvents: 'auto'
          }}>
            <button 
              className={clsx('nav-icon', showPaperPicker && 'active')} 
              onClick={() => setShowPaperPicker(!showPaperPicker)} 
              title="用紙スタイルを変更"
            >
              <Grid3X3 size={20} />
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--divider-color, rgba(0,0,0,0.05))', margin: '0 2px' }} />
            <button className="nav-icon" onClick={toggleTheme} title={theme === 'dark' ? 'ライトモードに変更' : 'ダークモードに変更'}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div style={{ width: '1px', height: '24px', background: 'var(--divider-color, rgba(0,0,0,0.05))', margin: '0 2px' }} />
            <button className="nav-icon" onClick={() => handleExport('png')} title="PNGとしてエクスポート" style={{ fontSize: '11px', fontWeight: 800, padding: '8px 10px', gap: '4px' }}>
              <span>PNG</span>
              <Download size={14} />
            </button>
            <button className="nav-icon" onClick={() => handleExport('svg')} title="SVGとしてエクスポート" style={{ fontSize: '11px', fontWeight: 800, padding: '8px 10px', gap: '4px' }}>
              <span>SVG</span>
              <Download size={14} />
            </button>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="glass-panel" style={{ 
          position: 'absolute', bottom: '24px', right: '24px', padding: '6px',
          display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'auto'
        }}>
          <button className="nav-icon" onClick={() => editor?.zoomOut()} title="ズームアウト"><ZoomOut size={20} /></button>
          <button 
            className="nav-icon" 
            onClick={() => editor?.resetZoom()} 
            style={{ fontSize: '12px', fontWeight: 700, width: 'auto', minWidth: '50px', padding: '0 8px' }}
            title="等倍に戻す"
          >
            {zoomLevel}%
          </button>
          <button className="nav-icon" onClick={() => editor?.zoomIn()} title="ズームイン"><ZoomIn size={20} /></button>
          <div style={{ width: '1px', height: '24px', background: 'var(--divider-color, rgba(0,0,0,0.05))', margin: '0 4px' }} />
          <button className="nav-icon" onClick={() => editor?.zoomToFit()} title="全体を表示"><Maximize size={20} /></button>
        </div>

        {/* Minimalist Sidebar UI */}
        <div className="thinkspace-ui" style={{ position: 'absolute', top: '24px', left: '24px', bottom: '24px', pointerEvents: 'none' }}>
          <div className="glass-panel" style={{ 
            height: '100%', 
            width: '64px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            padding: '20px 0',
            pointerEvents: 'auto'
          }}>
            <button className={clsx('nav-icon', showExplorer && 'active')} onClick={() => setShowExplorer(!showExplorer)} title="ノート一覧"><FileText size={24} /></button>
            <div className="tool-divider" />
            <button onClick={() => editor?.undo()} className="nav-icon" title="元に戻す"><Undo2 size={22} /></button>
            <button onClick={() => editor?.redo()} className="nav-icon" title="やり直し"><Redo2 size={22} /></button>
            <div className="tool-divider" />
            <button className={clsx('nav-icon', activeTool === 'select' && 'active')} onClick={() => selectTool('select')} title="選択 (V)"><MousePointer2 size={24} /></button>
            <button className={clsx('nav-icon', activeTool === 'hand' && 'active')} onClick={() => selectTool('hand')} title="移動 (H)"><Hand size={24} /></button>
            <div className="tool-divider" />
            <button className={clsx('nav-icon', activeTool === 'draw' && 'active')} onClick={() => selectTool('draw')} title="手書き (D, P)"><Pencil size={22} /></button>
            <button className={clsx('nav-icon', activeTool === 'eraser' && 'active')} onClick={() => selectTool('eraser')} title="消しゴム (E)"><Eraser size={22} /></button>
            <div className="tool-divider" />
            <button className={clsx('nav-icon', activeTool === 'geo-rectangle' && 'active')} onClick={() => selectTool('geo', 'rectangle')} title="矩形 (R)"><Square size={22} /></button>
            <button className={clsx('nav-icon', activeTool === 'geo-ellipse' && 'active')} onClick={() => selectTool('geo', 'ellipse')} title="楕円 (O)"><Circle size={22} /></button>
            <button className={clsx('nav-icon', activeTool === 'arrow' && 'active')} onClick={() => selectTool('arrow')} title="矢印 (A)"><ArrowUpRight size={22} /></button>
            <button className={clsx('nav-icon', activeTool === 'text' && 'active')} onClick={() => selectTool('text')} title="テキスト (T)"><Type size={22} /></button>
            <button className={clsx('nav-icon', activeTool === 'math' && 'active')} onClick={createMathShape} title="LaTeX 数式 (M)"><Sigma size={22} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
