import api from './api';

export interface Investor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  investor_type: string | null;
  commitment_amount: number | null;
  funded_amount: number;
  organization_id: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface InvestorFundAllocation {
  id: string;
  investor_id: string;
  fund_id: string;
  allocation_percentage: number;
  commitment_amount: number | null;
  funded_amount: number;
  status: string;
  created_at: string;
  updated_at: string | null;
}

export const investorService = {
  async getAll(): Promise<Investor[]> {
    const response = await api.get<Investor[]>('/investors');
    return response.data;
  },

  async getByFund(fundId: string): Promise<Investor[]> {
    const response = await api.get<Investor[]>(`/investors/fund/${fundId}`);
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<Investor[]> {
    const response = await api.get<Investor[]>(`/investors/organization/${organizationId}`);
    return response.data;
  },

  async getById(id: string): Promise<Investor> {
    const response = await api.get<Investor>(`/investors/${id}`);
    return response.data;
  },

  async create(data: Partial<Investor>): Promise<Investor> {
    const response = await api.post<Investor>('/investors', data);
    return response.data;
  },

  async update(id: string, data: Partial<Investor>): Promise<Investor> {
    const response = await api.put<Investor>(`/investors/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/investors/${id}`);
  },
};

export const investorFundService = {
  async getAll(): Promise<InvestorFundAllocation[]> {
    const response = await api.get<InvestorFundAllocation[]>('/investor-funds');
    return response.data;
  },

  async getByInvestor(investorId: string): Promise<InvestorFundAllocation[]> {
    const response = await api.get<InvestorFundAllocation[]>(`/investor-funds/investor/${investorId}`);
    return response.data;
  },

  async getByFund(fundId: string): Promise<InvestorFundAllocation[]> {
    const response = await api.get<InvestorFundAllocation[]>(`/investor-funds/fund/${fundId}`);
    return response.data;
  },

  async getByOrganization(organizationId: string): Promise<InvestorFundAllocation[]> {
    const response = await api.get<InvestorFundAllocation[]>(`/investor-funds/organization/${organizationId}`);
    return response.data;
  },

  async create(data: Partial<InvestorFundAllocation>): Promise<InvestorFundAllocation> {
    const response = await api.post<InvestorFundAllocation>('/investor-funds', data);
    return response.data;
  },

  async update(id: string, data: Partial<InvestorFundAllocation>): Promise<InvestorFundAllocation> {
    const response = await api.put<InvestorFundAllocation>(`/investor-funds/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/investor-funds/${id}`);
  },
};
