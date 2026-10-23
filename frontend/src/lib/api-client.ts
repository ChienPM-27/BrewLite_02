const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
}

/** Lỗi trả về từ API; giữ `statusCode` để giao diện phân biệt 404 / 400 / 401 / 5xx. */
export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new ApiError('Phản hồi không hợp lệ từ máy chủ', response.status);
  }

  if (!response.ok || !json?.success) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('brewlite_auth');
      const pathname = window.location.pathname;
      if (!pathname.startsWith('/auth/')) {
        const next = encodeURIComponent(pathname + window.location.search);
        window.location.href = `/auth/login?next=${next}`;
      }
    }

    const rawMessage = json?.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : rawMessage || 'Có lỗi xảy ra khi gọi API';
    throw new ApiError(message, response.status);
  }

  return json.data as T;
}
