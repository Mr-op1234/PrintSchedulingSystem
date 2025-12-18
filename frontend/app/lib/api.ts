const API_BASE_URL = 'http://localhost:8000'

// Token storage key
const AUTH_TOKEN_KEY = 'xerox_auth_token'

// Default timeout for API calls (10 seconds)
const API_TIMEOUT = 10000

// Helper function to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = API_TIMEOUT): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}

// ==================== AUTHENTICATION ====================

export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(AUTH_TOKEN_KEY, token)
    }
}

export function clearAuthToken(): void {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(AUTH_TOKEN_KEY)
    }
}

export function isAuthenticated(): boolean {
    return getAuthToken() !== null
}

function getAuthHeaders(): HeadersInit {
    const token = getAuthToken()
    if (token) {
        return { 'Authorization': `Bearer ${token}` }
    }
    return {}
}

export interface LoginResponse {
    access_token: string
    token_type: string
    expires_in: number
}

export async function login(username: string, password: string): Promise<LoginResponse> {
    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        body: formData
    })
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Login failed' }))
        throw new Error(error.detail || 'Invalid credentials')
    }
    
    const data = await response.json()
    setAuthToken(data.access_token)
    return data
}

export async function verifyAuth(): Promise<boolean> {
    const token = getAuthToken()
    if (!token) return false
    
    try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/verify`, {
            headers: getAuthHeaders()
        })
        return response.ok
    } catch {
        return false
    }
}

export function logout(): void {
    clearAuthToken()
}

interface OrderResponse {
    success: boolean
    order_id: string
    total_pages: number
    estimated_cost: number
    status: string
}

export interface Order {
    id: string
    queue_position: number
    is_first: boolean
    student_name: string
    student_id: string
    total_pages: number
    copies: number
    color_mode: string
    print_sides: string
    estimated_cost: number
    file_size: number
    status: string
    created_at: string
    instructions: string
    original_filenames: string[]
    transaction_id: string | null
}

interface StatsResponse {
    pending_count: number
    completed_today: number
}

export async function submitOrder(
    files: File[],
    studentName: string,
    studentId: string,
    colorMode: string,
    printSides: string,
    copies: number,
    pageSize: string,
    paperType: string,
    binding: string,
    instructions: string,
    transactionId: string
): Promise<OrderResponse> {
    const formData = new FormData()
    
    // Add files in order
    files.forEach(file => {
        formData.append('files', file)
    })
    
    // Add other fields
    formData.append('student_name', studentName)
    formData.append('student_id', studentId)
    formData.append('color_mode', colorMode)
    formData.append('print_sides', printSides)
    formData.append('copies', copies.toString())
    formData.append('page_size', pageSize)
    formData.append('paper_type', paperType)
    formData.append('binding', binding)
    formData.append('instructions', instructions)
    formData.append('transaction_id', transactionId)
    
    // Longer timeout for file uploads (60 seconds)
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        body: formData
    }, 60000)
    
    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to submit order')
    }
    
    return response.json()
}

export async function getOrders(status?: string): Promise<{ orders: Order[] }> {
    const url = status 
        ? `${API_BASE_URL}/api/orders?status=${status}`
        : `${API_BASE_URL}/api/orders`
    
    const response = await fetchWithTimeout(url, {
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        throw new Error('Failed to fetch orders')
    }
    
    return response.json()
}

export async function getOrder(orderId: string): Promise<Order> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}`)
    
    if (!response.ok) {
        throw new Error('Failed to fetch order')
    }
    
    return response.json()
}

export async function downloadOrderPdf(orderId: string): Promise<Blob> {
    // Longer timeout for file downloads (60 seconds)
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}/download`, {
        headers: getAuthHeaders()
    }, 60000)
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to download PDF' }))
        throw new Error(error.detail || 'Can only download the first order in queue')
    }
    
    return response.blob()
}

export async function markComplete(orderId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to complete order' }))
        throw new Error(error.detail || 'Can only complete the first order in queue')
    }
}

export async function markNotComplete(orderId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}/not-complete`, {
        method: 'POST',
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to mark as not complete' }))
        throw new Error(error.detail || 'Can only process the first order in queue')
    }
}

export async function deleteOrder(orderId: string): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to delete order' }))
        throw new Error(error.detail || 'Can only delete the first order in queue')
    }
}

export async function getStats(): Promise<StatsResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/stats`)
    
    if (!response.ok) {
        throw new Error('Failed to fetch stats')
    }
    
    return response.json()
}

// ==================== PAYMENT VERIFICATION ====================

export interface PaymentVerificationResult {
    success: boolean
    transaction_id: string | null
    message: string
    errors?: string[]
}

export async function verifyPaymentScreenshot(screenshot: File): Promise<PaymentVerificationResult> {
    const formData = new FormData()
    formData.append('screenshot', screenshot)
    
    // Longer timeout for OCR processing (30 seconds)
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        body: formData
    }, 30000)
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Failed to verify payment' }))
        throw new Error(error.detail || 'Payment verification failed')
    }
    
    return response.json()
}

export async function getPaymentUpiId(): Promise<{ upi_id: string }> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/payment/upi-id`)
    
    if (!response.ok) {
        throw new Error('Failed to fetch UPI ID')
    }
    
    return response.json()
}

// ==================== SERVICE STATUS ====================

export interface ServiceStatus {
    is_active: boolean
    message: string
    stopped_at: string | null
    stopped_by: string | null
}

export async function getServiceStatus(): Promise<ServiceStatus> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/service/status`, {}, 5000)
    
    if (!response.ok) {
        throw new Error('Failed to fetch service status')
    }
    
    return response.json()
}

export async function stopService(message: string): Promise<void> {
    const formData = new FormData()
    formData.append('message', message)
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/service/stop`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        throw new Error('Failed to stop service')
    }
}

export async function startService(): Promise<void> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/service/start`, {
        method: 'POST',
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        throw new Error('Failed to start service')
    }
}

// ==================== DATABASE MANAGEMENT ====================

export interface ClearDatabaseResponse {
    success: boolean
    deleted_count: number
    message: string
}

export async function clearDatabase(): Promise<ClearDatabaseResponse> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/database/clear`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    })
    
    if (!response.ok) {
        if (response.status === 401) {
            clearAuthToken()
            throw new Error('Authentication required')
        }
        const error = await response.json().catch(() => ({ detail: 'Failed to clear database' }))
        throw new Error(error.detail || 'Failed to clear database')
    }
    
    return response.json()
}

// ==================== PAGE COUNTING ====================

export interface FilePageCount {
    filename: string
    pages: number
}

export interface CountPagesResponse {
    success: boolean
    total_pages: number
    files: FilePageCount[]
}

export async function countPages(files: File[]): Promise<CountPagesResponse> {
    const formData = new FormData()
    files.forEach((file) => {
        formData.append('files', file)
    })

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/count-pages`, {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to count pages')
    }

    return response.json()
}

// Utility function to format file size
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
