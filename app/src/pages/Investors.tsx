import React, { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { fundService } from '../services/funds';
import { investorService, investorFundService, Investor, InvestorFundAllocation } from '../services/investors';
import { Fund } from '../types';
import Modal, { ConfirmModal } from '../components/Modal';

interface InvestorFormData {
  name: string;
  email: string;
  phone: string;
  investor_type: string;
  commitment_amount: string;
  address: string;
  city: string;
  state: string;
  country: string;
  is_active: boolean;
}

interface AllocationFormData {
  fund_id: string;
  allocation_percentage: string;
  commitment_amount: string;
  funded_amount: string;
  status: string;
}

const initialFormData: InvestorFormData = {
  name: '',
  email: '',
  phone: '',
  investor_type: 'institutional',
  commitment_amount: '',
  address: '',
  city: '',
  state: '',
  country: 'USA',
  is_active: true,
};

const initialAllocationFormData: AllocationFormData = {
  fund_id: '',
  allocation_percentage: '100',
  commitment_amount: '',
  funded_amount: '0',
  status: 'active',
};

const INVESTOR_TYPES = [
  { value: 'institutional', label: 'Institutional' },
  { value: 'individual', label: 'Individual' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'pension_fund', label: 'Pension Fund' },
  { value: 'endowment', label: 'Endowment' },
  { value: 'sovereign_wealth', label: 'Sovereign Wealth' },
];

const ALLOCATION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function Investors() {
  const { currentOrganization } = useOrganization();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [allocations, setAllocations] = useState<InvestorFundAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Investor Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState<Investor | null>(null);
  const [deletingInvestor, setDeletingInvestor] = useState<Investor | null>(null);
  const [formData, setFormData] = useState<InvestorFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Allocation Modal states
  const [isAllocationsModalOpen, setIsAllocationsModalOpen] = useState(false);
  const [isAllocationFormModalOpen, setIsAllocationFormModalOpen] = useState(false);
  const [isDeleteAllocationModalOpen, setIsDeleteAllocationModalOpen] = useState(false);
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<InvestorFundAllocation | null>(null);
  const [deletingAllocation, setDeletingAllocation] = useState<InvestorFundAllocation | null>(null);
  const [allocationFormData, setAllocationFormData] = useState<AllocationFormData>(initialAllocationFormData);
  const [allocationFormError, setAllocationFormError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentOrganization]);

  async function loadData() {
    if (!currentOrganization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [orgFunds, orgInvestors, orgAllocations] = await Promise.all([
        fundService.getByOrganization(currentOrganization.id),
        investorService.getByOrganization(currentOrganization.id),
        investorFundService.getByOrganization(currentOrganization.id),
      ]);
      setFunds(orgFunds);
      setInvestors(orgInvestors);
      setAllocations(orgAllocations);
    } catch (err: any) {
      console.error('Failed to load investors:', err);
      setError(err.response?.data?.detail || 'Failed to load investors');
    } finally {
      setIsLoading(false);
    }
  }

  // Investor handlers
  const openAddModal = () => {
    setEditingInvestor(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (investor: Investor) => {
    setEditingInvestor(investor);
    setFormData({
      name: investor.name,
      email: investor.email || '',
      phone: investor.phone || '',
      investor_type: investor.investor_type || 'institutional',
      commitment_amount: investor.commitment_amount?.toString() || '',
      address: investor.address || '',
      city: investor.city || '',
      state: investor.state || '',
      country: investor.country || 'USA',
      is_active: investor.is_active,
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (investor: Investor) => {
    setDeletingInvestor(investor);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        investor_type: formData.investor_type,
        commitment_amount: formData.commitment_amount ? parseFloat(formData.commitment_amount) : null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        is_active: formData.is_active,
        organization_id: currentOrganization.id,
      };

      if (editingInvestor) {
        await investorService.update(editingInvestor.id, payload);
      } else {
        await investorService.create(payload);
      }

      setIsFormModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Failed to save investor:', err);
      setFormError(err.response?.data?.detail || 'Failed to save investor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingInvestor) return;

    setIsSaving(true);
    try {
      await investorService.delete(deletingInvestor.id);
      setIsDeleteModalOpen(false);
      setDeletingInvestor(null);
      loadData();
    } catch (err: any) {
      console.error('Failed to delete investor:', err);
      setFormError(err.response?.data?.detail || 'Failed to delete investor');
    } finally {
      setIsSaving(false);
    }
  };

  // Allocation handlers
  const openAllocationsModal = (investor: Investor) => {
    setSelectedInvestor(investor);
    setIsAllocationsModalOpen(true);
  };

  const openAddAllocationModal = () => {
    setEditingAllocation(null);
    const availableFunds = getAvailableFundsForInvestor(selectedInvestor?.id || '');

    setAllocationFormData({
      ...initialAllocationFormData,
      fund_id: availableFunds.length > 0 ? availableFunds[0].id : '',
    });
    setAllocationFormError(null);
    setIsAllocationFormModalOpen(true);
  };

  const openEditAllocationModal = (allocation: InvestorFundAllocation) => {
    setEditingAllocation(allocation);
    setAllocationFormData({
      fund_id: allocation.fund_id,
      allocation_percentage: allocation.allocation_percentage.toString(),
      commitment_amount: allocation.commitment_amount?.toString() || '',
      funded_amount: allocation.funded_amount.toString(),
      status: allocation.status,
    });
    setAllocationFormError(null);
    setIsAllocationFormModalOpen(true);
  };

  const openDeleteAllocationModal = (allocation: InvestorFundAllocation) => {
    setDeletingAllocation(allocation);
    setIsDeleteAllocationModalOpen(true);
  };

  const handleAllocationFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAllocationFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAllocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestor) return;

    setIsSaving(true);
    setAllocationFormError(null);

    try {
      const payload = {
        investor_id: selectedInvestor.id,
        fund_id: allocationFormData.fund_id,
        allocation_percentage: parseFloat(allocationFormData.allocation_percentage),
        commitment_amount: allocationFormData.commitment_amount ? parseFloat(allocationFormData.commitment_amount) : null,
        funded_amount: parseFloat(allocationFormData.funded_amount) || 0,
        status: allocationFormData.status,
      };

      if (editingAllocation) {
        await investorFundService.update(editingAllocation.id, payload);
      } else {
        await investorFundService.create(payload);
      }

      setIsAllocationFormModalOpen(false);
      // Refresh allocations
      const orgAllocations = await investorFundService.getByOrganization(currentOrganization!.id);
      setAllocations(orgAllocations);
    } catch (err: any) {
      console.error('Failed to save allocation:', err);
      setAllocationFormError(err.response?.data?.detail || 'Failed to save allocation');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!deletingAllocation) return;

    setIsSaving(true);
    try {
      await investorFundService.delete(deletingAllocation.id);
      setIsDeleteAllocationModalOpen(false);
      setDeletingAllocation(null);
      // Refresh allocations
      const orgAllocations = await investorFundService.getByOrganization(currentOrganization!.id);
      setAllocations(orgAllocations);
    } catch (err: any) {
      console.error('Failed to delete allocation:', err);
      setAllocationFormError(err.response?.data?.detail || 'Failed to delete allocation');
    } finally {
      setIsSaving(false);
    }
  };

  // Helpers
  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInvestorTypeLabel = (type: string | null) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getFundName = (fundId: string) => {
    const fund = funds.find((f) => f.id === fundId);
    return fund?.name || '-';
  };

  const getInvestorAllocations = (investorId: string) => {
    return allocations.filter((a) => a.investor_id === investorId);
  };

  const getAvailableFundsForInvestor = (investorId: string) => {
    const investorAllocations = getInvestorAllocations(investorId);
    const allocatedFundIds = investorAllocations.map((a) => a.fund_id);
    // When editing, include the current fund
    if (editingAllocation) {
      return funds.filter((f) => !allocatedFundIds.includes(f.id) || f.id === editingAllocation.fund_id);
    }
    return funds.filter((f) => !allocatedFundIds.includes(f.id));
  };

  const getTotalAllocationPercentage = (investorId: string) => {
    const investorAllocations = getInvestorAllocations(investorId);
    return investorAllocations.reduce((sum, a) => sum + a.allocation_percentage, 0);
  };

  if (!currentOrganization) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700">No Organization Selected</h2>
        <p className="text-gray-500 mt-2">Please select an organization from the sidebar.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded max-w-md mx-auto">
          {error}
        </div>
      </div>
    );
  }

  const totalCommitment = investors.reduce((sum, i) => sum + (i.commitment_amount || 0), 0);
  const totalFunded = investors.reduce((sum, i) => sum + (i.funded_amount || 0), 0);
  const activeInvestors = investors.filter((i) => i.is_active).length;

  // Get allocations for selected investor
  const selectedInvestorAllocations = selectedInvestor ? getInvestorAllocations(selectedInvestor.id) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investors</h1>
          <p className="text-gray-500">Manage investors for {currentOrganization.name}</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Investor
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Investors</p>
          <p className="text-2xl font-bold text-gray-900">{investors.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Active Investors</p>
          <p className="text-2xl font-bold text-green-600">{activeInvestors}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Commitment</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCommitment)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Funded</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFunded)}</p>
        </div>
      </div>

      {/* Investors Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Investors</h3>
        </div>
        <div className="overflow-x-auto">
          {investors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="mt-4">No investors found for this organization.</p>
              <p className="text-sm">Add investors to your funds to get started.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund Allocations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Commitment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Funded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...investors].sort((a, b) => a.name.localeCompare(b.name)).map((investor) => {
                  const investorAllocations = getInvestorAllocations(investor.id);
                  return (
                    <tr key={investor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{investor.name}</div>
                          <div className="text-sm text-gray-500">{investor.email || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getInvestorTypeLabel(investor.investor_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {investorAllocations.length === 0 ? (
                            <span className="text-sm text-gray-500">No allocations</span>
                          ) : (
                            investorAllocations.slice(0, 2).map((alloc) => (
                              <div key={alloc.id} className="text-sm">
                                <span className="font-medium text-gray-900">
                                  {getFundName(alloc.fund_id)}
                                </span>
                                <span className="ml-2 text-gray-500">
                                  ({alloc.allocation_percentage}%)
                                </span>
                              </div>
                            ))
                          )}
                          {investorAllocations.length > 2 && (
                            <div className="text-sm text-gray-500">
                              +{investorAllocations.length - 2} more
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(investor.commitment_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(investor.funded_amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            investor.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {investor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => openAllocationsModal(investor)}
                          className="text-purple-600 hover:text-purple-800 mr-3"
                        >
                          Funds
                        </button>
                        <button
                          onClick={() => openEditModal(investor)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(investor)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Investor Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingInvestor ? 'Edit Investor' : 'Add Investor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Investor Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter investor name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1-xxx-xxx-xxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Investor Type</label>
              <select
                name="investor_type"
                value={formData.investor_type}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {INVESTOR_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Amount ($)</label>
              <input
                type="number"
                name="commitment_amount"
                value={formData.commitment_amount}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleFormChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="State"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="Country"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              checked={formData.is_active}
              onChange={handleFormChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active investor
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsFormModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingInvestor ? 'Update Investor' : 'Create Investor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Investor Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Investor"
        message={`Are you sure you want to delete "${deletingInvestor?.name}"? This will also remove all fund allocations for this investor. This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
        isLoading={isSaving}
      />

      {/* Fund Allocations Modal */}
      <Modal
        isOpen={isAllocationsModalOpen}
        onClose={() => setIsAllocationsModalOpen(false)}
        title={`Fund Allocations - ${selectedInvestor?.name || ''}`}
        size="3xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Total Allocation: {selectedInvestor ? getTotalAllocationPercentage(selectedInvestor.id) : 0}%
            </div>
            <button
              onClick={openAddAllocationModal}
              disabled={funds.length === 0 || (selectedInvestor && getAvailableFundsForInvestor(selectedInvestor.id).length === 0)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Add Fund
            </button>
          </div>

          {selectedInvestorAllocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No fund allocations yet.</p>
              <p className="text-sm">Click "Add Fund" to allocate this investor to a fund.</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fund</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocation %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commitment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Funded</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...selectedInvestorAllocations].sort((a, b) => getFundName(a.fund_id).localeCompare(getFundName(b.fund_id))).map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {getFundName(allocation.fund_id)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {allocation.allocation_percentage}%
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(allocation.commitment_amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatCurrency(allocation.funded_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            allocation.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : allocation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : allocation.status === 'completed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {allocation.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <button
                          onClick={() => openEditAllocationModal(allocation)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteAllocationModal(allocation)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {selectedInvestorAllocations.reduce((sum, a) => sum + a.allocation_percentage, 0)}%
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {formatCurrency(selectedInvestorAllocations.reduce((sum, a) => sum + (a.commitment_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">
                      {formatCurrency(selectedInvestorAllocations.reduce((sum, a) => sum + (a.funded_amount || 0), 0))}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsAllocationsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Allocation Modal */}
      <Modal
        isOpen={isAllocationFormModalOpen}
        onClose={() => setIsAllocationFormModalOpen(false)}
        title={editingAllocation ? 'Edit Fund Allocation' : 'Add Fund Allocation'}
        size="md"
      >
        <form onSubmit={handleAllocationSubmit} className="space-y-4">
          {allocationFormError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {allocationFormError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fund *</label>
            <select
              name="fund_id"
              value={allocationFormData.fund_id}
              onChange={handleAllocationFormChange}
              required
              disabled={!!editingAllocation}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select a fund</option>
              {(editingAllocation ? funds : getAvailableFundsForInvestor(selectedInvestor?.id || '')).map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {fund.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allocation Percentage *</label>
              <input
                type="number"
                name="allocation_percentage"
                value={allocationFormData.allocation_percentage}
                onChange={handleAllocationFormChange}
                required
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={allocationFormData.status}
                onChange={handleAllocationFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {ALLOCATION_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Amount ($)</label>
              <input
                type="number"
                name="commitment_amount"
                value={allocationFormData.commitment_amount}
                onChange={handleAllocationFormChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Funded Amount ($)</label>
              <input
                type="number"
                name="funded_amount"
                value={allocationFormData.funded_amount}
                onChange={handleAllocationFormChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsAllocationFormModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : editingAllocation ? 'Update Allocation' : 'Add Allocation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Allocation Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteAllocationModalOpen}
        onClose={() => setIsDeleteAllocationModalOpen(false)}
        onConfirm={handleDeleteAllocation}
        title="Remove Fund Allocation"
        message={`Are you sure you want to remove the allocation to "${deletingAllocation ? getFundName(deletingAllocation.fund_id) : ''}"?`}
        confirmText="Remove"
        confirmColor="red"
        isLoading={isSaving}
      />
    </div>
  );
}
