import React, { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { fundService } from '../services/funds';
import { propertyService, Property } from '../services/properties';
import { Fund } from '../types';
import Modal, { ConfirmModal } from '../components/Modal';

const PROPERTY_TYPES = [
  { value: 'multifamily', label: 'Multifamily' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'mixed_use', label: 'Mixed Use' },
  { value: 'land', label: 'Land' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'self_storage', label: 'Self Storage' },
  { value: 'senior_living', label: 'Senior Living' },
  { value: 'student_housing', label: 'Student Housing' },
];

const PROPERTY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'sold', label: 'Sold' },
];

interface PropertyFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  property_type: string;
  acquisition_price: string;
  current_value: string;
  acquisition_date: string;
  fund_id: string;
  status: string;
  square_footage: string;
  description: string;
}

const emptyFormData: PropertyFormData = {
  name: '',
  address: '',
  city: '',
  state: '',
  country: 'USA',
  property_type: 'multifamily',
  acquisition_price: '',
  current_value: '',
  acquisition_date: '',
  fund_id: '',
  status: 'active',
  square_footage: '',
  description: '',
};

export default function Properties() {
  const { currentOrganization } = useOrganization();
  const [properties, setProperties] = useState<Property[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!currentOrganization) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // Get funds and properties for current organization in parallel
        const [orgFunds, orgProperties] = await Promise.all([
          fundService.getByOrganization(currentOrganization.id),
          propertyService.getByOrganization(currentOrganization.id),
        ]);
        setFunds(orgFunds);
        setProperties(orgProperties);
      } catch (err: any) {
        console.error('Failed to load properties:', err);
        setError(err.response?.data?.detail || 'Failed to load properties');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentOrganization]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPropertyTypeLabel = (type: string | null) => {
    if (!type) return '-';
    const found = PROPERTY_TYPES.find(t => t.value === type);
    return found ? found.label : type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getFundName = (fundId: string | null) => {
    if (!fundId) return '-';
    const fund = funds.find((f) => f.id === fundId);
    return fund?.name || '-';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'sold':
        return 'bg-gray-100 text-gray-800';
      case 'under_contract':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // CRUD handlers
  const handleAddClick = () => {
    setFormData({
      ...emptyFormData,
      fund_id: funds.length > 0 ? funds[0].id : '',
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleEditClick = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      name: property.name,
      address: property.address || '',
      city: property.city || '',
      state: property.state || '',
      country: property.country || 'USA',
      property_type: property.property_type || 'multifamily',
      acquisition_price: property.acquisition_price?.toString() || '',
      current_value: property.current_value?.toString() || '',
      acquisition_date: property.acquisition_date ? property.acquisition_date.split('T')[0] : '',
      fund_id: property.fund_id || '',
      status: property.status || 'active',
      square_footage: property.square_footage?.toString() || '',
      description: property.description || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (property: Property) => {
    setSelectedProperty(property);
    setIsDeleteModalOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsSaving(true);
    setFormError(null);

    try {
      const newProperty = await propertyService.create({
        name: formData.name,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        property_type: formData.property_type || null,
        acquisition_price: formData.acquisition_price ? parseFloat(formData.acquisition_price) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        acquisition_date: formData.acquisition_date || null,
        fund_id: formData.fund_id || null,
        status: formData.status,
        square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
        description: formData.description || null,
      });
      setProperties(prev => [...prev, newProperty]);
      setIsAddModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create property:', err);
      setFormError(err.response?.data?.detail || 'Failed to create property');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;

    setIsSaving(true);
    setFormError(null);

    try {
      const updatedProperty = await propertyService.update(selectedProperty.id, {
        name: formData.name,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        property_type: formData.property_type || null,
        acquisition_price: formData.acquisition_price ? parseFloat(formData.acquisition_price) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        acquisition_date: formData.acquisition_date || null,
        fund_id: formData.fund_id || null,
        status: formData.status,
        square_footage: formData.square_footage ? parseFloat(formData.square_footage) : null,
        description: formData.description || null,
      });
      setProperties(prev => prev.map(p => p.id === selectedProperty.id ? updatedProperty : p));
      setIsEditModalOpen(false);
      setSelectedProperty(null);
    } catch (err: any) {
      console.error('Failed to update property:', err);
      setFormError(err.response?.data?.detail || 'Failed to update property');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProperty) return;

    setIsSaving(true);

    try {
      await propertyService.delete(selectedProperty.id);
      setProperties(prev => prev.filter(p => p.id !== selectedProperty.id));
      setIsDeleteModalOpen(false);
      setSelectedProperty(null);
    } catch (err: any) {
      console.error('Failed to delete property:', err);
      setError(err.response?.data?.detail || 'Failed to delete property');
    } finally {
      setIsSaving(false);
    }
  };

  // Form component
  const PropertyForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit: boolean }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {formError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleFormChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
          <select
            name="property_type"
            value={formData.property_type}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROPERTY_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fund</label>
          <select
            name="fund_id"
            value={formData.fund_id}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No Fund</option>
            {funds.map(fund => (
              <option key={fund.id} value={fund.id}>{fund.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Square Footage</label>
          <input
            type="number"
            name="square_footage"
            value={formData.square_footage}
            onChange={handleFormChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Price</label>
          <input
            type="number"
            name="acquisition_price"
            value={formData.acquisition_price}
            onChange={handleFormChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
          <input
            type="number"
            name="current_value"
            value={formData.current_value}
            onChange={handleFormChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
          <input
            type="date"
            name="acquisition_date"
            value={formData.acquisition_date}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleFormChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PROPERTY_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleFormChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => isEdit ? setIsEditModalOpen(false) : setIsAddModalOpen(false)}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : isEdit ? 'Update Property' : 'Add Property'}
        </button>
      </div>
    </form>
  );

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

  const totalAcquisitionValue = properties.reduce((sum, p) => sum + (p.acquisition_price || 0), 0);
  const totalCurrentValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const activeProperties = properties.filter((p) => p.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500">Manage properties for {currentOrganization.name}</p>
        </div>
        <button
          onClick={handleAddClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Property
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Properties</p>
          <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Active Properties</p>
          <p className="text-2xl font-bold text-green-600">{activeProperties}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Acquisition Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAcquisitionValue)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Current Value</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentValue)}</p>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Properties</h3>
        </div>
        <div className="overflow-x-auto">
          {properties.length === 0 ? (
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <p className="mt-4">No properties found for this organization.</p>
              <p className="text-sm">Click "Add Property" to get started.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acquisition
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
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
                {[...properties].sort((a, b) => a.name.localeCompare(b.name)).map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{property.name}</div>
                        <div className="text-sm text-gray-500">
                          {[property.city, property.state].filter(Boolean).join(', ') || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPropertyTypeLabel(property.property_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getFundName(property.fund_id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(property.acquisition_price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(property.acquisition_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(property.current_value)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          property.status
                        )}`}
                      >
                        {property.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => handleEditClick(property)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(property)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Property Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Property"
        size="lg"
      >
        <PropertyForm onSubmit={handleAddSubmit} isEdit={false} />
      </Modal>

      {/* Edit Property Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Property"
        size="lg"
      >
        <PropertyForm onSubmit={handleEditSubmit} isEdit={true} />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Property"
        message={`Are you sure you want to delete "${selectedProperty?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        isDestructive={true}
        isLoading={isSaving}
      />
    </div>
  );
}
