import api from './api';
import { Role } from '../types';

export type { Role };

export interface CreateRoleData {
  name: string;
  display_name: string;
  description?: string;
  permissions?: Record<string, boolean>;
  is_system?: boolean;
  is_active?: boolean;
}

export interface UpdateRoleData {
  name?: string;
  display_name?: string;
  description?: string;
  permissions?: Record<string, boolean>;
  is_active?: boolean;
}

export const roleService = {
  async getAll(activeOnly: boolean = false): Promise<Role[]> {
    const response = await api.get<Role[]>('/roles', {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  async getById(id: string): Promise<Role> {
    const response = await api.get<Role>(`/roles/${id}`);
    return response.data;
  },

  async getByName(name: string): Promise<Role> {
    const response = await api.get<Role>(`/roles/name/${name}`);
    return response.data;
  },

  async create(data: CreateRoleData): Promise<Role> {
    const response = await api.post<Role>('/roles', data);
    return response.data;
  },

  async update(id: string, data: UpdateRoleData): Promise<Role> {
    const response = await api.put<Role>(`/roles/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
  },

  async seedDefaultRoles(): Promise<Role[]> {
    const response = await api.post<Role[]>('/roles/seed');
    return response.data;
  },
};
