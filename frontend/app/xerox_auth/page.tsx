'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { login, verifyAuth } from '../lib/api'

export default function XeroxAuth() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [loginId, setLoginId] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // Check if already authenticated
    useEffect(() => {
        const checkAuth = async () => {
            const isValid = await verifyAuth()
            if (isValid) {
                router.push('/xerox_dashboard')
            }
        }
        checkAuth()
    }, [router])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    const handleLogin = async () => {
        if (loginId.trim() === '' || password.trim() === '') {
            setError('Please enter both Login ID and Password')
            return
        }
        
        setIsLoading(true)
        setError('')
        
        try {
            await login(loginId, password)
            router.push('/xerox_dashboard')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid Login ID or Password')
        } finally {
            setIsLoading(false)
        }
    }

    const isFormValid = loginId.trim() !== '' && password.trim() !== '' && !isLoading

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link href="/" className={styles.titleLink}>
                    <h1 className={styles.title}>Print Scheduling</h1>
                </Link>
                <button className={styles.themeToggle} onClick={toggleTheme}>
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>
            </header>

            <main className={styles.main}>
                <div className={styles.loginCard}>
                    <h2 className={styles.cardTitle}>Xerox Login</h2>
                    <p className={styles.cardSubtitle}>Access the Xerox Management Portal</p>

                    {error && <p className={styles.error}>{error}</p>}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Login ID</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>👤</span>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Enter your login ID"
                                value={loginId}
                                onChange={(e) => { setLoginId(e.target.value); setError(''); }}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Password</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.inputIcon}>🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={styles.input}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                            />
                            <button 
                                type="button"
                                className={styles.eyeButton}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button 
                        className={styles.signInButton}
                        disabled={!isFormValid}
                        onClick={handleLogin}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>

                    <button 
                        className={styles.returnButton}
                        onClick={() => router.push('/')}
                    >
                        Return to Home
                    </button>
                </div>
            </main>
        </div>
    )
}
