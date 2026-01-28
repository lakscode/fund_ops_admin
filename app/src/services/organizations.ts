import api from './api';
import { Organization, Fund } from '../types';

export const organizationService = {
  async getAll(): Promise<Organization[]> {
    const response = await api.get<Organization[]>('/organizations');
    return response.data;
  },

  async getById(id: number): Promise<Organization> {
    const response = await api.get<Organization>(`/organizations/${id}`);
    return response.data;
  },

  async getWithFunds(id: number): Promise<Organization & { funds: Fund[] }> {
    const response = await api.get<Organization & { funds: Fund[] }>(`/organizations/${id}/funds`);
    return response.data;
  },

  async create(data: Partial<Organization>): Promise<Organization> {
    const response = await api.post<Organization>('/organizations', data);
    return response.data;
  },

  async update(id: number, data: Partial<Organization>): Promise<Organization> {
    const response = await api.put<Organization>(`/organizations/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/organizations/${id}`);
  },
};
