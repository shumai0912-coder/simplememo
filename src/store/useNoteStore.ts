import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Note {
  id: string
  name: string
  folderId: string
  updatedAt: number
  isPinned?: boolean
}

export interface Folder {
  id: string
  name: string
  parentId: string | null // Support nested folders
}

interface NoteStore {
  notes: Note[]
  folders: Folder[]
  activeNoteId: string | null
  
  addNote: (name: string, folderId: string) => string
  deleteNote: (id: string) => void
  setActiveNote: (id: string) => void
  updateNoteName: (id: string, name: string) => void
  moveNote: (noteId: string, targetFolderId: string) => void
  togglePinNote: (id: string) => void
  
  addFolder: (name: string, parentId?: string | null) => void
  deleteFolder: (id: string) => void
  updateFolderName: (id: string, name: string) => void
  moveFolder: (folderId: string, targetParentId: string | null) => void
}

export const useNoteStore = create<NoteStore>()(
  persist(
    (set) => ({
      folders: [
        { id: 'main', name: 'メイン', parentId: null }
      ],
      notes: [
        { id: 'default', name: '無題のノート', folderId: 'main', updatedAt: Date.now() }
      ],
      activeNoteId: 'default',
      
      addNote: (name, folderId) => {
        const id = Math.random().toString(36).substring(7)
        const newNote: Note = { id, name, folderId, updatedAt: Date.now() }
        set((state) => ({
          notes: [...state.notes, newNote],
          activeNoteId: id
        }))
        return id
      },

      deleteNote: (id) => {
        set((state) => {
          const newNotes = state.notes.filter(n => n.id !== id)
          let newActiveId = state.activeNoteId
          if (state.activeNoteId === id) {
            newActiveId = newNotes.length > 0 ? newNotes[0].id : null
          }
          return { notes: newNotes, activeNoteId: newActiveId }
        })
      },

      setActiveNote: (id) => set({ activeNoteId: id }),

      updateNoteName: (id, name) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, name, updatedAt: Date.now() } : n)
        }))
      },

      moveNote: (noteId, targetFolderId) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === noteId ? { ...n, folderId: targetFolderId } : n)
        }))
      },

      togglePinNote: (id) => {
        set((state) => ({
          notes: state.notes.map(n => n.id === id ? { ...n, isPinned: !n.isPinned } : n)
        }))
      },

      addFolder: (name, parentId = null) => {
        const id = Math.random().toString(36).substring(7)
        set((state) => ({
          folders: [...state.folders, { id, name, parentId }]
        }))
      },

      updateFolderName: (id, name) => {
        set((state) => ({
          folders: state.folders.map(f => f.id === id ? { ...f, name } : f)
        }))
      },

      deleteFolder: (id) => {
        if (id === 'main') return
        set((state) => {
          // For simplicity, move subfolders and notes to 'main' on delete
          return {
            folders: state.folders.filter(f => f.id !== id).map(f => f.parentId === id ? { ...f, parentId: 'main' } : f),
            notes: state.notes.map(n => n.folderId === id ? { ...n, folderId: 'main' } : n)
          }
        })
      },

      moveFolder: (folderId, targetParentId) => {
        if (folderId === targetParentId) return
        set((state) => ({
          folders: state.folders.map(f => f.id === folderId ? { ...f, parentId: targetParentId } : f)
        }))
      }
    }),
    {
      name: 'thinkspace-notes-metadata-v3'
    }
  )
)
