// Pagination
export const PAGE_SIZE_DEFAULT = 5;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100];

// Fund Types
export const FUND_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'hedge_fund', label: 'Hedge Fund' },
  { value: 'venture_capital', label: 'Venture Capital' },
  { value: 'infrastructure', label: 'Infrastructure' },
] as const;

// Fund Statuses
export const FUND_STATUSES = [
  { value: 'fundraising', label: 'Fundraising' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
] as const;

// Investor Types
export const INVESTOR_TYPES = [
  { value: 'institutional', label: 'Institutional' },
  { value: 'individual', label: 'Individual' },
  { value: 'family_office', label: 'Family Office' },
  { value: 'pension_fund', label: 'Pension Fund' },
  { value: 'endowment', label: 'Endowment' },
  { value: 'sovereign_wealth', label: 'Sovereign Wealth' },
] as const;

// Allocation Statuses
export const ALLOCATION_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

// Property Types
export const PROPERTY_TYPES = [
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
] as const;

// Property Statuses
export const PROPERTY_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_contract', label: 'Under Contract' },
  { value: 'sold', label: 'Sold' },
] as const;

// Roles (fallback for when API fails)
export const FALLBACK_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'fund_manager', label: 'Fund Manager' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'viewer', label: 'Viewer' },
] as const;

// Admin usernames (for login page)
export const ADMIN_USERNAMES = ['superadmin', 'sysadmin', 'orgadmin', 'viewer'];

// Currency
export const DEFAULT_CURRENCY = 'USD';

// Countries
export const DEFAULT_COUNTRY = 'USA';
