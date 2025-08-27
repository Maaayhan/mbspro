'use client'

import AppLayout from '@/components/AppLayout'
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'

// Types
interface KPICard {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  description: string
}

interface ActivityItem {
  id: number
  type: string
  description: string
  time: string
  status: 'success' | 'warning' | 'info'
}

export default function DashboardPage() {
  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 12400, claims: 156 },
    { month: 'Feb', revenue: 13800, claims: 172 },
    { month: 'Mar', revenue: 15200, claims: 189 },
    { month: 'Apr', revenue: 14600, claims: 183 },
    { month: 'May', revenue: 16800, claims: 204 },
    { month: 'Jun', revenue: 18200, claims: 228 },
  ]

  const topItemsData = [
    { code: '23', description: 'Consultation Level A', count: 145, revenue: 6003 },
    { code: '36', description: 'Consultation Level C', count: 89, revenue: 7614 },
    { code: '721', description: 'Health Assessment', count: 67, revenue: 4489 },
    { code: '11700', description: 'ECG', count: 54, revenue: 1434 },
    { code: '2713', description: 'Mental Health', count: 42, revenue: 4284 },
  ]

  const errorReasonsData = [
    { name: 'Documentation', value: 35, color: '#ef4444' },
    { name: 'Time Intervals', value: 25, color: '#f97316' },
    { name: 'Patient Eligibility', value: 20, color: '#eab308' },
    { name: 'Code Selection', value: 15, color: '#06b6d4' },
    { name: 'Other', value: 5, color: '#6b7280' },
  ]

  const kpiCards: KPICard[] = [
    {
      title: 'Total Claims',
      value: '1,247',
      change: '+12.5%',
      trend: 'up',
      description: 'This month'
    },
    {
      title: 'Error/Reject Rate',
      value: '2.3%',
      change: '-0.8%',
      trend: 'down',
      description: 'Industry avg: 4.1%'
    },
    {
      title: 'Total Revenue',
      value: '$82,400',
      change: '+18.2%',
      trend: 'up',
      description: 'Last 30 days'
    },
    {
      title: 'Compliance Score',
      value: '97.7%',
      change: '+2.1%',
      trend: 'up',
      description: 'Above target'
    },
  ]

  const recentActivity: ActivityItem[] = [
    {
      id: 1,
      type: 'claim_submitted',
      description: 'Claim CLM-2024-001523 submitted successfully',
      time: '2 hours ago',
      status: 'success'
    },
    {
      id: 2,
      type: 'compliance_warning',
      description: 'Potential documentation issue detected',
      time: '4 hours ago',
      status: 'warning'
    },
    {
      id: 3,
      type: 'claim_processed',
      description: 'Claim CLM-2024-001522 processed and paid',
      time: '6 hours ago',
      status: 'success'
    },
    {
      id: 4,
      type: 'system_update',
      description: 'MBS code database updated',
      time: '1 day ago',
      status: 'info'
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'info':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      default:
        return null
    }
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Compliance Banner */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-green-800">Excellent Compliance Status</h3>
              <p className="text-green-700">
                Your practice maintains a 97.7% compliance score. All recent claims follow MBS guidelines.
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</p>
                </div>
                <div className={`flex items-center space-x-1 ${
                  kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {kpi.trend === 'up' ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{kpi.change}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{kpi.description}</p>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0ea5e9" 
                    strokeWidth={3}
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top MBS Items */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top MBS Items</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItemsData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis 
                    type="category" 
                    dataKey="code" 
                    stroke="#6b7280"
                    width={60}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      name === 'count' ? `${value} claims` : `$${value}`,
                      name === 'count' ? 'Claims' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Error Reasons Pie Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Reasons</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorReasonsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                  >
                    {errorReasonsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Percentage']}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {errorReasonsData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-medium text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all activity →
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">New Claim</h3>
            <p className="text-blue-700 text-sm mb-4">Start a new Medicare claim with AI assistance</p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Create Claim
            </button>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Compliance Check</h3>
            <p className="text-green-700 text-sm mb-4">Review practice compliance and get recommendations</p>
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Run Check
            </button>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Analytics Report</h3>
            <p className="text-purple-700 text-sm mb-4">Generate detailed practice performance report</p>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
