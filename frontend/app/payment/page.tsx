'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'
import { submitOrder, verifyPaymentScreenshot, getPaymentUpiId } from '../lib/api'

export default function Payment() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState('')
    const [screenshot, setScreenshot] = useState<File | null>(null)
    const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
    const [transactionId, setTransactionId] = useState<string | null>(null)
    const [verificationErrors, setVerificationErrors] = useState<string[]>([])
    const [managerUpiId, setManagerUpiId] = useState<string>('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    
    const { 
        files, 
        printConfig, 
        studentInfo, 
        totalPages,
        estimatedCost,
        resetOrder 
    } = useOrder()

    // Redirect if no files or student info
    useEffect(() => {
        if (files.length === 0) {
            router.push('/student')
        } else if (!studentInfo.name || !studentInfo.studentId) {
            router.push('/details')
        }
    }, [files, studentInfo, router])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // Fetch manager's UPI ID on mount
    useEffect(() => {
        const fetchUpiId = async () => {
            try {
                const result = await getPaymentUpiId()
                setManagerUpiId(result.upi_id)
            } catch (err) {
                console.error('Failed to fetch UPI ID:', err)
            }
        }
        fetchUpiId()
    }, [])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const colorModeDisplay = printConfig.colorMode === 'color' ? 'Color' : 'B&W'
    const printSidesDisplay = printConfig.printSides === 'double' ? 'Double-sided' : 'Single-sided'

    const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check file type
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG, WebP)')
            return
        }

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Screenshot size must be less than 10MB')
            return
        }

        setScreenshot(file)
        setError('')
        setVerificationErrors([])
        setTransactionId(null)

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
            setScreenshotPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)

        // Verify the screenshot
        setIsVerifying(true)
        try {
            const result = await verifyPaymentScreenshot(file)
            if (result.success && result.transaction_id) {
                setTransactionId(result.transaction_id)
                setVerificationErrors([])
            } else {
                setTransactionId(null)
                setVerificationErrors(result.errors || ['Verification failed'])
            }
        } catch (err) {
            setTransactionId(null)
            setVerificationErrors([err instanceof Error ? err.message : 'Verification failed'])
        } finally {
            setIsVerifying(false)
        }
    }

    const handleRemoveScreenshot = () => {
        setScreenshot(null)
        setScreenshotPreview(null)
        setTransactionId(null)
        setVerificationErrors([])
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const isPaymentVerified = transactionId !== null

    const handlePayment = async () => {
        if (!isPaymentVerified || isSubmitting || !transactionId) return
        
        setIsSubmitting(true)
        setError('')
        
        try {
            // Extract File objects from uploaded files
            const fileObjects = files.map(f => f.file)
            
            await submitOrder(
                fileObjects,
                studentInfo.name,
                studentInfo.studentId,
                printConfig.colorMode,
                printConfig.printSides,
                printConfig.copies,
                studentInfo.instructions,
                transactionId
            )
            
            // Reset order state
            resetOrder()
            
            // Redirect to success
            router.push('/?success=true')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit order')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-left">
                    <Link href="/" className="page-title-link">
                        <h1 className="page-title">Print Scheduling</h1>
                    </Link>
                </div>
                <button className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </header>

            <main className="page-main max-600">
                <div className="card">
                    <div className="card-header">
                        <span className="card-icon">💳</span>
                        <h2 className="card-title">Payment</h2>
                    </div>

                    <div className={styles.summarySection}>
                        <h3 className={styles.summaryTitle}>Order Summary</h3>
                        <div className={styles.summaryDetails}>
                            <p><strong>Student:</strong> {studentInfo.name}</p>
                            <p><strong>ID:</strong> {studentInfo.studentId}</p>
                            <p><strong>Files:</strong> {files.length} document(s)</p>
                            <p><strong>Pages:</strong> {totalPages + 1} (includes cover page)</p>
                            <p><strong>Settings:</strong> {colorModeDisplay}, {printSidesDisplay}, {printConfig.copies} copy</p>
                        </div>
                        <div className={styles.summaryTotal}>
                            <span className={styles.totalLabel}>Total</span>
                            <span className={styles.totalPrice}>₹{estimatedCost.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className={styles.paymentSection}>
                        <h3 className={styles.paymentTitle}>Payment Instructions</h3>
                        <div className={styles.paymentInstructions}>
                            <p>1. Pay <strong>₹{estimatedCost.toFixed(2)}</strong> to:</p>
                            <div className={styles.upiDisplay}>
                                <span className={styles.upiLabel}>UPI ID:</span>
                                <span className={styles.upiValue}>{managerUpiId || 'Loading...'}</span>
                            </div>
                            <p>2. Take a screenshot of the payment confirmation</p>
                            <p>3. Upload the screenshot below</p>
                        </div>
                    </div>

                    <div className={styles.screenshotSection}>
                        <label className="form-label">Upload Payment Screenshot</label>
                        
                        {!screenshot ? (
                            <div 
                                className={styles.uploadArea}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleScreenshotSelect}
                                    accept="image/*"
                                    className={styles.fileInput}
                                    disabled={isSubmitting}
                                />
                                <div className={styles.uploadIcon}>📸</div>
                                <p className={styles.uploadText}>Click to upload screenshot</p>
                                <p className={styles.uploadHint}>JPEG, PNG, or WebP (max 10MB)</p>
                            </div>
                        ) : (
                            <div className={styles.previewContainer}>
                                <img 
                                    src={screenshotPreview || ''} 
                                    alt="Payment screenshot" 
                                    className={styles.screenshotPreview}
                                />
                                <button 
                                    className={styles.removeButton}
                                    onClick={handleRemoveScreenshot}
                                    disabled={isSubmitting}
                                >
                                    ✕ Remove
                                </button>
                            </div>
                        )}

                        {isVerifying && (
                            <div className={styles.verifying}>
                                <span className={styles.spinner}></span>
                                Verifying payment...
                            </div>
                        )}

                        {transactionId && (
                            <div className={styles.verified}>
                                <span className={styles.verifiedIcon}>✓</span>
                                <div>
                                    <p className={styles.verifiedText}>Payment Verified!</p>
                                </div>
                            </div>
                        )}

                        {verificationErrors.length > 0 && (
                            <div className={styles.verificationErrors}>
                                <p className={styles.errorTitle}>Verification Failed:</p>
                                <ul>
                                    {verificationErrors.map((err, idx) => (
                                        <li key={idx}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button 
                        className="back-button" 
                        onClick={() => router.push('/details')}
                        disabled={isSubmitting}
                    >
                        ← Back
                    </button>
                    <button 
                        className="btn-primary" 
                        disabled={!isPaymentVerified || isSubmitting}
                        onClick={handlePayment}
                    >
                        {isSubmitting ? 'Submitting...' : `Submit Order`}
                    </button>
                </div>
            </main>
        </div>
    )
}
