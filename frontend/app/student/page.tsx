'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'
import { getServiceStatus, ServiceStatus } from '../lib/api'

export default function StudentDashboard() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    
    const { files, addFiles, removeFile, reorderFiles, setTotalPages } = useOrder()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useEffect(() => {
        fetchServiceStatus()
    }, [])

    const fetchServiceStatus = async () => {
        try {
            const status = await getServiceStatus()
            setServiceStatus(status)
        } catch (error) {
            console.error('Error fetching service status:', error)
            // Default to active if can't fetch status
            setServiceStatus({ is_active: true, message: null, stopped_at: null })
        } finally {
            setLoading(false)
        }
    }

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
                {loading ? (
                    <div className={styles.loadingState}>
                        <div className={styles.spinner}></div>
                        <p>Loading...</p>
                    </div>
                ) : serviceStatus && !serviceStatus.is_active ? (
                    <div className={styles.serviceStoppedBanner}>
                        <div className={styles.stoppedIcon}>🚫</div>
                        <h2 className={styles.stoppedTitle}>Service Temporarily Unavailable</h2>
                        <p className={styles.stoppedMessage}>
                            {serviceStatus.message || 'The print service is currently not accepting new orders. Please try again later.'}
                        </p>
                        <button 
                            className={styles.refreshButton}
                            onClick={fetchServiceStatus}
                        >
                            ↻ Check Again
                        </button>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </main>
        </div>
    )
}
