import apiClient from './api';
import type { DynamicField, OnboardingFormData } from '../Types/types';
import { mockAdminService } from './mock.service';

const USE_MOCK = false;

class AdminService {
  // Admin Onboarding
  async completeOnboarding(data: OnboardingFormData) {
    if (USE_MOCK) {
      return mockAdminService.completeOnboarding(data);
    }
    const response = await apiClient.post('/admin/onboarding/', data);
    return response.data;
  }

  // Dynamic Fields Management
  async getDynamicFields(lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getDynamicFields(lgId);
    }
    const endpoint = lgId ? `/lg/requirements/?lg=${lgId}` : '/lg/requirements/';
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async createDynamicField(fieldData: Omit<DynamicField, 'id'>) {
    if (USE_MOCK) {
      return mockAdminService.createDynamicField(fieldData);
    }
    const response = await apiClient.post('/lg/requirements/', fieldData);
    return response.data;
  }

  async updateDynamicField(fieldId: string, fieldData: Omit<DynamicField, 'id'>) {
    if (USE_MOCK) {
      return mockAdminService.updateDynamicField(fieldId, fieldData);
    }
    const response = await apiClient.put(`/lg/requirements/${fieldId}/`, fieldData);
    return response.data;
  }

  async deleteDynamicField(fieldId: string) {
    if (USE_MOCK) {
      return mockAdminService.deleteDynamicField(fieldId);
    }
    const response = await apiClient.delete(`/lg/requirements/${fieldId}/`);
    return response.data;
  }

  // Dashboard Analytics
  async getDashboardStats(lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getDashboardStats(lgId);
    }
    const endpoint = lgId ? `/analytics/dashboard/?lg=${lgId}` : '/analytics/dashboard/';
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async getApplicationTrends(period: 'week' | 'month' | 'year', lgId?: string) {
    if (USE_MOCK) {
      return mockAdminService.getApplicationTrends(period, lgId);
    }
    const params = new URLSearchParams({ period });
    if (lgId) params.append('lg', lgId);
    
    const response = await apiClient.get(`/analytics/trends/?${params.toString()}`);
    return response.data;
  }

  // Settings
  async getSettings(lgId?: string) {
    const endpoint = lgId ? `/settings/?lg=${lgId}` : '/settings/';
    const response = await apiClient.get(endpoint);
    return response.data;
  }

  async updateSettings(settings: {
    processingTimeDays?: number;
    applicationFee?: number;
    processingFee?: number;
    autoApproval?: boolean;
  }) {
    const response = await apiClient.patch('/settings/', settings);
    return response.data;
  }

  // Super Admin - LGA Management
  async getAllLGAs(filters?: { status?: string; state?: string }) {
    if (USE_MOCK) {
      return mockAdminService.getAllLGAs(filters);
    }
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`/lgas/?${params.toString()}`);
    return response.data;
  }

  async createLGAdmin(data: {
    state: string;
    localGovernment: string;
    adminName: string;
    email: string;
  }) {
    if (USE_MOCK) {
      return mockAdminService.createLGAdmin(data);
    }
    const response = await apiClient.post('/lgas/', data);
    return response.data;
  }

  async updateLGAStatus(lgaId: string, status: 'active' | 'inactive') {
    if (USE_MOCK) {
      return mockAdminService.updateLGAStatus(lgaId, status);
    }
    const response = await apiClient.patch(`/lgas/${lgaId}/`, { status });
    return response.data;
  }

  // Audit Log
  async getAuditLog(filters?: { page?: number; limit?: number }) {
    if (USE_MOCK) {
      return mockAdminService.getAuditLog(filters);
    }
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await apiClient.get(`/audit-log/?${params.toString()}`);
    return response.data;
  }
}

export default new AdminService();