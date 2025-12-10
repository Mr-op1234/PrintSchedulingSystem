'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'
import { getServiceStatus, ServiceStatus, countPages } from '../lib/api'

export default function StudentDashboard() {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    
    const { files, addFiles, removeFile, reorderFiles, setTotalPages } = useOrder()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
    }, [])

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (!selectedFiles) return

        const pdfFiles = Array.from(selectedFiles).filter(
            (file) => file.type === 'application/pdf'
        )

        try {
            // Call backend API to count pages for all PDFs
            const result = await countPages(pdfFiles)
            
            // Map files with their page counts from backend response
            const newFilesWithPages = pdfFiles.map((file) => {
                const fileInfo = result.files.find(f => f.filename === file.name)
                return {
                    id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                    name: file.name,
                    file: file,
                    pageCount: fileInfo?.pages || 0
                }
            })

            addFiles(newFilesWithPages)
            console.log(`Total pages: ${result.total_pages}`)
        } catch (error) {
            console.error('Error counting pages:', error)
            // Still add files but without page counts
            const newFiles = pdfFiles.map((file) => ({
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
                name: file.name,
                file: file,
                pageCount: 0
            }))
            addFiles(newFiles)
        }
        
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
        router.push('/configure')
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-left">
                    <Link href="/" className="page-title-link">
                        <h1 className="page-title">Print Scheduling</h1>
                    </Link>
                </div>
            </header>
            <main className="page-main max-600">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
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
                                        <span className={styles.fileName}>
                                            {file.name}
                                            {file.pageCount !== undefined && (
                                                <span className={styles.pageCount}> ({file.pageCount} pages)</span>
                                            )}
                                        </span>
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
