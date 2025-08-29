'use client'

import React, { useState, useEffect } from 'react'
import { FunnelIcon, CalendarIcon, UserIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

type FilterState = {
  dateRange: string;
  provider: string;
  item: string;
  chartType: string;
  fromDate?: string;
  toDate?: string;
}

interface DashboardFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
}

interface Provider {
  provider_number: string;
  full_name: string;
}

interface Item {
  code: string;
  title: string;
  count: number;
}

export default function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000").replace(/\/$/, "");
        
        const [providersResponse, itemsResponse] = await Promise.all([
          fetch(`${apiBase}/api/claim/providers`),
          fetch(`${apiBase}/api/claim/items?top=5`)
        ]);

        if (providersResponse.ok) {
          const providersData = await providersResponse.json();
          setProviders(providersData);
        }

        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setItems(itemsData);
        }
      } catch (error) {
        console.error('Failed to fetch filter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onChange({
      ...filters,
      [key]: value
    })
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-3">
      <div className="flex items-center justify-between">
        {/* Filter Icon and Title */}
        {/* <div className="flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div> */}

        {/* Filter Controls - Horizontal Layout */}
        <div className="flex items-center space-x-3">
          {/* Date Range Filter */}
          <div className="flex items-center space-x-1.5 h-6 w-25">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-1.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[110px] max-w-[130px] truncate"
            >
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="Last 180 days">Last 180 days</option>
            </select>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-200"></div>

          {/* Provider Filter */}
          <div className="flex items-center space-x-1.5">
            <UserIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filters.provider}
              onChange={(e) => handleFilterChange('provider', e.target.value)}
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-1.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[110px] max-w-[160px] truncate"
              disabled={loading}
            >
              <option value="All">All Providers</option>
              {providers.map((provider) => (
                <option key={provider.provider_number} value={provider.provider_number}>
                  {provider.provider_number} - {provider.full_name.length > 10 ? provider.full_name.slice(0, 10) + '...' : provider.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-gray-200"></div>

          {/* Item Filter */}
          <div className="flex items-center space-x-1.5">
            <DocumentTextIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filters.item}
              onChange={(e) => handleFilterChange('item', e.target.value)}
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[110px] max-w-[170px] truncate"
              disabled={loading}
            >
              <option value="All">All Items</option>
              {items.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {item.title.length > 15 ? item.title.slice(0, 15) + '...' : item.title} ({item.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
