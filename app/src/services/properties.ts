import api from './api';

export interface Property {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  property_type: string | null;
  acquisition_price: number | null;
  current_value: number | null;
  acquisition_date: string | null;
  fund_id: string | null;
  status: string;
  square_footage: number | null;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

export const propertyService = {
  async getAll(): Promise<Property[]> {
    const response = await api.get<Property[]>('/properties');
    return response.data;
  },

  async getByFund(fundId: string): Promise<Property[]> {
    const response = await api.get<Property[]>(`/properties/fund/${fundId}`);
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<Property[]> {
    const response = await api.get<Property[]>(`/properties/organization/${organizationId}`);
    return response.data;
  },

  async getById(id: string): Promise<Property> {
    const response = await api.get<Property>(`/properties/${id}`);
    return response.data;
  },

  async create(data: Partial<Property>): Promise<Property> {
    const response = await api.post<Property>('/properties', data);
    return response.data;
  },

  async update(id: string, data: Partial<Property>): Promise<Property> {
    const response = await api.put<Property>(`/properties/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/properties/${id}`);
  },
};
