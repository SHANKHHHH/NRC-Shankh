import React, { useState, useEffect, useMemo } from "react";
import { Calendar, AlertTriangle, RefreshCw } from "lucide-react";
import DateFilterComponent, {
  type DateFilterType,
} from "./FilterComponents/DateFilterComponent";
import StatisticsGrid from "./StatisticsCards/StatisticsGrid";
import LineChartComponent from "./ChartComponents/LineChartComponent";
import BarChartComponent from "./ChartComponents/BarChartComponent";
import PieChartComponent from "./ChartComponents/PieChartComponent";
// import AdvancedDataChart from "./ChartComponents/AdvancedDataChart";
import JobPlansTable from "./DataTable/JobPlansTable";
import { useNavigate, useLocation } from "react-router-dom";
import CompletedJobsTable from "./CompletedJobsTable";
import LoadingSpinner from "../../common/LoadingSpinner";
import MachineUtilizationDashboard from "./MachineUtilization";
import ActiveUsersModal from "./Modals/ActiveUsersModal";
import PDAAnnouncements from "./PDAAnnouncements";
import { fetchStepDetailsBatch } from "../../../utils/dashboardStepDetailsBatch";

// Types based on the API response structure
interface JobPlanStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: Array<{
    unit: string | null;
    machineId: string | number;
    machineCode: string | null;
    machineType: string;
    machine?: {
      id: string;
      description: string;
      status: string;
      capacity: number;
    };
  }>;
  status: "planned" | "start" | "stop" | "accept" | "major_hold";
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  createdAt: string;
  updatedAt: string;
  stepDetails?: any; // Step-specific details from API endpoints
  // Step-specific properties that may contain status
  paperStore?: { id?: number; status?: string; [key: string]: any };
  printingDetails?: { id?: number; status?: string; [key: string]: any };
  corrugation?: { id?: number; status?: string; [key: string]: any };
  flutelam?: { id?: number; status?: string; [key: string]: any };
  fluteLaminateBoardConversion?: {
    id?: number;
    status?: string;
    [key: string]: any;
  };
  punching?: { id?: number; status?: string; [key: string]: any };
  sideFlapPasting?: { id?: number; status?: string; [key: string]: any };
  qualityDept?: { id?: number; status?: string; [key: string]: any };
  dispatchProcess?: { id?: number; status?: string; [key: string]: any };
}

interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  steps: JobPlanStep[];
}

// StepDetails interface removed as it's not used

interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobDemand: string;
  jobDetails: {
    id: number;
    customerName: string;
    preRate: number;
    latestRate: number;
    [key: string]: any;
  };
  purchaseOrderDetails: {
    id: number;
    customer: string;
    unit: string;
    [key: string]: any;
  };
  allSteps: Array<{
    id: number;
    stepName: string;
    machineDetails: Array<{
      unit: string | null;
      machineId: string;
      machineCode: string | null;
      machineType: string;
    }>;
    dispatchProcess?: {
      id: number;
      quantity: number;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
  completedAt: string;
  completedBy: string;
  [key: string]: any;
}

interface HeldMachine {
  machineId: string;
  machineCode: string;
  machineType: string;
  unit: string;
  description: string;
  capacity: number;
  holdRemark: string | null;
  heldAt: string;
  heldBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  formData: any;
  startedAt: string;
}

interface HeldJobStep {
  stepNo: number;
  stepName: string;
  stepStatus: string;
  stepStartDate: string | null;
  stepEndDate: string | null;
  machineDetails: Array<{
    id?: string;
    unit: string;
    machineCode: string | null;
    machineType: string;
  }>;
  hasHeldMachines: boolean;
  heldMachinesCount: number;
  heldMachines: HeldMachine[];
  stepSpecificData: any;
  stepHoldRemark: string | null;
}

interface HeldJob {
  jobDetails: {
    nrcJobNo: string;
    customerName: string;
    styleItemSKU: string;
    fluteType: string;
    status: string;
    jobDemand: string;
    boxDimensions: string;
    noOfColor: string;
    imageURL: string | null;
    createdAt: string | null;
  };
  purchaseOrders: Array<{
    id: number;
    poNumber: string;
    customer: string;
    totalPOQuantity: number;
    pendingQuantity: number;
    deliveryDate: string;
    nrcDeliveryDate: string;
    poDate: string;
    status: string;
  }>;
  steps: HeldJobStep[];
  totalHeldMachines: number;
  jobPlanningId: number;
}

interface AdminDashboardData {
  jobPlans: JobPlan[];
  /** Planned job plans (excludes hold/major_hold); count = length so card matches list page */
  plannedJobPlans?: JobPlan[];
  /** In-progress job plans; count = length so card matches list page */
  inProgressJobPlans?: JobPlan[];
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  plannedJobs: number;
  totalSteps: number;
  completedSteps: number;
  activeUsers: number;
  activeUserIds: Set<string>;
  efficiency: number;
  stepCompletionStats: {
    [key: string]: {
      completed: number;
      inProgress: number;
      planned: number;
      // Add the actual data arrays
      completedData: JobPlan[];
      inProgressData: JobPlan[];
      plannedData: JobPlan[];
    };
  };
  machineUtilization: MachineUtilizationData;
  timeSeriesData: Array<{
    date: string;
    jobsStarted: number;
    jobsCompleted: number;
    totalSteps: number;
    completedSteps: number;
  }>;
  completedJobsData: CompletedJob[];
  heldJobs: number;
  heldJobsData: HeldJob[];
}

interface MachineDetails {
  id: string;
  machineCode: string;
  machineType: string;
  description: string;
  status: string;
  capacity: number;
  unit: string;
  totalQuantityProduced?: number;
  jobs: Array<{
    id?: number;
    jobPlanId?: number | null;
    jobPlanCode?: string | null;
    nrcJobNo: string;
    customerName: string | null;
    status: string | null;
    workedSteps?: Array<{
      jobStepId: number | null;
      stepName: string;
      stepStatus: string | null;
      quantityProduced: number;
      workedAt: string | null;
      startDate: string | null;
      endDate: string | null;
    }>;
  }>;
}

interface MachineUtilizationData {
  machineStats: Record<
    string,
    { total: number; available: number; inUse: number }
  >;
  machineDetails: MachineDetails[];
}

// Cache last fetched dashboard data so we don't refetch when returning from a card (e.g. Back to Dashboard)
function getDashboardCacheKey(
  filter: DateFilterType,
  customRange?: { start: string; end: string } | null
): string {
  if (filter === "custom" && customRange) {
    return `custom|${customRange.start}|${customRange.end}`;
  }
  return filter;
}
let dashboardDataCache: {
  data: AdminDashboardData;
  cacheKey: string;
  lastRefreshedAt: Date;
  dateFilter: DateFilterType;
  customDateRange: { start: string; end: string };
} | null = null;

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);

  const [userRecordLoading, setUserRecordLoading] = useState(false);
  const [userRecordError, setUserRecordError] = useState<string | null>(null);
  const [userRecordData, setUserRecordData] = useState<any | null>(null);
  const [userRecordSearch, setUserRecordSearch] = useState("");
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [selectedUserRecord, setSelectedUserRecord] = useState<any | null>(
    null
  );

  const getWorkedStepPlannedQty = (ws: any): number => {
    const q = ws?.quantities ?? {};
    const raw =
      q?.plannedQty ??
      q?.dispatchedQty ??
      q?.finishedGoodsQty ??
      q?.inProgress ??
      null;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : 0;
  };

  const computeUserQuantityProduced = (u: any): number => {
    const steps: any[] = u?.jobs?.flatMap((j: any) => j?.workedSteps ?? []) ?? [];
    const completed = steps.filter((ws: any) => ws?.stepStatus === "accept");
    return completed.reduce((sum: number, ws: any) => sum + getWorkedStepPlannedQty(ws), 0);
  };

  const toTitleWords = (value: string): string =>
    value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

  const formatUserRoleLabel = (roleValue: unknown): string => {
    if (!roleValue) return "N/A";

    const parseRoleItem = (item: unknown): string => {
      if (typeof item !== "string") return "";
      return toTitleWords(item.trim());
    };

    if (Array.isArray(roleValue)) {
      const labels = roleValue.map(parseRoleItem).filter(Boolean);
      return labels.length ? labels.join(", ") : "N/A";
    }

    if (typeof roleValue === "string") {
      const trimmed = roleValue.trim();
      if (!trimmed) return "N/A";

      // Roles are often sent as stringified arrays: ["punching_operator"]
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            const labels = parsed.map(parseRoleItem).filter(Boolean);
            return labels.length ? labels.join(", ") : "N/A";
          }
        } catch {
          // Fallback to plain text format below
        }
      }

      return toTitleWords(trimmed);
    }

    return "N/A";
  };

  const extractRoleKeys = (roleValue: unknown): string[] => {
    const normalize = (v: string) =>
      v.trim().toLowerCase().replace(/\s+/g, "_");

    if (!roleValue) return [];

    if (Array.isArray(roleValue)) {
      return roleValue
        .filter((r): r is string => typeof r === "string")
        .map(normalize)
        .filter(Boolean);
    }

    if (typeof roleValue === "string") {
      const trimmed = roleValue.trim();
      if (!trimmed) return [];
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .filter((r): r is string => typeof r === "string")
              .map(normalize)
              .filter(Boolean);
          }
        } catch {
          // fall through
        }
      }
      return [normalize(trimmed)];
    }

    return [];
  };

  const userIdSortValue = (userId: unknown): number => {
    const text = String(userId ?? "");
    const digits = text.replace(/\D+/g, "");
    const n = Number(digits);
    return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
  };

  const getRoleBadgeClass = (roleValue: unknown): string => {
    const roleKey = extractRoleKeys(roleValue)[0] ?? "";
    if (roleKey.includes("dispatch")) {
      return "bg-orange-50 text-orange-700 border border-orange-200";
    }
    if (roleKey.includes("qc") || roleKey.includes("quality")) {
      return "bg-violet-50 text-violet-700 border border-violet-200";
    }
    if (roleKey.includes("printing") || roleKey.includes("printer")) {
      return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    }
    if (roleKey.includes("corrugat") || roleKey.includes("flute")) {
      return "bg-teal-50 text-teal-700 border border-teal-200";
    }
    if (roleKey.includes("paper")) {
      return "bg-lime-50 text-lime-700 border border-lime-200";
    }
    if (roleKey.includes("punch")) {
      return "bg-rose-50 text-rose-700 border border-rose-200";
    }
    if (roleKey.includes("past")) {
      return "bg-amber-50 text-amber-700 border border-amber-200";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  // Check if returning from a detail page with filter state
  const returnedState = location.state as {
    dateFilter?: DateFilterType;
    customDateRange?: { start: string; end: string };
  } | null;

  // Prefer returned state from Back to Dashboard, then cached filter, then default
  const [dateFilter, setDateFilter] = useState<DateFilterType>(() =>
    returnedState?.dateFilter ?? dashboardDataCache?.dateFilter ?? "today"
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [pdaRefreshTrigger, setPdaRefreshTrigger] = useState<number | null>(
    null
  );
  const [majorHoldJobsCount, setMajorHoldJobsCount] = useState<number>(0);
  const [customDateRange, setCustomDateRange] = useState<{
    start: string;
    end: string;
  }>(() =>
    returnedState?.customDateRange ?? dashboardDataCache?.customDateRange ?? {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      end: new Date().toISOString().split("T")[0],
    }
  );
  // selectedJobPlan state removed as it's not used

  // Color scheme for charts
  const colors = {
    primary: "#00AEEF",
    secondary: "#10B981",
    accent: "#F59E0B",
    danger: "#EF4444",
    warning: "#F97316",
    info: "#3B82F6",
    success: "#22C55E",
    gray: "#6B7280",
  };

  // stepColors removed as it's not used

  // Handle Total Jobs card click
  // Handle Total Jobs card click
  const handleTotalJobsClick = () => {
    navigate("/dashboard/job-details", {
      state: {
        jobData: {
          totalJobs: filteredData?.totalJobs || 0,
          completedJobs: filteredData?.completedJobs || 0,
          inProgressJobs: filteredData?.inProgressJobs || 0,
          plannedJobs: filteredData?.plannedJobs || 0,
        },
        // Pass the filtered job plans and completed jobs data
        filteredJobPlans: filteredData?.jobPlans || [],
        filteredCompletedJobs: filteredData?.completedJobsData || [],
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Add this handler alongside your existing handlers
  const handleHeldJobsClick = () => {
    console.log("Held Jobs card clicked - navigating to held jobs view");
    console.log("Held jobs data from API:", filteredData?.heldJobsData);

    // Use the held jobs data from the new API
    const heldJobPlans = filteredData?.heldJobsData || [];

    navigate("/dashboard/held-jobs", {
      state: {
        heldJobs: heldJobPlans,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Navigate to Major Hold Jobs view (page fetches list from GET /api/job-planning/major-hold)
  const handleMajorHoldJobsClick = () => {
    navigate("/dashboard/major-hold-jobs", {
      state: {
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Handle Active Users card click
  const handleActiveUsersClick = () => {
    console.log("Active Users card clicked - opening users modal");
    setShowActiveUsersModal(true);
  };

  // Handle Completed Jobs card click
  const handleCompletedJobsClick = () => {
    console.log(
      "Completed Jobs card clicked - navigating to completed jobs view"
    );
    navigate("/dashboard/completed-jobs", {
      state: {
        completedJobs: filteredData?.completedJobsData || [],
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Handle In Progress Jobs card click - use same array as card count so numbers always match
  const handleInProgressJobsClick = () => {
    const list = filteredData?.inProgressJobPlans ?? [];
    navigate("/dashboard/in-progress-jobs", {
      state: {
        inProgressJobs: list,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Handle Planned Jobs card click - use same array as card count so numbers always match
  const handlePlannedJobsClick = () => {
    const list = filteredData?.plannedJobPlans ?? [];
    navigate("/dashboard/planned-jobs", {
      state: {
        plannedJobs: list,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Add this new function to fetch machine data
  // Add this function at the top level
  const fetchMachineUtilization = async (
    filterType?: DateFilterType,
    customRange?: { start: string; end: string }
  ): Promise<MachineUtilizationData> => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found.");
      }

      const baseUrl =
        import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
      const queryParams = new URLSearchParams();
      const effectiveFilter = filterType ?? dateFilter;
      const effectiveRange = customRange ?? customDateRange;
      if (effectiveFilter && effectiveFilter !== "custom") {
        queryParams.append("filter", effectiveFilter);
      } else if (effectiveRange?.start && effectiveRange?.end) {
        queryParams.append("filter", "custom");
        queryParams.append("startDate", effectiveRange.start);
        queryParams.append("endDate", effectiveRange.end);
      }

      const response = await fetch(
        `${baseUrl}/api/machines/record${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch machines: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data?.data?.machines)) {
        throw new Error("Invalid API response format");
      }

      // Process machines by type for stats
      const machineStats: Record<
        string,
        { total: number; available: number; inUse: number }
      > = {};

      // Store individual machine details
      const machineDetails: MachineDetails[] = [];

      data.data.machines.forEach((machine: any) => {
        const machineType = machine.machineType ?? "Other";

        // Add to individual machine details
        machineDetails.push({
          id: machine.machineId ?? machine.id,
          machineCode: machine.machineCode,
          machineType: machine.machineType,
          description: machine.description,
          status: machine.status,
          capacity: machine.capacity ?? 1,
          unit: machine.unit,
          totalQuantityProduced: Number(machine.totalQuantityProduced ?? 0),
          jobs: machine.jobs || [],
        });

        // Initialize stats if not exists
        if (!machineStats[machineType]) {
          machineStats[machineType] = { total: 0, available: 0, inUse: 0 };
        }

        // Count totals
        machineStats[machineType].total++;

        // Count by status
        switch (machine.status.toLowerCase()) {
          case "available":
            machineStats[machineType].available++;
            break;
          case "busy":
          case "in_use":
          case "occupied":
            machineStats[machineType].inUse++;
            break;
          default:
            // For other statuses (maintenance, etc.), don't count as available or in use
            break;
        }
      });

      return {
        machineStats,
        machineDetails,
      };
    } catch (error) {
      console.error("Error fetching machine utilization:", error);
      return {
        machineStats: {},
        machineDetails: [],
      };
    }
  };

  const mergeStepCompletionStats = (stepStats: {
    [key: string]: {
      completed: number;
      inProgress: number;
      planned: number;
      completedData: JobPlan[];
      inProgressData: JobPlan[];
      plannedData: JobPlan[];
    };
  }) => {
    // Define mapping for duplicate steps
    const stepMappings = {
      Printing: ["Printing", "PrintingDetails"],
      "Flute Lamination": ["Flute Lamination", "FluteLaminateBoardConversion"],
      "Quality Control": ["Quality Control", "QualityDept"],
      "Flap Pasting": ["Flap Pasting", "SideFlapPasting"],
      "Paper Store": ["Paper Store", "PaperStore"],
      Dispatch: ["Dispatch", "DispatchProcess"],
    };

    const mergedStats: {
      [key: string]: {
        completed: number;
        inProgress: number;
        planned: number;
        completedData: JobPlan[];
        inProgressData: JobPlan[];
        plannedData: JobPlan[];
      };
    } = {};

    const processedKeys = new Set<string>();

    // Process each step in the original stats
    Object.keys(stepStats).forEach((stepName) => {
      if (processedKeys.has(stepName)) return;

      // Find if this step belongs to any mapping group
      let masterKey = stepName;
      let foundGroup = false;

      for (const [master, variants] of Object.entries(stepMappings)) {
        if (variants.includes(stepName)) {
          masterKey = master;
          foundGroup = true;
          break;
        }
      }

      // Initialize the master key if not exists
      if (!mergedStats[masterKey]) {
        mergedStats[masterKey] = {
          completed: 0,
          inProgress: 0,
          planned: 0,
          completedData: [],
          inProgressData: [],
          plannedData: [],
        };
      }

      if (foundGroup) {
        // Aggregate all variants of this step
        const variants = stepMappings[masterKey as keyof typeof stepMappings];
        variants.forEach((variant) => {
          if (stepStats[variant]) {
            mergedStats[masterKey].completed += stepStats[variant].completed;
            mergedStats[masterKey].inProgress += stepStats[variant].inProgress;
            mergedStats[masterKey].planned += stepStats[variant].planned;

            // Merge the data arrays
            mergedStats[masterKey].completedData.push(
              ...stepStats[variant].completedData
            );
            mergedStats[masterKey].inProgressData.push(
              ...stepStats[variant].inProgressData
            );
            mergedStats[masterKey].plannedData.push(
              ...stepStats[variant].plannedData
            );

            processedKeys.add(variant);
          }
        });
      } else {
        // Single step, just copy the data
        mergedStats[masterKey].completed += stepStats[stepName].completed;
        mergedStats[masterKey].inProgress += stepStats[stepName].inProgress;
        mergedStats[masterKey].planned += stepStats[stepName].planned;

        // Copy the data arrays
        mergedStats[masterKey].completedData.push(
          ...stepStats[stepName].completedData
        );
        mergedStats[masterKey].inProgressData.push(
          ...stepStats[stepName].inProgressData
        );
        mergedStats[masterKey].plannedData.push(
          ...stepStats[stepName].plannedData
        );

        processedKeys.add(stepName);
      }
    });

    return mergedStats;
  };

  // Fetch major hold count from API (same as Planner / Production / Printing dashboards)
  const fetchMajorHoldCount = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setMajorHoldJobsCount(0);
        return;
      }
      const baseUrl =
        import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
      const response = await fetch(
        `${baseUrl}/api/job-planning/major-hold/count`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) {
        setMajorHoldJobsCount(0);
        return;
      }
      const json = await response.json();
      setMajorHoldJobsCount(
        json.success && typeof json.count === "number" ? json.count : 0
      );
    } catch {
      setMajorHoldJobsCount(0);
    }
  };

  // Updated fetchDashboardData - make it async and await processJobPlanData
  const fetchDashboardData = async (
    filterType?: DateFilterType,
    customRange?: { start: string; end: string }
  ) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Build query parameters for date filtering
      const queryParams = new URLSearchParams();
      if (filterType && filterType !== "custom") {
        queryParams.append("filter", filterType);
      } else if (customRange) {
        queryParams.append("startDate", customRange.start);
        queryParams.append("endDate", customRange.end);
      }

      const baseUrl =
        import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
      const qp = queryParams.toString();
      const bundleUrl = `${baseUrl}/api/dashboard/role-bundle${
        qp ? `?${qp}` : ""
      }`;
      const userRecordUrl = `${baseUrl}/api/users/user-record${
        qp ? `?${qp}` : ""
      }`;

      setUserRecordLoading(true);
      setUserRecordError(null);

      // Dashboard bundle requires auth; user-record is public.
      // Start user-record fetch in background so it doesn't block dashboard rendering.
      const userRecordFetchPromise = (async () => {
        const resp = await fetch(userRecordUrl);
        if (!resp.ok) {
          throw new Error(
            `Failed to fetch user record: ${resp.status} ${resp.statusText}`
          );
        }
        return resp.json();
      })();

      const bundleResponse = await fetch(bundleUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!bundleResponse.ok) {
        throw new Error(
          `Failed to fetch dashboard bundle: ${bundleResponse.status}`
        );
      }

      const bundle = await bundleResponse.json();
      if (!bundle.success || !bundle.data?.jobPlanning) {
        throw new Error("Invalid dashboard bundle response");
      }

      const jobPlanningResult = bundle.data.jobPlanning;

      userRecordFetchPromise
        .then((userRecordJson: any) => {
          setUserRecordData(userRecordJson?.data ?? null);
        })
        .catch((e: any) => {
          setUserRecordError(
            e instanceof Error ? e.message : "Failed to fetch user record"
          );
          setUserRecordData(null);
        })
        .finally(() => {
          setUserRecordLoading(false);
        });

      let completedJobsData: CompletedJob[] = [];
      const completedJobsResult = bundle.data.completedJobs;
      if (
        completedJobsResult?.success &&
        Array.isArray(completedJobsResult.data)
      ) {
        completedJobsData = completedJobsResult.data;
      }

      let heldJobsData: HeldJob[] = [];
      const heldMachinesResult = bundle.data.heldMachines;
      if (
        heldMachinesResult?.success &&
        heldMachinesResult.data &&
        Array.isArray(heldMachinesResult.data.heldJobs)
      ) {
        heldJobsData = heldMachinesResult.data.heldJobs;
      }

      const majorHold = bundle.data.majorHoldCount;
      if (majorHold?.success && typeof majorHold.count === "number") {
        setMajorHoldJobsCount(majorHold.count);
      } else {
        setMajorHoldJobsCount(0);
      }

      if (jobPlanningResult.success && Array.isArray(jobPlanningResult.data)) {
        const jobPlans = jobPlanningResult.data;

        // Step details: one batched POST (same rows as per-step by-step-id APIs) instead of N HTTP calls
        const stepIndexList = jobPlans.flatMap((jp: JobPlan) =>
          jp.steps.map((s: JobPlanStep) => ({
            stepId: s.id,
            stepName: s.stepName,
          }))
        );
        const detailsByStepId = await fetchStepDetailsBatch(
          baseUrl,
          accessToken,
          stepIndexList
        );
        const jobPlansWithDetails = jobPlans.map((jobPlan: JobPlan) => ({
          ...jobPlan,
          steps: jobPlan.steps.map((step: JobPlanStep) => ({
            ...step,
            stepDetails: detailsByStepId[String(step.id)] ?? null,
          })),
        }));

        console.log("completedJobsData", completedJobsData);
        console.log("heldJobsData from API", heldJobsData);
        // Process the data to create dashboard statistics - AWAIT this call
        const processedData = await processJobPlanData(
          jobPlansWithDetails,
          completedJobsData,
          heldJobsData,
          filterType,
          customRange
        );

        setData(processedData);
        const filter = filterType ?? "today";
        const range = customRange ?? customDateRange;
        const cacheKey = getDashboardCacheKey(filter, range);
        const refreshedAt = new Date();
        dashboardDataCache = {
          data: processedData,
          cacheKey,
          lastRefreshedAt: refreshedAt,
          dateFilter: filter,
          customDateRange: range,
        };
        setLastRefreshedAt(refreshedAt);
        setPdaRefreshTrigger(Date.now());
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data"
      );
      console.error("Dashboard data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // When we restore dashboard UI from cache (Back navigation), the bundle isn't refetched.
  // In that case, we still want to load user-record data for the same date filter.
  const fetchUserRecordOnly = async (
    filterType: DateFilterType,
    customRange: { start: string; end: string }
  ) => {
    const queryParams = new URLSearchParams();
    if (filterType && filterType !== "custom") {
      queryParams.append("filter", filterType);
    } else {
      queryParams.append("startDate", customRange.start);
      queryParams.append("endDate", customRange.end);
    }

    const baseUrl =
      import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
    const qp = queryParams.toString();
    const userRecordUrl = `${baseUrl}/api/users/user-record${
      qp ? `?${qp}` : ""
    }`;

    setUserRecordLoading(true);
    setUserRecordError(null);

    try {
      const resp = await fetch(userRecordUrl);
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch user record: ${resp.status} ${resp.statusText}`
        );
      }
      const json = await resp.json();
      setUserRecordData(json?.data ?? null);
    } catch (e) {
      setUserRecordError(
        e instanceof Error ? e.message : "Failed to fetch user record"
      );
      setUserRecordData(null);
    } finally {
      setUserRecordLoading(false);
    }
  };

  // Helper function to get actual step status (prioritizes stepDetails over step.status)
  const getStepActualStatus = (
    step: JobPlanStep
  ): "completed" | "in_progress" | "hold" | "planned" => {
    // Check for major_hold and hold first (highest priority) - major_hold jobs must not count as in-progress
    if (
      step.stepDetails?.data?.status === "major_hold" ||
      step.stepDetails?.status === "major_hold" ||
      step.status === "major_hold"
    ) {
      return "hold";
    }
    if (
      step.stepDetails?.data?.status === "hold" ||
      step.stepDetails?.status === "hold"
    ) {
      return "hold";
    }

    // Special handling for PaperStore: Check paperStore.status first (direct property)
    if (step.stepName === "PaperStore") {
      const paperStore = (step as any).paperStore;
      if (paperStore?.status) {
        if (paperStore.status === "accept") {
          return "completed";
        }
        if (paperStore.status === "in_progress") {
          return "in_progress";
        }
        if (paperStore.status === "hold") {
          return "hold";
        }
      }
    }

    // Priority 1: Check stepDetails.data.status first (where the actual status is often stored)
    // A step is only "completed" when status is "stop" AND stepDetails.status is "accept"
    if (step.stepDetails?.data?.status) {
      if (step.stepDetails.data.status === "accept") {
        // Only mark as completed if step.status is also "stop"
        if (step.status === "stop") {
          return "completed";
        }
        // If stepDetails says "accept" but step.status is "start", treat as in progress
        if (step.status === "start") {
          return "in_progress";
        }
      }
      if (step.stepDetails.data.status === "in_progress") {
        return "in_progress";
      }
      if (step.stepDetails.data.status === "hold") {
        return "hold";
      }
    }

    // Priority 2: Check stepDetails.status if data.status is not available
    // A step is only "completed" when status is "stop" AND stepDetails.status is "accept"
    if (step.stepDetails?.status) {
      if (step.stepDetails.status === "accept") {
        // Only mark as completed if step.status is also "stop"
        if (step.status === "stop") {
          return "completed";
        }
        // If stepDetails says "accept" but step.status is "start", treat as in progress
        if (step.status === "start") {
          return "in_progress";
        }
      }
      if (step.stepDetails.status === "in_progress") {
        return "in_progress";
      }
      if (step.stepDetails.status === "hold") {
        return "hold";
      }
    }

    // Priority 3: Check step.status directly (for cases like "accept" or "in_progress")
    if ((step.status as any) === "accept") {
      return "completed";
    }
    if ((step.status as any) === "in_progress") {
      return "in_progress";
    }

    // Priority 4: Use step.status for legacy status values
    if (step.status === "stop") {
      return "completed";
    }
    if (step.status === "start") {
      return "in_progress";
    }

    // Default: planned (stepDetails exists but status is not set, or step.status is "planned")
    return "planned";
  };

  // Helper function to check if a job has major hold
  const isMajorHold = (job: JobPlan): boolean => {
    for (const step of job.steps || []) {
      // Check direct step status
      if (step.status === "major_hold") {
        return true;
      }

      // Check step-specific properties (paperStore, printingDetails, etc.)
      if (
        step.paperStore?.status === "major_hold" ||
        step.printingDetails?.status === "major_hold" ||
        step.corrugation?.status === "major_hold" ||
        step.flutelam?.status === "major_hold" ||
        step.fluteLaminateBoardConversion?.status === "major_hold" ||
        step.punching?.status === "major_hold" ||
        step.sideFlapPasting?.status === "major_hold" ||
        step.qualityDept?.status === "major_hold" ||
        step.dispatchProcess?.status === "major_hold"
      ) {
        return true;
      }

      // Check stepDetails.data.status for "major_hold"
      if (step.stepDetails?.data?.status === "major_hold") {
        return true;
      }
      // Also check stepDetails.status
      if (step.stepDetails?.status === "major_hold") {
        return true;
      }
      // Check for major hold remark
      if (
        step.stepDetails?.data?.majorHoldRemark ||
        (step.stepDetails?.data?.holdRemark &&
          /major/i.test(step.stepDetails.data.holdRemark))
      ) {
        return true;
      }
    }
    return false;
  };

  // Held job has major_hold if any step has status major_hold (exclude from held count so it matches Held Jobs list)
  const heldJobHasMajorHold = (heldJob: HeldJob): boolean =>
    heldJob.steps?.some(
      (step: HeldJobStep) =>
        (step as any).stepSpecificData?.status === "major_hold" ||
        (step as any).status === "major_hold"
    ) ?? false;

  // Updated processJobPlanData - fetch machines once, not in loop
  const processJobPlanData = async (
    jobPlans: JobPlan[],
    completedJobsData: CompletedJob[],
    heldJobsData: HeldJob[],
    filterType?: DateFilterType,
    customRange?: { start: string; end: string }
  ): Promise<AdminDashboardData> => {
    // Count completed jobs from the completed jobs API
    const completedJobsCount = completedJobsData.length;

    // Fetch machine data once at the beginning
    const machineStats = await fetchMachineUtilization(filterType, customRange);

    // Count jobs from job planning API (these are in progress or planned)
    const totalJobs = jobPlans.length;
    let inProgressJobs = 0;
    let plannedJobs = 0;
    // Exclude major-hold jobs from held count so dashboard count matches Held Jobs list (which also excludes major hold)
    const heldJobsDataExcludingMajorHold = heldJobsData.filter(
      (held) => !heldJobHasMajorHold(held)
    );
    let heldJobs = heldJobsDataExcludingMajorHold.length;

    console.log("Processing held jobs data:", heldJobsData);
    console.log("Total held jobs from API (excluding major hold):", heldJobs);
    let totalSteps = 0;
    let completedSteps = 0;
    const uniqueUsers = new Set<string>();

    const stepStats: {
      [key: string]: {
        completed: number;
        inProgress: number;
        planned: number;
        completedData: JobPlan[];
        inProgressData: JobPlan[];
        plannedData: JobPlan[];
      };
    } = {};

    const timeSeriesData: Array<{
      date: string;
      jobsStarted: number;
      jobsCompleted: number;
      totalSteps: number;
      completedSteps: number;
    }> = [];

    // Initialize step statistics
    const stepNames = [
      "PaperStore",
      "PrintingDetails",
      "Corrugation",
      "FluteLaminateBoardConversion",
      "Punching",
      "SideFlapPasting",
      "QualityDept",
      "DispatchProcess",
    ];

    // ✅ Helper function for step variants
    const isStepVariant = (
      stepCategory: string,
      actualStepName: string
    ): boolean => {
      const stepMappings: { [key: string]: string[] } = {
        PaperStore: ["PaperStore", "Paper Store"],
        PrintingDetails: ["PrintingDetails", "Printing"],
        Corrugation: ["Corrugation"],
        FluteLaminateBoardConversion: [
          "FluteLaminateBoardConversion",
          "Flute Lamination",
        ],
        Punching: ["Punching"],
        SideFlapPasting: ["SideFlapPasting", "Flap Pasting"],
        QualityDept: ["QualityDept", "Quality Control"],
        DispatchProcess: ["DispatchProcess", "Dispatch"],
      };

      return (
        stepMappings[stepCategory]?.includes(actualStepName) ||
        stepCategory === actualStepName
      );
    };

    stepNames.forEach((step) => {
      stepStats[step] = {
        completed: 0,
        inProgress: 0,
        planned: 0,
        completedData: [],
        inProgressData: [],
        plannedData: [],
      };
    });

    // Process each job plan
    jobPlans.forEach((jobPlan) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;
      const totalStepsInJob = jobPlan.steps.length;
      let completedStepsInJob = 0;

      totalSteps += totalStepsInJob;

      // ✅ FIXED: Process each step category separately
      stepNames.forEach((stepName) => {
        // Find the matching step for this category in this job
        const matchingStep = jobPlan.steps.find((step) =>
          isStepVariant(stepName, step.stepName)
        );

        if (matchingStep) {
          // Use helper function to get actual step status
          const stepStatus = getStepActualStatus(matchingStep);

          if (stepStatus === "hold") {
            jobOnHold = true;
            jobCompleted = false;
          } else if (stepStatus === "completed") {
            // This step is completed
            stepStats[stepName].completed++;
            stepStats[stepName].completedData.push(jobPlan);
            completedStepsInJob++;
            completedSteps++;
          } else if (stepStatus === "in_progress") {
            // This step is in progress
            stepStats[stepName].inProgress++;
            stepStats[stepName].inProgressData.push(jobPlan);
            jobInProgress = true;
            jobCompleted = false;
          } else {
            // This step is planned - exclude jobs that have any step in major_hold from planned list
            if (!isMajorHold(jobPlan)) {
              stepStats[stepName].planned++;
              stepStats[stepName].plannedData.push(jobPlan);
            }
            jobCompleted = false;
          }

          // Track unique users
          if (matchingStep.user) {
            uniqueUsers.add(matchingStep.user);
          }
        }
      });

      // ✅ SAFETY CHECK: Handle steps not in our predefined list
      jobPlan.steps.forEach((step) => {
        // Only process steps that are not already handled by the main logic
        const isHandled = stepNames.some((stepName) =>
          isStepVariant(stepName, step.stepName)
        );

        if (!isHandled) {
          // SAFETY CHECK: Ensure stepStats exists for this step name
          if (!stepStats[step.stepName]) {
            stepStats[step.stepName] = {
              completed: 0,
              inProgress: 0,
              planned: 0,
              completedData: [],
              inProgressData: [],
              plannedData: [],
            };
          }

          // Use helper function to get actual step status
          const stepStatus = getStepActualStatus(step);

          if (stepStatus === "hold") {
            jobOnHold = true;
            jobCompleted = false;
          } else if (stepStatus === "completed") {
            stepStats[step.stepName].completed++;
            stepStats[step.stepName].completedData.push(jobPlan);
          } else if (stepStatus === "in_progress") {
            stepStats[step.stepName].inProgress++;
            stepStats[step.stepName].inProgressData.push(jobPlan);
            jobInProgress = true;
            jobCompleted = false;
          } else {
            if (!isMajorHold(jobPlan)) {
              stepStats[step.stepName].planned++;
              stepStats[step.stepName].plannedData.push(jobPlan);
            }
            jobCompleted = false;
          }

          // Track unique users
          if (step.user) {
            uniqueUsers.add(step.user);
          }
        }
      });

      // Determine job status: held = regular hold only (from API or step status "hold"). Major hold count comes from API (majorHoldJobsCount).
      // Held count comes from heldJobsDataExcludingMajorHold only (not from this loop) so dashboard matches Held Jobs list.
      if (jobCompleted) {
        // This job is completed, but we're not counting it here since it comes from completed jobs API
      } else if (jobOnHold && !isMajorHold(jobPlan)) {
        // heldJobs already set from API filtered list; do not double-count here
      } else if (jobInProgress) {
        inProgressJobs++;
      } else {
        plannedJobs++;
      }

      // Add to time series data
      const jobDate = new Date(jobPlan.createdAt).toISOString().split("T")[0];
      const existingDateIndex = timeSeriesData.findIndex(
        (item) => item.date === jobDate
      );

      if (existingDateIndex >= 0) {
        timeSeriesData[existingDateIndex].totalSteps += totalStepsInJob;
        timeSeriesData[existingDateIndex].completedSteps += completedStepsInJob;
        if (jobInProgress) timeSeriesData[existingDateIndex].jobsStarted++;
      } else {
        timeSeriesData.push({
          date: jobDate,
          jobsStarted: jobInProgress ? 1 : 0,
          jobsCompleted: 0,
          totalSteps: totalStepsInJob,
          completedSteps: completedStepsInJob,
        });
      }
    });

    console.log("completed jobs", completedJobsData);

    // Process completed jobs data for time series
    completedJobsData.forEach((completedJob) => {
      // Count Dispatch completed from Completed Jobs API.
      // Completed jobs are removed from jobPlanning, so Dispatch completion
      // must also be sourced here to keep Step Completion Status accurate.
      const dispatchDetailsRow = Array.isArray(
        (completedJob as any).allStepDetails?.dispatchProcess
      )
        ? (completedJob as any).allStepDetails.dispatchProcess[0]
        : null;
      const hasDispatchInCompletedJob =
        (Array.isArray((completedJob as any).allSteps) &&
          (completedJob as any).allSteps.some((s: any) =>
            isStepVariant("DispatchProcess", String(s?.stepName ?? ""))
          )) ||
        !!dispatchDetailsRow;
      if (hasDispatchInCompletedJob) {
        stepStats.DispatchProcess.completed++;
        // Also add row data so StepDetailsPopup can render job cards under "Completed" tab.
        stepStats.DispatchProcess.completedData.push({
          jobPlanId: (completedJob as any).jobPlanId ?? (completedJob as any).id,
          jobPlanCode: (completedJob as any).jobPlanCode,
          nrcJobNo: (completedJob as any).nrcJobNo,
          jobDemand: ((completedJob as any).jobDemand ?? "medium") as
            | "low"
            | "medium"
            | "high",
          createdAt:
            (completedJob as any).createdAt ?? (completedJob as any).completedAt,
          updatedAt:
            (completedJob as any).updatedAt ?? (completedJob as any).completedAt,
          steps: (Array.isArray((completedJob as any).allSteps)
            ? (completedJob as any).allSteps
            : []
          ).map((s: any) => ({
            ...s,
            status:
              s?.status ??
              (s?.stepName === "DispatchProcess" && dispatchDetailsRow?.status === "accept"
                ? "stop"
                : "planned"),
            stepDetails:
              s?.stepName === "DispatchProcess" && dispatchDetailsRow
                ? { data: dispatchDetailsRow }
                : s?.stepDetails ?? null,
          })),
        } as JobPlan);
      }

      const completedAt = completedJob.completedAt;

      if (completedAt) {
        const completedDate = new Date(completedAt).toISOString().split("T")[0];
        const existingDateIndex = timeSeriesData.findIndex(
          (item) => item.date === completedDate
        );

        if (existingDateIndex >= 0) {
          timeSeriesData[existingDateIndex].jobsCompleted++;
        } else {
          timeSeriesData.push({
            date: completedDate,
            jobsStarted: 0,
            jobsCompleted: 1,
            totalSteps: 0,
            completedSteps: 0,
          });
        }
      } else {
        console.warn(
          `Job ${completedJob.id} has no completedAt date, skipping...`
        );
      }
    });

    // Sort time series data by date
    timeSeriesData.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate efficiency
    const efficiency =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const mergedStepStats = mergeStepCompletionStats(stepStats);

    return {
      jobPlans,
      totalJobs: totalJobs + completedJobsCount,
      completedJobs: completedJobsCount,
      inProgressJobs,
      plannedJobs,
      totalSteps,
      completedSteps,
      activeUsers: uniqueUsers.size,
      activeUserIds: uniqueUsers,
      efficiency,
      stepCompletionStats: mergedStepStats,
      machineUtilization: machineStats,
      timeSeriesData,
      completedJobsData: completedJobsData,
      heldJobs,
      heldJobsData: heldJobsDataExcludingMajorHold,
    };
  };

  // Handle filter changes
  const handleFilterChange = (
    newFilter: DateFilterType,
    customRange?: { start: string; end: string }
  ) => {
    fetchDashboardData(newFilter, customRange);
  };

  // On mount: restore from cache when available (e.g. Back from In Progress, Planned, Held, Completed, Total Jobs) to avoid refetch. Only fetch when there is no cache.
  useEffect(() => {
    if (dashboardDataCache) {
      setData(dashboardDataCache.data);
      setLastRefreshedAt(dashboardDataCache.lastRefreshedAt);
      setDateFilter(dashboardDataCache.dateFilter ?? "today");
      setCustomDateRange(
        dashboardDataCache.customDateRange ?? {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          end: new Date().toISOString().split("T")[0],
        }
      );
      setLoading(false);
      // Ensure user-record panel still loads when bundle is restored from cache.
      fetchUserRecordOnly(
        dashboardDataCache.dateFilter ?? "today",
        dashboardDataCache.customDateRange ?? customDateRange
      );
      return;
    }
    fetchDashboardData(dateFilter, customDateRange);
  }, []);

  // When restoring from session cache we don't refetch the bundle; refresh major-hold badge only
  useEffect(() => {
    if (dashboardDataCache) {
      fetchMajorHoldCount();
    }
  }, []);

  // Clear location state after it's been read to prevent stale data
  useEffect(() => {
    if (returnedState) {
      // Replace the current history entry without the state
      window.history.replaceState({}, document.title);
    }
  }, [returnedState]);

  // Data is now filtered at the API level, so we use the data directly
  // const filteredData = data;

  // Helper function to check if a date falls within the selected range
  // Helper function to check if a date falls within the selected range
  const isDateInRange = (
    date: string | Date,
    startDate: Date,
    endDate: Date
  ): boolean => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return checkDate >= start && checkDate <= end;
  };

  /** Local calendar YYYY-MM-DD (avoids UTC-only ISO date skew vs "today" filter). */
  const formatLocalDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  /** One row per calendar day in [start, end] for line chart. */
  const buildTimeSeriesForFilteredRange = (
    jobPlans: JobPlan[],
    completedJobs: CompletedJob[],
    rangeStart: Date,
    rangeEnd: Date
  ): Array<{
    date: string;
    jobsStarted: number;
    jobsCompleted: number;
    totalSteps: number;
    completedSteps: number;
  }> => {
    const start = new Date(rangeStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(rangeEnd);
    end.setHours(0, 0, 0, 0);

    const days: string[] = [];
    const cur = new Date(start);
    while (cur.getTime() <= end.getTime()) {
      days.push(formatLocalDateKey(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const map = new Map<
      string,
      {
        jobsStarted: number;
        jobsCompleted: number;
        totalSteps: number;
        completedSteps: number;
      }
    >();
    days.forEach((d) =>
      map.set(d, {
        jobsStarted: 0,
        jobsCompleted: 0,
        totalSteps: 0,
        completedSteps: 0,
      })
    );

    completedJobs.forEach((cj) => {
      if (!cj.completedAt) return;
      const key = formatLocalDateKey(new Date(cj.completedAt));
      const row = map.get(key);
      if (row) row.jobsCompleted++;
    });

    const getBucketDayForInProgressJob = (jobPlan: JobPlan): string | null => {
      const candidates: Date[] = [];
      jobPlan.steps.forEach((step) => {
        const raw =
          step.updatedAt ||
          (step.stepDetails && step.stepDetails.updatedAt) ||
          step.startDate ||
          step.endDate;
        if (!raw) return;
        const d = new Date(raw as string);
        if (isNaN(d.getTime())) return;
        if (isDateInRange(d, new Date(rangeStart), new Date(rangeEnd))) {
          candidates.push(d);
        }
      });
      const jobTs = (jobPlan as any).updatedAt ?? jobPlan.createdAt;
      if (jobTs) {
        const jd = new Date(jobTs);
        if (
          !isNaN(jd.getTime()) &&
          isDateInRange(jd, new Date(rangeStart), new Date(rangeEnd))
        ) {
          candidates.push(jd);
        }
      }
      if (candidates.length === 0) return null;
      const newest = candidates.reduce((a, b) =>
        a.getTime() > b.getTime() ? a : b
      );
      return formatLocalDateKey(newest);
    };

    jobPlans.forEach((jobPlan) => {
      let jobInProgress = false;
      let jobOnHold = false;
      let completedStepsInJob = 0;
      const totalStepsInJob = jobPlan.steps.length;

      jobPlan.steps.forEach((step) => {
        const st = getStepActualStatus(step);
        if (st === "hold") jobOnHold = true;
        else if (st === "completed") completedStepsInJob++;
        else if (st === "in_progress") jobInProgress = true;
      });

      if (!jobInProgress || jobOnHold) return;

      const bucketDay = getBucketDayForInProgressJob(jobPlan);
      if (!bucketDay || !map.has(bucketDay)) return;

      const row = map.get(bucketDay)!;
      row.jobsStarted++;
      row.totalSteps += totalStepsInJob;
      row.completedSteps += completedStepsInJob;
    });

    return days.map((date) => ({
      date,
      ...map.get(date)!,
    }));
  };

  // Calculate date range based on your filter options
  const getDateRange = (
    filter: DateFilterType,
    customRange?: { start: string; end: string }
  ) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = new Date(today);

    switch (filter) {
      case "today":
        startDate = new Date(today);
        endDate = new Date(today);
        break;
      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday);
        endDate = new Date(yesterday);
        break;
      }
      case "week":
        // This week (from Monday to Sunday)
        startDate = new Date(today);
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
        startDate.setDate(today.getDate() - daysToMonday);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case "month":
        // This month
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "quarter":
        // This quarter
        const currentQuarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
        endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
        break;
      case "year":
        // This year
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case "custom":
        if (customRange) {
          startDate = new Date(customRange.start);
          endDate = new Date(customRange.end);
        } else {
          // Fallback to today if no custom range
          startDate = new Date(today);
          endDate = new Date(today);
        }
        break;
      default:
        // Show all data
        return null;
    }

    return { startDate, endDate };
  };

  // Filter the data based on selected dates
  // 🔥 FIXED: Build plannedJobPlans/inProgressJobPlans so card count = list length (single source of truth)
  const filteredData = useMemo(() => {
    if (!data) return null;

    let filteredJobPlans: JobPlan[];
    let filteredCompletedJobsData: CompletedJob[];
    let filteredTimeSeriesData: typeof data.timeSeriesData;

    if (!dateFilter) {
      // No date filter: use all data (still recalc counts so they match list page logic)
      filteredJobPlans = data.jobPlans;
      filteredCompletedJobsData = data.completedJobsData;
      filteredTimeSeriesData = data.timeSeriesData;
    } else {
      const dateRange = getDateRange(dateFilter, customDateRange);
      if (!dateRange) {
        filteredJobPlans = data.jobPlans;
        filteredCompletedJobsData = data.completedJobsData;
        filteredTimeSeriesData = data.timeSeriesData;
      } else {
        const { startDate, endDate } = dateRange;
        console.log(
          "Filtering data from:",
          startDate.toDateString(),
          "to:",
          endDate.toDateString()
        );
        const getStepActivityDate = (step: any): Date | null => {
          const raw =
            step.updatedAt ||
            (step.stepDetails && step.stepDetails.updatedAt) ||
            step.startDate;
          if (!raw) return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        };
        filteredJobPlans = data.jobPlans.filter((jobPlan) => {
          const hasRecentStepActivity = jobPlan.steps.some((step) => {
            const stepUpdateDate = getStepActivityDate(step);
            if (!stepUpdateDate) return false;
            return isDateInRange(
              stepUpdateDate,
              new Date(startDate),
              new Date(endDate)
            );
          });
          if (!hasRecentStepActivity) {
            const jobTimestamp = (jobPlan as any).updatedAt ?? jobPlan.createdAt;
            if (!jobTimestamp) return false;
            const jobDate = new Date(jobTimestamp);
            return isDateInRange(jobDate, new Date(startDate), new Date(endDate));
          }
          return hasRecentStepActivity;
        });
        filteredCompletedJobsData = data.completedJobsData.filter(
          (completedJob) => {
            const completedAt = completedJob.completedAt;
            if (!completedAt) return false;
            return isDateInRange(
              completedAt,
              new Date(startDate),
              new Date(endDate)
            );
          }
        );
        // Rebuild series from filtered jobs — slicing pre-aggregated timeSeriesData left "today" empty
        // when jobs were created on earlier days but had activity today (cards/step chart still showed data).
        filteredTimeSeriesData = buildTimeSeriesForFilteredRange(
          filteredJobPlans,
          filteredCompletedJobsData,
          startDate,
          endDate
        );
      }
    }

    const totalJobs = filteredJobPlans.length;
    const completedJobs = filteredCompletedJobsData.length;
    const heldJobs = data.heldJobs;
    const plannedJobPlans: JobPlan[] = [];
    const inProgressJobPlans: JobPlan[] = [];
    let totalSteps = 0;
    let completedSteps = 0;
    const uniqueUsers = new Set<string>();

    filteredJobPlans.forEach((jobPlan) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;
      const totalStepsInJob = jobPlan.steps.length;
      let completedStepsInJob = 0;

      totalSteps += totalStepsInJob;

      jobPlan.steps.forEach((step) => {
        if (step.user) uniqueUsers.add(step.user);
        const stepStatus = getStepActualStatus(step);
        if (stepStatus === "hold") {
          jobOnHold = true;
          jobCompleted = false;
        } else if (stepStatus === "completed") {
          completedStepsInJob++;
          completedSteps++;
        } else if (stepStatus === "in_progress") {
          jobInProgress = true;
          jobCompleted = false;
        } else {
          jobCompleted = false;
        }
      });

      if (jobCompleted) {
        // completed jobs come from completed jobs API
      } else if (jobOnHold) {
        // don't count as in progress or planned
      } else if (jobInProgress) {
        inProgressJobPlans.push(jobPlan);
      } else {
        plannedJobPlans.push(jobPlan);
      }
    });

    const plannedJobs = plannedJobPlans.length;
    const inProgressJobs = inProgressJobPlans.length;

    // 🔥 RECALCULATE STEP STATS USING SAME LOGIC (if needed for step completion stats)
    const stepCompletionStats: Record<
      string,
      {
        completed: number;
        inProgress: number;
        planned: number;
        completedData: any[];
        inProgressData: any[];
        plannedData: any[];
      }
    > = {};

    // Initialize step stats using the same step names as processJobPlanData
    const stepNames = [
      "PaperStore",
      "PrintingDetails",
      "Corrugation",
      "FluteLaminateBoardConversion",
      "Punching",
      "SideFlapPasting",
      "QualityDept",
      "DispatchProcess",
    ];

    stepNames.forEach((stepName) => {
      stepCompletionStats[stepName] = {
        completed: 0,
        inProgress: 0,
        planned: 0,
        completedData: [],
        inProgressData: [],
        plannedData: [],
      };
    });

    // 🔥 HELPER FUNCTION: Same as processJobPlanData
    const isStepVariant = (
      stepCategory: string,
      actualStepName: string
    ): boolean => {
      const stepMappings: { [key: string]: string[] } = {
        PaperStore: ["PaperStore", "Paper Store"],
        PrintingDetails: ["PrintingDetails", "Printing"],
        Corrugation: ["Corrugation"],
        FluteLaminateBoardConversion: [
          "FluteLaminateBoardConversion",
          "Flute Lamination",
        ],
        Punching: ["Punching"],
        SideFlapPasting: ["SideFlapPasting", "Flap Pasting"],
        QualityDept: ["QualityDept", "Quality Control"],
        DispatchProcess: ["DispatchProcess", "Dispatch"],
      };

      return (
        stepMappings[stepCategory]?.includes(actualStepName) ||
        stepCategory === actualStepName
      );
    };

    // Process step completion stats using the same logic
    filteredJobPlans.forEach((jobPlan) => {
      stepNames.forEach((stepName) => {
        const matchingStep = jobPlan.steps.find((step) =>
          isStepVariant(stepName, step.stepName)
        );

        if (matchingStep) {
          const stepStatus = getStepActualStatus(matchingStep);

          if (stepStatus === "completed") {
            stepCompletionStats[stepName].completed++;
            stepCompletionStats[stepName].completedData.push(jobPlan);
          } else if (stepStatus === "in_progress") {
            stepCompletionStats[stepName].inProgress++;
            stepCompletionStats[stepName].inProgressData.push(jobPlan);
          } else {
            if (!isMajorHold(jobPlan)) {
              stepCompletionStats[stepName].planned++;
              stepCompletionStats[stepName].plannedData.push(jobPlan);
            }
          }
        }
      });

      // Handle steps not in predefined list (same as processJobPlanData)
      jobPlan.steps.forEach((step) => {
        const isHandled = stepNames.some((stepName) =>
          isStepVariant(stepName, step.stepName)
        );

        if (!isHandled) {
          if (!stepCompletionStats[step.stepName]) {
            stepCompletionStats[step.stepName] = {
              completed: 0,
              inProgress: 0,
              planned: 0,
              completedData: [],
              inProgressData: [],
              plannedData: [],
            };
          }

          const stepStatus = getStepActualStatus(step);

          if (stepStatus === "completed") {
            stepCompletionStats[step.stepName].completed++;
            stepCompletionStats[step.stepName].completedData.push(jobPlan);
          } else if (stepStatus === "in_progress") {
            stepCompletionStats[step.stepName].inProgress++;
            stepCompletionStats[step.stepName].inProgressData.push(jobPlan);
          } else {
            if (!isMajorHold(jobPlan)) {
              stepCompletionStats[step.stepName].planned++;
              stepCompletionStats[step.stepName].plannedData.push(jobPlan);
            }
          }
        }
      });
    });

    // Same fix for filtered view: completed jobs are not in jobPlanning,
    // so Dispatch completed must be sourced from filtered completed-jobs API data.
    filteredCompletedJobsData.forEach((completedJob: any) => {
      const dispatchDetailsRow = Array.isArray(
        completedJob?.allStepDetails?.dispatchProcess
      )
        ? completedJob.allStepDetails.dispatchProcess[0]
        : null;
      const hasDispatchInCompletedJob =
        (Array.isArray(completedJob?.allSteps) &&
          completedJob.allSteps.some((s: any) =>
            isStepVariant("DispatchProcess", String(s?.stepName ?? ""))
          )) ||
        !!dispatchDetailsRow;
      if (hasDispatchInCompletedJob) {
        stepCompletionStats.DispatchProcess.completed++;
        stepCompletionStats.DispatchProcess.completedData.push({
          jobPlanId: completedJob?.jobPlanId ?? completedJob?.id,
          jobPlanCode: completedJob?.jobPlanCode,
          nrcJobNo: completedJob?.nrcJobNo,
          jobDemand: (completedJob?.jobDemand ?? "medium") as
            | "low"
            | "medium"
            | "high",
          createdAt: completedJob?.createdAt ?? completedJob?.completedAt,
          updatedAt: completedJob?.updatedAt ?? completedJob?.completedAt,
          steps: (Array.isArray(completedJob?.allSteps) ? completedJob.allSteps : []).map(
            (s: any) => ({
              ...s,
              status:
                s?.status ??
                (s?.stepName === "DispatchProcess" && dispatchDetailsRow?.status === "accept"
                  ? "stop"
                  : "planned"),
              stepDetails:
                s?.stepName === "DispatchProcess" && dispatchDetailsRow
                  ? { data: dispatchDetailsRow }
                  : s?.stepDetails ?? null,
            })
          ),
        });
      }
    });

    // Calculate efficiency
    const efficiency =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // Use your existing mergeStepCompletionStats function
    const mergedStepStats = mergeStepCompletionStats(stepCompletionStats);

    return {
      ...data,
      jobPlans: filteredJobPlans,
      plannedJobPlans,
      inProgressJobPlans,
      totalJobs: totalJobs + completedJobs,
      completedJobs,
      inProgressJobs,
      plannedJobs,
      totalSteps,
      completedSteps,
      activeUsers: uniqueUsers.size,
      activeUserIds: uniqueUsers,
      efficiency,
      stepCompletionStats: mergedStepStats,
      timeSeriesData: filteredTimeSeriesData,
      completedJobsData: filteredCompletedJobsData,
      heldJobs,
      heldJobsData: data.heldJobsData,
    };
  }, [data, dateFilter, customDateRange]);

  /**
   * Demand pie must match status logic: planned + in-progress + regular held (exclude major hold).
   * Key by jobPlanId (not nrcJobNo): the same NRC can have multiple job plans — deduping by NRC
   * collapsed cards (e.g. 30 plans → 21 rows) and broke the total vs KPI cards.
   */
  const jobDemandDistributionData = useMemo(() => {
    if (!filteredData) return [];

    const planned = filteredData.plannedJobPlans ?? [];
    const inProg = filteredData.inProgressJobPlans ?? [];
    const heldNonMajor = (filteredData.heldJobsData ?? []).filter(
      (h) => !heldJobHasMajorHold(h)
    );

    const byKey = new Map<string, "low" | "medium" | "high">();

    const addFromPlan = (jp: JobPlan) => {
      const d = jp.jobDemand;
      const norm: "low" | "medium" | "high" =
        d === "high" ? "high" : d === "low" ? "low" : "medium";
      byKey.set(`jp:${jp.jobPlanId}`, norm);
    };

    planned.forEach(addFromPlan);
    inProg.forEach(addFromPlan);

    heldNonMajor.forEach((h) => {
      const jpid = h.jobPlanningId;
      const nrc = h.jobDetails?.nrcJobNo;
      const key =
        jpid != null && jpid !== undefined
          ? `jp:${jpid}`
          : nrc
            ? `held-nrc:${nrc}`
            : null;
      if (!key || byKey.has(key)) return;

      const raw = String(h.jobDetails?.jobDemand ?? "medium").toLowerCase();
      let norm: "low" | "medium" | "high" = "medium";
      if (raw === "high" || raw === "urgent") norm = "high";
      else if (raw === "low") norm = "low";
      byKey.set(key, norm);
    });

    let low = 0;
    let medium = 0;
    let high = 0;
    byKey.forEach((v) => {
      if (v === "high") high++;
      else if (v === "low") low++;
      else medium++;
    });

    return [
      {
        name: "Regular",
        value: medium + low,
        color: colors.warning,
      },
      {
        name: "Urgent",
        value: high,
        color: colors.danger,
      },
    ];
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen ">
        <LoadingSpinner size="lg" variant="inline" />
        <p className="ml-4 text-lg text-gray-600">Loading admin dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
        <button
          onClick={() => fetchDashboardData()}
          className="mt-4 bg-[#00AEEF] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#0099cc] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!filteredData) {
    return <div>No data available</div>;
  }
  console.log("filtered", filteredData);

  return (
    <div className="p-4 sm:p-6 lg:p-8  min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            {/* Major Hold Jobs Quick Access */}
            <button
              type="button"
              onClick={handleMajorHoldJobsClick}
              title="View major hold jobs"
              className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00AEEF]"
            >
              <AlertTriangle
                className={`text-red-500 ${
                  majorHoldJobsCount > 0 ? "animate-pulse" : ""
                }`}
                size={20}
              />
              {majorHoldJobsCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {majorHoldJobsCount}
                </span>
              )}
            </button>

            <Calendar className="text-gray-500" size={20} />
            <span className="text-sm text-gray-600">
              Last updated:{" "}
              {lastRefreshedAt
                ? lastRefreshedAt.toLocaleString()
                : "—"}
            </span>
          </div>
        </div>

        {/* Date Filter and Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DateFilterComponent
            dateFilter={dateFilter}
            setDateFilter={(filter) => {
              setDateFilter(filter);
              handleFilterChange(filter);
            }}
            customDateRange={customDateRange}
            setCustomDateRange={(range) => {
              setCustomDateRange(range);
              handleFilterChange("custom", range);
            }}
          />
          <button
            type="button"
            onClick={() => fetchDashboardData(dateFilter, customDateRange)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#00AEEF] text-white font-medium hover:bg-[#0099cc] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00AEEF] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        </div>
      </div>

      {/* PDA Announcements */}

      {/* Statistics Grid */}
      <StatisticsGrid
        totalJobs={
          (filteredData?.plannedJobs || 0) +
          (filteredData?.inProgressJobs || 0) +
          (filteredData?.completedJobs || 0) +
          (filteredData?.heldJobs || 0)
        }
        completedJobs={filteredData?.completedJobs || 0}
        inProgressJobs={filteredData?.inProgressJobs || 0}
        plannedJobs={filteredData?.plannedJobs || 0}
        // totalSteps={filteredData.totalSteps}
        // completedSteps={filteredData.completedSteps}
        activeUsers={filteredData?.activeUsers || 0}
        // efficiency={filteredData?.efficiency || 0}
        heldJobs={(() => {
          console.log(
            "Held jobs count for StatisticsGrid:",
            filteredData?.heldJobs
          );
          console.log("Held jobs data array:", filteredData?.heldJobsData);
          return filteredData?.heldJobs || 0;
        })()}
        className="mb-8"
        // Make Total Job Cards a pure summary (not clickable)
        onTotalJobsClick={undefined}
        onCompletedJobsClick={handleCompletedJobsClick}
        onInProgressJobsClick={handleInProgressJobsClick}
        onActiveUsersClick={handleActiveUsersClick}
        onPlannedJobsClick={handlePlannedJobsClick}
        onHeldJobsClick={handleHeldJobsClick}
      />

      {/* Completed Jobs Summary Table - Moved here below statistics grid */}
      {filteredData.completedJobsData &&
        filteredData.completedJobsData.length > 0 && (
          <CompletedJobsTable
            data={filteredData.completedJobsData}
            className="mb-8"
          />
        )}

      {/* Production Summary Cards - Commented out for now
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {(() => {
          // Calculate total quantities from step details
          let totalQuantity = 0;
          let totalWastage = 0;
          let totalRejected = 0;
          let totalDispatched = 0;

          filteredData.jobPlans.forEach(jobPlan => {
            jobPlan.steps.forEach(step => {
              if (step.stepDetails) {
                const details = step.stepDetails;
                
                // Sum quantities from different step types
                if (details.quantity) {
                  totalQuantity += details.quantity;
                }
                
                // Sum wastage
                if (details.wastage) {
                  totalWastage += details.wastage;
                }
                
                // Sum rejected quantities (from QualityDept)
                if (details.rejectedQty) {
                  totalRejected += details.rejectedQty;
                }
                
                // Sum dispatched quantities (from DispatchProcess)
                if (details.quantity && step.stepName === 'DispatchProcess') {
                  totalDispatched += details.quantity;
                }
              }
            });
          });

          return [
            {
              title: 'Total Production Qty',
              value: totalQuantity.toLocaleString(),
              icon: '📦',
              color: 'bg-blue-100 text-blue-800 border-blue-300'
            },
            {
              title: 'Total Wastage',
              value: totalWastage.toLocaleString(),
              icon: '🗑️',
              color: 'bg-red-100 text-red-800 border-red-300'
            },
            {
              title: 'Total Rejected',
              value: totalRejected.toLocaleString(),
              icon: '❌',
              color: 'bg-orange-100 text-orange-800 border-orange-300'
            },
            {
              title: 'Total Dispatched',
              value: totalDispatched.toLocaleString(),
              icon: '🚚',
              color: 'bg-green-100 text-green-800 border-green-300'
            }
          ];
        })().map((card, index) => (
          <div key={index} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${card.color}`}>
            <div className="flex items-center">
              <div className="text-3xl mr-4">{card.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      */}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Job Progress Over Time */}
        <LineChartComponent
          data={filteredData.timeSeriesData}
          dataKeys={[
            { key: "jobsStarted", color: colors.warning, name: "Jobs Started" },
            {
              key: "jobsCompleted",
              color: colors.success,
              name: "Jobs Completed",
            },
          ]}
          xAxisKey="date"
          title="Job Progress Over Time"
          height={300}
          maxDataPoints={2000}
          showArea={true}
        />

        {/* Step Completion Status */}
        <BarChartComponent
          data={Object.entries(filteredData.stepCompletionStats)
            .filter(
              ([step]) =>
                !(
                  step === "Paper Store" &&
                  filteredData.stepCompletionStats["PaperStore"]
                )
            )
            .map(([step, stats]) => ({
              step,
              completed: stats.completed,
              inProgress: stats.inProgress,
              planned: stats.planned,
            }))}
          dataKeys={[
            { key: "completed", color: colors.success, name: "Completed" },
            { key: "inProgress", color: colors.warning, name: "In Progress" },
            { key: "planned", color: colors.gray, name: "Planned" },
          ]}
          xAxisKey="step"
          title="Step Completion Status"
          height={300}
          maxDataPoints={500}
          stacked={true}
          stepCompletionStats={filteredData.stepCompletionStats} // Add this line
        />
      </div>
      {/* <DateFilterComponent
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customDateRange={customDateRange}
        setCustomDateRange={setCustomDateRange}
        className="mb-4"
      /> */}
      {/* Machine Utilization - commented out for now */}
      {/* <BarChartComponent
  data={Object.entries(filteredData.machineUtilization).map(
    ([machine, stats]) => ({
      machine,
      available: stats.available,
      inUse: stats.inUse,
     
    })
  )}
  dataKeys={[
    { key: "available", color: colors.success, name: "Available" },
    { key: "inUse", color: colors.warning, name: "In Use" },
  ]}
  xAxisKey="machine"
  title="Machine Utilization"
  height={300}
  maxDataPoints={300}
  className="mb-8"
  showDateFilter={true}
/> */}
      <MachineUtilizationDashboard
        machineData={filteredData.machineUtilization}
        className="mb-8"
      />

      {/* Step-wise Progress Chart */}
      {/* <LineChartComponent
        data={filteredData.timeSeriesData}
        dataKeys={[
          { key: 'totalSteps', color: colors.primary, name: 'Total Steps' },
          { key: 'completedSteps', color: colors.success, name: 'Completed Steps' }
        ]}
        xAxisKey="date"
        title="Step-wise Progress"
        height={400}
        maxDataPoints={3000}
        showArea={true}
        className="mb-8"
      /> */}

      {/* Advanced Data Visualization for Large Datasets */}
      {/* <AdvancedDataChart
        data={filteredData.jobPlans.flatMap(jobPlan => 
          jobPlan.steps.map(step => ({
            date: step.startDate || step.createdAt,
            stepName: step.stepName,
            status: step.status,
            user: step.user,
            machineType: step.machineDetails?.[0]?.machineType || 'Not assigned',
            stepId: step.id,
            jobNo: jobPlan.nrcJobNo,
            demand: jobPlan.jobDemand
          }))
        )}
        dataKeys={[
          { key: 'stepId', color: colors.primary, name: 'Step ID' },
          { key: 'status', color: colors.secondary, name: 'Status' },
          { key: 'demand', color: colors.accent, name: 'Demand Level' }
        ]}
        xAxisKey="date"
        title="Advanced Step Analysis (Large Dataset Capable)"
        chartType="line"
        height={450}
        maxDataPoints={5000}
        enableVirtualization={true}
        enableFiltering={true}
        enableSearch={true}
        className="mb-8"
      /> */}

      {/* {console.log(filteredData.stepCompletionStats)} */}

      {/* Detailed Step Information */}
      {/* <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Detailed Step Information
        </h3>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {Object.entries(filteredData.stepCompletionStats)
    .map(([stepName, stats]) => {
      const stepJobs = filteredData.jobPlans.filter((jobPlan) =>
        jobPlan.steps.some(
          (step) => step.stepName === stepName && step.stepDetails
        )
      );

      return (
        <div
          key={stepName}
          className="border border-gray-200 rounded-lg p-4"
        >
          <h4 className="font-semibold text-gray-700 mb-3">
            {stepName}
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completed:</span>
              <span className="font-medium text-green-600">
                {stats.completed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">
                In Progress:
              </span>
              <span className="font-medium text-yellow-600">
                {stats.inProgress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Planned:</span>
              <span className="font-medium text-gray-600">
                {stats.planned}
              </span>
            </div>
            {stepJobs.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                  Recent Jobs with Details:
                </p>
                <div className="space-y-1">
                  {stepJobs.slice(0, 3).map((jobPlan) => {
                    const step = jobPlan.steps.find(
                      (s) => s.stepName === stepName
                    );
                    const details = step?.stepDetails;

                    if (!details) return null;

                    return (
                      <div
                        key={jobPlan.jobPlanId}
                        className="text-xs bg-gray-50 p-2 rounded"
                      >
                        <div className="font-medium text-gray-700">
                          {jobPlan.nrcJobNo}
                        </div>
                        <div className="text-gray-500">
                          {details.quantity &&
                            `Qty: ${details.quantity}`}
                          {details.operatorName &&
                            ` | Operator: ${details.operatorName}`}
                          {details.date &&
                            ` | Date: ${new Date(
                              details.date
                            ).toLocaleDateString()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    })}
</div>

      </div> */}

      {/* Job Plans Table */}
      <JobPlansTable
        jobPlans={filteredData.jobPlans}
        onViewDetails={(jobPlan: JobPlan) =>
          console.log("Viewing job plan:", jobPlan)
        }
        className="mb-8"
      />

      {/* Job Demand Distribution Pie Chart */}
      {/* Quality Check and Customer Insights Section */}
      {/* <div className="flex flex-col lg:flex-row gap-8 mb-8">

   <div className="flex-1">
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Quality Control Overview
      </h3>
    
     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">✅</div>
            <div>
              <p className="text-sm font-medium text-green-700">Accepted</p>
              <p className="text-xl font-bold text-green-800">230</p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">❌</div>
            <div>
              <p className="text-sm font-medium text-red-700">Rejected</p>
              <p className="text-xl font-bold text-red-800">20</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📊</div>
            <div>
              <p className="text-sm font-medium text-blue-700">Success Rate</p>
              <p className="text-xl font-bold text-blue-800">92%</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-700 mb-3">
          Rejection Reasons
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Damaged Packaging</span>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">8</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Print Smudges</span>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">5</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Wrong Dimensions</span>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">7</span>
          </div>
        </div>
      </div>
    </div>
  </div>


 <div className="flex-1">
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 h-full">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Customer Insights
      </h3>
      

      <div className="space-y-4 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🔄</div>
            <div>
              <p className="text-sm font-medium text-purple-700">Retention Rate</p>
              <p className="text-xl font-bold text-purple-800">85%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">👥</div>
            <div>
              <p className="text-sm font-medium text-indigo-700">New Customers</p>
              <p className="text-xl font-bold text-indigo-800">23</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-semibold text-gray-700 mb-3">
          Top Customer Segments
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">🍭 Sweets Shops</span>
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{width: '40%'}}></div>
              </div>
              <span className="text-xs text-gray-600 font-medium">40%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">👕 Clothing Retailers</span>
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div className="bg-green-500 h-2 rounded-full" style={{width: '35%'}}></div>
              </div>
              <span className="text-xs text-gray-600 font-medium">35%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">📱 Electronics Stores</span>
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{width: '15%'}}></div>
              </div>
              <span className="text-xs text-gray-600 font-medium">15%</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">🪑 Furniture Shops</span>
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{width: '10%'}}></div>
              </div>
              <span className="text-xs text-gray-600 font-medium">10%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div> */}

      {/* Job Demand Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <PieChartComponent
          data={jobDemandDistributionData}
          title="Job Demand Distribution"
          height={300}
          maxDataPoints={50}
          showPercentage={true}
          showValues={true}
          centerNote="Excluding major hold and completed jobs"
        />

        <PieChartComponent
          data={[
            {
              name: "Completed",
              value: filteredData.completedJobs,
              color: colors.success,
            },
            {
              name: "In Progress",
              value: filteredData.inProgressJobs,
              color: colors.warning,
            },
            {
              name: "Planned",
              value: filteredData.plannedJobs,
              color: colors.gray,
            },
          ]}
          title="Job Status Distribution"
          height={300}
          maxDataPoints={50}
          showPercentage={true}
          showValues={true}
        />
      </div>

      {/* User Work Records */}
      <div className="mb-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-green-50">
            <h3 className="text-lg font-semibold text-gray-800 tracking-tight">
              User Work Records
            </h3>

            <div className="flex items-center gap-3 lg:ml-auto">
              <input
                type="text"
                value={userRecordSearch}
                onChange={(e) => setUserRecordSearch(e.target.value)}
                placeholder="Search by name, role, or user ID..."
                className="w-full lg:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
              />
              {userRecordData?.period?.startDate && userRecordData?.period?.endDate ? (
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                  {userRecordData.period.startDate} to {userRecordData.period.endDate}
                </span>
              ) : null}
            </div>
          </div>

          <div className="px-5 py-4">
          {userRecordLoading ? (
            <div className="flex items-center text-sm text-gray-600">
              <LoadingSpinner size="sm" variant="inline" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : null}

            {userRecordError ? (
              <p className="text-sm text-red-600 mb-3">{userRecordError}</p>
            ) : null}

            {(() => {
              const blockedRoles = new Set([
                "admin",
                "planner",
                "printing_manager",
                "production_head",
              ]);
              const usersForTable = (userRecordData?.users ?? [])
                .filter((u: any) => {
                  const roles = extractRoleKeys(u?.role);
                  return !roles.some((r) => blockedRoles.has(r));
                })
                .filter((u: any) => {
                  const q = userRecordSearch.trim().toLowerCase();
                  if (!q) return true;
                  const name = String(u?.userName ?? "").toLowerCase();
                  const userId = String(u?.userId ?? "").toLowerCase();
                  const roleLabel = formatUserRoleLabel(u?.role).toLowerCase();
                  return (
                    name.includes(q) ||
                    userId.includes(q) ||
                    roleLabel.includes(q)
                  );
                })
                .sort((a: any, b: any) => {
                  const av = userIdSortValue(a?.userId);
                  const bv = userIdSortValue(b?.userId);
                  if (av !== bv) return av - bv;
                  return String(a?.userId ?? "").localeCompare(
                    String(b?.userId ?? "")
                  );
                });

              if (!usersForTable.length) {
                return (
                  <p className="text-sm text-gray-600">
                    No user work records found for this filter.
                  </p>
                );
              }

              return (
              <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-xl border border-slate-200 shadow-sm">
                <table className="min-w-full text-sm table-fixed">
                  <thead className="bg-gradient-to-r from-slate-100 to-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-[28%] text-left px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        User
                      </th>
                      <th className="w-[24%] text-left px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        Role
                      </th>
                      <th className="w-[10%] text-right px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        Jobs
                      </th>
                      <th className="w-[14%] text-right px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        Produced
                      </th>
                      <th className="w-[12%] text-right px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        Steps Done
                      </th>
                      <th className="w-[12%] text-right px-4 py-3 font-semibold text-slate-600 tracking-wider uppercase text-[11px]">
                        In Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersForTable.map((u: any, idx: number) => (
                      <tr
                        key={u.userId}
                        className={`cursor-pointer transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        } hover:bg-sky-50`}
                        onClick={() => {
                          setSelectedUserRecord(u);
                          setShowUserDetailsModal(true);
                        }}
                      >
                        <td className="px-4 py-3 align-middle">
                          <p className="font-medium text-gray-800">
                            {u.userName ?? u.userId}
                          </p>
                          <p className="text-xs text-gray-500">{u.userId}</p>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(
                              u.role
                            )}`}
                          >
                            {formatUserRoleLabel(u.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {u.workSummary?.totalJobsWorkedOn ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {computeUserQuantityProduced(u).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {u.workSummary?.totalStepsCompleted ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-amber-700">
                          {u.workSummary?.inProgress?.totalStepsInProgress ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <PDAAnnouncements
          dateFilter={dateFilter}
          customDateRange={customDateRange}
          refreshTrigger={pdaRefreshTrigger}
        />
      </div>

      {/* User Details Modal */}
      {showUserDetailsModal && selectedUserRecord ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[88vh] overflow-hidden border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-slate-50 to-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedUserRecord.userName ?? selectedUserRecord.userId}
                </h3>
                <p className="text-sm text-gray-600">
                  Role: {formatUserRoleLabel(selectedUserRecord.role)}
                </p>
              </div>
              <button
                type="button"
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-800"
                onClick={() => {
                  setShowUserDetailsModal(false);
                  setSelectedUserRecord(null);
                }}
              >
                Close
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(88vh-72px)] bg-slate-50/40">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-xs text-gray-500">Jobs Worked On</p>
                  <p className="text-base font-semibold text-gray-800">
                    {selectedUserRecord.workSummary?.totalJobsWorkedOn ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="text-xs text-gray-500">Quantity Produced</p>
                  <p className="text-base font-semibold text-emerald-800">
                    {computeUserQuantityProduced(selectedUserRecord).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <p className="text-xs text-gray-500">Steps Completed</p>
                  <p className="text-base font-semibold text-gray-800">
                    {selectedUserRecord.workSummary?.totalStepsCompleted ?? 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-gray-500">In Progress Steps</p>
                  <p className="text-base font-semibold text-amber-800">
                    {selectedUserRecord.workSummary?.inProgress?.totalStepsInProgress ?? 0}
                  </p>
                </div>
              </div>

              <h4 className="text-md font-semibold text-gray-700 mb-3">
                Jobs
              </h4>
              {selectedUserRecord.jobs?.length ? (
                <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                  {selectedUserRecord.jobs.slice(0, 30).map((j: any) => (
                    <div
                      key={j.jobPlanId ?? j.nrcJobNo}
                      className="border border-gray-200 rounded-xl p-3 bg-white shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {j.jobPlanCode ?? j.jobPlanId}
                          </p>
                          <p className="text-xs text-gray-600">
                            NRC Job No: {j.nrcJobNo}
                          </p>
                          <p className="text-xs text-gray-600">
                            Status: {j.jobStatus}
                            {j.customerName ? ` | ${j.customerName}` : ""}
                            {j.unit ? ` | ${j.unit}` : ""}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          Steps: {j.workedSteps?.length ?? 0}
                        </p>
                      </div>

                      {j.workedSteps?.length ? (
                        <div className="mt-3 space-y-2">
                          {j.workedSteps.slice(0, 20).map((ws: any) => (
                            <div
                              key={`${j.jobPlanId}-${ws.jobStepId}-${ws.stepName}`}
                              className="flex justify-between items-center text-sm bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2"
                            >
                              <span className="text-gray-800">
                                {ws.stepName}:
                                <span className="ml-2 font-medium text-gray-900">
                                  {ws.stepStatus}
                                </span>
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-3 flex-wrap justify-end">
                                <span>
                                  Machine:{" "}
                                  {ws?.machine?.machineCode ??
                                    ws?.machine?.machineId ??
                                    "N/A"}
                                </span>
                                    <span>
                                      Qty:{" "}
                                      {getWorkedStepPlannedQty(ws).toLocaleString()}
                                    </span>
                                <span>
                                  Start:{" "}
                                  {ws?.dates?.startDate
                                    ? new Date(ws.dates.startDate).toLocaleDateString()
                                    : "—"}
                                </span>
                                <span>
                                  End:{" "}
                                  {ws?.dates?.endDate
                                    ? new Date(ws.dates.endDate).toLocaleDateString()
                                    : "—"}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600 mt-2">
                          No worked steps for this job in the selected period.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No jobs found for this user in the selected period.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Active Users Modal */}
      <ActiveUsersModal
        isOpen={showActiveUsersModal}
        onClose={() => setShowActiveUsersModal(false)}
        activeUserIds={filteredData?.activeUserIds || new Set()}
      />
    </div>
  );
};

export default AdminDashboard;
