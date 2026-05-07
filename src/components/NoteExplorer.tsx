import { useNoteStore, Folder as FolderType } from '../store/useNoteStore'
import { Folder, FileText, Trash2, ChevronRight, FolderPlus, ChevronDown, FilePlus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface TreeItemProps {
  folder: FolderType
  depth: number
}

const TreeItem = ({ folder, depth }: TreeItemProps) => {
  const { 
    notes, folders, activeNoteId, 
    setActiveNote, addNote, deleteNote, 
    addFolder, deleteFolder, moveNote, moveFolder,
    updateNoteName, updateFolderName
  } = useNoteStore()

  const [isOpen, setIsOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const childFolders = folders.filter(f => f.parentId === folder.id)
  const folderNotes = notes.filter(n => n.folderId === folder.id)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const handleRename = () => {
    if (!editingId || !editValue.trim()) {
      setEditingId(null)
      return
    }
    if (editingId.startsWith('folder-')) {
      updateFolderName(editingId.replace('folder-', ''), editValue)
    } else {
      updateNoteName(editingId, editValue)
    }
    setEditingId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const data = e.dataTransfer.getData('text/plain')
    try {
      const { type, id } = JSON.parse(data)
      if (type === 'note') {
        moveNote(id, folder.id)
      } else if (type === 'folder' && id !== folder.id) {
        moveFolder(id, folder.id)
      }
    } catch (err) { /* ignore */ }
  }

  const handleDragStart = (e: React.DragEvent, type: 'note' | 'folder', id: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type, id }))
  }

  return (
    <div className="folder-group">
      <div 
        className="folder-title" 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{ paddingLeft: `${depth * 12}px` }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, cursor: 'pointer' }} onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={16} color="#4f46e5" fill="#4f46e522" />
          
          {editingId === `folder-${folder.id}` ? (
            <input
              ref={editInputRef}
              className="rename-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span 
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingId(`folder-${folder.id}`)
                setEditValue(folder.name)
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
            >
              {folder.name}
            </span>
          )}
        </div>
        
        <div className="action-btns" style={{ display: 'flex', gap: '2px' }}>
          <button className="action-btn" onClick={() => addNote('新しいノート', folder.id)} title="ノートを追加">
            <FilePlus size={14} />
          </button>
          <button className="action-btn" onClick={() => addFolder('新しいフォルダ', folder.id)} title="サブフォルダを追加">
            <FolderPlus size={14} />
          </button>
          {folder.id !== 'main' && (
            <button className="action-btn" onClick={() => confirm('フォルダを削除しますか？') && deleteFolder(folder.id)}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="tree-node">
          {childFolders.map(child => (
            <TreeItem key={child.id} folder={child} depth={depth + 1} />
          ))}
          {folderNotes.map(note => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => handleDragStart(e, 'note', note.id)}
              className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
              onClick={() => setActiveNote(note.id)}
              style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                setEditingId(note.id)
                setEditValue(note.name)
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <FileText size={16} color={activeNoteId === note.id ? '#4f46e5' : '#64748b'} />
                {editingId === note.id ? (
                  <input
                    ref={editInputRef}
                    className="rename-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.name}
                  </span>
                )}
              </div>
              <button 
                className="action-btn" 
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('このノートを削除しますか？')) deleteNote(note.id)
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const NoteExplorer = () => {
  const { folders, addFolder } = useNoteStore()
  const rootFolders = folders.filter(f => f.parentId === null)

  return (
    <div className="explorer-panel glass-panel" style={{ borderRadius: 0, border: 'none', borderRight: '1.5px solid rgba(0,0,0,0.1)' }}>
      <div className="explorer-header">
        <span style={{ fontWeight: 800, fontSize: '14px', color: '#1e1b4b' }}>研究ライブラリ</span>
        <button className="action-btn" onClick={() => addFolder('新しいフォルダ', null)} title="ルートフォルダを追加">
          <FolderPlus size={18} />
        </button>
      </div>

      <div className="explorer-content">
        {rootFolders.map(folder => (
          <TreeItem key={folder.id} folder={folder} depth={0} />
        ))}
      </div>
    </div>
  )
}
