import api from './api';
import { User } from '../types';

export interface UserWithRole extends User {
  role: string;
  is_primary: boolean;
  joined_at: string;
}

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  async getById(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<UserWithRole[]> {
    const response = await api.get<UserWithRole[]>(`/users/organization/${organizationId}`);
    return response.data;
  },

  async create(data: CreateUserData): Promise<User> {
    const response = await api.post<User>('/users', data);
    return response.data;
  },

  async update(id: string, data: UpdateUserData): Promise<User> {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
