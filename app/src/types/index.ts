export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Organization {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_primary: boolean;
  joined_at: string;
  updated_at: string | null;
  organization?: Organization;
}

export interface Fund {
  id: string;
  name: string;
  fund_type: string | null;
  target_size: number | null;
  current_size: number;
  currency: string;
  status: string;
  description: string | null;
  organization_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserWithOrganizations extends User {
  organizations: Array<{
    id: string;
    name: string;
    code: string | null;
    role: string;
    is_primary: boolean;
  }>;
}
