'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'

export default function StudentDashboard() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    
    const { files, addFiles, removeFile, reorderFiles, setTotalPages } = useOrder()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (!selectedFiles) return

        const pdfFiles = Array.from(selectedFiles).filter(
            (file) => file.type === 'application/pdf'
        )

        const newFiles = pdfFiles.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
            name: file.name,
            file: file,
        }))

        addFiles(newFiles)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDelete = (id: string) => {
        removeFile(id)
    }

    const handleDragStart = (index: number) => {
        setDraggedIndex(index)
    }

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault()
        setDragOverIndex(index)
    }

    const handleDragEnd = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            reorderFiles(draggedIndex, dragOverIndex)
        }
        setDraggedIndex(null)
        setDragOverIndex(null)
    }

    const handleUploadClick = () => {
        fileInputRef.current?.click()
    }

    const handleContinue = () => {
        // Estimate pages (1 page per file as placeholder - backend will calculate actual)
        setTotalPages(files.length)
        router.push('/configure')
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.titleLink}>
                        <h1 className={styles.title}>Print Scheduling</h1>
                    </Link>
                </div>
                <button className={styles.themeToggle} onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </header>
            <main className={styles.main}>
                <h2 className={styles.uploadTitle}>Upload Files</h2>
                <p className={styles.uploadSubtitle}>Maximum 10 files, 50MB each</p>
                
                <div className={styles.uploadArea} onClick={handleUploadClick}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf"
                        multiple
                        className={styles.fileInput}
                    />
                    <div className={styles.uploadIcon}>📄</div>
                    <p className={styles.uploadText}>Click to upload PDF files</p>
                    <p className={styles.uploadHint}>or drag and drop</p>
                </div>

                {files.length > 0 && (
                    <div className={styles.fileList}>
                        <p className={styles.fileListHeader}>
                            {files.length} file(s) selected - Drag to reorder
                        </p>
                        {files.map((file, index) => (
                            <div
                                key={file.id}
                                className={`${styles.fileItem} ${draggedIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                <span className={styles.fileIndex}>{index + 1}</span>
                                <span className={styles.dragHandle}>⋮⋮</span>
                                <span className={styles.fileIcon}>📄</span>
                                <span className={styles.fileName}>{file.name}</span>
                                <button
                                    className={styles.deleteButton}
                                    onClick={() => handleDelete(file.id)}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <button 
                    className={styles.continueButton}
                    disabled={files.length === 0}
                    onClick={handleContinue}
                >
                    Continue
                </button>
            </main>
        </div>
    )
}
