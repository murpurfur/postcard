import { useState, useRef, MouseEvent, useEffect } from 'react'
import './PostcardEditor.css'

interface TextLabel {
  id: string
  x: number
  y: number
  text: string
  isEditing: boolean
}

interface Mark {
  id: string
  x: number
  y: number
  type: 'circle' | 'stamp' | 'heart'
}

interface DragState {
  itemId: string
  itemType: 'text' | 'mark'
  startX: number
  startY: number
  initialX: number
  initialY: number
}

interface SelectedWidget {
  id: string
  type: 'text' | 'mark'
}

function PostcardEditor() {
  const [textLabels, setTextLabels] = useState<TextLabel[]>([])
  const [marks, setMarks] = useState<Mark[]>([])
  const [selectedMarkType, setSelectedMarkType] = useState<'circle' | 'stamp' | 'heart'>('circle')
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addTextLabel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const newLabel: TextLabel = {
      id: `text-${Date.now()}`,
      x: rect.width / 2,
      y: rect.height / 2,
      text: 'Double click to edit',
      isEditing: false
    }
    setTextLabels([...textLabels, newLabel])
  }

  const addMark = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const newMark: Mark = {
      id: `mark-${Date.now()}`,
      x: rect.width / 2,
      y: rect.height / 2,
      type: selectedMarkType
    }
    setMarks([...marks, newMark])
  }

  const handleTextMouseDown = (e: MouseEvent, label: TextLabel) => {
    if (label.isEditing) return

    e.stopPropagation()
    setSelectedWidget({ id: label.id, type: 'text' })
    setDragState({
      itemId: label.id,
      itemType: 'text',
      startX: e.clientX,
      startY: e.clientY,
      initialX: label.x,
      initialY: label.y
    })
  }

  const handleMarkMouseDown = (e: MouseEvent, mark: Mark) => {
    e.stopPropagation()
    setSelectedWidget({ id: mark.id, type: 'mark' })
    setDragState({
      itemId: mark.id,
      itemType: 'mark',
      startX: e.clientX,
      startY: e.clientY,
      initialX: mark.x,
      initialY: mark.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragState) return

    const deltaX = e.clientX - dragState.startX
    const deltaY = e.clientY - dragState.startY

    if (dragState.itemType === 'text') {
      setTextLabels(labels =>
        labels.map(label =>
          label.id === dragState.itemId
            ? { ...label, x: dragState.initialX + deltaX, y: dragState.initialY + deltaY }
            : label
        )
      )
    } else if (dragState.itemType === 'mark') {
      setMarks(currentMarks =>
        currentMarks.map(mark =>
          mark.id === dragState.itemId
            ? { ...mark, x: dragState.initialX + deltaX, y: dragState.initialY + deltaY }
            : mark
        )
      )
    }
  }

  const handleMouseUp = () => {
    setDragState(null)
  }

  const handleTextDoubleClick = (labelId: string) => {
    setTextLabels(labels =>
      labels.map(label =>
        label.id === labelId ? { ...label, isEditing: true } : label
      )
    )
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleTextChange = (labelId: string, newText: string) => {
    setTextLabels(labels =>
      labels.map(label =>
        label.id === labelId ? { ...label, text: newText } : label
      )
    )
  }

  const handleTextBlur = (labelId: string) => {
    setTextLabels(labels =>
      labels.map(label =>
        label.id === labelId ? { ...label, isEditing: false } : label
      )
    )
  }

  const handleCanvasClick = (e: MouseEvent) => {
    // Only deselect if clicking directly on the canvas, not on widgets
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.postcard-border')) {
      setSelectedWidget(null)
    }
  }

  const handleDeleteWidget = () => {
    if (!selectedWidget) return

    if (selectedWidget.type === 'text') {
      setTextLabels(labels => labels.filter(label => label.id !== selectedWidget.id))
    } else if (selectedWidget.type === 'mark') {
      setMarks(currentMarks => currentMarks.filter(mark => mark.id !== selectedWidget.id))
    }
    setSelectedWidget(null)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Delete (Windows/Linux) or Backspace (Mac Delete key)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if we're editing text
        const isEditingText = textLabels.some(label => label.isEditing)
        if (!isEditingText) {
          e.preventDefault()
          handleDeleteWidget()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedWidget, textLabels])

  const renderMark = (mark: Mark) => {
    const size = 40
    switch (mark.type) {
      case 'circle':
        return (
          <div
            className="mark circle"
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              border: '2px solid #333',
              backgroundColor: 'transparent'
            }}
          />
        )
      case 'stamp':
        return (
          <div
            className="mark stamp"
            style={{
              width: size,
              height: size,
              border: '2px dashed #333',
              backgroundColor: 'transparent'
            }}
          />
        )
      case 'heart':
        return (
          <div
            className="mark heart"
            style={{
              fontSize: size,
              lineHeight: 1
            }}
          >
            ♥
          </div>
        )
    }
  }

  return (
    <div className="postcard-editor">
      <div className="header">
        <h1>Postcard Builder</h1>
        <p>Create a beautiful postcard, add your message, and share it with someone special</p>
      </div>

      <div
        ref={canvasRef}
        className="canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        <div className="postcard-border">
          <div className="postcard-content">
            <div className="postcard-left" />
            <div className="postcard-divider" />
            <div className="postcard-right">
              <div className="stamp-placeholder" />
              <div className="address-lines">
                <div className="address-line" />
                <div className="address-line" />
                <div className="address-line" />
              </div>
            </div>
          </div>
        </div>

        {textLabels.map(label => (
          <div
            key={label.id}
            className={`text-label ${selectedWidget?.id === label.id && selectedWidget?.type === 'text' ? 'selected' : ''}`}
            style={{
              left: label.x,
              top: label.y,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseDown={(e) => handleTextMouseDown(e, label)}
            onDoubleClick={() => handleTextDoubleClick(label.id)}
          >
            {label.isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={label.text}
                onChange={(e) => handleTextChange(label.id, e.target.value)}
                onBlur={() => handleTextBlur(label.id)}
                className="text-input"
              />
            ) : (
              <span>{label.text}</span>
            )}
          </div>
        ))}

        {marks.map(mark => (
          <div
            key={mark.id}
            className={`mark-wrapper ${selectedWidget?.id === mark.id && selectedWidget?.type === 'mark' ? 'selected' : ''}`}
            style={{
              left: mark.x,
              top: mark.y,
              transform: 'translate(-50%, -50%)'
            }}
            onMouseDown={(e) => handleMarkMouseDown(e, mark)}
          >
            {renderMark(mark)}
          </div>
        ))}
      </div>

      <div className="toolbar">
        <button className="toolbar-button" onClick={addTextLabel} title="Add text">
          T
        </button>
        <button
          className={`toolbar-button ${selectedMarkType === 'circle' ? 'active' : ''}`}
          onClick={() => {
            setSelectedMarkType('circle')
            addMark()
          }}
          title="Add circle"
        >
          ○
        </button>
        <button
          className={`toolbar-button ${selectedMarkType === 'stamp' ? 'active' : ''}`}
          onClick={() => {
            setSelectedMarkType('stamp')
            addMark()
          }}
          title="Add stamp"
        >
          ▢
        </button>
        <button
          className={`toolbar-button ${selectedMarkType === 'heart' ? 'active' : ''}`}
          onClick={() => {
            setSelectedMarkType('heart')
            addMark()
          }}
          title="Add heart"
        >
          ♥
        </button>
      </div>
    </div>
  )
}

export default PostcardEditor
