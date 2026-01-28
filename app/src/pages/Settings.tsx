import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { organizationService } from '../services/organizations';
import { userService, UserWithRole, CreateUserData } from '../services/users';
import { userOrganizationService, CreateUserOrganizationData } from '../services/userOrganizations';
import { Organization, User } from '../types';
import Modal, { ConfirmModal } from '../components/Modal';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'fund_manager', label: 'Fund Manager' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
];

export default function Settings() {
  const { user } = useAuth();
  const { organizations: userOrganizations, currentOrganization } = useOrganization();
  const isSuperAdmin = user?.is_superuser || false;

  // Check if current user is admin for a specific organization
  const isOrgAdmin = (orgId: string): boolean => {
    if (isSuperAdmin) return true;
    const userOrg = userOrganizations.find((o) => o.id === orgId);
    return userOrg?.role === 'admin';
  };

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgUsersMap, setOrgUsersMap] = useState<Record<string, UserWithRole[]>>({});
  const [loadingOrgUsers, setLoadingOrgUsers] = useState<string | null>(null);

  // Modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isMapUserModalOpen, setIsMapUserModalOpen] = useState(false);
  const [isRemoveUserModalOpen, setIsRemoveUserModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [userToRemove, setUserToRemove] = useState<UserWithRole | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [selectedOrgForModal, setSelectedOrgForModal] = useState<Organization | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ role: '', is_primary: false });

  // Form data
  const [newUserForm, setNewUserForm] = useState<CreateUserData>({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_active: true,
  });
  const [mapUserForm, setMapUserForm] = useState<CreateUserOrganizationData>({
    user_id: '',
    organization_id: '',
    role: 'viewer',
    is_primary: false,
  });

  useEffect(() => {
    loadData();
  }, [isSuperAdmin, currentOrganization]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      if (isSuperAdmin) {
        const [orgs, users] = await Promise.all([
          organizationService.getAll(),
          userService.getAll(),
        ]);
        setAllOrganizations(orgs);
        setAllUsers(users);
      }
    } catch (err: any) {
      console.error('Failed to load settings data:', err);
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadOrgUsers(orgId: string) {
    if (orgUsersMap[orgId]) return; // Already loaded
    setLoadingOrgUsers(orgId);
    try {
      const orgUsersData = await userService.getByOrganization(orgId);
      setOrgUsersMap((prev) => ({ ...prev, [orgId]: orgUsersData }));
    } catch (err: any) {
      console.error('Failed to load organization users:', err);
    } finally {
      setLoadingOrgUsers(null);
    }
  }

  async function refreshOrgUsers(orgId: string) {
    setLoadingOrgUsers(orgId);
    try {
      const orgUsersData = await userService.getByOrganization(orgId);
      setOrgUsersMap((prev) => ({ ...prev, [orgId]: orgUsersData }));
    } catch (err: any) {
      console.error('Failed to refresh organization users:', err);
    } finally {
      setLoadingOrgUsers(null);
    }
  }

  const handleToggleOrg = async (org: Organization) => {
    if (expandedOrgId === org.id) {
      setExpandedOrgId(null);
    } else {
      setExpandedOrgId(org.id);
      await loadOrgUsers(org.id);
    }
  };

  // Add new user handler
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      const newUser = await userService.create(newUserForm);
      const orgId = selectedOrgForModal?.id || currentOrganization?.id;

      if (orgId) {
        await userOrganizationService.create({
          user_id: newUser.id,
          organization_id: orgId,
          role: 'viewer',
          is_primary: true,
        });
        await refreshOrgUsers(orgId);
      }

      if (isSuperAdmin) {
        setAllUsers((prev) => [...prev, newUser]);
      }

      setIsAddUserModalOpen(false);
      setNewUserForm({
        email: '',
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        is_active: true,
      });
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to create user:', err);
      setFormError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  // Map user to organization handler
  const handleMapUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      await userOrganizationService.create(mapUserForm);
      if (mapUserForm.organization_id) {
        await refreshOrgUsers(mapUserForm.organization_id);
      }
      setIsMapUserModalOpen(false);
      setMapUserForm({
        user_id: '',
        organization_id: '',
        role: 'viewer',
        is_primary: false,
      });
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to map user:', err);
      setFormError(err.response?.data?.detail || 'Failed to assign user to organization');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove user from organization handler
  const handleRemoveUser = async () => {
    if (!userToRemove || !selectedOrgForModal) return;
    setIsSaving(true);

    try {
      await userOrganizationService.removeUserFromOrganization(userToRemove.id, selectedOrgForModal.id);
      await refreshOrgUsers(selectedOrgForModal.id);
      setIsRemoveUserModalOpen(false);
      setUserToRemove(null);
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to remove user:', err);
      setFormError(err.response?.data?.detail || 'Failed to remove user from organization');
    } finally {
      setIsSaving(false);
    }
  };

  const openAddUserModal = (org: Organization) => {
    setSelectedOrgForModal(org);
    setFormError(null);
    setIsAddUserModalOpen(true);
  };

  const openMapUserModal = (org: Organization) => {
    setSelectedOrgForModal(org);
    setMapUserForm({
      user_id: '',
      organization_id: org.id,
      role: 'viewer',
      is_primary: false,
    });
    setFormError(null);
    setIsMapUserModalOpen(true);
  };

  const openRemoveUserModal = (userWithRole: UserWithRole, org: Organization) => {
    setUserToRemove(userWithRole);
    setSelectedOrgForModal(org);
    setIsRemoveUserModalOpen(true);
  };

  const openEditRoleModal = (userWithRole: UserWithRole, org: Organization) => {
    setUserToEdit(userWithRole);
    setSelectedOrgForModal(org);
    setEditRoleForm({
      role: userWithRole.role,
      is_primary: userWithRole.is_primary,
    });
    setFormError(null);
    setIsEditRoleModalOpen(true);
  };

  // Update user role handler
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !selectedOrgForModal) return;
    setIsSaving(true);
    setFormError(null);

    try {
      // Find the user-organization mapping and update it
      const userOrgs = await userOrganizationService.getByUser(userToEdit.id);
      const mapping = userOrgs.find(
        (uo) => uo.organization_id === selectedOrgForModal.id
      );

      if (mapping) {
        await userOrganizationService.update(mapping.id, {
          role: editRoleForm.role,
          is_primary: editRoleForm.is_primary,
        });
        await refreshOrgUsers(selectedOrgForModal.id);
      }

      setIsEditRoleModalOpen(false);
      setUserToEdit(null);
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to update user role:', err);
      setFormError(err.response?.data?.detail || 'Failed to update user role');
    } finally {
      setIsSaving(false);
    }
  };

  // Get users not in the selected organization
  const getUnassignedUsers = (orgId: string) => {
    const orgUsers = orgUsersMap[orgId] || [];
    const assignedUserIds = orgUsers.map((u) => u.id);
    return allUsers.filter((u) => !assignedUserIds.includes(u.id));
  };

  const renderOrgUsers = (org: Organization) => {
    const users = orgUsersMap[org.id] || [];
    const isLoading = loadingOrgUsers === org.id;
    const canManageUsers = isOrgAdmin(org.id);

    if (isLoading) {
      return (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading users...</p>
        </div>
      );
    }

    return (
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="px-6 py-3 flex justify-between items-center border-b border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700">Users ({users.length})</h4>
          {canManageUsers && (
            <div className="space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAddUserModal(org);
                }}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300 transition-colors"
              >
                + New User
              </button>
              {isSuperAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openMapUserModal(org);
                  }}
                  disabled={getUnassignedUsers(org.id).length === 0}
                  className="px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Existing User
                </button>
              )}
            </div>
          )}
        </div>
        {users.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            No users in this organization.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Primary
                </th>
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {canManageUsers && (
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[...users]
                .sort((a, b) => (a.first_name || a.username).localeCompare(b.first_name || b.username))
                .map((userWithRole) => (
                  <tr key={userWithRole.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {userWithRole.first_name && userWithRole.last_name
                          ? `${userWithRole.first_name} ${userWithRole.last_name}`
                          : userWithRole.username}
                      </div>
                      <div className="text-xs text-gray-500">@{userWithRole.username}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {userWithRole.email}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {userWithRole.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {userWithRole.is_primary ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userWithRole.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {userWithRole.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManageUsers && (
                      <td className="px-6 py-3 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditRoleModal(userWithRole, org);
                          }}
                          className="text-primary-600 hover:text-primary-800"
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openRemoveUserModal(userWithRole, org);
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">
          {isSuperAdmin
            ? 'Platform administration - Manage all organizations and users'
            : 'View your organizations and manage users (Admin role required)'}
        </p>
      </div>

      {/* Organizations Section */}
      <div className="space-y-6">
        {isSuperAdmin ? (
          // Super Admin: Show all organizations with expandable users
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">All Organizations</h3>
              <p className="text-sm text-gray-500">Click on an organization to view and manage its users</p>
            </div>
            <div className="overflow-x-auto">
              {allOrganizations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No organizations found.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {[...allOrganizations]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((org) => (
                      <div key={org.id}>
                        <div
                          className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            expandedOrgId === org.id ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => handleToggleOrg(org)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <svg
                                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                                  expandedOrgId === org.id ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                                {org.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-md">
                                    {org.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">{org.code || '-'}</span>
                              <span className="text-sm text-gray-500">{org.email || '-'}</span>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  org.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {org.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        {expandedOrgId === org.id && renderOrgUsers(org)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Non-super admin: Show their organizations with expandable users
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Your Organizations</h3>
              <p className="text-sm text-gray-500">Click on an organization to view its users. Admin role required to manage users.</p>
            </div>
            <div className="overflow-x-auto">
              {userOrganizations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  You are not assigned to any organizations.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {[...userOrganizations]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((org) => (
                      <div key={org.id}>
                        <div
                          className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            expandedOrgId === org.id ? 'bg-primary-50' : ''
                          }`}
                          onClick={() => handleToggleOrg(org)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <svg
                                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                                  expandedOrgId === org.id ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{org.name}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <span className="text-sm text-gray-500">{org.code || '-'}</span>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {org.role.replace('_', ' ')}
                              </span>
                              {org.is_primary && (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Primary
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {expandedOrgId === org.id && renderOrgUsers(org)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add New User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title={`Add New User to ${selectedOrgForModal?.name || 'Organization'}`}
        size="lg"
      >
        <form onSubmit={handleAddUser} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={newUserForm.first_name || ''}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={newUserForm.last_name || ''}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              value={newUserForm.username}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <input
              type="password"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={newUserForm.phone || ''}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Map User to Organization Modal (Super Admin) */}
      <Modal
        isOpen={isMapUserModalOpen}
        onClose={() => setIsMapUserModalOpen(false)}
        title={`Add User to ${selectedOrgForModal?.name || 'Organization'}`}
        size="md"
      >
        <form onSubmit={handleMapUser} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select User *</label>
            <select
              value={mapUserForm.user_id}
              onChange={(e) => setMapUserForm((prev) => ({ ...prev, user_id: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Choose a user...</option>
              {(selectedOrgForModal ? getUnassignedUsers(selectedOrgForModal.id) : []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={mapUserForm.role}
              onChange={(e) => setMapUserForm((prev) => ({ ...prev, role: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_primary"
              checked={mapUserForm.is_primary}
              onChange={(e) => setMapUserForm((prev) => ({ ...prev, is_primary: e.target.checked }))}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_primary" className="ml-2 block text-sm text-gray-700">
              Set as primary organization for this user
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsMapUserModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !mapUserForm.user_id}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove User Confirmation Modal */}
      <ConfirmModal
        isOpen={isRemoveUserModalOpen}
        onClose={() => setIsRemoveUserModalOpen(false)}
        onConfirm={handleRemoveUser}
        title="Remove User from Organization"
        message={`Are you sure you want to remove "${
          userToRemove?.first_name && userToRemove?.last_name
            ? `${userToRemove.first_name} ${userToRemove.last_name}`
            : userToRemove?.username
        }" from ${selectedOrgForModal?.name || 'this organization'}?`}
        confirmText="Remove"
        confirmColor="red"
        isLoading={isSaving}
      />
    </div>
  );
}
