'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'
import { submitOrder } from '../lib/api'

export default function Payment() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    
    const { 
        files, 
        printConfig, 
        studentInfo, 
        totalPages,
        estimatedCost,
        upiId,
        setUpiId,
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

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const colorModeDisplay = printConfig.colorMode === 'color' ? 'Color' : 'B&W'
    const printSidesDisplay = printConfig.printSides === 'double' ? 'Double-sided' : 'Single-sided'

    const isValidUpi = upiId.trim() !== ''

    const handlePayment = async () => {
        if (!isValidUpi || isSubmitting) return
        
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
                upiId
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
                <div className={styles.paymentCard}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardIcon}>💳</span>
                        <h2 className={styles.cardTitle}>Payment</h2>
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

                    <div className={styles.upiSection}>
                        <label className={styles.label}>Enter your UPI ID</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="example@upi"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>

                    {error && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button 
                        className={styles.backButton} 
                        onClick={() => router.push('/details')}
                        disabled={isSubmitting}
                    >
                        ← Back
                    </button>
                    <button 
                        className={styles.payButton} 
                        disabled={!isValidUpi || isSubmitting}
                        onClick={handlePayment}
                    >
                        {isSubmitting ? 'Submitting...' : `Pay ₹${estimatedCost.toFixed(2)}`}
                    </button>
                </div>
            </main>
        </div>
    )
}
