'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'

export default function DocsConfiguration() {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark')
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const router = useRouter()
    
    const { files, printConfig, setPrintConfig, totalPages, estimatedCost } = useOrder()

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

    const handleDropdownToggle = (dropdown: string) => {
        setOpenDropdown(openDropdown === dropdown ? null : dropdown)
    }

    const handleColorModeSelect = (mode: 'bw' | 'color') => {
        setPrintConfig({ ...printConfig, colorMode: mode })
        setOpenDropdown(null)
    }

    const handlePrintSidesSelect = (sides: 'single' | 'double') => {
        setPrintConfig({ ...printConfig, printSides: sides })
        setOpenDropdown(null)
    }

    const handleCopiesSelect = (copies: number) => {
        setPrintConfig({ ...printConfig, copies })
        setOpenDropdown(null)
    }

    const colorModeDisplay = printConfig.colorMode === 'color' ? 'Color' : 'Black & White'
    const printSidesDisplay = printConfig.printSides === 'double' ? 'Double-sided' : 'Single-sided'

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
                <div className={styles.configCard}>
                    <div className={styles.configHeader}>
                        <span className={styles.configIcon}>⚙️</span>
                        <h2 className={styles.configTitle}>Configure Print Settings</h2>
                    </div>
                    <p className={styles.configSubtitle}>Customize how your documents will be printed.</p>

                    <div className={styles.dropdownContainer}>
                        <div className={styles.dropdownWrapper}>
                            <div className={styles.dropdown} onClick={() => handleDropdownToggle('colorMode')}>
                                <div className={styles.dropdownContent}>
                                    <span className={styles.dropdownLabel}>Color Mode</span>
                                    <span className={styles.dropdownValue}>{colorModeDisplay}</span>
                                </div>
                                <span className={styles.dropdownArrow}>▼</span>
                            </div>
                            {openDropdown === 'colorMode' && (
                                <div className={styles.dropdownMenu}>
                                    <div className={styles.dropdownItem} onClick={() => handleColorModeSelect('bw')}>Black & White</div>
                                    <div className={styles.dropdownItem} onClick={() => handleColorModeSelect('color')}>Color</div>
                                </div>
                            )}
                        </div>

                        <div className={styles.dropdownWrapper}>
                            <div className={styles.dropdown} onClick={() => handleDropdownToggle('printSides')}>
                                <div className={styles.dropdownContent}>
                                    <span className={styles.dropdownLabel}>Print Sides</span>
                                    <span className={styles.dropdownValue}>{printSidesDisplay}</span>
                                </div>
                                <span className={styles.dropdownArrow}>▼</span>
                            </div>
                            {openDropdown === 'printSides' && (
                                <div className={styles.dropdownMenu}>
                                    <div className={styles.dropdownItem} onClick={() => handlePrintSidesSelect('single')}>Single-sided</div>
                                    <div className={styles.dropdownItem} onClick={() => handlePrintSidesSelect('double')}>Double-sided</div>
                                </div>
                            )}
                        </div>

                        <div className={styles.dropdownWrapper}>
                            <div className={styles.dropdown} onClick={() => handleDropdownToggle('copies')}>
                                <div className={styles.dropdownContent}>
                                    <span className={styles.dropdownLabel}>No of Copies</span>
                                    <span className={styles.dropdownValue}>{printConfig.copies} Copy</span>
                                </div>
                                <span className={styles.dropdownArrow}>▼</span>
                            </div>
                            {openDropdown === 'copies' && (
                                <div className={styles.dropdownMenu}>
                                    {[1, 2, 3, 4, 5].map((num) => (
                                        <div key={num} className={styles.dropdownItem} onClick={() => handleCopiesSelect(num)}>{num} Copy</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.summaryCard}>
                        <h3 className={styles.summaryTitle}>Print Summary</h3>
                        <div className={styles.summaryGrid}>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Files:</span>
                                <span className={styles.summaryValue}>{files.length} document(s)</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Total Pages:</span>
                                <span className={styles.summaryValue}>{totalPages + 1} page(s)</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Color:</span>
                                <span className={styles.summaryValue}>{colorModeDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Sides:</span>
                                <span className={styles.summaryValue}>{printSidesDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Copies:</span>
                                <span className={styles.summaryValue}>{printConfig.copies}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Estimated cost:</span>
                                <span className={styles.summaryCost}>₹{estimatedCost.toFixed(2)}</span>
                            </div>
                        </div>
                        <p className={styles.summaryNote}>* Includes 1 front page with your details</p>
                    </div>
                </div>

                <div className={styles.footer}>
                    <button className={styles.backButton} onClick={() => router.push('/student')}>← Back</button>
                    <button className={styles.continueButton} onClick={() => router.push('/details')}>Continue →</button>
                </div>
            </main>
        </div>
    )
}
