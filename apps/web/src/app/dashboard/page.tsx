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
  DocumentTextIcon,
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
type TopItem = { code: string; title: string; count: number; revenue: number; description?: string };
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

  // Loading component for cards
  const LoadingSpinner = ({ className = "h-8 w-8" }: { className?: string }) => (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${className}`}></div>
  );

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
      { code: "23", title: "Consultation Level A", count: 145, revenue: 6003, description: "Professional attendance by a general practitioner at consulting rooms for standard consultation" },
      { code: "36", title: "Consultation Level C", count: 89, revenue: 7614, description: "Professional attendance by a general practitioner for complex consultation requiring detailed examination" },
      { code: "721", title: "Health Assessment", count: 67, revenue: 4489, description: "Comprehensive health assessment including physical examination and health screening" },
      { code: "11700", title: "ECG", count: 54, revenue: 1434, description: "Electrocardiogram to assess heart rhythm and detect cardiac abnormalities" },
      { code: "2713", title: "Mental Health", count: 42, revenue: 4284, description: "Mental health treatment plan preparation and assessment by general practitioner" },
      { code: "58503", title: "Chest X-ray", count: 38, revenue: 2797, description: "Chest radiograph to examine lungs, heart, and chest cavity for diagnostic purposes" },
      { code: "11506", title: "Pathology Test", count: 35, revenue: 892, description: "Laboratory pathology testing and analysis for diagnostic investigation" },
      { code: "16400", title: "Ultrasound", count: 32, revenue: 3456, description: "Ultrasound examination for non-invasive diagnostic imaging of internal organs" },
      { code: "30000", title: "Surgery Minor", count: 28, revenue: 1234, description: "Minor surgical procedure performed in clinic or day surgery setting" },
      { code: "11000", title: "Blood Test", count: 25, revenue: 567, description: "Blood collection and basic laboratory analysis for health monitoring" },
    ];

    return {
      kpis: {
        totalClaims: 0,
        errorRate: 0,
        revenue: 0,
        complianceScore: 0,
      },
      revenueTrend: [
        { month: "Jan", value: 45835 },
        { month: "Feb", value: 42265 },
        { month: "Mar", value: 49519 },
        { month: "Apr", value: 42858 },
        { month: "May", value: 43388 },
        { month: "Jun", value: 37244 },
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
  const getKPICards = (data: DashboardData): KPICard[] => {
    const isFiltered = filters.provider !== "All" || filters.item !== "All" || filters.dateRange !== "Last 30 days";
    const filterSuffix = isFiltered ? " (Filtered)" : "";
    
    // Calculate dynamic descriptions based on current filters
    const getTimeDescription = () => {
      if (isFiltered) return "Filtered period";
      return filters.dateRange.toLowerCase();
    };
    
    return [
      {
        key: "totalClaims",
        title: `Total Claims${filterSuffix}`,
        value: data.kpis.totalClaims.toLocaleString(),
        change: data.kpis.totalClaims > 0 ? `${data.kpis.totalClaims} total` : "No data",
        trend: "up",
        description: getTimeDescription(),
      },
    {
      key: "errorRate",
      title: `Error/Reject Rate${filterSuffix}`,
      value: `${(data.kpis.errorRate * 100).toFixed(1)}%`,
      change: data.kpis.errorRate < 0.05 ? "Good" : "Needs attention",
      trend: data.kpis.errorRate < 0.05 ? "down" : "up",
      description: "Industry avg: 4.1%",
    },
    {
      key: "revenue",
      title: `Total Revenue${filterSuffix}`,
      value: `$${Math.floor(data.kpis.revenue).toLocaleString()}`,
      change: data.kpis.revenue > 0 ? "From successful claims" : "No revenue",
      trend: "up",
      description: getTimeDescription(),
    },
    {
      key: "complianceScore",
      title: `Compliance Score${filterSuffix}`,
      value: `${(data.kpis.complianceScore * 100).toFixed(1)}%`,
      change: data.kpis.complianceScore > 0.95 ? "Excellent" : data.kpis.complianceScore > 0.90 ? "Good" : "Needs work",
      trend: data.kpis.complianceScore > 0.90 ? "up" : "down",
      description: "Target: 95%+",
    },
  ];
  };

  // API functions
  const fetchDashboardData = useCallback(
    async (filterParams: FilterState) => {
      setIsLoading(true);
      try {
        const apiBase = (
          process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000"
        ).replace(/\/$/, "");



        // Fetch metrics with filters
        const searchParams = new URLSearchParams();
        if (filterParams.fromDate)
          searchParams.set("from", filterParams.fromDate);
        if (filterParams.toDate) searchParams.set("to", filterParams.toDate);
        if (filterParams.provider && filterParams.provider !== "All")
          searchParams.set("provider", filterParams.provider);
        if (filterParams.item && filterParams.item !== "All")
          searchParams.set("item", filterParams.item);
        
        // Always add type=errors for audit rows
        searchParams.set("type", "errors");



        const metricsResponse = await fetch(
          `${apiBase}/api/metrics?${searchParams}`
        );
        if (!metricsResponse.ok) throw new Error("API failed");

        const metricsData = await metricsResponse.json();


        // Always fetch revenue trend for 180 days regardless of filter
        const revenueTrendParams = new URLSearchParams();
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const fromDate180 = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const toDate180 = today.toISOString().split("T")[0];
        
        revenueTrendParams.set("from", fromDate180);
        revenueTrendParams.set("to", toDate180);
        // Don't apply item filter to revenue trend, but keep provider filter
        if (filterParams.provider && filterParams.provider !== "All")
          revenueTrendParams.set("provider", filterParams.provider);

        const revenueTrendResponse = await fetch(
          `${apiBase}/api/metrics?${revenueTrendParams}`
        );
        
        // Fetch top items without item filter
        const topItemsParams = new URLSearchParams();
        if (filterParams.fromDate)
          topItemsParams.set("from", filterParams.fromDate);
        if (filterParams.toDate) 
          topItemsParams.set("to", filterParams.toDate);
        if (filterParams.provider && filterParams.provider !== "All")
          topItemsParams.set("provider", filterParams.provider);
        // Intentionally don't set item filter for top items

        const topItemsResponse = await fetch(
          `${apiBase}/api/metrics?${topItemsParams}`
        );

        let finalData = metricsData;
        
        // Override revenue trend with 180-day data
        if (revenueTrendResponse.ok) {
          const revenueTrendData = await revenueTrendResponse.json();
          finalData.revenueTrend = revenueTrendData.revenueTrend;
        }

        // Override top items with unfiltered data
        if (topItemsResponse.ok) {
          const topItemsData = await topItemsResponse.json();
          finalData.topItems = topItemsData.topItems;
        }

        setDashboardData(finalData);
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

    let result;
    switch (range) {
      case "Last 30 days":
        result = {
          fromDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
        break;
      case "Last 90 days":
        result = {
          fromDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
        break;
      case "Last 180 days":
        result = {
          fromDate: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
        break;
      case "This month":
        result = {
          fromDate: new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0],
          toDate: today.toISOString().split("T")[0],
        };
        break;
      default:
        result = {};
    }

    return result;
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
    const dateRangeParams = getDateRange(filters.dateRange);
    const updatedFilters = { ...filters, ...dateRangeParams };
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
                {/* Active filters indicator */}
                {(filters.provider !== "All" || filters.item !== "All") && (
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-sm text-green-600 font-medium">Active filters:</span>
                    {filters.provider !== "All" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Provider: {filters.provider}
                      </span>
                    )}
                    {filters.item !== "All" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        Item: {filters.item}
                      </span>
                    )}
                  </div>
                )}
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
              {isLoading ? (
                <div className="flex items-center justify-center h-24">
                  <LoadingSpinner className="h-6 w-6" />
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Revenue Trend
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Past 180 days (independent of date filter)
              </p>
            </div>
            <div className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              ) : (
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
              )}
            </div>
          </div>

          {/* Top MBS Items */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Top MBS Items
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  All items ranked (independent of item filter)
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Sort by</p>
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
            </div>

            <div className="h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner className="h-8 w-8" />
                </div>
              ) : dashboardData.topItems && dashboardData.topItems.length > 0 ? (
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
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const item = dashboardData.topItems.find(
                            (i) => i.code === label
                          );
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg max-w-sm">
                              <p className="font-semibold text-gray-900">
                                {label}: {item?.title}
                              </p>
                              {item?.description && item.description !== item?.title && (
                                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                              <p className="text-sm font-medium mt-2 text-blue-600">
                                {filters.chartType === "claims"
                                  ? `${payload[0].value} claims`
                                  : `$${Number(payload[0].value).toLocaleString()} revenue`}
                              </p>
                            </div>
                          );
                        }
                        return null;
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
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner className="h-6 w-6" />
                </div>
              ) : (
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
              )}
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
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner className="h-6 w-6" />
                </div>
              ) : (
                recentActivity.map((activity) => (
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
                ))
              )}
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
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={async () => {
                    const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000").replace(/\/$/, "");
                    const searchParams = new URLSearchParams();
                    
                    // 计算日期范围
                    const dateRangeParams = getDateRange(filters.dateRange);
                    const currentFilters = { ...filters, ...dateRangeParams };
                    
                    // 应用当前的过滤器
                    if (currentFilters.fromDate) searchParams.set('from', currentFilters.fromDate);
                    if (currentFilters.toDate) searchParams.set('to', currentFilters.toDate);
                    if (currentFilters.provider && currentFilters.provider !== 'All') searchParams.set('provider', currentFilters.provider);
                    if (currentFilters.item && currentFilters.item !== 'All') searchParams.set('item', currentFilters.item);
                    
                    // 添加导出类型
                    searchParams.set('type', 'errors');

                    try {
                      const response = await fetch(`${apiBase}/api/metrics/export/audit?${searchParams}`);
                      
                      if (response.status === 204) {
                        alert('No error records found for the selected filters.');
                        return;
                      }

                      if (!response.ok) {
                        throw new Error('Failed to export audit data');
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `audit_errors_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export audit data');
                    }
                  }}
                  className="flex items-center space-x-2 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>Export Errors</span>
                </button>
              </div>
              <div className="relative">
                <button
                  onClick={async () => {
                    const apiBase = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000").replace(/\/$/, "");
                    const searchParams = new URLSearchParams();
                    
                    // 计算日期范围
                    const dateRangeParams = getDateRange(filters.dateRange);
                    const currentFilters = { ...filters, ...dateRangeParams };
                    
                    // 应用当前的过滤器
                    if (currentFilters.fromDate) searchParams.set('from', currentFilters.fromDate);
                    if (currentFilters.toDate) searchParams.set('to', currentFilters.toDate);
                    if (currentFilters.provider && currentFilters.provider !== 'All') searchParams.set('provider', currentFilters.provider);
                    if (currentFilters.item && currentFilters.item !== 'All') searchParams.set('item', currentFilters.item);
                    
                    // 添加导出类型
                    searchParams.set('type', 'all');

                    try {
                      const response = await fetch(`${apiBase}/api/metrics/export/audit?${searchParams}`);
                      
                      if (response.status === 204) {
                        alert('No records found for the selected filters.');
                        return;
                      }

                      if (!response.ok) {
                        throw new Error('Failed to export audit data');
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `audit_all_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert('Failed to export audit data');
                    }
                  }}
                  className="flex items-center space-x-2 bg-primary-100 text-primary-700 hover:bg-primary-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>Export All</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner className="h-6 w-6" />
              </div>
            ) : dashboardData.auditRows.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-700">
                      No Audit Records Found
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {filters.provider !== "All" || filters.item !== "All" || filters.dateRange !== "Last 30 days"
                        ? "No records match the current filter criteria."
                        : "There are no audit records to display."}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Claim ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item(s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dashboardData.auditRows.slice(0, 6).map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {row.date}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-primary-600">
                        {row.claimId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {row.provider}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {row.items}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-900 max-w-[150px] truncate">
                        {row.reason}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
            )}

            {dashboardData.auditRows.length > 6 && (
              <div className="text-center mt-4">
                <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                  View all audit details →
                </button>
              </div>
            )}
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
