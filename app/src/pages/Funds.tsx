import React, { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { fundService } from '../services/funds';
import { Fund } from '../types';
import Modal, { ConfirmModal } from '../components/Modal';

interface FundFormData {
  name: string;
  fund_type: string;
  target_size: string;
  current_size: string;
  status: string;
  description: string;
}

const initialFormData: FundFormData = {
  name: '',
  fund_type: 'real_estate',
  target_size: '',
  current_size: '',
  status: 'fundraising',
  description: '',
};

const FUND_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'hedge_fund', label: 'Hedge Fund' },
  { value: 'venture_capital', label: 'Venture Capital' },
  { value: 'infrastructure', label: 'Infrastructure' },
];

const FUND_STATUSES = [
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

export default function Funds() {
  const { currentOrganization } = useOrganization();
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [deletingFund, setDeletingFund] = useState<Fund | null>(null);
  const [formData, setFormData] = useState<FundFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadFunds();
  }, [currentOrganization]);

  async function loadFunds() {
    if (!currentOrganization) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const orgFunds = await fundService.getByOrganization(currentOrganization.id);
      setFunds(orgFunds);
    } catch (err: any) {
      console.error('Failed to load funds:', err);
      setError(err.response?.data?.detail || 'Failed to load funds');
    } finally {
      setIsLoading(false);
    }
  }

  const openAddModal = () => {
    setEditingFund(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (fund: Fund) => {
    setEditingFund(fund);
    setFormData({
      name: fund.name,
      fund_type: fund.fund_type || 'real_estate',
      target_size: fund.target_size?.toString() || '',
      current_size: fund.current_size?.toString() || '',
      status: fund.status || 'active',
      description: fund.description || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openDeleteModal = (fund: Fund) => {
    setDeletingFund(fund);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsSaving(true);
    setFormError(null);

    try {
      const payload = {
        name: formData.name,
        fund_type: formData.fund_type,
        target_size: formData.target_size ? parseFloat(formData.target_size) : null,
        current_size: formData.current_size ? parseFloat(formData.current_size) : 0,
        status: formData.status,
        description: formData.description || null,
        organization_id: currentOrganization.id,
      };

      if (editingFund) {
        await fundService.update(editingFund.id, payload);
      } else {
        await fundService.create(payload);
      }

      setIsFormModalOpen(false);
      loadFunds();
    } catch (err: any) {
      console.error('Failed to save fund:', err);
      setFormError(err.response?.data?.detail || 'Failed to save fund');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFund) return;

    setIsSaving(true);
    try {
      await fundService.delete(deletingFund.id);
      setIsDeleteModalOpen(false);
      setDeletingFund(null);
      loadFunds();
    } catch (err: any) {
      console.error('Failed to delete fund:', err);
      setFormError(err.response?.data?.detail || 'Failed to delete fund');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'fundraising':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFundTypeLabel = (type: string | null) => {
    if (!type) return '-';
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funds</h1>
          <p className="text-gray-500">Manage funds for {currentOrganization.name}</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Fund
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Funds</p>
          <p className="text-2xl font-bold text-gray-900">{funds.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Active Funds</p>
          <p className="text-2xl font-bold text-green-600">
            {funds.filter((f) => f.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Target AUM</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(funds.reduce((sum, f) => sum + (f.target_size || 0), 0))}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Current AUM</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(funds.reduce((sum, f) => sum + (f.current_size || 0), 0))}
          </p>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Funds</h3>
        </div>
        <div className="overflow-x-auto">
          {funds.length === 0 ? (
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-4">No funds found for this organization.</p>
              <p className="text-sm">Create your first fund to get started.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
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
                {[...funds].sort((a, b) => a.name.localeCompare(b.name)).map((fund) => {
                  const progress = fund.target_size
                    ? Math.min((fund.current_size / fund.target_size) * 100, 100)
                    : 0;
                  return (
                    <tr key={fund.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{fund.name}</div>
                          {fund.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {fund.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getFundTypeLabel(fund.fund_type)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(fund.target_size)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(fund.current_size)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            fund.status
                          )}`}
                        >
                          {fund.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => openEditModal(fund)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteModal(fund)}
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

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingFund ? 'Edit Fund' : 'Add Fund'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fund Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter fund name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fund Type</label>
              <select
                name="fund_type"
                value={formData.fund_type}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {FUND_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                {FUND_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Size ($)</label>
              <input
                type="number"
                name="target_size"
                value={formData.target_size}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 100000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Size ($)</label>
              <input
                type="number"
                name="current_size"
                value={formData.current_size}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 50000000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter fund description"
            />
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
              {isSaving ? 'Saving...' : editingFund ? 'Update Fund' : 'Create Fund'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Fund"
        message={`Are you sure you want to delete "${deletingFund?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        confirmColor="red"
        isLoading={isSaving}
      />
    </div>
  );
}
