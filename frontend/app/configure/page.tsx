'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { useOrder } from '../context/OrderContext'

export default function DocsConfiguration() {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const [showCustomCopies, setShowCustomCopies] = useState(false)
    const [customCopiesInput, setCustomCopiesInput] = useState('')
    const router = useRouter()
    
    const { files, printConfig, setPrintConfig, totalPages, estimatedCost } = useOrder()

    // Redirect if no files uploaded
    useEffect(() => {
        if (files.length === 0) {
            router.push('/student')
        }
    }, [files, router])

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'dark')
    }, [])

    const handleDropdownToggle = (dropdown: string) => {
        setOpenDropdown(openDropdown === dropdown ? null : dropdown)
    }

    const handleColorModeSelect = (mode: 'bw' | 'color') => {
        setPrintConfig({ ...printConfig, colorMode: mode })
        setOpenDropdown(null)
    }

    const handlePaperTypeSelect = (type: 'normal' | 'photopaper') => {
        setPrintConfig({ ...printConfig, paperType: type })
        setOpenDropdown(null)
    }

    const handlePageSizeSelect = (size: 'A4' | 'A3') => {
        setPrintConfig({ ...printConfig, pageSize: size })
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

    const handleCustomCopiesClick = () => {
        setCustomCopiesInput(printConfig.copies > 10 ? printConfig.copies.toString() : '')
        setShowCustomCopies(true)
        setOpenDropdown(null)
    }

    const handleCustomCopiesSubmit = () => {
        const num = parseInt(customCopiesInput)
        if (!isNaN(num) && num >= 1 && num <= 50) {
            setPrintConfig({ ...printConfig, copies: num })
            setShowCustomCopies(false)
            setCustomCopiesInput('')
        }
    }

    const handleBindingToggle = (binding: 'spiral' | 'soft') => {
        // Toggle: if same binding is clicked, turn it off; otherwise set to new binding
        setPrintConfig({ 
            ...printConfig, 
            binding: printConfig.binding === binding ? 'none' : binding 
        })
    }

    const colorModeDisplay = printConfig.colorMode === 'color' ? 'Color' : 'Black & White'
    const paperTypeDisplay = printConfig.paperType === 'photopaper' ? 'Photo Paper' : 'Normal Paper'
    const printSidesDisplay = printConfig.printSides === 'double' ? 'Double-sided' : 'Single-sided'
    const pageSizeDisplay = printConfig.pageSize

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
                <div className={styles.configCard}>
                    <div className={styles.configHeader}>
                        <h2 className={styles.configTitle}>Configure Print Settings</h2>
                    </div>
                    <p className={styles.configSubtitle}>Customize how your documents will be printed.</p>

                    <div className={styles.dropdownContainer}>
                        <div className={styles.dropdownWrapper}>
                            <div className={styles.dropdown} onClick={() => handleDropdownToggle('pageSize')}>
                                <div className={styles.dropdownContent}>
                                    <span className={styles.dropdownLabel}>Page Size</span>
                                    <span className={styles.dropdownValue}>{pageSizeDisplay}</span>
                                </div>
                                <span className={styles.dropdownArrow}>▼</span>
                            </div>
                            {openDropdown === 'pageSize' && (
                                <div className={styles.dropdownMenu}>
                                    <div className={styles.dropdownItem} onClick={() => handlePageSizeSelect('A4')}>A4</div>
                                    <div className={styles.dropdownItem} onClick={() => handlePageSizeSelect('A3')}>A3</div>
                                </div>
                            )}
                        </div>

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
                            <div className={styles.dropdown} onClick={() => handleDropdownToggle('paperType')}>
                                <div className={styles.dropdownContent}>
                                    <span className={styles.dropdownLabel}>Paper Type</span>
                                    <span className={styles.dropdownValue}>{paperTypeDisplay}</span>
                                </div>
                                <span className={styles.dropdownArrow}>▼</span>
                            </div>
                            {openDropdown === 'paperType' && (
                                <div className={styles.dropdownMenu}>
                                    <div className={styles.dropdownItem} onClick={() => handlePaperTypeSelect('normal')}>Normal Paper</div>
                                    <div className={styles.dropdownItem} onClick={() => handlePaperTypeSelect('photopaper')}>Photo Paper</div>
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
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                        <div key={num} className={styles.dropdownItem} onClick={() => handleCopiesSelect(num)}>{num} {num === 1 ? 'Copy' : 'Copies'}</div>
                                    ))}
                                    <div className={styles.dropdownItem} onClick={handleCustomCopiesClick}>Custom...</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className={styles.bindingSection}>
                        <h3 className={styles.bindingTitle}>Binding Options</h3>
                        <div className={styles.bindingButtons}>
                            <button 
                                className={`${styles.bindingButton} ${printConfig.binding === 'spiral' ? styles.bindingActive : ''}`}
                                onClick={() => handleBindingToggle('spiral')}
                            >
                                <div className={styles.bindingInfo}>
                                    <span className={styles.bindingName}>Spiral Binding</span>
                                    <span className={styles.bindingPrice}>+₹25</span>
                                </div>
                            </button>
                            <button 
                                className={`${styles.bindingButton} ${printConfig.binding === 'soft' ? styles.bindingActive : ''}`}
                                onClick={() => handleBindingToggle('soft')}
                            >
                                <div className={styles.bindingInfo}>
                                    <span className={styles.bindingName}>Soft Binding</span>
                                    <span className={styles.bindingPrice}>+₹100</span>
                                </div>
                            </button>
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
                                <span className={styles.summaryValue}>{totalPages} page(s)</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Page Size:</span>
                                <span className={styles.summaryValue}>{pageSizeDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Color:</span>
                                <span className={styles.summaryValue}>{colorModeDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Paper Type:</span>
                                <span className={styles.summaryValue}>{paperTypeDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Sides:</span>
                                <span className={styles.summaryValue}>{printSidesDisplay}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span className={styles.summaryLabel}>Total Copies:</span>
                                <span className={styles.summaryValue}>
                                    {printConfig.copies === 1 
                                        ? '1 (Print)' 
                                        : `${printConfig.copies} (1 Print + ${printConfig.copies - 1} Xerox)`}
                                </span>
                            </div>
                            {printConfig.binding !== 'none' && (
                                <div className={styles.summaryRow}>
                                    <span className={styles.summaryLabel}>Binding:</span>
                                    <span className={styles.summaryValue}>
                                        {printConfig.binding === 'spiral' ? 'Spiral Binding (+₹25)' : 'Soft Binding (+₹100)'}
                                    </span>
                                </div>
                            )}
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

            {showCustomCopies && (
                <div className={styles.modalOverlay} onClick={() => setShowCustomCopies(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>Custom Number of Copies</h3>
                        <p className={styles.modalDescription}>Enter the number of copies (1-50)</p>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={customCopiesInput}
                            onChange={(e) => setCustomCopiesInput(e.target.value)}
                            className={styles.modalInput}
                            placeholder="Enter number"
                            autoFocus
                            onKeyPress={(e) => e.key === 'Enter' && handleCustomCopiesSubmit()}
                        />
                        <div className={styles.modalButtons}>
                            <button className={styles.modalCancelButton} onClick={() => setShowCustomCopies(false)}>
                                Cancel
                            </button>
                            <button className={styles.modalSubmitButton} onClick={handleCustomCopiesSubmit}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
