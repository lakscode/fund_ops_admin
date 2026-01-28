import React, { useEffect, useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { fundService } from '../services/funds';
import { investorService, investorFundService, Investor, InvestorFundAllocation } from '../services/investors';
import { propertyService, Property } from '../services/properties';
import { Fund } from '../types';

interface DashboardStats {
  totalFunds: number;
  totalTargetSize: number;
  totalCurrentSize: number;
  activeFunds: number;
  totalInvestors: number;
  totalProperties: number;
}

interface FundWithDetails extends Fund {
  investors: (Investor & { allocation: InvestorFundAllocation })[];
  properties: Property[];
}

export default function Dashboard() {
  const { currentOrganization } = useOrganization();
  const [fundsWithDetails, setFundsWithDetails] = useState<FundWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalFunds: 0,
    totalTargetSize: 0,
    totalCurrentSize: 0,
    activeFunds: 0,
    totalInvestors: 0,
    totalProperties: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedFunds, setExpandedFunds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentOrganization) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [orgFunds, orgInvestors, orgAllocations, orgProperties] = await Promise.all([
          fundService.getByOrganization(currentOrganization.id),
          investorService.getByOrganization(currentOrganization.id),
          investorFundService.getByOrganization(currentOrganization.id),
          propertyService.getByOrganization(currentOrganization.id),
        ]);

        // Build fund details with investors and properties
        const fundsDetails: FundWithDetails[] = orgFunds.map((fund) => {
          // Get allocations for this fund
          const fundAllocations = orgAllocations.filter((a) => a.fund_id === fund.id);

          // Get investors with their allocations for this fund
          const fundInvestors = fundAllocations.map((allocation) => {
            const investor = orgInvestors.find((i) => i.id === allocation.investor_id);
            return investor ? { ...investor, allocation } : null;
          }).filter(Boolean) as (Investor & { allocation: InvestorFundAllocation })[];

          // Get properties for this fund
          const fundProperties = orgProperties.filter((p) => p.fund_id === fund.id);

          return {
            ...fund,
            investors: fundInvestors,
            properties: fundProperties,
          };
        });

        setFundsWithDetails(fundsDetails);

        // Calculate stats
        const totalTargetSize = orgFunds.reduce((sum, f) => sum + (f.target_size || 0), 0);
        const totalCurrentSize = orgFunds.reduce((sum, f) => sum + (f.current_size || 0), 0);
        const activeFunds = orgFunds.filter((f) => f.status === 'active').length;

        setStats({
          totalFunds: orgFunds.length,
          totalTargetSize,
          totalCurrentSize,
          activeFunds,
          totalInvestors: orgInvestors.length,
          totalProperties: orgProperties.length,
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
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

  const toggleFundExpanded = (fundId: string) => {
    setExpandedFunds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fundId)) {
        newSet.delete(fundId);
      } else {
        newSet.add(fundId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'raising':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPropertyTypeLabel = (type: string | null) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview for {currentOrganization.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          title="Total Funds"
          value={stats.totalFunds.toString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
          color="blue"
        />
        <StatCard
          title="Active Funds"
          value={stats.activeFunds.toString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard
          title="Target AUM"
          value={formatCurrency(stats.totalTargetSize)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="purple"
        />
        <StatCard
          title="Current AUM"
          value={formatCurrency(stats.totalCurrentSize)}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          color="indigo"
        />
        <StatCard
          title="Investors"
          value={stats.totalInvestors.toString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          color="orange"
        />
        <StatCard
          title="Properties"
          value={stats.totalProperties.toString()}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
          color="teal"
        />
      </div>

      {/* Funds with Details */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Funds Overview</h2>

        {fundsWithDetails.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            No funds found for this organization.
          </div>
        ) : (
          [...fundsWithDetails].sort((a, b) => a.name.localeCompare(b.name)).map((fund) => (
            <div key={fund.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Fund Header - Clickable */}
              <div
                className="px-6 py-4 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleFundExpanded(fund.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${
                        expandedFunds.has(fund.id) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{fund.name}</h3>
                      <p className="text-sm text-gray-500">{fund.fund_type || 'No type'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right min-w-[180px]">
                      <p className="text-sm text-gray-500">Target / Current</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(fund.target_size)} / {formatCurrency(fund.current_size)}
                      </p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm text-gray-500">Investors</p>
                      <p className="text-sm font-medium text-gray-900">{fund.investors.length}</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm text-gray-500">Properties</p>
                      <p className="text-sm font-medium text-gray-900">{fund.properties.length}</p>
                    </div>
                    <div className="min-w-[70px] text-center">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(fund.status)}`}>
                        {fund.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedFunds.has(fund.id) && (
                <div className="p-6 space-y-6">
                  {/* Investors Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Investors ({fund.investors.length})
                    </h4>
                    {fund.investors.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No investors allocated to this fund.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Allocation %</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Commitment</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Funded</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[...fund.investors].sort((a, b) => a.name.localeCompare(b.name)).map((investor) => (
                              <tr key={investor.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{investor.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {investor.investor_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">{investor.allocation.allocation_percentage}%</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(investor.allocation.commitment_amount)}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(investor.allocation.funded_amount)}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(investor.allocation.status)}`}>
                                    {investor.allocation.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100">
                            <tr>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900" colSpan={2}>Total</td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                {fund.investors.reduce((sum, i) => sum + i.allocation.allocation_percentage, 0)}%
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                {formatCurrency(fund.investors.reduce((sum, i) => sum + (i.allocation.commitment_amount || 0), 0))}
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                {formatCurrency(fund.investors.reduce((sum, i) => sum + (i.allocation.funded_amount || 0), 0))}
                              </td>
                              <td className="px-4 py-2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Properties Section */}
                  <div>
                    <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Properties ({fund.properties.length})
                    </h4>
                    {fund.properties.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No properties in this fund.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Acquisition</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current Value</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {[...fund.properties].sort((a, b) => a.name.localeCompare(b.name)).map((property) => (
                              <tr key={property.id} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{property.name}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">{getPropertyTypeLabel(property.property_type)}</td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {[property.city, property.state].filter(Boolean).join(', ') || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(property.acquisition_price)}</td>
                                <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(property.current_value)}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property.status)}`}>
                                    {property.status.replace(/_/g, ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100">
                            <tr>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900" colSpan={3}>Total</td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                {formatCurrency(fund.properties.reduce((sum, p) => sum + (p.acquisition_price || 0), 0))}
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-gray-900">
                                {formatCurrency(fund.properties.reduce((sum, p) => sum + (p.current_value || 0), 0))}
                              </td>
                              <td className="px-4 py-2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'orange' | 'teal';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="ml-3">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
