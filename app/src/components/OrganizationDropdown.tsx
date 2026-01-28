import React, { useState, useRef, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';

export default function OrganizationDropdown() {
  const { currentOrganization, organizations, setCurrentOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (organizations.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        No organizations assigned
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-semibold">
            {currentOrganization?.name?.charAt(0).toUpperCase() || 'O'}
          </div>
          <div className="ml-3 text-left">
            <p className="text-sm font-medium text-white truncate max-w-[140px]">
              {currentOrganization?.name || 'Select Organization'}
            </p>
            {currentOrganization?.code && (
              <p className="text-xs text-gray-400">{currentOrganization.code}</p>
            )}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                setCurrentOrganization(org);
                setIsOpen(false);
              }}
              className={`w-full flex items-center px-3 py-2 hover:bg-gray-700 transition-colors ${
                currentOrganization?.id === org.id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center text-white font-semibold">
                {org.name.charAt(0).toUpperCase()}
              </div>
              <div className="ml-3 text-left flex-1">
                <p className="text-sm font-medium text-white">{org.name}</p>
                <p className="text-xs text-gray-400">
                  {org.role.replace('_', ' ')}
                  {org.is_primary && ' (Primary)'}
                </p>
              </div>
              {currentOrganization?.id === org.id && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
