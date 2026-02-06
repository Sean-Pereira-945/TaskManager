import { clearToken, getToken } from './authToken'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

type JsonBody = unknown
type RequestOptions = Omit<RequestInit, 'body'> & { body?: JsonBody }
type ApiError = Error & { status?: number }

export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { body, headers, ...rest } = options
  const finalHeaders: HeadersInit = headers instanceof Headers ? headers : { ...(headers ?? {}) }
  const preparedBody = body ? JSON.stringify(body) : undefined

  if (preparedBody && !(headers instanceof Headers && headers.has('Content-Type'))) {
    ;(finalHeaders as Record<string, string>)['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token && !(headers instanceof Headers && headers.has('Authorization'))) {
    ;(finalHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: finalHeaders,
    body: preparedBody,
    ...rest,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = (payload as Record<string, unknown> | null)?.message
    const error = new Error(typeof message === 'string' ? message : 'Unexpected server error') as ApiError
    error.status = response.status
    if (response.status === 401) {
      clearToken()
    }
    throw error
  }

  return (payload as { data?: T } | null)?.data ?? (null as T)
}
