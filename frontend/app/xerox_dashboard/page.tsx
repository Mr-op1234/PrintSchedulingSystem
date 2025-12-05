'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { getOrders, getStats, downloadOrderPdf, markComplete, markNotComplete, deleteOrder, formatFileSize, Order, getServiceStatus, stopService, startService } from '../lib/api'

const ClipboardIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
)

const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
)

const SearchIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
)

const RefreshIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
)

const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const LockIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
)

const PowerIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
    </svg>
)

export default function XeroxDashboard() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [orders, setOrders] = useState<Order[]>([])
    const [stats, setStats] = useState({ pending_count: 0, completed_today: 0 })
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [processingAction, setProcessingAction] = useState<string | null>(null)
    const [serviceActive, setServiceActive] = useState(true)
    const [stopMessage, setStopMessage] = useState('Xerox service is temporarily unavailable. Please try again later.')
    const [showStopModal, setShowStopModal] = useState(false)
    const router = useRouter()

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            const [ordersData, statsData, serviceStatus] = await Promise.all([
                getOrders('pending'),
                getStats(),
                getServiceStatus()
            ])
            setOrders(ordersData.orders)
            setStats(statsData)
            setServiceActive(serviceStatus.is_active)
            setError('')
        } catch (err) {
            setError('Failed to fetch data. Is the backend running?')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useEffect(() => {
        const auth = localStorage.getItem('xerox_authenticated')
        if (auth !== 'true') {
            router.push('/xerox_auth')
        } else {
            setIsAuthenticated(true)
            fetchData()
        }
    }, [router, fetchData])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const handleLogout = () => {
        localStorage.removeItem('xerox_authenticated')
        router.push('/')
    }

    const handleDownload = async (orderId: string, studentName: string) => {
        try {
            setProcessingAction('download')
            const blob = await downloadOrderPdf(orderId)
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${studentName.replace(/\s+/g, '_')}_print_order.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to download PDF'
            setError(message)
        } finally {
            setProcessingAction(null)
        }
    }

    const handleMarkComplete = async (orderId: string) => {
        try {
            setProcessingAction('complete')
            await markComplete(orderId)
            fetchData() // Refresh queue after removing top item
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to mark as complete'
            setError(message)
        } finally {
            setProcessingAction(null)
        }
    }

    const handleMarkNotComplete = async (orderId: string) => {
        try {
            setProcessingAction('notComplete')
            await markNotComplete(orderId)
            fetchData() // Refresh queue after removing top item
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to mark as not complete'
            setError(message)
        } finally {
            setProcessingAction(null)
        }
    }

    const handleDelete = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
            return
        }
        try {
            setProcessingAction('delete')
            await deleteOrder(orderId)
            fetchData() // Refresh queue after removing top item
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to delete order'
            setError(message)
        } finally {
            setProcessingAction(null)
        }
    }

    const handleToggleService = async () => {
        if (serviceActive) {
            // Show modal to get stop message
            setShowStopModal(true)
        } else {
            // Start service directly
            try {
                setProcessingAction('service')
                await startService()
                setServiceActive(true)
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'Failed to start service'
                setError(message)
            } finally {
                setProcessingAction(null)
            }
        }
    }

    const handleConfirmStop = async () => {
        try {
            setProcessingAction('service')
            await stopService(stopMessage)
            setServiceActive(false)
            setShowStopModal(false)
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to stop service'
            setError(message)
        } finally {
            setProcessingAction(null)
        }
    }

    const filteredOrders = orders.filter(order => 
        order.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.student_id.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Show loading while checking auth
    if (isAuthenticated === null) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading...</div>
            </div>
        )
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link href="/" className={styles.titleLink}>
                        <h1 className={styles.title}>Print Scheduling</h1>
                    </Link>
                </div>
                <div className={styles.headerRight}>
                    <button className={styles.logoutButton} onClick={handleLogout}>
                        Logout
                    </button>
                    <button className={styles.themeToggle} onClick={toggleTheme}>
                        {theme === 'light' ? '☾' : '☀'}
                    </button>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.portalHeader}>
                    <h2 className={styles.portalTitle}>Xerox Staff Portal</h2>
                    <p className={styles.portalSubtitle}>Process print requests in strict FIFO order</p>
                </div>

                <div className={styles.statsContainer}>
                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statIcon}><ClipboardIcon /></span>
                            <span className={styles.statLabel}>Pending Requests</span>
                        </div>
                        <div className={styles.statValue}>
                            <span className={styles.statNumber}>{stats.pending_count}</span>
                            <span className={styles.statUnit}>requests</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statHeader}>
                            <span className={styles.statIcon}><CheckCircleIcon /></span>
                            <span className={styles.statLabel}>Completed Today</span>
                        </div>
                        <div className={styles.statValue}>
                            <span className={styles.statNumber}>{stats.completed_today}</span>
                            <span className={styles.statUnit}>jobs</span>
                        </div>
                    </div>

                    <div className={`${styles.statCard} ${styles.serviceCard}`}>
                        <div className={styles.statHeader}>
                            <span className={styles.statIcon}><PowerIcon /></span>
                            <span className={styles.statLabel}>Service Status</span>
                        </div>
                        <div className={styles.serviceStatus}>
                            <span className={`${styles.statusIndicator} ${serviceActive ? styles.active : styles.inactive}`}>
                                {serviceActive ? '● ACTIVE' : '● STOPPED'}
                            </span>
                            <button 
                                className={`${styles.serviceToggle} ${serviceActive ? styles.stopBtn : styles.startBtn}`}
                                onClick={handleToggleService}
                                disabled={processingAction === 'service'}
                            >
                                {serviceActive ? 'Stop Service' : 'Start Service'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stop Service Modal */}
                {showStopModal && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal}>
                            <h3 className={styles.modalTitle}>Stop Service</h3>
                            <p className={styles.modalText}>Enter a message to display to students:</p>
                            <textarea
                                className={styles.modalInput}
                                value={stopMessage}
                                onChange={(e) => setStopMessage(e.target.value)}
                                placeholder="Xerox service is temporarily unavailable..."
                                rows={3}
                            />
                            <div className={styles.modalActions}>
                                <button 
                                    className={styles.modalCancel} 
                                    onClick={() => setShowStopModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className={styles.modalConfirm}
                                    onClick={handleConfirmStop}
                                    disabled={processingAction === 'service'}
                                >
                                    Stop Service
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className={styles.errorBanner}>
                        {error}
                        <button onClick={() => setError('')}>✕</button>
                    </div>
                )}

                <div className={styles.queueSection}>
                    <div className={styles.queueHeader}>
                        <div className={styles.queueTitleGroup}>
                            <h3 className={styles.queueTitle}>Print Queue (FIFO)</h3>
                            <span className={styles.queueCount}>Showing {filteredOrders.length} requests</span>
                        </div>
                        <div className={styles.queueActions}>
                            <div className={styles.searchWrapper}>
                                <span className={styles.searchIconWrapper}><SearchIcon /></span>
                                <input
                                    type="text"
                                    className={styles.searchInput}
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className={styles.refreshButton} type="button" onClick={fetchData}>
                                <RefreshIcon />
                            </button>
                        </div>
                    </div>

                    <div className={styles.queueContent}>
                        {isLoading ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>Loading print requests...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>No print requests found</p>
                            </div>
                        ) : (
                            <div className={styles.ordersList}>
                                {filteredOrders.map((order, index) => (
                                    <div 
                                        key={order.id} 
                                        className={`${styles.orderCard} ${order.is_first ? styles.firstInQueue : styles.locked}`}
                                    >
                                        <div className={styles.queuePosition}>
                                            <span className={styles.positionNumber}>#{index + 1}</span>
                                            {order.is_first ? (
                                                <span className={styles.readyBadge}>READY TO PROCESS</span>
                                            ) : (
                                                <span className={styles.waitingBadge}><LockIcon /> WAITING</span>
                                            )}
                                        </div>
                                        <div className={styles.orderHeader}>
                                            <div className={styles.orderInfo}>
                                                <h4 className={styles.orderName}>{order.student_name}</h4>
                                                <span className={styles.orderId}>{order.student_id}</span>
                                            </div>
                                            <span className={styles.fileSize}>{formatFileSize(order.file_size)}</span>
                                        </div>
                                        <div className={styles.orderDetails}>
                                            <span>{order.total_pages} pages</span>
                                            <span>{order.copies} copies</span>
                                            <span>{order.color_mode === 'color' ? 'Color' : 'B&W'}</span>
                                            <span>{order.print_sides === 'double' ? 'Double' : 'Single'}</span>
                                            <span className={styles.orderCost}>₹{order.estimated_cost.toFixed(2)}</span>
                                        </div>
                                        {order.instructions && (
                                            <div className={styles.orderInstructions}>
                                                <strong>Note:</strong> {order.instructions}
                                            </div>
                                        )}
                                        <div className={styles.orderFooter}>
                                            <span className={styles.orderTime}>{formatDate(order.created_at)}</span>
                                            {order.is_first ? (
                                                <div className={styles.orderActions}>
                                                    <button 
                                                        className={styles.downloadBtn}
                                                        onClick={() => handleDownload(order.id, order.student_name)}
                                                        disabled={processingAction !== null}
                                                    >
                                                        <DownloadIcon /> Download PDF
                                                    </button>
                                                    <button 
                                                        className={styles.completeBtn}
                                                        onClick={() => handleMarkComplete(order.id)}
                                                        disabled={processingAction !== null}
                                                    >
                                                        ✓ Mark Complete
                                                    </button>
                                                    <button 
                                                        className={styles.notCompleteBtn}
                                                        onClick={() => handleMarkNotComplete(order.id)}
                                                        disabled={processingAction !== null}
                                                    >
                                                        ✗ Not Complete
                                                    </button>
                                                    <button 
                                                        className={styles.deleteBtn}
                                                        onClick={() => handleDelete(order.id)}
                                                        disabled={processingAction !== null}
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={styles.lockedActions}>
                                                    <span className={styles.lockedText}>
                                                        <LockIcon /> Process orders above first
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
