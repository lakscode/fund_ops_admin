import api from './api';
import { UserOrganization } from '../types';

export interface CreateUserOrganizationData {
  user_id: string;
  organization_id: string;
  role?: string;
  role_id?: string;
  is_primary?: boolean;
}

export interface UpdateUserOrganizationData {
  role?: string;
  role_id?: string;
  is_primary?: boolean;
}

export const userOrganizationService = {
  async getAll(): Promise<UserOrganization[]> {
    const response = await api.get<UserOrganization[]>('/user-organizations');
    return response.data;
  },

  async getByUser(userId: string): Promise<UserOrganization[]> {
    const response = await api.get<UserOrganization[]>(`/user-organizations/user/${userId}`);
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<UserOrganization[]> {
    const response = await api.get<UserOrganization[]>(`/user-organizations/organization/${organizationId}`);
    return response.data;
  },

  async create(data: CreateUserOrganizationData): Promise<UserOrganization> {
    const response = await api.post<UserOrganization>('/user-organizations', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserOrganizationData): Promise<UserOrganization> {
    const response = await api.put<UserOrganization>(`/user-organizations/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/user-organizations/${id}`);
  },

  async removeUserFromOrganization(userId: string, organizationId: string): Promise<void> {
    await api.delete(`/user-organizations/user/${userId}/organization/${organizationId}`);
  },
};
