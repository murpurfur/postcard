import { useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react'
import html2canvas from 'html2canvas'
import stampEmpty from './assets/stamp-empty.svg'
import iconToolbarSticker from './assets/icon-toolbar-sticker.svg'
import iconToolbarStamp from './assets/icon-toolbar-stamp.svg'
import iconToolbarText from './assets/icon-toolbar-text.svg'
import iconDownload from './assets/icon-download.svg'
import stampChoco from './assets/stamps/stamp-choco.svg'
import stampChristmas from './assets/stamps/stamp-christmas.svg'
import stampCloud from './assets/stamps/stamp-cloud.svg'
import stampItaly from './assets/stamps/stamp-italy.svg'
import stampMountain from './assets/stamps/stamp-mountain.svg'
import stampPiggy from './assets/stamps/stamp-piggy.svg'
import madeInMatter from './assets/made-in-matter.svg'
import stickerFire from './assets/stickers/fire.svg'
import stickerFireworks from './assets/stickers/fireworks.svg'
import stickerFlash from './assets/stickers/flash.svg'
import stickerHeart from './assets/stickers/heart.svg'
import stickerKiss from './assets/stickers/kiss.svg'
import stickerMail from './assets/stickers/mail.svg'
import stickerSend from './assets/stickers/send.svg'
import stickerShine from './assets/stickers/shine.svg'
import stickerSmile from './assets/stickers/smile.svg'
import stickerSmileyBlessed from './assets/stickers/smiley-blessed--Streamline-Freehand.svg'
import stickerSun from './assets/stickers/sun.svg'
import stickerThumbsup from './assets/stickers/thumbsup.svg'
import './PostcardEditor.css'

interface TextLabel {
  id: string
  x: number
  y: number
  text: string
  isEditing: boolean
  fontFamily: string
}

// TODO: id, x, y are duplicated in TextLabel, extract common interface, representing an object on the canvas
interface Mark {
  id: string
  x: number
  y: number
  type: 'sticker' | 'stamp'
  stickerSrc?: string
}

const markIconMeta: Record<Mark['type'], { src: string; label: string }> = {
  sticker: { src: iconToolbarSticker, label: 'Sticker' },
  stamp: { src: iconToolbarStamp, label: 'Stamp' },
}

interface DragState {
  itemId: string
  // TODO: we're duplicating 'text' | 'mark' server times in the types, extract to a type
  itemType: 'text' | 'mark'
  // TODO?: What's the difference between startX and initialX?
  startX: number
  startY: number
  initialX: number
  initialY: number
}

interface SelectedWidget {
  id: string
    // TODO?: can't type be derived given we have an id?
  type: 'text' | 'mark'
}

interface FontOption {
  id: string
  label: string
  family: string
  sampleText: string
}

const fontOptions: FontOption[] = [
  { id: 'playwrite', label: 'Playwrite US Modern', family: 'Playwrite US Modern, Playpen Sans', sampleText: 'Warm hello' },
  { id: 'poppins', label: 'Poppins', family: 'Poppins, Noto Sans', sampleText: 'Little note' },
  { id: 'great-vibes', label: 'Great Vibes', family: 'Great Vibes', sampleText: 'Sending love' }
];

// TODO: rename to StampType
interface StampOption {
  id: string
  label: string
  src: string
}

const stampOptions: StampOption[] = [
  { id: 'piggy', label: 'Piggy', src: stampPiggy },
  { id: 'cloud', label: 'Cloud', src: stampCloud },
  { id: 'choco', label: 'Chocolate', src: stampChoco },
  { id: 'italy', label: 'Italy', src: stampItaly },
  { id: 'mountain', label: 'Mountain', src: stampMountain },
  { id: 'christmas', label: 'Christmas', src: stampChristmas }
];

// TODO: rename to StickerType
interface StickerOption {
  id: string
  label: string
  src: string
}

const stickerOptions: StickerOption[] = [
  { id: 'fire', label: 'Fire', src: stickerFire },
  { id: 'heart', label: 'Heart', src: stickerHeart },

  { id: 'flash', label: 'Flash', src: stickerFlash },
  { id: 'fireworks', label: 'Fireworks', src: stickerFireworks },
  { id: 'sun', label: 'Sun', src: stickerSun },

  { id: 'mail', label: 'Mail', src: stickerMail },
  { id: 'send', label: 'Send', src: stickerSend },
  { id: 'shine', label: 'Shine', src: stickerShine },
  { id: 'smile', label: 'Smile', src: stickerSmile },
  { id: 'smiley-blessed', label: 'Smiley Blessed', src: stickerSmileyBlessed },
  { id: 'kiss', label: 'Kiss', src: stickerKiss },
  { id: 'thumbsup', label: 'Thumbs Up', src: stickerThumbsup }
];

function PostcardEditor() {
  // TODO: have only one state for all widgets, and use itemType to distinguish;
  //   `stamp` should just become a non-draggable, non-selectable widget with fixed position from the start;
  //   `addTextLabel` & `addMark` should also be merged into a single function;
  //   `handleTextMouseDown` & `handleMarkMouseDown` should also be merged into a single function;
  const [textLabels, setTextLabels] = useState<TextLabel[]>([])
  const [marks, setMarks] = useState<Mark[]>([])

  const [selectedMarkType, setSelectedMarkType] = useState<'sticker' | 'stamp'>('sticker')
  // TODO?: if we have drag state as a state (you know), why do we need to pass the same info inside the drag event, unpack it and parse it? Can we store it as a react state instead?
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null)

  // TODO: introduce a component for menu, manage open state inside it; incapsulate the logic about outside clicks in this common component too
  const [isFontMenuOpen, setFontMenuOpen] = useState(false)
  const [stampDropdownOpen, setStampDropdownOpen] = useState(false)
  const [stickerDropdownOpen, setStickerDropdownOpen] = useState(false)

  const [stampPlaceholderSrc, setStampPlaceholderSrc] = useState(stampEmpty)
  const [isStampAnimating, setStampAnimating] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fontPickerRef = useRef<HTMLDivElement>(null)
  const stampButtonRef = useRef<HTMLButtonElement>(null)
  const stampDropdownRef = useRef<HTMLDivElement>(null)
  const stickerDropdownRef = useRef<HTMLDivElement>(null)

  const addTextLabel = (
    fontFamily = 'Unbounded',
    text = 'Double click to edit',
    position?: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const newLabel: TextLabel = {
      id: `text-${Date.now()}`,
      x: position?.x ?? rect.width / 2,
      y: position?.y ?? rect.height / 2,
      text,
      isEditing: false,
      fontFamily
    }
    setTextLabels(labels => [...labels, newLabel])
  }

  const addMark = (type?: Mark['type'], stickerSrc?: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const newMark: Mark = {
      id: `mark-${Date.now()}`,
      x: rect.width / 2,
      y: rect.height / 2,
      type: type ?? selectedMarkType,
      stickerSrc
    }
    setMarks([...marks, newMark])
  }

  const handleStickerSelect = (option: StickerOption) => {
    addMark('sticker', option.src)
    setStickerDropdownOpen(false)
  }

  const handleFontOptionSelect = (option: FontOption) => {
    addTextLabel(option.family, option.sampleText)
    setFontMenuOpen(false)
  }

  const handleFontDragStart = (option: FontOption, event: ReactDragEvent<HTMLButtonElement>) => {
    event.dataTransfer?.setData('application/json', JSON.stringify({
      family: option.family,
      text: option.sampleText
    }))
    event.dataTransfer?.setData('text/plain', option.sampleText)
    event.dataTransfer.effectAllowed = 'copy'
    setFontMenuOpen(false)
  }

  const handleStampSelect = (option: StampOption) => {
    setStampPlaceholderSrc(option.src)
    setStampDropdownOpen(false)
    setSelectedMarkType('sticker')
  }

  useEffect(() => {
    const animationDuration = 400
    setStampAnimating(true)
    const timeoutId = window.setTimeout(() => setStampAnimating(false), animationDuration)
    return () => window.clearTimeout(timeoutId)
  }, [stampPlaceholderSrc])

  const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const data = event.dataTransfer.getData('application/json')
    if (!data) return
    
    try {
      const payload = JSON.parse(data)
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      // Handle text label drop
      if (payload.family && payload.text) {
        addTextLabel(payload.family, payload.text, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top
        })
      }
      // Handle sticker drop
      else if (payload.type === 'sticker' && payload.src) {
        const canvas = canvasRef.current
        if (!canvas) return
        const newMark: Mark = {
          id: `mark-${Date.now()}`,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          type: 'sticker',
          stickerSrc: payload.src
        }
        setMarks([...marks, newMark])
      }
    } catch {
      return
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target as Node)) {
        setFontMenuOpen(false)
      }
      if (
        stampDropdownOpen &&
        stampDropdownRef.current &&
        !stampDropdownRef.current.contains(event.target as Node) &&
        stampButtonRef.current &&
        !stampButtonRef.current.contains(event.target as Node)
      ) {
        setStampDropdownOpen(false)
        setSelectedMarkType('sticker')
      }
      if (
        stickerDropdownOpen &&
        stickerDropdownRef.current &&
        !stickerDropdownRef.current.contains(event.target as Node)
      ) {
        setStickerDropdownOpen(false)
      }
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [stampDropdownOpen, stickerDropdownOpen])

  const handleTextMouseDown = (e: ReactMouseEvent<HTMLDivElement>, label: TextLabel) => {
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

  const handleMarkMouseDown = (e: ReactMouseEvent<HTMLDivElement>, mark: Mark) => {
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

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
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

  const handleCanvasClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    setFontMenuOpen(false)
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

  const handleDownload = async () => {
    const postcardBorder = document.querySelector('.postcard-border') as HTMLElement
    if (!postcardBorder) return

    try {
      const canvas = await html2canvas(postcardBorder, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Ensure the border is visible in the cloned document
          const clonedBorder = clonedDoc.querySelector('.postcard-border') as HTMLElement
          if (clonedBorder) {
            // Force the border to be visible
            clonedBorder.style.boxShadow = '2px 2px 8px rgba(126, 126, 190, 0.15)'
          }
        }
      })
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'postcard.png'
      link.href = url
      link.click()
    } catch (error) {
      console.error('Failed to download postcard:', error)
    }
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

  /** WTF IS HERE?? */
  const renderMark = (mark: Mark) => {
    const size = 52
    // If it's a sticker with a specific stickerSrc, use that
    if (mark.type === 'sticker' && mark.stickerSrc) {
      return (
        <img
          src={mark.stickerSrc}
          alt="Sticker"
          className="mark-icon"
          style={{ width: size, height: size }}
          draggable={false}
        />
      )
    }
    // Otherwise use the default icon for the mark type
    const icon = markIconMeta[mark.type]
    if (!icon) return null

    return (
      <img
        src={icon.src}
        alt={`${icon.label} mark`}
        className="mark-icon"
        style={{ width: size, height: size }}
        draggable={false}
      />
    )
  }

  return (
    <div className="postcard-editor">
      <div className="header">
        <h1>Postcard Builder</h1>
        <p>Create a beautiful postcard, add your message, and share it with someone special</p>
        <button
          type="button"
          className="download-button"
          onClick={handleDownload}
          title="Download postcard"
          aria-label="Download postcard"
        >
          <img src={iconDownload} alt="" className="download-icon" />
          <span>Download</span>
        </button>
      </div>

      <div
        ref={canvasRef}
        className="canvas"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <div className="postcard-border">
          <div className="postcard-content">
            <div className="postcard-left" />
            <div className="postcard-divider" />
            <div className="postcard-right">

              {/* TODO: extract stamp into a component together with isStampAnimating logic */}
              <img
                src={stampPlaceholderSrc}
                alt="Stamp placeholder"
                className={`stamp-placeholder ${isStampAnimating ? 'animate' : ''}`}
                draggable="false"
              />

              <div className="address-lines">
                <div className="address-line" />
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
            className={`text-label ${label.fontFamily === 'Great Vibes' ? 'font-great-vibes' : ''} ${selectedWidget?.id === label.id && selectedWidget?.type === 'text' ? 'selected' : ''}`}
            style={{
              left: label.x,
              top: label.y,
              transform: 'translate(-50%, -50%)',
              fontFamily: label.fontFamily
            }}
            onMouseDown={(e) => handleTextMouseDown(e, label)}
            onDoubleClick={() => handleTextDoubleClick(label.id)}
          >
            {label.isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={label.text}
                onChange={(e) => {
                  handleTextChange(label.id, e.target.value)
                  // Dynamically adjust size to prevent cropping
                  if (inputRef.current) {
                    inputRef.current.size = Math.max(e.target.value.length || 1, 1)
                  }
                }}
                onBlur={() => handleTextBlur(label.id)}
                className="text-input"
                style={{ fontFamily: label.fontFamily }}
                size={Math.max(label.text.length || 1, 1)}
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
      <div className="toolbar-container">
        <div className="toolbar">
          <div className="font-picker" ref={fontPickerRef}>
            <button
              type="button"
              className={`toolbar-button ${isFontMenuOpen ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setFontMenuOpen(open => !open)
              }}
              title="Add text"
              aria-label="Add text"
            >
              <img src={iconToolbarText} alt="" className="toolbar-icon" />
            </button>
            {isFontMenuOpen && (
              <div className="font-dropdown">
                {fontOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className="font-dropdown-item"
                    onClick={() => handleFontOptionSelect(option)}
                    draggable
                    onDragStart={(event) => handleFontDragStart(option, event)}
                  >
                    <span className="font-option-name" style={{ fontFamily: option.family }}>
                      {option.sampleText}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mark-picker">
            <button
              ref={stampButtonRef}
              className={`toolbar-button ${selectedMarkType === 'stamp' ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                setStampDropdownOpen(prev => {
                  const next = !prev
                  setSelectedMarkType(next ? 'stamp' : 'sticker')
                  return next
                })
              }}
              title="Select stamp"
              aria-label="Select stamp"
            >
              <img src={iconToolbarStamp} alt="" className="toolbar-icon" />
            </button>
            {stampDropdownOpen && (
              <div className="stamp-dropdown" ref={stampDropdownRef} aria-hidden="true">
                {stampOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className="stamp-option"
                    onClick={() => handleStampSelect(option)}
                    aria-label={option.label}
                  >
                    <img src={option.src} alt={option.label} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="mark-picker">
            <button
              className={`toolbar-button ${stickerDropdownOpen ? 'active' : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                setStickerDropdownOpen(prev => !prev)
              }}
              title="Add sticker"
              aria-label="Add sticker"
            >
              <img src={iconToolbarSticker} alt="" className="toolbar-icon" />
            </button>
            {stickerDropdownOpen && (
              <div className="sticker-dropdown" ref={stickerDropdownRef} aria-hidden="true">
                {stickerOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    className="sticker-option"
                    onClick={() => handleStickerSelect(option)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer?.setData('application/json', JSON.stringify({
                        type: 'sticker',
                        src: option.src
                      }))
                      event.dataTransfer.effectAllowed = 'copy'
                      setStickerDropdownOpen(false)
                    }}
                    aria-label={option.label}
                  >
                    <img src={option.src} alt={option.label} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="footer">
         <img src={madeInMatter} alt="Made in Matter" className="made-in-matter" />
        </div>  
      </div>

    </div>
  )
}

export default PostcardEditor
