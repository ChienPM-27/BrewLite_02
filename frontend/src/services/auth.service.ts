// frontend/src/services/auth.service.ts
import { fetchApi } from '@/lib/api-client';
import { AuthUser } from '@/store/useAuthStore';

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName?: string;
}

export async function loginApi(dto: LoginDto): Promise<AuthResponse> {
  return await fetchApi<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: dto.email.trim(),
      password: dto.password,
    }),
  });
}

export async function registerApi(dto: RegisterDto): Promise<AuthResponse> {
  const payload: RegisterDto = {
    email: dto.email.trim(),
    password: dto.password,
  };
  if (dto.fullName && dto.fullName.trim().length > 0) {
    payload.fullName = dto.fullName.trim();
  }
  return await fetchApi<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
