'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface UploadedFile {
    id: string
    name: string
    file: File
    pageCount?: number
}

interface PrintConfig {
    colorMode: 'bw' | 'color'
    paperType: 'normal' | 'photopaper'
    printSides: 'single' | 'double'
    copies: number
    pageSize: 'A4' | 'A3'
    binding: 'none' | 'spiral' | 'soft'
}

interface StudentInfo {
    name: string
    studentId: string
    phoneNumber: string
    instructions: string
}

interface OrderContextType {
    // Files
    files: UploadedFile[]
    setFiles: (files: UploadedFile[]) => void
    addFiles: (newFiles: UploadedFile[]) => void
    removeFile: (id: string) => void
    reorderFiles: (fromIndex: number, toIndex: number) => void
    
    // Print config
    printConfig: PrintConfig
    setPrintConfig: (config: PrintConfig) => void
    
    // Student info
    studentInfo: StudentInfo
    setStudentInfo: (info: StudentInfo) => void
    
    // Cost calculation
    totalPages: number
    setTotalPages: (pages: number) => void
    estimatedCost: number
    
    // Reset
    resetOrder: () => void
}

const defaultPrintConfig: PrintConfig = {
    colorMode: 'bw',
    paperType: 'normal',
    printSides: 'single',
    copies: 1,
    pageSize: 'A4',
    binding: 'none'
}

const defaultStudentInfo: StudentInfo = {
    name: '',
    studentId: '',
    phoneNumber: '',
    instructions: ''
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [printConfig, setPrintConfig] = useState<PrintConfig>(defaultPrintConfig)
    const [studentInfo, setStudentInfo] = useState<StudentInfo>(defaultStudentInfo)
    const [totalPages, setTotalPages] = useState(0)
    
    // Auto-calculate total pages when files change
    useEffect(() => {
        const total = files.reduce((sum, file) => sum + (file.pageCount || 0), 0)
        setTotalPages(total)
    }, [files])

    const addFiles = (newFiles: UploadedFile[]) => {
        setFiles(prev => [...prev, ...newFiles])
    }

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id))
    }

    const reorderFiles = (fromIndex: number, toIndex: number) => {
        const newFiles = [...files]
        const [movedFile] = newFiles.splice(fromIndex, 1)
        newFiles.splice(toIndex, 0, movedFile)
        setFiles(newFiles)
    }

    // Calculate estimated cost
    // Front page is always ₹2, uploaded pages use configured pricing
    // Note: Double-sided counts as 2 pages (both sides charged)
    const estimatedCost = (() => {
        let uploadedPages = totalPages
        
        // Double-sided: each sheet counts as 2 pages
        if (printConfig.printSides === 'double') {
            uploadedPages = Math.ceil(uploadedPages / 2) * 2
        }
        
        // Pricing based on page size, color mode, and paper type (for uploaded pages only)
        let pricePerPage = 0
        if (printConfig.paperType === 'photopaper') {
            // Photo paper pricing
            pricePerPage = printConfig.pageSize === 'A4' ? 20 : 40
        } else {
            // Normal paper pricing
            if (printConfig.pageSize === 'A4') {
                pricePerPage = printConfig.colorMode === 'bw' ? 2 : 5
            } else if (printConfig.pageSize === 'A3') {
                pricePerPage = printConfig.colorMode === 'bw' ? 4 : 20
            }
        }
        
        // Calculate cost: 1 print copy + (n-1) xerox copies if copies > 1
        let baseCost = 0
        const frontPageCost = 2 // Front page is always ₹2
        
        if (printConfig.copies === 1) {
            // Single copy: front page (₹2) + uploaded pages at configured price
            baseCost = frontPageCost + (uploadedPages * pricePerPage)
        } else {
            // Multiple copies: 1 print + (n-1) xerox
            // Print cost for 1 copy: front page (₹2) + uploaded pages
            baseCost = frontPageCost + (uploadedPages * pricePerPage)
            
            // Xerox cost for remaining copies (only uploaded pages, NOT front page)
            // Front page is only printed once in the original, not xeroxed
            // Xerox pricing: ₹1.5/page for B&W, ₹5/page for color
            const xeroxPricePerPage = printConfig.colorMode === 'bw' ? 1.5 : 5
            const xeroxCopies = printConfig.copies - 1
            baseCost += uploadedPages * xeroxPricePerPage * xeroxCopies
        }
        
        // Add binding cost
        if (printConfig.binding === 'spiral') {
            baseCost += 25
        } else if (printConfig.binding === 'soft') {
            baseCost += 100
        }
        
        return baseCost
    })()

    const resetOrder = () => {
        setFiles([])
        setPrintConfig(defaultPrintConfig)
        setStudentInfo(defaultStudentInfo)
        setTotalPages(0)
    }

    return (
        <OrderContext.Provider value={{
            files,
            setFiles,
            addFiles,
            removeFile,
            reorderFiles,
            printConfig,
            setPrintConfig,
            studentInfo,
            setStudentInfo,
            totalPages,
            setTotalPages,
            estimatedCost,
            resetOrder
        }}>
            {children}
        </OrderContext.Provider>
    )
}

export function useOrder() {
    const context = useContext(OrderContext)
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider')
    }
    return context
}
