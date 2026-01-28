import api from './api';
import { Fund } from '../types';

export const fundService = {
  async getAll(): Promise<Fund[]> {
    const response = await api.get<Fund[]>('/funds');
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<Fund[]> {
    const response = await api.get<Fund[]>(`/funds/organization/${organizationId}`);
    return response.data;
  },

  async getById(id: string): Promise<Fund> {
    const response = await api.get<Fund>(`/funds/${id}`);
    return response.data;
  },

  async create(data: Partial<Fund>): Promise<Fund> {
    const response = await api.post<Fund>('/funds', data);
    return response.data;
  },

  async update(id: string, data: Partial<Fund>): Promise<Fund> {
    const response = await api.put<Fund>(`/funds/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/funds/${id}`);
  },
};
