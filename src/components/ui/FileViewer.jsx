import React, { useState, useRef, useEffect } from 'react'
import { Paperclip, Download, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

// ── File type helpers ─────────────────────────────────────────
export function fileIcon(type = '', name = '') {
  const t = (type + name).toLowerCase()
  if (t.includes('pdf'))                              return '📄'
  if (t.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)/.test(t)) return '🖼️'
  if (t.includes('sheet') || /\.(xlsx|xls|csv)/.test(t)) return '📊'
  if (t.includes('word')  || /\.(doc|docx)/.test(t)) return '📝'
  return '📎'
}

function isImage(type = '', name = '') {
  const t = (type + name).toLowerCase()
  return t.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg)$/.test(t)
}

function isPDF(type = '', name = '') {
  const t = (type + name).toLowerCase()
  return t.includes('pdf') || t.endsWith('.pdf')
}

function canPreview(f) {
  return isImage(f.type, f.name) || isPDF(f.type, f.name)
}

// ── Full-screen preview modal ─────────────────────────────────
function PreviewModal({ files, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const file = files[idx]

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')       onClose()
      if (e.key === 'ArrowRight')   setIdx(i => Math.min(i + 1, files.length - 1))
      if (e.key === 'ArrowLeft')    setIdx(i => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [files.length, onClose])

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      {/* Header */}
      <div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>{fileIcon(file.type, file.name)}</span>
          <div>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{file.name}</div>
            {file.size && (
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                {file.size > 1024*1024 ? `${(file.size/1024/1024).toFixed(1)} MB` : `${(file.size/1024).toFixed(0)} KB`}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Counter */}
          {files.length > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', alignSelf: 'center', marginRight: 8 }}>
              {idx + 1} / {files.length}
            </span>
          )}
          <a
            href={file.url} download={file.name}
            title="Download"
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}
          >
            <Download size={15} />
          </a>
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        style={{ maxWidth: '90vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 64 }}
        onClick={e => e.stopPropagation()}
      >
        {isImage(file.type, file.name) ? (
          <img
            src={file.url}
            alt={file.name}
            style={{ maxWidth: '85vw', maxHeight: '78vh', borderRadius: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', objectFit: 'contain' }}
          />
        ) : isPDF(file.type, file.name) ? (
          <iframe
            src={file.url}
            title={file.name}
            style={{ width: '85vw', height: '78vh', border: 'none', borderRadius: 8, background: '#fff' }}
          />
        ) : (
          /* Non-previewable — show download prompt */
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '4rem', marginBottom: 16 }}>{fileIcon(file.type, file.name)}</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>{file.name}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: 24 }}>
              This file type cannot be previewed in the browser.
            </div>
            <a
              href={file.url}
              download={file.name}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#2563EB', color: '#fff', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}
            >
              <Download size={16} /> Download File
            </a>
          </div>
        )}
      </div>

      {/* Prev / Next arrows */}
      {files.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.max(i - 1, 0)) }}
            disabled={idx === 0}
            style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: idx === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIdx(i => Math.min(i + 1, files.length - 1)) }}
            disabled={idx === files.length - 1}
            style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: idx === files.length - 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: idx === files.length - 1 ? 'default' : 'pointer', opacity: idx === files.length - 1 ? 0.3 : 1 }}
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Thumbnail strip for multiple files */}
      {files.length > 1 && (
        <div
          style={{ position: 'absolute', bottom: 16, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: 10, backdropFilter: 'blur(8px)' }}
          onClick={e => e.stopPropagation()}
        >
          {files.map((f, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              width: 36, height: 36, borderRadius: 6,
              background: i === idx ? '#2563EB' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${i === idx ? '#2563EB' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '1rem', transition: 'all 0.15s',
            }}>
              {fileIcon(f.type, f.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── File popover (list with preview button) ───────────────────
function FilePopover({ files, onClose, onPreview }) {
  const ref = useRef()
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', zIndex: 999, top: '110%', left: 0,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
      minWidth: 290, maxWidth: 350, padding: '10px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-2)' }}>
          {files.length} Attached File{files.length !== 1 ? 's' : ''}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2 }}>
          <X size={13} />
        </button>
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {files.map((f, i) => (
          <div key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'default' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{fileIcon(f.type, f.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
              {f.size && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-4)', marginTop: 2 }}>
                  {f.size > 1024*1024 ? `${(f.size/1024/1024).toFixed(1)} MB` : `${(f.size/1024).toFixed(0)} KB`}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {/* View — opens inline preview */}
              <button
                onClick={() => { onPreview(i); onClose() }}
                title={canPreview(f) ? 'Preview' : 'View (downloads unsupported types)'}
                style={{ width: 30, height: 30, borderRadius: 7, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', border: '1px solid #BFDBFE', cursor: 'pointer' }}
              >
                <Eye size={12} />
              </button>
              {/* Download */}
              <a href={f.url} download={f.name} title="Download"
                style={{ width: 30, height: 30, borderRadius: 7, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', textDecoration: 'none', border: '1px solid #BBF7D0' }}
                onClick={e => e.stopPropagation()}
              >
                <Download size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main export: FilesCell ────────────────────────────────────
export function FilesCell({ files }) {
  const [open,    setOpen]    = useState(false)
  const [preview, setPreview] = useState(null) // index

  if (!files || files.length === 0) {
    return <span style={{ color: 'var(--text-4)', fontSize: '0.78rem' }}>—</span>
  }

  return (
    <>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            background: open ? '#DBEAFE' : '#EFF6FF',
            border: `1px solid ${open ? '#93C5FD' : '#BFDBFE'}`,
            color: '#2563EB', fontWeight: 700, fontSize: '0.75rem',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          <Paperclip size={11} />
          {files.length} file{files.length !== 1 ? 's' : ''}
        </button>

        {open && (
          <FilePopover
            files={files}
            onClose={() => setOpen(false)}
            onPreview={(i) => setPreview(i)}
          />
        )}
      </div>

      {/* Full-screen preview */}
      {preview !== null && (
        <PreviewModal
          files={files}
          startIndex={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  )
}