import { useNoteStore, Folder as FolderType } from '../store/useNoteStore'
import { Folder, FileText, Trash2, ChevronRight, FolderPlus, ChevronDown, FilePlus, Search, X, Pin } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface TreeItemProps {
  folder: FolderType
  depth: number
  searchQuery: string
}

const TreeItem = ({ folder, depth, searchQuery }: TreeItemProps) => {
  const { 
    notes, folders, activeNoteId, 
    setActiveNote, addNote, deleteNote, 
    addFolder, deleteFolder, moveNote, moveFolder,
    updateNoteName, updateFolderName, togglePinNote
  } = useNoteStore()

  const [isOpen, setIsOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const childFolders = folders.filter(f => f.parentId === folder.id)
  const folderNotes = notes.filter(n => n.folderId === folder.id)

  // Recursive content check for search filtering
  const hasMatchingContent = (folderId: string): boolean => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    
    // Check if current folder matches
    const current = folders.find(f => f.id === folderId)
    if (current && current.name.toLowerCase().includes(query)) return true

    // Check direct notes
    const directNotes = notes.filter(n => n.folderId === folderId)
    if (directNotes.some(n => n.name.toLowerCase().includes(query))) return true

    // Check subfolders
    const subDirs = folders.filter(f => f.parentId === folderId)
    return subDirs.some(sub => hasMatchingContent(sub.id))
  }

  // Filter children based on search
  const visibleChildFolders = childFolders.filter(child => hasMatchingContent(child.id))
  const visibleNotes = searchQuery.trim()
    ? folderNotes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : folderNotes

  const sortedNotes = [...visibleNotes].sort((a, b) => {
    const aPinned = a.isPinned ? 1 : 0
    const bPinned = b.isPinned ? 1 : 0
    if (aPinned !== bPinned) return bPinned - aPinned
    return b.updatedAt - a.updatedAt
  })

  // Force open folders when searching
  const displayOpen = searchQuery.trim() ? true : isOpen

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

  // If searching and this folder has nothing matching, hide it
  if (searchQuery.trim() && !hasMatchingContent(folder.id)) {
    return null
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
          {displayOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

      {displayOpen && (
        <div className="tree-node">
          {visibleChildFolders.map(child => (
            <TreeItem key={child.id} folder={child} depth={depth + 1} searchQuery={searchQuery} />
          ))}
          {sortedNotes.map(note => (
            <div
              key={note.id}
              draggable
              onDragStart={(e) => handleDragStart(e, 'note', note.id)}
              className={`note-item ${activeNoteId === note.id ? 'active' : ''} ${note.isPinned ? 'pinned' : ''}`}
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
              <div className="action-btns" style={{ display: 'flex', gap: '2px' }}>
                <button 
                  className={`action-btn pin-btn ${note.isPinned ? 'pinned' : ''}`} 
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePinNote(note.id)
                  }}
                  title={note.isPinned ? "ピン留めを解除" : "ピン留めする"}
                >
                  <Pin size={13} fill={note.isPinned ? "currentColor" : "none"} style={{ transform: note.isPinned ? 'none' : 'rotate(45deg)' }} />
                </button>
                <button 
                  className="action-btn" 
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('このノートを削除しますか？')) deleteNote(note.id)
                  }}
                  title="削除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export const NoteExplorer = () => {
  const { folders, addFolder, notes, togglePinNote, setActiveNote, activeNoteId, deleteNote } = useNoteStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPinnedOpen, setIsPinnedOpen] = useState(true)
  
  const rootFolders = folders.filter(f => f.parentId === null)
  const pinnedNotes = notes.filter(n => n.isPinned)

  const getFolderName = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : ''
  }

  return (
    <div className="explorer-panel glass-panel" style={{ borderRadius: 0, border: 'none', borderRight: '1.5px solid var(--border-color, rgba(0,0,0,0.1))' }}>
      <div className="explorer-header">
        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-header, #1e1b4b)' }}>研究ライブラリ</span>
        <button className="action-btn" onClick={() => addFolder('新しいフォルダ', null)} title="ルートフォルダを追加">
          <FolderPlus size={18} />
        </button>
      </div>

      {/* Search Bar Container */}
      <div style={{ padding: '8px 12px', position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={16} style={{ position: 'absolute', left: '22px', color: 'var(--text-secondary, #94a3b8)', pointerEvents: 'none' }} />
        <input
          type="text"
          className="search-input"
          placeholder="ノートやフォルダを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', paddingLeft: '32px', paddingRight: searchQuery ? '28px' : '12px' }}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary, #94a3b8)',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="explorer-content">
        {/* Pinned Notes Global Section */}
        {pinnedNotes.length > 0 && (
          <div className="pinned-section" style={{ marginBottom: '16px' }}>
            <div 
              className="folder-title pinned-section-header" 
              onClick={() => setIsPinnedOpen(!isPinnedOpen)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', textTransform: 'none' }}
            >
              {isPinnedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Pin size={13} color="#6366f1" fill="#6366f1" />
              <span style={{ color: 'var(--text-header, #1e1b4b)', fontWeight: 800, fontSize: '11px', letterSpacing: '0.05em' }}>ピン留めされたノート</span>
              <span className="pinned-count-badge" style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
                {pinnedNotes.length}
              </span>
            </div>

            {isPinnedOpen && (
              <div className="pinned-notes-list" style={{ marginLeft: '8px', borderLeft: '1px dashed var(--divider-color)', paddingLeft: '4px', marginTop: '4px' }}>
                {pinnedNotes.map(note => {
                  const folderName = getFolderName(note.folderId)
                  return (
                    <div
                      key={`pinned-${note.id}`}
                      className={`note-item ${activeNoteId === note.id ? 'active' : ''}`}
                      onClick={() => setActiveNote(note.id)}
                      style={{ paddingLeft: '8px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}
                    >
                      <FileText size={16} color={activeNoteId === note.id ? '#4f46e5' : '#64748b'} />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', lineHeight: '1.2' }}>
                          {note.name}
                        </span>
                        {folderName && (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            📁 {folderName}
                          </span>
                        )}
                      </div>
                      <div className="action-btns" style={{ display: 'flex', gap: '2px' }}>
                        <button 
                          className="action-btn pin-btn pinned" 
                          onClick={(e) => {
                            e.stopPropagation()
                            togglePinNote(note.id)
                          }}
                          title="ピン留めを解除"
                        >
                          <Pin size={13} fill="currentColor" />
                        </button>
                        <button 
                          className="action-btn" 
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('このノートを削除しますか？')) deleteNote(note.id)
                          }}
                          title="削除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ height: '1px', background: 'var(--divider-color)', margin: '12px 0 8px 0' }} />
          </div>
        )}

        {rootFolders.map(folder => (
          <TreeItem key={folder.id} folder={folder} depth={0} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  )
}
