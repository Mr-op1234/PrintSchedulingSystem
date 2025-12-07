'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './page.module.css'

export default function Home() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [showPopup, setShowPopup] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setShowPopup(true)
            // Clear the URL parameter
            router.replace('/')
        }
    }, [searchParams, router])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const closePopup = () => {
        setShowPopup(false)
    }

    return (
        <div className="page-container">
            {showPopup && (
                <div className={styles.popupOverlay} onClick={closePopup}>
                    <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.popupIcon}>✓</div>
                        <h2 className={styles.popupTitle}>Document Submitted Successfully</h2>
                        <p className={styles.popupText}>Your print order has been placed.</p>
                        <button className={styles.popupButton} onClick={closePopup}>OK</button>
                    </div>
                </div>
            )}
            <header className="page-header">
                <h1 className="page-title">Print Scheduling</h1>
                <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </header>
            <main className={styles.main}>
                <div className={styles.cardContainer}>
                    <div className={styles.card} onClick={() => router.push('/student')}>
                        <h2>Student Dashboard</h2>
                    </div>
                    <div className={styles.card} onClick={() => router.push('/xerox_auth')}>
                        <h2>Xerox Dashboard</h2>
                    </div>
                </div>
            </main>
        </div>
    )
}
