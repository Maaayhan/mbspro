"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import AppLayout from "@/components/AppLayout";
import DashboardFilters from "@/components/DashboardFilters";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
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
  ResponsiveContainer,
} from "recharts";

// Types
interface KPICard {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  description: string;
  key: string;
}

interface ActivityItem {
  id: number;
  type: string;
  description: string;
  time: string;
  status: "success" | "warning" | "info";
}

type KPIs = {
  totalClaims: number;
  errorRate: number; // 0..1
  revenue: number; // $
  complianceScore: number; // 0..1
};

type RevenuePoint = { month: string; value: number };
type TopItem = { code: string; title: string; count: number; revenue: number };
type AuditRow = {
  date: string;
  claimId: string;
  provider: string;
  items: string;
  reason: string;
  status: "Rejected" | "Flagged";
};
type RuleRow = {
  id: string;
  name: string;
  status: "ok" | "warning" | "fail";
  reason: string;
};

type DashboardData = {
  kpis: KPIs;
  revenueTrend: RevenuePoint[];
  topItems: TopItem[];
  auditRows: AuditRow[];
  rules: RuleRow[];
};

type FilterState = {
  dateRange: string;
  provider: string;
  item: string;
  chartType: string;
  fromDate?: string;
  toDate?: string;
};

export default function DashboardPage() {
  // State management
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "Last 30 days",
    provider: "All",
    item: "All",
    chartType: "revenue",
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);

  const getTopItems = (
    items: TopItem[],
    sortBy: "count" | "revenue",
    topN: number = 7
  ): TopItem[] => {
    return items
      .slice() // 创建副本
      .sort((a, b) => b[sortBy] - a[sortBy]) // 降序排序
      .slice(0, topN); // 取前N个
  };

  const mockData: DashboardData = useMemo(() => {
    const allItems: TopItem[] = [
      { code: "23", title: "Consultation Level A", count: 145, revenue: 6003 },
      { code: "36", title: "Consultation Level C", count: 89, revenue: 7614 },
      { code: "721", title: "Health Assessment", count: 67, revenue: 4489 },
      { code: "11700", title: "ECG", count: 54, revenue: 1434 },
      { code: "2713", title: "Mental Health", count: 42, revenue: 4284 },
      { code: "58503", title: "Chest X-ray", count: 38, revenue: 2797 },
      { code: "11506", title: "Pathology Test", count: 35, revenue: 892 },
      { code: "16400", title: "Ultrasound", count: 32, revenue: 3456 },
      { code: "30000", title: "Surgery Minor", count: 28, revenue: 1234 },
      { code: "11000", title: "Blood Test", count: 25, revenue: 567 },
    ];

    return {
      kpis: {
        totalClaims: 1247,
        errorRate: 0.023,
        revenue: 82400,
        complianceScore: 0.977,
      },
      revenueTrend: [
        { month: "Jan", value: 12400 },
        { month: "Feb", value: 13800 },
        { month: "Mar", value: 15200 },
        { month: "Apr", value: 14600 },
        { month: "May", value: 16800 },
        { month: "Jun", value: 18200 },
      ],
      topItems: getTopItems(allItems, "revenue"), // 默认按收入取前5名
      auditRows: [
        {
          date: "2024-01-15",
          claimId: "CLM-2024-001523",
          provider: "Dr. Smith",
          items: "23, 36",
          reason: "Insufficient documentation",
          status: "Rejected",
        },
        {
          date: "2024-01-14",
          claimId: "CLM-2024-001522",
          provider: "Dr. Lee",
          items: "11700",
          reason: "Time interval violation",
          status: "Flagged",
        },
        {
          date: "2024-01-13",
          claimId: "CLM-2024-001521",
          provider: "Dr. Smith",
          items: "721",
          reason: "Patient eligibility issue",
          status: "Rejected",
        },
        {
          date: "2024-01-12",
          claimId: "CLM-2024-001520",
          provider: "Dr. Wilson",
          items: "2713",
          reason: "Incorrect code selection",
          status: "Flagged",
        },
      ],
      rules: [
        {
          id: "R001",
          name: "Documentation Completeness",
          status: "ok",
          reason: "All required fields documented",
        },
        {
          id: "R002",
          name: "Time Interval Compliance",
          status: "warning",
          reason: "2 claims with potential time violations",
        },
        {
          id: "R003",
          name: "Patient Eligibility",
          status: "ok",
          reason: "All patients meet eligibility criteria",
        },
        {
          id: "R004",
          name: "Code Accuracy",
          status: "fail",
          reason: "5 claims with incorrect code selection",
        },
        {
          id: "R005",
          name: "Billing Rules",
          status: "ok",
          reason: "All billing rules followed correctly",
        },
      ],
    };
  }, []);

  const errorReasonsData = [
    { name: "Documentation", value: 35, color: "#ef4444" },
    { name: "Time Intervals", value: 25, color: "#f97316" },
    { name: "Patient Eligibility", value: 20, color: "#eab308" },
    { name: "Code Selection", value: 15, color: "#06b6d4" },
    { name: "Other", value: 5, color: "#6b7280" },
  ];

  // Generate KPI cards from data
  const getKPICards = (data: DashboardData): KPICard[] => [
    {
      key: "totalClaims",
      title: "Total Claims",
      value: data.kpis.totalClaims.toLocaleString(),
      change: "+12.5%",
      trend: "up",
      description: "This month",
    },
    {
      key: "errorRate",
      title: "Error/Reject Rate",
      value: `${(data.kpis.errorRate * 100).toFixed(1)}%`,
      change: "-0.8%",
      trend: "down",
      description: "Industry avg: 4.1%",
    },
    {
      key: "revenue",
      title: "Total Revenue",
      value: `$${Math.floor(data.kpis.revenue).toLocaleString()}`,
      change: "+18.2%",
      trend: "up",
      description: "Last 30 days",
    },
    {
      key: "complianceScore",
      title: "Compliance Score",
      value: `${(data.kpis.complianceScore * 100).toFixed(1)}%`,
      change: "+2.1%",
      trend: "up",
      description: "Above target",
    },
  ];

  // API functions
  const fetchDashboardData = useCallback(
    async (filterParams: FilterState) => {
      setIsLoading(true);
      try {
        const apiBase = (
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
        ).replace(/\/$/, "");

        // Fetch claims stats for total claims count
        const claimsResponse = await fetch(`${apiBase}/api/claim/stats`);
        let claimsStats = null;
        if (claimsResponse.ok) {
          claimsStats = await claimsResponse.json();
        }

        // Fetch metrics for other data
        const searchParams = new URLSearchParams();
        if (filterParams.fromDate)
          searchParams.set("from", filterParams.fromDate);
        if (filterParams.toDate) searchParams.set("to", filterParams.toDate);
        if (filterParams.provider !== "All")
          searchParams.set("provider", filterParams.provider);
        if (filterParams.item !== "All")
          searchParams.set("item", filterParams.item);

        const metricsResponse = await fetch(
          `${apiBase}/api/metrics?${searchParams}`
        );
        if (!metricsResponse.ok) throw new Error("API failed");

        const metricsData = await metricsResponse.json();

        // Merge claims stats with metrics data
        const mergedData = {
          ...metricsData,
          kpis: {
            ...metricsData.kpis,
            totalClaims: claimsStats?.total || 0,
            revenue: claimsStats?.totalAmount || metricsData.kpis.revenue,
          },
        };

        setDashboardData(mergedData);
      } catch (error) {
        console.warn("API failed, using mock data:", error);
        setDashboardData(mockData);
      } finally {
        setIsLoading(false);
      }
    },
    [mockData]
  );

  // Date range calculation
  const getDateRange = (range: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (range) {
      case "Last 30 days":
        return {
          fromDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
      case "Last 90 days":
        return {
          fromDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
      case "This month":
        return {
          fromDate: new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
      default:
        return {};
    }
  };

  // CSV Export function
  const exportToCSV = (data: AuditRow[], filename: string) => {
    const headers = [
      "Date",
      "Claim ID",
      "Provider",
      "Items",
      "Reason",
      "Status",
    ];
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        [
          row.date,
          row.claimId,
          row.provider,
          `"${row.items}"`,
          `"${row.reason}"`,
          row.status,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Effects
  useEffect(() => {
    const dateRange = getDateRange(filters.dateRange);
    const updatedFilters = { ...filters, ...dateRange };
    fetchDashboardData(updatedFilters);
  }, [filters, fetchDashboardData]);

  // Initialize with mock data
  useEffect(() => {
    if (!dashboardData) {
      setDashboardData(mockData);
    }
  }, [dashboardData, mockData]);

  const recentActivity: ActivityItem[] = [
    {
      id: 1,
      type: "claim_submitted",
      description: "Claim CLM-2024-001523 submitted successfully",
      time: "2 hours ago",
      status: "success",
    },
    {
      id: 2,
      type: "compliance_warning",
      description: "Potential documentation issue detected",
      time: "4 hours ago",
      status: "warning",
    },
    {
      id: 3,
      type: "claim_processed",
      description: "Claim CLM-2024-001522 processed and paid",
      time: "6 hours ago",
      status: "success",
    },
    {
      id: 4,
      type: "system_update",
      description: "MBS code database updated",
      time: "1 day ago",
      status: "info",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case "info":
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRuleStatusBadge = (status: "ok" | "warning" | "fail") => {
    const styles = {
      ok: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      fail: "bg-red-100 text-red-800",
    };
    const labels = {
      ok: "OK",
      warning: "Warning",
      fail: "Fail",
    };
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (!dashboardData) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const kpiCards = getKPICards(dashboardData);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Compliance Banner with Integrated Filters */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            {/* Left side - Compliance info */}
            <div className="flex items-center mt-2">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-green-800">
                  Excellent Compliance Status
                </h3>
                <p className="text-green-700">
                  {(dashboardData.kpis.complianceScore * 100).toFixed(1)}%
                  Compliance: All Recent Claims Follow MBS Guidelines.
                </p>
              </div>
            </div>

            {/* Right side - Filters */}
            <div className="ml-6">
              <DashboardFilters filters={filters} onChange={setFilters} />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((kpi, index) => (
            <div
              key={index}
              className={`card transition-shadow duration-200 ${
                kpi.key === "complianceScore"
                  ? "cursor-pointer hover:shadow-lg"
                  : ""
              }`}
              onClick={() =>
                kpi.key === "complianceScore"
                  ? setSelectedKPI(kpi.key)
                  : undefined
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {kpi.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {kpi.value}
                  </p>
                </div>
                <div
                  className={`flex items-center space-x-1 ${
                    kpi.trend === "up" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {kpi.trend === "up" ? (
                    <ArrowUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{kpi.change}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">{kpi.description}</p>
              {kpi.key === "complianceScore" && (
                <p className="text-xs text-primary-600 mt-2">
                  Click for compliance details →
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Revenue Trend
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dashboardData.revenueTrend.map((item) => ({
                    month: item.month,
                    revenue: item.value,
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    stroke="#6b7280"
                    padding={{ left: 25, right: 25 }}
                  />
                  <YAxis
                    stroke="#6b7280"
                    domain={["auto", "auto"]}
                    padding={{ top: 10, bottom: 10 }}
                    tickFormatter={(value) =>
                      `$${Number(value).toLocaleString()}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString()}`,
                      "Revenue",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#0ea5e9"
                    strokeWidth={3}
                    dot={{ fill: "#0ea5e9", strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top MBS Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Top MBS Items
              </h3>
              <div className="flex items-center space-x-3">
                <select
                  value={filters.chartType || "revenue"}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      chartType: e.target.value,
                    }))
                  }
                  className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="revenue">Revenue</option>
                  <option value="claims">Claims</option>
                </select>
              </div>
            </div>

            <div className="h-96">
              {dashboardData.topItems && dashboardData.topItems.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getTopItems(
                      dashboardData.topItems,
                      filters.chartType === "claims" ? "count" : "revenue"
                    )}
                    margin={{ top: 20, right: 30, left: 20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="code" stroke="#6b7280" />
                    <YAxis
                      stroke="#6b7280"
                      tickFormatter={(value) =>
                        filters.chartType === "revenue"
                          ? `$${Number(value).toLocaleString()}`
                          : Number(value).toLocaleString()
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value) => [
                        filters.chartType === "claims"
                          ? `${value} claims`
                          : `$${Number(value).toLocaleString()}`,
                        filters.chartType === "claims" ? "Claims" : "Revenue",
                      ]}
                      labelFormatter={(code) => {
                        const item = dashboardData.topItems.find(
                          (i) => i.code === code
                        );
                        return item ? `${code}: ${item.title}` : code;
                      }}
                    />
                    <Bar
                      dataKey={
                        filters.chartType === "claims" ? "count" : "revenue"
                      }
                      fill={
                        filters.chartType === "claims" ? "#3b82f6" : "#14b8a6"
                      }
                      radius={[0, 4, 4, 0]}
                      barSize={25}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">
                      No data available
                    </div>
                    <div className="text-sm">
                      Chart will appear when data is loaded
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Error Reasons Pie Chart */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Error Reasons
            </h3>
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
                    formatter={(value) => [`${value}%`, "Percentage"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
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
                  <span className="text-sm font-medium text-gray-900">
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getStatusIcon(activity.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
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

        {/* Errors / Rejects Audit Detail */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Errors / Rejects (Audit Detail)
            </h3>
            <button
              onClick={() =>
                exportToCSV(dashboardData.auditRows, "audit-details.csv")
              }
              className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Claim ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item(s)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.auditRows.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">
                      {row.claimId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {row.items}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {row.reason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          row.status === "Rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPI Drill-down Modal */}
        {selectedKPI && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Compliance Rules Details
                </h3>
                <button
                  onClick={() => setSelectedKPI(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  {dashboardData.rules.map((rule, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">
                            {rule.id}
                          </span>
                          <span className="text-gray-600">{rule.name}</span>
                        </div>
                        {getRuleStatusBadge(rule.status)}
                      </div>
                      <p className="text-sm text-gray-600">{rule.reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => setSelectedKPI(null)}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
