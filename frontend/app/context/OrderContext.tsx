'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface UploadedFile {
    id: string
    name: string
    file: File
}

interface PrintConfig {
    colorMode: 'bw' | 'color'
    printSides: 'single' | 'double'
    copies: number
}

interface StudentInfo {
    name: string
    studentId: string
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
    
    // UPI
    upiId: string
    setUpiId: (upi: string) => void
    
    // Reset
    resetOrder: () => void
}

const defaultPrintConfig: PrintConfig = {
    colorMode: 'bw',
    printSides: 'single',
    copies: 1
}

const defaultStudentInfo: StudentInfo = {
    name: '',
    studentId: '',
    instructions: ''
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [printConfig, setPrintConfig] = useState<PrintConfig>(defaultPrintConfig)
    const [studentInfo, setStudentInfo] = useState<StudentInfo>(defaultStudentInfo)
    const [totalPages, setTotalPages] = useState(0)
    const [upiId, setUpiId] = useState('')

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
    // +1 for front page that will be added by backend
    const estimatedCost = (() => {
        const pages = totalPages + 1 // +1 for front page
        const baseCost = printConfig.colorMode === 'color' ? 5 : 3
        const sideMultiplier = printConfig.printSides === 'double' ? 0.8 : 1
        return pages * baseCost * printConfig.copies * sideMultiplier
    })()

    const resetOrder = () => {
        setFiles([])
        setPrintConfig(defaultPrintConfig)
        setStudentInfo(defaultStudentInfo)
        setTotalPages(0)
        setUpiId('')
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
            upiId,
            setUpiId,
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
