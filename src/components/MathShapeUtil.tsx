import { ShapeUtil, HTMLContainer, Rectangle2d, TLBaseShape } from 'tldraw'
import katex from 'katex'
import 'katex/dist/katex.min.css'

export type TLMathShape = TLBaseShape<
  'math',
  {
    w: number
    h: number
    formula: string
  }
>

export class MathShapeUtil extends ShapeUtil<TLMathShape> {
  static override type = 'math' as const

  override canEdit = () => true

  override getDefaultProps(): TLMathShape['props'] {
    return {
      w: 240,
      h: 80,
      formula: 'f(x) = \\int_{-\\infty}^{\\infty} e^{-x^2} dx',
    }
  }

  override getGeometry(shape: TLMathShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override onResize = (shape: TLMathShape, info: any) => {
    return {
      props: {
        w: Math.max(50, shape.props.w * info.scaleX),
        h: Math.max(30, shape.props.h * info.scaleY),
      },
    }
  }

  override component(shape: TLMathShape) {
    const isEditing = this.editor.getEditingShapeId() === shape.id
    
    let html = ''
    try {
      html = katex.renderToString(shape.props.formula || '\\text{数式を入力...}', {
        displayMode: true,
        throwOnError: false,
      })
    } catch (e: any) {
      html = `<span style="color: #ef4444; font-size: 12px; word-break: break-all;">${e.message}</span>`
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      this.editor.updateShape<TLMathShape>({
        id: shape.id,
        type: 'math',
        props: {
          formula: e.target.value
        }
      })
    }

    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: isEditing ? 'all' : 'none',
          padding: '12px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          borderRadius: '8px',
          border: isEditing ? 'none' : '1px dashed rgba(79, 70, 229, 0.2)',
          backgroundColor: isEditing ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
          transition: 'border 0.2s, background-color 0.2s',
        }}
      >
        {isEditing ? (
          <textarea
            className="math-shape-textarea"
            value={shape.props.formula}
            onChange={handleChange}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '8px',
              borderRadius: '8px',
              border: '2px solid #4f46e5',
              boxShadow: '0 0 10px rgba(79, 70, 229, 0.2)',
              resize: 'none',
              outline: 'none',
              background: 'var(--bg-textarea, #ffffff)',
              color: 'var(--text-textarea, #1e293b)',
              zIndex: 100,
            }}
            autoFocus
            onBlur={() => this.editor.setEditingShape(null)}
            placeholder="LaTeX 数式を入力..."
          />
        ) : (
          <div 
            className="math-shape-display"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{
              fontSize: '18px',
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              overflow: 'auto',
            }}
          />
        )}
      </HTMLContainer>
    )
  }

  override indicator(shape: TLMathShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
