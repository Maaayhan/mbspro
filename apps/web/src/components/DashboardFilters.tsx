'use client'

import React from 'react'
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

export default function DashboardFilters({ filters, onChange }: DashboardFiltersProps) {
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
          <div className="flex items-center space-x-1.5">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[110px]"
            >
              <option value="Last 30 days">Last 30 days</option>
              <option value="Last 90 days">Last 90 days</option>
              <option value="This month">This month</option>
              <option value="Custom...">Custom...</option>
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
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[100px]"
            >
              <option value="All">All Providers</option>
              <option value="Dr. Smith">Dr. Smith</option>
              <option value="Dr. Lee">Dr. Lee</option>
              <option value="Dr. Wilson">Dr. Wilson</option>
              <option value="Dr. Davis">Dr. Davis</option>
              <option value="Dr. Jones">Dr. Jones</option>
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
              className="bg-gray-50 border-0 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors min-w-[140px]"
            >
              <option value="All">All Items</option>
              <option value="23">23 - Consultation Level A</option>
              <option value="36">36 - Consultation Level C</option>
              <option value="721">721 - Health Assessment</option>
              <option value="11700">11700 - ECG</option>
              <option value="2713">2713 - Mental Health</option>
              <option value="58503">58503 - Chest X-ray</option>
              <option value="11506">11506 - Pathology Test</option>
              <option value="16400">16400 - Ultrasound</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
