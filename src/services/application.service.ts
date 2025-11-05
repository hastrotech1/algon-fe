import apiClient from './api';
import type { Application, ApplicationFormData } from '../Types/types';
import { mockApplicationService } from './mock.service';

const USE_MOCK = true;

class ApplicationService {
  async submitApplication(data: ApplicationFormData): Promise<Application> {
    
    if (USE_MOCK) {
      return mockApplicationService.submitApplication(data);
    }

    const formData = new FormData();

    // Add text fields
    Object.keys(data).forEach((key) => {
      const typedKey = key as keyof ApplicationFormData;
      const value = data[typedKey];

      if (typedKey === 'profilePhoto' && value) {
        formData.append('profile_photo', value as File);
      } else if (typedKey === 'ninSlip' && value) {
        formData.append('nin_slip', value as File);
      } else if (value !== null && typedKey !== 'profilePhoto' && typedKey !== 'ninSlip') {
        formData.append(typedKey, value as string);
      }
    });

    const response = await apiClient.post<Application>('/applications/', formData);
    return response.data;
  }

  async getMyApplications(): Promise<Application[]> {
    if (USE_MOCK) {
      return mockApplicationService.getMyApplications();
    }

    const response = await apiClient.get<Application[]>('/applications/my/');
    return response.data;
  }

  async getApplicationById(id: string): Promise<Application> {
    if (USE_MOCK) {
      return mockApplicationService.getApplicationById(id);
    }

    const response = await apiClient.get<Application>(`/applications/${id}/`);
    return response.data;
  }

  async getAllApplications(filters?: {
    status?: string;
    lg?: string;
    page?: number;
    limit?: number;
  }): Promise<{ results: Application[]; count: number }> {
    if (USE_MOCK) {
      return mockApplicationService.getAllApplications(filters);
    }
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await apiClient.get(`/applications/?${params.toString()}`);
    return response.data;
  }

  async updateApplicationStatus(
    id: string,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<Application> {
    
    if (USE_MOCK) {
      return mockApplicationService.updateApplicationStatus(id, status, comment);
    }
    const response = await apiClient.patch<Application>(
      `/applications/${id}/status/`,
      { status, comment }
    );
    return response.data;
  }
}

export default new ApplicationService();