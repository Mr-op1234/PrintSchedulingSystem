'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'

export default function StudentDetails() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const router = useRouter()
    
    const { files, studentInfo, setStudentInfo } = useOrder()

    // Redirect if no files uploaded
    useEffect(() => {
        if (files.length === 0) {
            router.push('/student')
        }
    }, [files, router])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const handleNameChange = (value: string) => {
        setStudentInfo({ ...studentInfo, name: value })
    }

    const handleStudentIdChange = (value: string) => {
        setStudentInfo({ ...studentInfo, studentId: value })
    }

    const handleInstructionsChange = (value: string) => {
        setStudentInfo({ ...studentInfo, instructions: value.slice(0, 200) })
    }

    const isFormValid = studentInfo.name.trim() !== '' && studentInfo.studentId.trim() !== ''

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

            <main className="page-main max-900">
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <span className={styles.formIcon}>📋</span>
                        <h2 className={styles.formTitle}>Student Information</h2>
                    </div>
                    <p className={styles.formSubtitle}>This information will appear on your print cover page</p>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Your Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Enter your full name"
                            value={studentInfo.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Student ID</label>
                        <input
                            type="text"
                            className={styles.input}
                            placeholder="Enter your IEM ID (e.g., 12023052016044)"
                            value={studentInfo.studentId}
                            onChange={(e) => handleStudentIdChange(e.target.value)}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            Additional Instructions <span className={styles.optional}>(Optional)</span>
                        </label>
                        <textarea
                            className={styles.textarea}
                            placeholder="Enter binding instructions or other details (200 characters max)"
                            value={studentInfo.instructions}
                            onChange={(e) => handleInstructionsChange(e.target.value)}
                            maxLength={200}
                        />
                        <span className={styles.charCount}>{studentInfo.instructions.length}/200</span>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.backButton} onClick={() => router.push('/configure')}>← Back</button>
                    <button 
                        className={styles.continueButton}
                        disabled={!isFormValid}
                        onClick={() => router.push('/payment')}
                    >
                        Continue →
                    </button>
                </div>
            </main>
        </div>
    )
}
