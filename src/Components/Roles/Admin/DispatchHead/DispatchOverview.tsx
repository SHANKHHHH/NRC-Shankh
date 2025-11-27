import React, { useEffect, useState, useMemo } from "react";
import {
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CalendarIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import {
  dispatchService,
  type DispatchProcess,
  type DispatchData,
} from "./dispatchService";
import LoadingSpinner from "../../../common/LoadingSpinner";

const DispatchOverview: React.FC = () => {
  const [dispatchData, setDispatchData] = useState<DispatchProcess[]>([]);
  const [summaryData, setSummaryData] = useState<DispatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDispatch, setSelectedDispatch] =
    useState<DispatchProcess | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [jobRates, setJobRates] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          throw new Error("Authentication token not found");
        }

        // Fetch completed jobs from current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const queryParams = new URLSearchParams();
        queryParams.append(
          "startDate",
          startOfMonth.toISOString().split("T")[0]
        );
        queryParams.append("endDate", endOfMonth.toISOString().split("T")[0]);

        const [data, summary, completedJobsResponse] = await Promise.all([
          dispatchService.getAllDispatchProcesses(),
          dispatchService.getDispatchStatistics(),
          fetch(
            `https://nrprod.nrcontainers.com/api/completed-jobs?${queryParams.toString()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          ),
        ]);

        setDispatchData(data);
        setSummaryData(summary);

        // Process completed jobs data
        if (completedJobsResponse.ok) {
          const completedJobsResult = await completedJobsResponse.json();
          console.log("Completed jobs API response:", completedJobsResult);

          if (
            completedJobsResult.success &&
            Array.isArray(completedJobsResult.data)
          ) {
            console.log("Completed jobs data:", completedJobsResult.data);

            // Filter for DispatchProcess steps and map to DispatchProcess format
            const dispatchCompletedJobs = completedJobsResult.data.flatMap(
              (job: any) => {
                console.log(
                  "Processing job:",
                  job.nrcJobNo,
                  "allStepDetails:",
                  job.allStepDetails
                );
                const dispatchSteps = job.allStepDetails?.dispatchProcess || [];
                console.log("Dispatch steps found:", dispatchSteps);

                return dispatchSteps.map((step: any) => ({
                  id: step.id || 0,
                  jobNrcJobNo: step.jobNrcJobNo || job.nrcJobNo || "-",
                  status: step.status || "accept", // Use the actual status from step
                  date:
                    step.date ||
                    step.dispatchDate ||
                    job.completedAt ||
                    new Date().toISOString(),
                  shift: step.shift || null,
                  operatorName: step.operatorName || "-",
                  dispatchNo: step.dispatchNo || "-",
                  quantity: step.quantity || 0,
                  vehicleNo: step.vehicleNo || "-",
                  driverName: step.driverName || null,
                  destination: step.destination || null,
                  remarks: step.remarks || "-",
                  dispatchDate: step.dispatchDate || step.date || null,
                  balanceQty: step.balanceQty || 0,
                  qcCheckSignBy: step.qcCheckSignBy || null,
                  qcCheckAt: step.qcCheckAt || null,
                  jobStepId: step.jobStepId || null,
                  stepNo: 8,
                  stepName: "DispatchProcess",
                  startDate: step.date || null,
                  endDate: step.date || null,
                  user: step.operatorName || null,
                  machineDetails: [],
                  jobPlanId: job.jobPlanId || null,
                  latestRate:
                    job?.jobDetails?.latestRate ??
                    job?.latestRate ??
                    step.latestRate ??
                    null,
                  dispatchDetails: {
                    dispatchHistory: step.dispatchHistory || null,
                    totalDispatchedQty:
                      step.totalDispatchedQty || step.quantity || 0,
                  },
                }));
              }
            );
            console.log(
              "Processed dispatch completed jobs:",
              dispatchCompletedJobs
            );
            setCompletedJobs(dispatchCompletedJobs);
          } else {
            console.log("No completed jobs data or invalid format");
          }
        } else {
          console.log(
            "Completed jobs API failed:",
            completedJobsResponse.status
          );
        }
      } catch (error) {
        console.error("Error loading dispatch data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Combine dispatchData with completed jobs
  const allDispatchData = useMemo(() => {
    const combined = [...dispatchData, ...completedJobs];
    console.log("Dispatch - Original dispatch data:", dispatchData);
    console.log("Dispatch - Completed jobs data:", completedJobs);
    console.log("Dispatch - Combined all dispatch data:", combined);
    return combined;
  }, [dispatchData, completedJobs]);

  useEffect(() => {
    const fetchMissingRates = async () => {
      if (allDispatchData.length === 0) return;

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.warn("Authentication token not found. Cannot fetch job rates.");
        return;
      }

      const jobsToFetch = Array.from(
        new Set(
          allDispatchData
            .filter(
              (dispatch) =>
                dispatch.jobNrcJobNo &&
                dispatch.latestRate == null &&
                jobRates[dispatch.jobNrcJobNo] === undefined
            )
            .map((dispatch) => dispatch.jobNrcJobNo)
            .filter(Boolean)
        )
      );

      if (jobsToFetch.length === 0) {
        return;
      }

      for (const jobNo of jobsToFetch) {
        try {
          const response = await fetch(
            `https://nrprod.nrcontainers.com/api/jobs/${encodeURIComponent(
              jobNo
            )}/with-po-details`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            console.warn(
              `Failed to fetch job details for ${jobNo}: ${response.status}`
            );
            continue;
          }

          const result = await response.json();
          const latestRate =
            result?.data?.jobDetails?.latestRate ??
            result?.data?.latestRate ??
            null;

          if (typeof latestRate === "number" && !Number.isNaN(latestRate)) {
            setJobRates((prev) => ({
              ...prev,
              [jobNo]: latestRate,
            }));
          }
        } catch (error) {
          console.error(`Error fetching job rate for ${jobNo}:`, error);
        }
      }
    };

    fetchMissingRates();
  }, [allDispatchData, jobRates]);

  // Helper function to get the first dispatch detail item (when dispatchDetails is an array)
  const getFirstDispatchDetail = (dispatch: DispatchProcess): any | null => {
    if (
      Array.isArray(dispatch.dispatchDetails) &&
      dispatch.dispatchDetails.length > 0
    ) {
      return dispatch.dispatchDetails[0];
    }
    return null;
  };

  // Helper function to get dispatch number
  const getDispatchNo = (dispatch: DispatchProcess): string => {
    const firstDetail = getFirstDispatchDetail(dispatch);
    if (firstDetail?.dispatchNo && firstDetail.dispatchNo !== "-") {
      return firstDetail.dispatchNo;
    }
    return dispatch.dispatchNo || "-";
  };

  // Helper function to get operator name
  const getOperatorName = (dispatch: DispatchProcess): string => {
    const firstDetail = getFirstDispatchDetail(dispatch);
    if (firstDetail?.operatorName && firstDetail.operatorName !== "-") {
      return firstDetail.operatorName;
    }
    return dispatch.operatorName || dispatch.user || "-";
  };

  // Helper function to get status (prioritize from dispatchDetails if available)
  const getDispatchStatus = (dispatch: DispatchProcess): string => {
    const firstDetail = getFirstDispatchDetail(dispatch);
    if (firstDetail?.status) {
      return firstDetail.status;
    }
    return dispatch.status || "pending";
  };

  const getLatestRateValue = (dispatch: DispatchProcess): number | null => {
    if (
      dispatch.latestRate !== undefined &&
      dispatch.latestRate !== null &&
      !Number.isNaN(dispatch.latestRate)
    ) {
      return dispatch.latestRate;
    }
    const rateFromMap = jobRates[dispatch.jobNrcJobNo];
    if (rateFromMap !== undefined && !Number.isNaN(rateFromMap)) {
      return rateFromMap;
    }
    return null;
  };

  // Helper function to get total dispatched quantity
  // Handles both data structures:
  // 1. dispatchDetails as object (from completed jobs): { totalDispatchedQty: number }
  // 2. dispatchDetails as array (from regular API): [{ totalDispatchedQty: number }, ...]
  const getTotalDispatchedQuantity = (dispatch: DispatchProcess): number => {
    // Case 1: dispatchDetails is an object (completed jobs structure)
    if (dispatch.dispatchDetails && !Array.isArray(dispatch.dispatchDetails)) {
      if (dispatch.dispatchDetails.totalDispatchedQty !== undefined) {
        return dispatch.dispatchDetails.totalDispatchedQty;
      }
    }

    // Case 2: dispatchDetails is an array (regular API structure)
    if (
      Array.isArray(dispatch.dispatchDetails) &&
      dispatch.dispatchDetails.length > 0
    ) {
      // Sum up totalDispatchedQty from all items in the array
      const totalQty = dispatch.dispatchDetails.reduce(
        (sum: number, item: any) => {
          return sum + (item.totalDispatchedQty || item.quantity || 0);
        },
        0
      );
      if (totalQty > 0) {
        return totalQty;
      }
    }

    // Fallback to quantity field
    return dispatch.quantity || 0;
  };

  const formatCurrency = (value: number, fractionDigits = 0) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  // Calculate updated summary data including completed jobs
  const updatedSummaryData = useMemo(() => {
    if (!summaryData) return null;

    const totalDispatches = allDispatchData.length;
    const totalQuantityDispatched = allDispatchData.reduce(
      (sum, item) => sum + getTotalDispatchedQuantity(item),
      0
    );
    const totalBalanceQuantity = allDispatchData.reduce(
      (sum, item) => sum + (item.balanceQty || 0),
      0
    );
    const completedDispatches = allDispatchData.filter((item) => {
      const status = getDispatchStatus(item);
      return status === "accept" || status === "stop";
    }).length;
    const pendingDispatches = allDispatchData.filter(
      (item) => getDispatchStatus(item) === "pending"
    ).length;
    const rejectedDispatches = allDispatchData.filter(
      (item) => getDispatchStatus(item) === "rejected"
    ).length;
    const plannedDispatches = allDispatchData.filter(
      (item) => getDispatchStatus(item) === "planned"
    ).length;
    const inProgressDispatches = allDispatchData.filter((item) => {
      const status = getDispatchStatus(item);
      return status === "start" || status === "in_progress";
    }).length;

    return {
      ...summaryData,
      totalDispatches,
      totalQuantityDispatched,
      totalBalanceQuantity,
      completedDispatches,
      pendingDispatches,
      rejectedDispatches,
      plannedDispatches,
      inProgressDispatches,
    };
  }, [summaryData, allDispatchData]);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    const filtered = allDispatchData.filter((item) => {
      const matchesSearch =
        item.jobNrcJobNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getDispatchNo(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getOperatorName(item).toLowerCase().includes(searchTerm.toLowerCase());

      const itemStatus = getDispatchStatus(item);
      let matchesStatus = statusFilter === "all";

      if (statusFilter === "in_progress") {
        // Match both "start" and "in_progress" for "In Progress" filter
        matchesStatus = itemStatus === "start" || itemStatus === "in_progress";
      } else if (statusFilter === "dispatched") {
        // Match both "accept" and "stop" for "Dispatched" filter
        matchesStatus = itemStatus === "accept" || itemStatus === "stop";
      } else if (statusFilter !== "all") {
        matchesStatus = itemStatus === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
    console.log("Dispatch - Filtered data:", filtered.length, "items");
    return filtered;
  }, [allDispatchData, searchTerm, statusFilter]);

  // Sort by dispatch date (latest first) and limit to 5 items
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort(
      (a, b) =>
        new Date(b.dispatchDate || b.date).getTime() -
        new Date(a.dispatchDate || a.date).getTime()
    );
    console.log("Dispatch - Sorted data:", sorted.length, "items");
    return sorted;
  }, [filteredData]);

  // Show all data or limit to 5 based on state
  const displayData = useMemo(() => {
    const data = showAllData ? sortedData : sortedData.slice(0, 5);
    console.log(
      "Dispatch - Display data:",
      data.length,
      "items",
      showAllData ? "(all)" : "(latest 5)"
    );
    return data;
  }, [sortedData, showAllData]);

  // Get status color and label - Updated with new statuses
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "accept":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Dispatched",
          icon: CheckCircleIcon,
        };
      case "pending":
        return {
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          label: "Pending",
          icon: ClockIcon,
        };
      case "rejected":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Rejected",
          icon: ExclamationTriangleIcon,
        };
      case "planned":
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Planned",
          icon: CalendarIcon,
        };
      case "start":
      case "in_progress":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "In Progress",
          icon: PlayCircleIcon,
        };
      case "stop":
        return {
          color: "bg-purple-100 text-purple-800 border-purple-200",
          label: "Dispatched",
          icon: TruckIcon,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Unknown",
          icon: ExclamationTriangleIcon,
        };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Handle row click to show details
  const handleRowClick = (dispatch: DispatchProcess) => {
    setSelectedDispatch(dispatch);
    setShowDetailPanel(true);
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedDispatch(null);
  };

  // Refresh data handler
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [data, summary] = await Promise.all([
        dispatchService.getAllDispatchProcesses(),
        dispatchService.getDispatchStatistics(),
      ]);
      setDispatchData(data);
      setSummaryData(summary);
    } catch (error) {
      console.error("Error refreshing dispatch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading Dispatch Dashboard..." />
      </div>
    );
  }

  // Show message when no data is available
  if (allDispatchData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <div className="bg-blue-500 p-3 rounded-xl">
              <TruckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dispatch Head Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Monitor and manage all dispatch operations
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <TruckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Dispatch Data Available
          </h3>
          <p className="text-gray-600 mb-4">
            No dispatch processes found in the system.
          </p>
          <button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  console.log("Dispatch Data:", dispatchData);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <TruckIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dispatch Head Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Monitor and manage all dispatch operations
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <LoadingSpinner
                size="sm"
                variant="button"
                color="white"
                text="Refreshing..."
              />
            ) : (
              <>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      {/* Summary KPI Cards - Updated to use summaryData from state */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Dispatches
              </p>
              <p className="text-xl font-bold text-blue-600">
                {updatedSummaryData?.totalDispatches || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <TruckIcon className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Quantity Dispatched
              </p>
              <p className="text-xl font-bold text-green-600">
                {updatedSummaryData?.totalQuantityDispatched?.toLocaleString() ||
                  0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Balance Qty</p>
              <p className="text-xl font-bold text-orange-600">
                {updatedSummaryData?.totalBalanceQuantity?.toLocaleString() ||
                  0}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <ClockIcon className="h-4 w-4 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Dispatched</p>
              <p className="text-xl font-bold text-green-600">
                {updatedSummaryData?.completedDispatches || 0}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {updatedSummaryData?.pendingDispatches || 0}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-xl">
              <ClockIcon className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-xl font-bold text-red-600">
                {updatedSummaryData?.rejectedDispatches || 0}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-xl">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Planned</p>
              <p className="text-xl font-bold text-gray-600">
                {updatedSummaryData?.plannedDispatches || 0}
              </p>
            </div>
            <div className="bg-gray-100 p-3 rounded-xl">
              <CalendarIcon className="h-4 w-4 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-xl font-bold text-blue-600">
                {updatedSummaryData?.inProgressDispatches || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <PlayCircleIcon className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search - Updated filter options */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Job No, Dispatch No, or Operator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="dispatched">Dispatched</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Showing {displayData.length} of {filteredData.length} dispatches (
            {showAllData ? "all" : "latest 5"} by dispatch date)
          </div>
        </div>
      </div>

      {/* Dispatch Details Table - Updated to handle potential division by zero */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Dispatch Details
          </h3>
          <p className="text-sm text-gray-600">
            Click on any row to view detailed information
          </p>
        </div>

        <div
          className={`overflow-x-auto custom-scrollbar ${
            displayData.length > 5 && !showAllData
              ? "overflow-y-auto max-h-[500px]"
              : "overflow-y-visible"
          }`}
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dispatch No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Step Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Dispatched Qty
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Qty
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <TruckIcon className="h-8 w-8 text-gray-300" />
                      <p>No dispatches found matching the current filters</p>
                      <p className="text-sm text-gray-400">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((dispatch: DispatchProcess) => {
                  const dispatchStatus = getDispatchStatus(dispatch);
                  const statusInfo = getStatusInfo(dispatchStatus);
                  const StatusIcon = statusInfo.icon;
                  const totalQuantity = getTotalDispatchedQuantity(dispatch);
                  const balanceQty = dispatch.balanceQty || 0;
                  const dispatchedQty = totalQuantity - balanceQty;
                  const completionPercentage =
                    totalQuantity > 0
                      ? (dispatchedQty / totalQuantity) * 100
                      : 0;
                  const latestRateValue = getLatestRateValue(dispatch);
                  const revenueValue =
                    latestRateValue !== null
                      ? latestRateValue * totalQuantity
                      : null;

                  return (
                    <tr
                      key={dispatch.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(dispatch)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {getDispatchNo(dispatch)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-mono">
                          {dispatch.jobNrcJobNo}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div>
                            Step {dispatch.stepNo}:{" "}
                            {dispatch.stepName?.replace(
                              /([a-z])([A-Z])/g,
                              "$1 $2"
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dispatch.machineDetails?.[0]?.machineCode ||
                              "Not Assigned"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(dispatch.dispatchDate || dispatch.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {totalQuantity.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {balanceQty.toLocaleString()}
                          </div>
                          {totalQuantity > 0 && (
                            <>
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${completionPercentage}%` }}
                                ></div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {Math.round(completionPercentage)}%
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {revenueValue !== null ? (
                          <div className="flex flex-col items-center space-y-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatCurrency(revenueValue, 2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Rate:{" "}
                              {latestRateValue !== null
                                ? formatCurrency(latestRateValue, 2)
                                : "N/A"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getOperatorName(dispatch)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Show View All button when there are more than 5 items */}
        {filteredData.length > 5 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {showAllData
                  ? `Showing all ${displayData.length} dispatches`
                  : `Showing latest 5 of ${filteredData.length} dispatches`}
              </p>
              <button
                onClick={() => setShowAllData(!showAllData)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
              >
                {showAllData
                  ? "Show Latest 5"
                  : `View All (${filteredData.length})`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel - Updated with step information */}
      {showDetailPanel && selectedDispatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Dispatch Details
                </h3>
                <button
                  onClick={closeDetailPanel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Dispatch Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Dispatch No:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {getDispatchNo(selectedDispatch)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Job No:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {selectedDispatch.jobNrcJobNo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Step:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedDispatch.stepNo}:{" "}
                        {selectedDispatch.stepName?.replace(
                          /([a-z])([A-Z])/g,
                          "$1 $2"
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusInfo(getDispatchStatus(selectedDispatch))
                            .color
                        }`}
                      >
                        {
                          getStatusInfo(getDispatchStatus(selectedDispatch))
                            .label
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {selectedDispatch.machineDetails &&
                  selectedDispatch.machineDetails.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Machine Information
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {selectedDispatch.machineDetails.map(
                          (machine, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Unit:
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {machine.unit || "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Machine Code:
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {machine.machineCode || "Not Assigned"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Type:
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {machine.machineType || "N/A"}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Quantity Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Total Dispatched Qty:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {getTotalDispatchedQuantity(
                          selectedDispatch
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Balance Qty:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedDispatch.balanceQty?.toLocaleString() || 0}
                      </span>
                    </div>
                    {getTotalDispatchedQuantity(selectedDispatch) > 0 && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((getTotalDispatchedQuantity(selectedDispatch) -
                                  selectedDispatch.balanceQty) /
                                  getTotalDispatchedQuantity(
                                    selectedDispatch
                                  )) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          {getTotalDispatchedQuantity(selectedDispatch) -
                            selectedDispatch.balanceQty}{" "}
                          of {getTotalDispatchedQuantity(selectedDispatch)}{" "}
                          dispatched
                        </div>
                      </>
                    )}
                    {/* Show dispatch history if available */}
                    {(() => {
                      // Handle both array and object structures for dispatchDetails
                      let dispatchHistory: any[] | null = null;

                      if (
                        Array.isArray(selectedDispatch.dispatchDetails) &&
                        selectedDispatch.dispatchDetails.length > 0
                      ) {
                        // If dispatchDetails is an array, get history from the first item (or combine all)
                        const firstItem = selectedDispatch.dispatchDetails[0];
                        dispatchHistory = firstItem.dispatchHistory || null;
                      } else if (
                        selectedDispatch.dispatchDetails &&
                        !Array.isArray(selectedDispatch.dispatchDetails)
                      ) {
                        // If dispatchDetails is an object
                        dispatchHistory =
                          selectedDispatch.dispatchDetails.dispatchHistory ||
                          null;
                      }

                      return dispatchHistory && dispatchHistory.length > 0 ? (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Dispatch History:
                          </div>
                          <div className="space-y-2">
                            {dispatchHistory.map(
                              (history: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-xs text-gray-600 bg-white p-2 rounded border"
                                >
                                  <div className="flex justify-between">
                                    <span className="font-medium">
                                      {history.dispatchNo}
                                    </span>
                                    <span>
                                      {history.dispatchedQty?.toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {history.operatorName} -{" "}
                                    {formatDate(history.dispatchDate)}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Operational Details
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Operator:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {getOperatorName(selectedDispatch)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Shift:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedDispatch.shift || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        QC Check By:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedDispatch.qcCheckSignBy || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Timeline
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(selectedDispatch.date)}
                      </span>
                    </div>
                    {selectedDispatch.startDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Started:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedDispatch.startDate)}
                        </span>
                      </div>
                    )}
                    {selectedDispatch.endDate && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ended:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedDispatch.endDate)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Dispatch Date:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(
                          selectedDispatch.dispatchDate || selectedDispatch.date
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedDispatch.remarks &&
                  selectedDispatch.remarks !== "-" && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">
                        Remarks
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-900">
                          {selectedDispatch.remarks}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispatchOverview;
