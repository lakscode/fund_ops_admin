import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { organizationService } from '../services/organizations';
import { userService, UserWithRole, CreateUserData, UpdateUserData } from '../services/users';
import { userOrganizationService, CreateUserOrganizationData } from '../services/userOrganizations';
import { roleService, Role } from '../services/roles';
import { Organization, User } from '../types';
import Modal, { ConfirmModal } from '../components/Modal';
import Pagination from '../components/Pagination';
import { FALLBACK_ROLES, PAGE_SIZE_DEFAULT } from '../constants';

// Organization info with user role (from context)
interface OrganizationInfo {
  id: string;
  name: string;
  code?: string | null;
  role?: string;
  role_id?: string;
  is_primary?: boolean;
  description?: string;
  email?: string;
  is_active?: boolean;
}

export default function Settings() {
  const { user } = useAuth();
  const { organizations: userOrganizations, currentOrganization } = useOrganization();
  const isSuperAdmin = user?.is_superuser || false;

  // Check if current user is admin for a specific organization
  const isOrgAdmin = (orgId: string): boolean => {
    if (isSuperAdmin) return true;
    const userOrg = userOrganizations.find((o) => o.id === orgId);
    // Case-insensitive check for admin role
    return userOrg?.role?.toLowerCase() === 'admin';
  };

  // Check if current user can manage any organization (is admin somewhere or super admin)
  const canManageAnyOrg = isSuperAdmin || userOrganizations.some((o) => o.role?.toLowerCase() === 'admin');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'organizations' | 'roles'>('organizations');
  const [seedingRoles, setSeedingRoles] = useState(false);

  // Data
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [orgUsersMap, setOrgUsersMap] = useState<Record<string, UserWithRole[]>>({});
  const [loadingOrgUsers, setLoadingOrgUsers] = useState<string | null>(null);

  // Modal states
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isMapUserModalOpen, setIsMapUserModalOpen] = useState(false);
  const [isRemoveUserModalOpen, setIsRemoveUserModalOpen] = useState(false);
  const [isEditRoleModalOpen, setIsEditRoleModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Pagination state
  const [usersCurrentPage, setUsersCurrentPage] = useState<Record<string, number>>({});
  const [usersPageSize, setUsersPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [rolesCurrentPage, setRolesCurrentPage] = useState(1);
  const [rolesPageSize, setRolesPageSize] = useState(PAGE_SIZE_DEFAULT);

  const [userToRemove, setUserToRemove] = useState<UserWithRole | null>(null);
  const [userToEdit, setUserToEdit] = useState<UserWithRole | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [selectedOrgForModal, setSelectedOrgForModal] = useState<Organization | OrganizationInfo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({ role: '', role_id: '', is_primary: false });
  const [editUserForm, setEditUserForm] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    is_active: true,
  });

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
      // Always load roles
      try {
        const roles = await roleService.getAll(true); // active only
        setAllRoles(roles);
      } catch (roleErr) {
        console.warn('Failed to load roles, using fallback:', roleErr);
        // Use fallback roles if API fails
        setAllRoles(FALLBACK_ROLES.map((r, idx) => ({
          id: `fallback-${idx}`,
          name: r.value,
          display_name: r.label,
          is_system: true,
          is_active: true,
        })));
      }

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

  const openAddUserModal = (org: Organization | OrganizationInfo) => {
    setSelectedOrgForModal(org);
    setFormError(null);
    setIsAddUserModalOpen(true);
  };

  const openMapUserModal = (org: Organization | OrganizationInfo) => {
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

  const openRemoveUserModal = (userWithRole: UserWithRole, org: Organization | OrganizationInfo) => {
    setUserToRemove(userWithRole);
    setSelectedOrgForModal(org);
    setIsRemoveUserModalOpen(true);
  };

  const openEditRoleModal = (userWithRole: UserWithRole, org: Organization | OrganizationInfo) => {
    setUserToEdit(userWithRole);
    setSelectedOrgForModal(org);
    // Find the role_id from the role name if not present
    const roleId = (userWithRole as any).role_id || allRoles.find(r => r.name === userWithRole.role)?.id || '';
    setEditRoleForm({
      role: userWithRole.role,
      role_id: roleId,
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
        // Use role_id if available, otherwise use role name
        const updateData: any = {
          is_primary: editRoleForm.is_primary,
        };
        if (editRoleForm.role_id) {
          updateData.role_id = editRoleForm.role_id;
        } else {
          updateData.role = editRoleForm.role;
        }
        await userOrganizationService.update(mapping.id, updateData);
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

  // Open edit user modal
  const openEditUserModal = (userWithRole: UserWithRole, org: Organization | OrganizationInfo) => {
    setUserToEdit(userWithRole);
    setSelectedOrgForModal(org);
    setEditUserForm({
      email: userWithRole.email,
      username: userWithRole.username,
      first_name: userWithRole.first_name || '',
      last_name: userWithRole.last_name || '',
      phone: userWithRole.phone || '',
      is_active: userWithRole.is_active,
    });
    setFormError(null);
    setIsEditUserModalOpen(true);
  };

  // Open delete user modal
  const openDeleteUserModal = (userWithRole: UserWithRole, org: Organization | OrganizationInfo) => {
    setUserToDelete(userWithRole);
    setSelectedOrgForModal(org);
    setIsDeleteUserModalOpen(true);
  };

  // Update user details handler
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;
    setIsSaving(true);
    setFormError(null);

    try {
      await userService.update(userToEdit.id, editUserForm);

      // Refresh org users if we have a selected org
      if (selectedOrgForModal) {
        await refreshOrgUsers(selectedOrgForModal.id);
      }

      // Refresh all users list for super admin
      if (isSuperAdmin) {
        const users = await userService.getAll();
        setAllUsers(users);
      }

      setIsEditUserModalOpen(false);
      setUserToEdit(null);
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      setFormError(err.response?.data?.detail || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete user handler
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsSaving(true);

    try {
      await userService.delete(userToDelete.id);

      // Refresh org users if we have a selected org
      if (selectedOrgForModal) {
        // Remove from local state immediately
        setOrgUsersMap((prev) => ({
          ...prev,
          [selectedOrgForModal.id]: (prev[selectedOrgForModal.id] || []).filter(
            (u) => u.id !== userToDelete.id
          ),
        }));
      }

      // Refresh all users list for super admin
      if (isSuperAdmin) {
        setAllUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      }

      setIsDeleteUserModalOpen(false);
      setUserToDelete(null);
      setSelectedOrgForModal(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setFormError(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed default roles handler
  const handleSeedRoles = async () => {
    setSeedingRoles(true);
    try {
      const seededRoles = await roleService.seedDefaultRoles();
      setAllRoles(seededRoles);
    } catch (err: any) {
      console.error('Failed to seed roles:', err);
      setError(err.response?.data?.detail || 'Failed to seed default roles');
    } finally {
      setSeedingRoles(false);
    }
  };

  // Get users not in the selected organization
  const getUnassignedUsers = (orgId: string) => {
    const orgUsers = orgUsersMap[orgId] || [];
    const assignedUserIds = orgUsers.map((u) => u.id);
    return allUsers.filter((u) => !assignedUserIds.includes(u.id));
  };

  const renderOrgUsers = (org: Organization | OrganizationInfo) => {
    const users = orgUsersMap[org.id] || [];
    const isLoadingUsers = loadingOrgUsers === org.id;
    // Admin check: super admin OR org admin OR user has admin role in this org
    const canManageUsers = isSuperAdmin || isOrgAdmin(org.id) || ('role' in org && org.role?.toLowerCase() === 'admin');

    if (isLoadingUsers) {
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
                <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                const sortedUsers = [...users].sort((a, b) => (a.first_name || a.username).localeCompare(b.first_name || b.username));
                const currentPageNum = usersCurrentPage[org.id] || 1;
                const startIndex = (currentPageNum - 1) * usersPageSize;
                const paginatedUsers = sortedUsers.slice(startIndex, startIndex + usersPageSize);
                return paginatedUsers.map((userWithRole) => (
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
                    <td className="px-6 py-3 whitespace-nowrap text-sm">
                      {canManageUsers ? (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === userWithRole.id ? null : userWithRole.id);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {openDropdownId === userWithRole.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(null);
                                    openEditUserModal(userWithRole, org);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit User
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(null);
                                    openEditRoleModal(userWithRole, org);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                  Change Role
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(null);
                                    openRemoveUserModal(userWithRole, org);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-2"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                  </svg>
                                  Remove
                                </button>
                                {isSuperAdmin && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(null);
                                      openDeleteUserModal(userWithRole, org);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete User
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        )}
        {users.length > usersPageSize && (
          <Pagination
            currentPage={usersCurrentPage[org.id] || 1}
            totalPages={Math.ceil(users.length / usersPageSize)}
            totalItems={users.length}
            pageSize={usersPageSize}
            onPageChange={(page) => setUsersCurrentPage(prev => ({ ...prev, [org.id]: page }))}
            onPageSizeChange={(size) => {
              setUsersPageSize(size);
              setUsersCurrentPage(prev => ({ ...prev, [org.id]: 1 }));
            }}
          />
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

      {/* Tabs for Super Admin */}
      {isSuperAdmin && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('organizations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'organizations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Organizations
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'roles'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Roles
            </button>
          </nav>
        </div>
      )}

      {/* Organizations Tab Content */}
      {(!isSuperAdmin || activeTab === 'organizations') && (
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
      )}

      {/* Roles Tab Content - Super Admin Only */}
      {isSuperAdmin && activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Roles</h3>
                <p className="text-sm text-gray-500">Manage roles and permissions for user access control</p>
              </div>
              <button
                onClick={handleSeedRoles}
                disabled={seedingRoles}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {seedingRoles ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Seeding...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Seed Default Roles
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              {allRoles.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No roles found.</p>
                  <p className="text-sm mt-2">Click "Seed Default Roles" to create the default roles.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const startIndex = (rolesCurrentPage - 1) * rolesPageSize;
                      const paginatedRoles = allRoles.slice(startIndex, startIndex + rolesPageSize);
                      return paginatedRoles.map((role) => (
                        <tr key={role.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{role.display_name}</div>
                          <div className="text-xs text-gray-500">{role.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {role.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {role.permissions && Object.entries(role.permissions)
                              .filter(([, value]) => value)
                              .slice(0, 3)
                              .map(([key]) => (
                                <span
                                  key={key}
                                  className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800"
                                >
                                  {key.replace('can_', '').replace(/_/g, ' ')}
                                </span>
                              ))}
                            {role.permissions && Object.values(role.permissions).filter(Boolean).length > 3 && (
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                                +{Object.values(role.permissions).filter(Boolean).length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              role.is_system
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {role.is_system ? 'System' : 'Custom'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              role.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {role.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              )}
            </div>
            {allRoles.length > 0 && (
              <Pagination
                currentPage={rolesCurrentPage}
                totalPages={Math.ceil(allRoles.length / rolesPageSize)}
                totalItems={allRoles.length}
                pageSize={rolesPageSize}
                onPageChange={(page) => setRolesCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setRolesPageSize(size);
                  setRolesCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

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
              onChange={(e) => {
                const selectedRole = allRoles.find(r => r.name === e.target.value);
                setMapUserForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                  role_id: selectedRole?.id,
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {allRoles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.display_name}
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

      {/* Edit Role Modal */}
      <Modal
        isOpen={isEditRoleModalOpen}
        onClose={() => setIsEditRoleModalOpen(false)}
        title={`Edit Role: ${userToEdit?.username || ''}`}
        size="md"
      >
        <form onSubmit={handleUpdateRole} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={editRoleForm.role_id || editRoleForm.role}
              onChange={(e) => {
                const selectedRole = allRoles.find(r => r.id === e.target.value || r.name === e.target.value);
                setEditRoleForm((prev) => ({
                  ...prev,
                  role: selectedRole?.name || e.target.value,
                  role_id: selectedRole?.id || '',
                }));
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              {allRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit_role_is_primary"
              checked={editRoleForm.is_primary}
              onChange={(e) => setEditRoleForm((prev) => ({ ...prev, is_primary: e.target.checked }))}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="edit_role_is_primary" className="ml-2 block text-sm text-gray-700">
              Set as primary organization for this user
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditRoleModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Update Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditUserModalOpen}
        onClose={() => setIsEditUserModalOpen(false)}
        title={`Edit User: ${userToEdit?.username || ''}`}
        size="lg"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
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
                value={editUserForm.first_name}
                onChange={(e) => setEditUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={editUserForm.last_name}
                onChange={(e) => setEditUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
            <input
              type="text"
              value={editUserForm.username}
              onChange={(e) => setEditUserForm((prev) => ({ ...prev, username: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={editUserForm.email}
              onChange={(e) => setEditUserForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={editUserForm.phone}
              onChange={(e) => setEditUserForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="edit_is_active"
              checked={editUserForm.is_active}
              onChange={(e) => setEditUserForm((prev) => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-primary-500 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-700">
              Active user
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditUserModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteUserModalOpen}
        onClose={() => setIsDeleteUserModalOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User Permanently"
        message={`Are you sure you want to permanently delete "${
          userToDelete?.first_name && userToDelete?.last_name
            ? `${userToDelete.first_name} ${userToDelete.last_name}`
            : userToDelete?.username
        }"? This will remove the user from all organizations and cannot be undone.`}
        confirmText="Delete Permanently"
        confirmColor="red"
        isLoading={isSaving}
      />
    </div>
  );
}
