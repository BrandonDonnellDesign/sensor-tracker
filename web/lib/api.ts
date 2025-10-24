import { User, Sensor, Photo } from '@dexcom-tracker/shared/dist';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: any[];
}

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data: ApiResponse<T> = await response.json();
    
    if (!response.ok) {
      // Handle token expiration
      if (response.status === 403 || response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResponse = await this.refreshToken(refreshToken);
            localStorage.setItem('accessToken', refreshResponse.accessToken);
            // Retry the original request
            // The DOM Response type doesn't expose the original request method.
            // Default to GET for retries. If retrying non-GET requests is needed
            // in the future, change handleResponse to accept the original
            // RequestInit and re-use it here.
            const retryResponse = await fetch(response.url, {
              method: 'GET',
              headers: this.getAuthHeaders(),
            });
            const retryData: ApiResponse<T> = await retryResponse.json();
            if (retryResponse.ok && retryData.success) {
              return retryData.data!;
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/auth/login';
            throw new Error('Session expired');
          }
        } else {
          // No refresh token, redirect to login
          window.location.href = '/auth/login';
          throw new Error('Authentication required');
        }
      }
      
      throw new Error(data.error || 'Request failed');
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data.data!;
  }

  async register(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    return this.handleResponse<AuthTokens>(response);
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    return this.handleResponse<AuthTokens>(response);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    return this.handleResponse<{ accessToken: string }>(response);
  }

  async getProfile(): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<{ user: User }>(response);
  }

  async updateProfile(email: string): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
    
    return this.handleResponse<{ user: User }>(response);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    
    await this.handleResponse<void>(response);
  }

  async logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }

  // Sensor endpoints (to be implemented in future tasks)
  async getSensors(): Promise<Sensor[]> {
    const response = await fetch(`${API_BASE_URL}/sensors`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<Sensor[]>(response);
  }

  async getSensor(id: string): Promise<Sensor> {
    const response = await fetch(`${API_BASE_URL}/sensors/${id}`, {
      headers: this.getAuthHeaders(),
    });
    
    return this.handleResponse<Sensor>(response);
  }

  async createSensor(sensorData: Omit<Sensor, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'isDeleted' | 'photos'>): Promise<Sensor> {
    const response = await fetch(`${API_BASE_URL}/sensors`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sensorData),
    });
    
    return this.handleResponse<Sensor>(response);
  }

  async updateSensor(id: string, sensorData: Partial<Sensor>): Promise<Sensor> {
    const response = await fetch(`${API_BASE_URL}/sensors/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(sensorData),
    });
    
    return this.handleResponse<Sensor>(response);
  }

  async deleteSensor(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/sensors/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    await this.handleResponse<void>(response);
  }
}

export const apiClient = new ApiClient();