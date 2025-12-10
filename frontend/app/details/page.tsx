'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'

export default function StudentDetails() {
    const router = useRouter()
    
    const { files, studentInfo, setStudentInfo } = useOrder()

    // Redirect if no files uploaded
    useEffect(() => {
        if (files.length === 0) {
            router.push('/student')
        }
    }, [files, router])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
    }, [])

    const handleNameChange = (value: string) => {
        setStudentInfo({ ...studentInfo, name: value })
    }

    const handleStudentIdChange = (value: string) => {
        setStudentInfo({ ...studentInfo, studentId: value })
    }

    const handlePhoneNumberChange = (value: string) => {
        // Only allow digits and limit to 10 characters
        const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
        setStudentInfo({ ...studentInfo, phoneNumber: digitsOnly })
    }

    const handleInstructionsChange = (value: string) => {
        setStudentInfo({ ...studentInfo, instructions: value.slice(0, 200) })
    }

    const isFormValid = studentInfo.name.trim() !== '' && studentInfo.studentId.trim() !== '' && studentInfo.phoneNumber.trim() !== '' && studentInfo.phoneNumber.length === 10

    return (
        <div className="page-container">
            <header className="page-header">
                <div className="header-left">
                    <Link href="/" className="page-title-link">
                        <h1 className="page-title">Print Scheduling</h1>
                    </Link>
                </div>
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
                        <label className={styles.label}>Phone Number</label>
                        <input
                            type="tel"
                            className={styles.input}
                            placeholder="Enter your 10-digit phone number"
                            value={studentInfo.phoneNumber}
                            onChange={(e) => handlePhoneNumberChange(e.target.value)}
                            maxLength={10}
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
