import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CogIcon,
  UserGroupIcon,
  TruckIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  FunnelIcon,
  PrinterIcon,
  CalendarDaysIcon,
  UserIcon,
  CurrencyRupeeIcon,
} from "@heroicons/react/24/outline";
import { productionService } from "./productionService";
import type {
  ProductionData,
  ProductionStep,
  AggregatedProductionData,
  JobPlan,
} from "./productionService";
import LoadingSpinner from "../../common/LoadingSpinner";
import ProductionDetailModal from "./ProductionDetailModal";
import { useUsers } from "../../../context/UsersContext";
import StatisticsGrid from "../Admin/StatisticsCards/StatisticsGrid";
import DateFilterComponent, {
  type DateFilterType,
} from "../Admin/FilterComponents/DateFilterComponent";
import { printingService } from "../Admin/PrintingManager/printingService";
import type { PrintingDetails } from "../Admin/PrintingManager/printingService";
import { fetchStepDetailsBatch } from "../../../utils/dashboardStepDetailsBatch";

// Interface for JobPlanStep (matching AdminDashboard structure)
interface JobPlanStep {
  id: number;
  stepNo: number;
  stepName: string;
  status: "planned" | "start" | "stop" | "accept" | "major_hold";
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  stepDetails?: {
    data?: {
      status?: string;
      [key: string]: any;
    };
    status?: string;
    [key: string]: any;
  } | null;
  paperStore?: { id?: number; status?: string; [key: string]: any };
  [key: string]: any;
}

// Interface for JobPlan (matching AdminDashboard structure)
interface JobPlanForStats {
  jobPlanId: number;
  nrcJobNo: string;
  steps: JobPlanStep[];
  [key: string]: any;
}

// Interface for CompletedJob
interface CompletedJob {
  id: number;
  nrcJobNo: string;
  completedAt: string;
  [key: string]: any;
}

/** Row shape for “Completed Jobs Summary” (revenue table). */
interface CompletedJobSummaryRow {
  id: number;
  nrcJobNo: string;
  recordDateIso: string;
  recordDateDisplay: string;
  customerName: string;
  unitLabel: string;
  dispatchDateIso: string | null;
  dispatchDateDisplay: string;
  dispatchQty: number;
  totalValue: number;
}

function formatDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatInr(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/**
 * Production **unit** = machine unit from job-plan steps (NR1, delhi, Mk…), same as Admin
 * `CompletedJobsTable` — NOT purchase order `unit` (often numeric codes like 2100).
 */
function extractUnitFromCompletedJobAllSteps(allSteps: unknown): string {
  if (!Array.isArray(allSteps)) return "N/A";
  const steps = allSteps as Array<{
    stepName?: string;
    machineDetails?: Array<{ unit?: string | null }>;
  }>;
  const dispatchStep = steps.find(
    (s) => s.stepName === "DispatchProcess" || s.stepName === "Dispatch",
  );
  const u0 = dispatchStep?.machineDetails?.[0]?.unit;
  if (u0 != null && String(u0).trim() !== "") return String(u0).trim();
  for (const step of steps) {
    const u = step?.machineDetails?.[0]?.unit;
    if (u != null && String(u).trim() !== "") return String(u).trim();
  }
  return "N/A";
}

function extractCompletedJobSummaryRow(
  cj: CompletedJob,
): CompletedJobSummaryRow {
  const jd = (cj as any).jobDetails ?? {};
  const po = (cj as any).purchaseOrderDetails;
  const asd = (cj as any).allStepDetails;
  const dps = Array.isArray(asd?.dispatchProcess) ? asd.dispatchProcess : [];
  const allSteps = (cj as any).allSteps;

  const dispatchStepFromPlan = Array.isArray(allSteps)
    ? (allSteps as { stepName?: string; dispatchProcess?: any }[]).find(
        (s) => s.stepName === "DispatchProcess" || s.stepName === "Dispatch",
      )
    : undefined;

  /** Match Admin CompletedJobsTable: qty from dispatch step’s process */
  let dispatchQty = Number(
    dispatchStepFromPlan?.dispatchProcess?.totalDispatchedQty ??
      dispatchStepFromPlan?.dispatchProcess?.quantity ??
      0,
  );

  let bestTs = 0;
  let dispatchDateIso: string | null = null;

  const dpFromStep = dispatchStepFromPlan?.dispatchProcess;
  if (dpFromStep) {
    const raw = dpFromStep.dispatchDate ?? dpFromStep.date;
    if (raw) {
      dispatchDateIso =
        typeof raw === "string" ? raw : new Date(raw).toISOString();
    }
  }

  for (const dp of dps) {
    const raw = dp?.dispatchDate ?? dp?.date;
    if (raw) {
      const t = new Date(raw).getTime();
      if (!isNaN(t) && t >= bestTs) {
        bestTs = t;
        if (!dispatchDateIso) {
          dispatchDateIso =
            typeof raw === "string" ? raw : new Date(raw).toISOString();
        }
      }
    }
    if (!dispatchQty) {
      const q = Number(dp?.quantity ?? dp?.totalDispatchedQty ?? 0);
      if (q > dispatchQty) dispatchQty = q;
    }
  }

  if (!dispatchQty) {
    dispatchQty =
      Number(po?.dispatchQuantity ?? 0) ||
      dps.reduce(
        (s: number, dp: any) =>
          s + (Number(dp?.quantity) || Number(dp?.totalDispatchedQty) || 0),
        0,
      );
  }

  /** Admin table uses PO delivery date for “Dispatch Date” column when showing schedule */
  if (!dispatchDateIso && po?.deliveryDate) {
    dispatchDateIso =
      typeof po.deliveryDate === "string"
        ? po.deliveryDate
        : new Date(po.deliveryDate).toISOString();
  }
  if (!dispatchDateIso && po?.dispatchDate) {
    dispatchDateIso =
      typeof po.dispatchDate === "string"
        ? po.dispatchDate
        : new Date(po.dispatchDate).toISOString();
  }

  const rate = Number(jd.latestRate ?? 0);
  const totalValue = rate > 0 && dispatchQty > 0 ? rate * dispatchQty : 0;

  const customerName =
    String(jd.customerName ?? po?.customer ?? "").trim() || "—";
  const unitLabel = extractUnitFromCompletedJobAllSteps(allSteps);

  const completedAt = cj.completedAt
    ? new Date(cj.completedAt).toISOString()
    : new Date().toISOString();

  return {
    id: cj.id,
    nrcJobNo: cj.nrcJobNo,
    recordDateIso: completedAt,
    recordDateDisplay: formatDdMmYyyy(completedAt),
    customerName,
    unitLabel,
    dispatchDateIso,
    dispatchDateDisplay: formatDdMmYyyy(dispatchDateIso),
    dispatchQty,
    totalValue,
  };
}

// Held job from held-machines API (match Admin)
interface HeldJobStep {
  stepNo: number;
  stepName: string;
  stepStatus?: string;
  stepSpecificData?: { status?: string };
  status?: string;
  [key: string]: any;
}
interface HeldJob {
  jobDetails?: { nrcJobNo: string; [key: string]: any };
  steps?: HeldJobStep[];
  [key: string]: any;
}

function getProductionDashboardCacheKey(
  filter: DateFilterType,
  customRange?: { start: string; end: string } | null,
): string {
  if (filter === "custom" && customRange) {
    return `custom|${customRange.start}|${customRange.end}`;
  }
  return filter;
}

/** Job-plan API may use "Flap Pasting" or "FlapPasting" instead of "SideFlapPasting" (same as Admin). */
function isFlapPastingStepName(name: string): boolean {
  return (
    name === "SideFlapPasting" ||
    name === "Flap Pasting" ||
    name === "FlapPasting"
  );
}

let productionDashboardCache: {
  jobPlansData: JobPlanForStats[];
  completedJobsData: CompletedJob[];
  heldJobsData: HeldJob[];
  dateFilter: DateFilterType;
  customDateRange: { start: string; end: string };
  cacheKey: string;
  aggregatedData?: AggregatedProductionData | null;
  printingDetails?: PrintingDetails[];
  majorHoldJobsCount?: number;
} | null = null;

const ProductionHeadDashboard: React.FC = () => {
  const { getUserName } = useUsers();
  const navigate = useNavigate();
  const location = useLocation();
  const restoredFromCacheRef = useRef(false);
  const returnedState = location.state as {
    dateFilter?: DateFilterType;
    customDateRange?: { start: string; end: string };
  } | null;
  const [aggregatedData, setAggregatedData] =
    useState<AggregatedProductionData | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [productionData, setProductionData] = useState<ProductionData>({
    corrugation: [],
    fluteLamination: [],
    punching: [],
    flapPasting: [],
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      nrcJobNo: string;
      jobDemand: string;
      totalSteps: number;
      hasProductionSteps: boolean;
    }>
  >([]);
  const [searchSuggestions, setSearchSuggestions] = useState<
    Array<{
      nrcJobNo: string;
      jobDemand: string;
      totalSteps: number;
      hasProductionSteps: boolean;
    }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAggregated, setIsLoadingAggregated] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "details" | "analytics"
  >("overview");
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<{
    isAuthenticated: boolean;
    message: string;
  } | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<JobPlan | null>(
    null,
  );
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [modalJobData, setModalJobData] = useState<
    Array<{ jobPlan: JobPlan; step: ProductionStep }>
  >([]);
  const [modalTitle, setModalTitle] = useState("");
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);

  // Job Steps Modal state
  const [isJobStepsModalOpen, setIsJobStepsModalOpen] = useState(false);
  const [selectedJobPlanForModal, setSelectedJobPlanForModal] =
    useState<JobPlanForStats | null>(null);

  // Job Cards Overview filters
  const [jobCardsSearchTerm, setJobCardsSearchTerm] = useState("");
  const [jobCardsDemandFilter, setJobCardsDemandFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [jobCardsStatusFilter, setJobCardsStatusFilter] = useState<
    "all" | "completed" | "inProgress" | "majorHold" | "planned"
  >("all");

  // Job statistics state (kept for initial loading, but filteredJobStats is used for display)
  const [jobStats, setJobStats] = useState({
    totalJobs: 0,
    plannedJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
  });
  const [isLoadingJobStats, setIsLoadingJobStats] = useState(false);

  // Store job plans and completed jobs data for navigation
  const [jobPlansData, setJobPlansData] = useState<JobPlanForStats[]>([]);
  const [completedJobsData, setCompletedJobsData] = useState<CompletedJob[]>(
    [],
  );

  // Date filter state (from returned state, cache, or default "today")
  const [dateFilter, setDateFilter] = useState<DateFilterType>(
    () =>
      returnedState?.dateFilter ??
      productionDashboardCache?.dateFilter ??
      "today",
  );
  const [heldJobsData, setHeldJobsData] = useState<HeldJob[]>([]);

  // Printing Details state
  const [printingDetails, setPrintingDetails] = useState<PrintingDetails[]>([]);
  // Track steps that have already been continued to production (frontend-only flag)
  const [continuedSteps, setContinuedSteps] = useState<Record<number, boolean>>(
    {},
  );
  // UI: which main table/tab is active: 'jobCards' | 'printing'
  const [activeMainTab, setActiveMainTab] = useState<"jobCards" | "printing">(
    "jobCards",
  );
  const [isLoadingPrintingDetails, setIsLoadingPrintingDetails] =
    useState(false);
  const [printingDetailsError, setPrintingDetailsError] = useState<
    string | null
  >(null);
  const [printingDetailsSearchTerm, setPrintingDetailsSearchTerm] =
    useState("");
  const [printingDetailsStatusFilter, setPrintingDetailsStatusFilter] =
    useState<string>("");

  /** Completed Jobs Summary (below KPI cards): local filters + sort */
  const [completedSummaryDateFilter, setCompletedSummaryDateFilter] =
    useState("");
  const [completedSummaryCustomerFilter, setCompletedSummaryCustomerFilter] =
    useState("");
  const [completedSummaryUnitFilter, setCompletedSummaryUnitFilter] =
    useState("");
  const [completedSummarySort, setCompletedSummarySort] = useState<{
    key: keyof CompletedJobSummaryRow;
    dir: "asc" | "desc";
  }>({ key: "recordDateIso", dir: "desc" });

  const [customDateRange, setCustomDateRange] = useState<{
    start: string;
    end: string;
  }>(
    () =>
      returnedState?.customDateRange ??
      productionDashboardCache?.customDateRange ?? {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
      },
  );

  // Major hold jobs count (for blinking icon + navigate to major-hold-jobs)
  const [majorHoldJobsCount, setMajorHoldJobsCount] = useState<number>(0);

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const status = productionService.checkAuthStatus();
      setAuthStatus(status);

      if (!status.isAuthenticated) {
        setError(status.message);
      }
    };

    checkAuth();
  }, []);

  // Run first: when returning from child pages, restore from cache and skip all data loads below
  useEffect(() => {
    if (!productionDashboardCache) return;
    restoredFromCacheRef.current = true;
    setJobPlansData(productionDashboardCache.jobPlansData);
    setCompletedJobsData(productionDashboardCache.completedJobsData);
    setHeldJobsData(productionDashboardCache.heldJobsData);
    setDateFilter(productionDashboardCache.dateFilter ?? "today");
    setCustomDateRange(
      productionDashboardCache.customDateRange ?? {
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .split("T")[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
          .toISOString()
          .split("T")[0],
      },
    );
    if (productionDashboardCache.aggregatedData !== undefined) {
      setAggregatedData(productionDashboardCache.aggregatedData);
    }
    if (productionDashboardCache.printingDetails !== undefined) {
      setPrintingDetails(productionDashboardCache.printingDetails);
    }
    if (productionDashboardCache.majorHoldJobsCount !== undefined) {
      setMajorHoldJobsCount(productionDashboardCache.majorHoldJobsCount);
    }
    setIsLoadingJobStats(false);
    setIsLoadingAggregated(false);
    setIsLoadingPrintingDetails(false);
  }, []);

  // Keep cache in sync with selected date filter so "Go to Dashboard" restores the same filter (e.g. yesterday)
  useEffect(() => {
    if (productionDashboardCache) {
      productionDashboardCache.dateFilter = dateFilter;
      productionDashboardCache.customDateRange = customDateRange;
      productionDashboardCache.cacheKey = getProductionDashboardCacheKey(
        dateFilter,
        customDateRange,
      );
    }
  }, [dateFilter, customDateRange]);

  // Aggregated production data was previously fetched from a separate API.
  // We now derive the Production Steps Status Overview entirely from the
  // same job planning + completed jobs data used for the Planned/In Progress/Completed cards.
  // (No separate aggregated API call is needed anymore.)

  // Load printing details (skip when restored from cache)
  useEffect(() => {
    if (restoredFromCacheRef.current) return;
    const loadPrintingDetails = async () => {
      try {
        setIsLoadingPrintingDetails(true);
        setPrintingDetailsError(null);
        const data = await printingService.getAllPrintingDetails();
        setPrintingDetails(data);
        if (productionDashboardCache) {
          productionDashboardCache.printingDetails = data;
        }
      } catch (error) {
        console.error("Error loading printing details:", error);
        setPrintingDetailsError("Failed to load printing details");
      } finally {
        setIsLoadingPrintingDetails(false);
      }
    };

    loadPrintingDetails();
  }, []);

  // Major hold count is loaded with fetchProductionDashboardData via /api/dashboard/role-bundle

  // Helper function to get step actual status (same as AdminDashboard)
  const getStepActualStatus = (
    step: JobPlanStep,
  ): "completed" | "in_progress" | "hold" | "planned" => {
    // Check for major_hold first (same as AdminDashboard) - must not count as in-progress
    if (
      step.stepDetails?.data?.status === "major_hold" ||
      step.stepDetails?.status === "major_hold" ||
      step.status === "major_hold"
    ) {
      return "hold";
    }
    // Check for hold status
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

    // Priority 1: Check stepDetails.data.status first
    if (step.stepDetails?.data?.status) {
      if (step.stepDetails.data.status === "accept") {
        if (step.status === "stop") {
          return "completed";
        }
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

    // Priority 2: Check stepDetails.status
    if (step.stepDetails?.status) {
      if (step.stepDetails.status === "accept") {
        if (step.status === "stop") {
          return "completed";
        }
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

    // Priority 3: Check step.status directly
    if ((step.status as any) === "accept") {
      return "completed";
    }
    if ((step.status as any) === "in_progress") {
      return "in_progress";
    }

    // Priority 4: Use step.status for legacy status values
    // 🔥 IMPORTANT: Match AdminDashboard exactly - return "completed" for "stop" status
    if (step.status === "stop") {
      return "completed";
    }
    if (step.status === "start") {
      return "in_progress";
    }

    // Default: planned (stepDetails exists but status is not set, or step.status is "planned")
    return "planned";
  };

  const hasMajorHold = (jobPlan: JobPlanForStats): boolean =>
    (jobPlan.steps || []).some(
      (step) =>
        step.stepDetails?.data?.status === "major_hold" ||
        step.stepDetails?.status === "major_hold" ||
        step.status === "major_hold",
    );

  // Helper function to get date range based on filter
  const getDateRange = (
    filter: DateFilterType,
    customRange?: { start: string; end: string },
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
        if (customRange && customRange.start && customRange.end) {
          // Parse custom dates and ensure proper time boundaries
          // Parse as local date to avoid timezone issues
          const startParts = customRange.start.split("-");
          const endParts = customRange.end.split("-");

          if (startParts.length === 3 && endParts.length === 3) {
            // Create dates in local timezone
            startDate = new Date(
              parseInt(startParts[0]),
              parseInt(startParts[1]) - 1, // Month is 0-indexed
              parseInt(startParts[2]),
            );
            startDate.setHours(0, 0, 0, 0); // Start of day

            endDate = new Date(
              parseInt(endParts[0]),
              parseInt(endParts[1]) - 1, // Month is 0-indexed
              parseInt(endParts[2]),
            );
            endDate.setHours(23, 59, 59, 999); // End of day
          } else {
            // Fallback: parse as ISO string
            startDate = new Date(customRange.start);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customRange.end);
            endDate.setHours(23, 59, 59, 999);
          }
        } else {
          // Fallback to this month if no custom range
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        break;
      default:
        // Show all data
        return null;
    }

    return { startDate, endDate };
  };

  // Helper function to check if a date is in range
  const isDateInRange = (
    date: Date | string,
    startDate: Date,
    endDate: Date,
  ): boolean => {
    const checkDate = typeof date === "string" ? new Date(date) : date;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return checkDate >= start && checkDate <= end;
  };

  // Apply the SAME date filter to printing details list (so it matches the dashboard cards)
  const filteredPrintingDetails = useMemo(() => {
    if (!dateFilter) return printingDetails;

    const dateRange = getDateRange(dateFilter, customDateRange);
    if (!dateRange) return printingDetails;

    const { startDate, endDate } = dateRange;
    return printingDetails.filter((p) => {
      const byMainDate =
        p.date != null &&
        p.date !== "" &&
        isDateInRange(p.date, startDate, endDate);
      const del = p.deliveryDate;
      const byDelivery =
        del != null && del !== "" && isDateInRange(del, startDate, endDate);
      return byMainDate || byDelivery;
    });
  }, [printingDetails, dateFilter, customDateRange]);

  // Single pipeline: date filter + categorization (mirror Admin so card counts match exactly)
  const dashboardFiltered = useMemo(() => {
    let filteredJobPlans: JobPlanForStats[] = jobPlansData;
    let filteredCompleted: CompletedJob[] = completedJobsData;

    if (dateFilter) {
      const dateRange = getDateRange(dateFilter, customDateRange);
      if (dateRange) {
        const { startDate, endDate } = dateRange;
        const getStepActivityDate = (step: any): Date | null => {
          const raw =
            step.updatedAt ||
            // ProductionHead wraps stepDetails as { data: <stepDetails> }
            // while other places may store updatedAt directly under stepDetails.
            (step.stepDetails &&
              (step.stepDetails.updatedAt ??
                step.stepDetails.data?.updatedAt)) ||
            step.startDate;
          if (!raw) return null;
          const d = new Date(raw);
          return isNaN(d.getTime()) ? null : d;
        };
        filteredJobPlans = jobPlansData.filter((jobPlan) => {
          const hasRecentStepActivity = jobPlan.steps.some((step) => {
            const stepUpdateDate = getStepActivityDate(step);
            if (!stepUpdateDate) return false;
            return isDateInRange(stepUpdateDate, startDate, endDate);
          });
          if (!hasRecentStepActivity) {
            const jobTimestamp =
              (jobPlan as any).updatedAt ?? (jobPlan as any).createdAt;
            if (!jobTimestamp) return false;
            const jobDate = new Date(jobTimestamp);
            return isDateInRange(jobDate, startDate, endDate);
          }
          return hasRecentStepActivity;
        });
        filteredCompleted = completedJobsData.filter((completedJob) => {
          const completedAt = completedJob.completedAt;
          if (!completedAt) return false;
          return isDateInRange(completedAt, startDate, endDate);
        });
      }
    }

    const plannedJobPlans: JobPlanForStats[] = [];
    const inProgressJobPlans: JobPlanForStats[] = [];
    const uniqueUsers = new Set<string>();

    filteredJobPlans.forEach((jobPlan: JobPlanForStats) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;
      jobPlan.steps.forEach((step: JobPlanStep) => {
        if (step.user) uniqueUsers.add(step.user);
        const stepStatus = getStepActualStatus(step);
        if (stepStatus === "hold") {
          jobOnHold = true;
          jobCompleted = false;
        } else if (stepStatus === "completed") {
          // completed
        } else if (stepStatus === "in_progress") {
          jobInProgress = true;
          jobCompleted = false;
        } else {
          jobCompleted = false;
        }
      });
      if (jobCompleted) {
        // completed from API
      } else if (jobOnHold) {
        // don't count
      } else if (jobInProgress) {
        inProgressJobPlans.push(jobPlan);
      } else {
        plannedJobPlans.push(jobPlan);
      }
    });

    const completedJobs = filteredCompleted.length;
    const plannedJobs = plannedJobPlans.length;
    const inProgressJobs = inProgressJobPlans.length;
    const totalJobs = plannedJobs + inProgressJobs + completedJobs;

    return {
      filteredJobPlansData: filteredJobPlans,
      filteredCompletedJobsData: filteredCompleted,
      plannedJobPlans,
      inProgressJobPlans,
      plannedJobs,
      inProgressJobs,
      completedJobs,
      totalJobs,
      activeUsers: uniqueUsers.size,
    };
  }, [jobPlansData, completedJobsData, dateFilter, customDateRange]);

  const filteredJobPlansData = dashboardFiltered.filteredJobPlansData;
  const filteredCompletedJobsData = dashboardFiltered.filteredCompletedJobsData;
  const filteredJobStats = {
    totalJobs: dashboardFiltered.totalJobs,
    plannedJobs: dashboardFiltered.plannedJobs,
    inProgressJobs: dashboardFiltered.inProgressJobs,
    completedJobs: dashboardFiltered.completedJobs,
    activeUsers: dashboardFiltered.activeUsers,
  };

  /** Completed Jobs Summary table: same date-filtered completed jobs as KPI “Completed” */
  const completedJobsSummaryRows = useMemo(
    () => filteredCompletedJobsData.map(extractCompletedJobSummaryRow),
    [filteredCompletedJobsData],
  );

  const completedJobsSummaryFilteredSorted = useMemo(() => {
    let rows = completedJobsSummaryRows;
    const df = completedSummaryDateFilter.trim().toLowerCase();
    const cf = completedSummaryCustomerFilter.trim().toLowerCase();
    const uf = completedSummaryUnitFilter.trim().toLowerCase();
    if (df) {
      rows = rows.filter((r) =>
        `${r.recordDateDisplay} ${r.recordDateIso} ${r.dispatchDateDisplay}`
          .toLowerCase()
          .includes(df),
      );
    }
    if (cf) {
      rows = rows.filter((r) => r.customerName.toLowerCase().includes(cf));
    }
    if (uf) {
      rows = rows.filter((r) => r.unitLabel.toLowerCase().includes(uf));
    }

    const { key, dir } = completedSummarySort;
    const mul = dir === "asc" ? 1 : -1;
    const sortKey = key as keyof CompletedJobSummaryRow;
    return [...rows].sort((a, b) => {
      if (sortKey === "dispatchDateIso" || sortKey === "recordDateIso") {
        const ta = a[sortKey] ? new Date(a[sortKey] as string).getTime() : 0;
        const tb = b[sortKey] ? new Date(b[sortKey] as string).getTime() : 0;
        const aMissing = !a[sortKey];
        const bMissing = !b[sortKey];
        if (aMissing && bMissing) return 0;
        if (aMissing) return 1 * mul;
        if (bMissing) return -1 * mul;
        return (ta - tb) * mul;
      }
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "number" && typeof vb === "number") {
        return (va - vb) * mul;
      }
      return (
        String(va ?? "").localeCompare(String(vb ?? ""), undefined, {
          sensitivity: "base",
        }) * mul
      );
    });
  }, [
    completedJobsSummaryRows,
    completedSummaryDateFilter,
    completedSummaryCustomerFilter,
    completedSummaryUnitFilter,
    completedSummarySort,
  ]);

  const completedJobsSummaryTotalRevenue = useMemo(
    () =>
      completedJobsSummaryFilteredSorted.reduce(
        (s, r) => s + (Number.isFinite(r.totalValue) ? r.totalValue : 0),
        0,
      ),
    [completedJobsSummaryFilteredSorted],
  );

  const handleCompletedSummarySort = useCallback(
    (key: keyof CompletedJobSummaryRow) => {
      setCompletedSummarySort((prev) =>
        prev.key === key
          ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
          : { key, dir: "desc" },
      );
    },
    [],
  );

  // Calculate filtered aggregated data based on filtered job plans
  const filteredAggregatedData = useMemo(() => {
    // Create a map of completed jobs by nrcJobNo
    const completedJobsMap = new Map<string, any>();
    filteredCompletedJobsData.forEach((job: any) => {
      completedJobsMap.set(job.nrcJobNo, job);
    });

    // Get date range for filtering steps individually
    const dateRange = getDateRange(dateFilter, customDateRange);

    /**
     * Printing Details table shows "Printed" when printing-details row has status accept.
     * Job-plan step can still be "start" until workflow moves — count those as printing completed so
     * overview matches the Printing Details list (e.g. 13 Printed vs 12 completed).
     */
    const printingStepIdsMarkedPrinted = new Set<number>();
    filteredPrintingDetails.forEach((p) => {
      if (p.status !== "accept") return;
      const jid = Number((p as { jobStepId?: number | string }).jobStepId);
      if (Number.isFinite(jid) && jid > 0) {
        printingStepIdsMarkedPrinted.add(jid);
      }
    });

    // Initialize counters for each step
    const stepSummary = {
      corrugation: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
      fluteLamination: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
      punching: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
      flapPasting: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
      printing: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
      qualityDept: {
        total: 0,
        planned: 0,
        start: 0,
        stop: 0,
        completed: 0,
        inProgress: 0,
      },
    };

    let totalJobs = 0;
    let completedSteps = 0;
    let totalSteps = 0;

    // 🔥 DEBUG: Collect all Flute Lamination planned jobs
    const fluteLaminationPlannedJobs: Array<{
      jobPlan: any;
      step: any;
      stepStatus: string;
      stepActualStatus: string;
    }> = [];

    // Keep exact completed jobs per step so cards and modals use the same data
    const completedJobsByStep: {
      corrugation: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
      fluteLamination: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
      punching: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
      flapPasting: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
      printing: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
      qualityDept: Array<{ jobPlan: JobPlan; step: ProductionStep }>;
    } = {
      corrugation: [],
      fluteLamination: [],
      punching: [],
      flapPasting: [],
      printing: [],
      qualityDept: [],
    };

    // 🔥 DEBUG: Collect all Corrugation completed jobs
    const corrugationCompletedJobs: Array<{
      jobPlan: any;
      step: any;
      stepStatus: string;
      stepActualStatus: string;
      isCompleted: boolean;
      hasAcceptStatus: boolean;
    }> = [];

    // 🔥 DEBUG: Log completed jobs data
    console.log("=== FILTERED COMPLETED JOBS DATA ===", {
      count: filteredCompletedJobsData.length,
      jobs: filteredCompletedJobsData.map((job) => ({
        nrcJobNo: job.nrcJobNo,
        completedAt: job.completedAt,
        allStepDetails: (job as any).allStepDetails,
        hasAllStepDetails: !!(job as any).allStepDetails,
      })),
    });

    // Process each filtered job plan
    filteredJobPlansData.forEach((jobPlan) => {
      totalJobs++;

      // Get completed job data if available (for allStepDetails)
      const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
      const allStepDetails =
        (completedJob as any)?.allStepDetails ||
        (jobPlan as any).allStepDetails;

      // Filter only the 6 production steps
      const productionSteps = jobPlan.steps.filter(
        (step) =>
          step.stepName === "Corrugation" ||
          step.stepName === "FluteLaminateBoardConversion" ||
          step.stepName === "Punching" ||
          isFlapPastingStepName(step.stepName) ||
          step.stepName === "PrintingDetails" ||
          step.stepName === "QualityDept",
      );

      // Count statuses for each step - use the SAME logic as productionService.getAggregatedProductionData
      // 🔥 IMPORTANT: Also filter each step by date range to match handleStatusCardClick logic
      productionSteps.forEach((step) => {
        // Check if this step is within the date range (same logic as handleStatusCardClick)
        let stepInDateRange = true;
        if (dateRange) {
          const { startDate, endDate } = dateRange;
          stepInDateRange = false;

          // 🔥 SPECIAL HANDLING: For completed Corrugation steps, check stepDetails.data.corrugation.date first
          // This is the actual completion date when status is "accept"
          if (
            step.stepName === "Corrugation" &&
            step.status === "stop" &&
            (step.stepDetails as any)?.data?.corrugation?.date
          ) {
            // Check if this step has accept status (completed)
            const stepData = (step.stepDetails as any).data.corrugation;
            if (stepData.status === "accept") {
              const completionDate = new Date(stepData.date);
              if (isDateInRange(completionDate, startDate, endDate)) {
                stepInDateRange = true;
              }
            }
          }

          // Use the same logic as handleStatusCardClick: check step updatedAt first
          if (!stepInDateRange && (step as any).updatedAt) {
            const stepUpdateDate = new Date((step as any).updatedAt);
            if (isDateInRange(stepUpdateDate, startDate, endDate)) {
              stepInDateRange = true;
            }
          }

          // Also check the job plan's step updatedAt (in case step.updatedAt is not available)
          if (!stepInDateRange) {
            const jobPlanStep = jobPlan.steps.find((s) => s.id === step.id);
            if (jobPlanStep && (jobPlanStep as any).updatedAt) {
              const stepUpdateDate = new Date((jobPlanStep as any).updatedAt);
              if (isDateInRange(stepUpdateDate, startDate, endDate)) {
                stepInDateRange = true;
              }
            }
          }

          // Check step start date
          if (!stepInDateRange && step.startDate) {
            const stepStartDate = new Date(step.startDate);
            if (isDateInRange(stepStartDate, startDate, endDate)) {
              stepInDateRange = true;
            }
          }

          // Check step end date (for completed/stopped steps)
          if (!stepInDateRange && step.endDate) {
            const stepEndDate = new Date(step.endDate);
            if (isDateInRange(stepEndDate, startDate, endDate)) {
              stepInDateRange = true;
            }
          }

          // Flap / Printing often lack step.updatedAt; job-level update still reflects work in range (esp. "today")
          if (
            !stepInDateRange &&
            (jobPlan as any).updatedAt &&
            (isFlapPastingStepName(step.stepName) ||
              step.stepName === "PrintingDetails")
          ) {
            const jobUpd = new Date((jobPlan as any).updatedAt);
            if (
              !isNaN(jobUpd.getTime()) &&
              isDateInRange(jobUpd, startDate, endDate)
            ) {
              stepInDateRange = true;
            }
          }

          // Flap pasting: completion date in step payload (same idea as Corrugation)
          if (
            !stepInDateRange &&
            isFlapPastingStepName(step.stepName) &&
            (step.stepDetails as any)?.data?.sideFlapPasting
          ) {
            const sf = (step.stepDetails as any).data.sideFlapPasting;
            if (sf?.date) {
              const flapDate = new Date(sf.date);
              if (
                !isNaN(flapDate.getTime()) &&
                isDateInRange(flapDate, startDate, endDate)
              ) {
                stepInDateRange = true;
              }
            }
          }

          // Fall back to job creation date if step dates are not available
          if (!stepInDateRange) {
            const jobDate = new Date((jobPlan as any).createdAt || Date.now());
            stepInDateRange = isDateInRange(jobDate, startDate, endDate);
          }
        }

        // Printing row is in filtered printing list but job-plan step has no in-range timestamps yet
        if (
          dateRange &&
          step.stepName === "PrintingDetails" &&
          printingStepIdsMarkedPrinted.has(Number(step.id))
        ) {
          stepInDateRange = true;
        }

        // Skip this step if it's not in the date range
        if (!stepInDateRange) {
          return;
        }
        totalSteps++;

        let stepKey: keyof typeof stepSummary;
        switch (step.stepName) {
          case "Corrugation":
            stepKey = "corrugation";
            break;
          case "FluteLaminateBoardConversion":
            stepKey = "fluteLamination";
            break;
          case "Punching":
            stepKey = "punching";
            break;
          case "SideFlapPasting":
          case "Flap Pasting":
          case "FlapPasting":
            stepKey = "flapPasting";
            break;
          case "PrintingDetails":
            stepKey = "printing";
            break;
          case "QualityDept":
            stepKey = "qualityDept";
            break;
          default:
            return;
        }

        stepSummary[stepKey].total++;

        // Check if step.status is "stop" and check allStepDetails for "accept" status
        // This matches the logic in productionService.getAggregatedProductionData
        let isCompleted = false;
        if (step.status === "stop") {
          // Map step name to allStepDetails key
          const stepDetailKey =
            step.stepName === "FluteLaminateBoardConversion"
              ? "flutelam"
              : isFlapPastingStepName(step.stepName)
                ? "sideFlapPasting"
                : step.stepName === "PrintingDetails"
                  ? "printingDetails"
                  : step.stepName === "QualityDept"
                    ? "qualityDept"
                    : step.stepName.toLowerCase();

          // Check allStepDetails from completed job or jobPlan
          if (allStepDetails) {
            const stepDetails =
              allStepDetails[stepDetailKey as keyof typeof allStepDetails];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              // Check if any step detail has "accept" status
              const hasAcceptStatus = stepDetails.some(
                (detail: any) => detail.status === "accept",
              );
              if (hasAcceptStatus) {
                isCompleted = true;
              }
            }
          }

          // Also check step-level details (for backward compatibility)
          if (!isCompleted) {
            const stepDetailProp =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : isFlapPastingStepName(step.stepName)
                  ? "sideFlapPasting"
                  : step.stepName === "PrintingDetails"
                    ? "printingDetails"
                    : step.stepName === "QualityDept"
                      ? "qualityDept"
                      : step.stepName.toLowerCase();

            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              const hasAcceptStatus = stepDetails.some(
                (detail: any) => detail.status === "accept",
              );
              if (hasAcceptStatus) {
                isCompleted = true;
              }
            }
          }

          // Also check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
          // This is the most direct way to check accept status for each step
          if (!isCompleted) {
            // Map step name to the data property name
            const stepDataKey =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : isFlapPastingStepName(step.stepName)
                  ? "sideFlapPasting"
                  : step.stepName === "PrintingDetails"
                    ? "printingDetails"
                    : step.stepName === "QualityDept"
                      ? "qualityDept"
                      : step.stepName.toLowerCase();

            // Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            if (
              step.stepDetails?.data &&
              (step.stepDetails.data as any)[stepDataKey]
            ) {
              const stepData = (step.stepDetails.data as any)[stepDataKey];
              if (stepData.status === "accept") {
                isCompleted = true;
              }
            }

            // Also check stepDetails.data.status (fallback)
            if (!isCompleted && step.stepDetails?.data?.status === "accept") {
              isCompleted = true;
            }

            // Also check stepDetails.status (fallback)
            if (!isCompleted && step.stepDetails?.status === "accept") {
              isCompleted = true;
            }
          }
        }

        // Align with Printing Details: "Printed" = printing-details API status accept (even if step still "start")
        if (
          step.stepName === "PrintingDetails" &&
          printingStepIdsMarkedPrinted.has(Number(step.id))
        ) {
          isCompleted = true;
        }

        // Count statuses - match productionService.getAggregatedProductionData logic exactly
        let finalStatus = "";
        if (step.status === "planned") {
          stepSummary[stepKey].planned++;
          finalStatus = "planned";

          // 🔥 DEBUG: Collect Flute Lamination planned jobs with complete data
          if (stepKey === "fluteLamination") {
            fluteLaminationPlannedJobs.push({
              jobPlan: {
                ...jobPlan,
                // Include all job plan properties
                jobPlanId: jobPlan.jobPlanId,
                nrcJobNo: jobPlan.nrcJobNo,
                jobDemand: (jobPlan as any).jobDemand,
                createdAt: (jobPlan as any).createdAt,
                updatedAt: (jobPlan as any).updatedAt,
                steps: jobPlan.steps,
                allStepDetails: allStepDetails,
              },
              step: {
                ...step,
                // Include all step properties
                id: step.id,
                stepNo: step.stepNo,
                stepName: step.stepName,
                status: step.status,
                startDate: step.startDate,
                endDate: step.endDate,
                user: step.user,
                createdAt: (step as any).createdAt,
                updatedAt: (step as any).updatedAt,
                stepDetails: step.stepDetails,
                machineDetails: (step as any).machineDetails,
              },
              stepStatus: step.status,
              stepActualStatus: finalStatus,
            });
          }
        } else if (step.status === "start") {
          if (
            step.stepName === "PrintingDetails" &&
            printingStepIdsMarkedPrinted.has(Number(step.id))
          ) {
            stepSummary[stepKey].completed++;
            completedSteps++;
            finalStatus = "completed";
            completedJobsByStep[stepKey].push({
              jobPlan: jobPlan as JobPlan,
              step: step as unknown as ProductionStep,
            });
          } else {
            stepSummary[stepKey].start++;
            stepSummary[stepKey].inProgress++;
            finalStatus = "in_progress";
          }
        } else if (step.status === "stop") {
          if (isCompleted) {
            // If step detail has "accept", count as completed (NOT as stop)
            stepSummary[stepKey].completed++;
            completedSteps++;
            finalStatus = "completed";

            // Track this exact completed job for the detail modal
            completedJobsByStep[stepKey].push({
              jobPlan: jobPlan as JobPlan,
              step: step as unknown as ProductionStep,
            });

            // 🔥 DEBUG: Collect Corrugation completed jobs (stop with accept)
            if (stepKey === "corrugation") {
              corrugationCompletedJobs.push({
                jobPlan: {
                  ...jobPlan,
                  jobPlanId: jobPlan.jobPlanId,
                  nrcJobNo: jobPlan.nrcJobNo,
                  jobDemand: (jobPlan as any).jobDemand,
                  createdAt: (jobPlan as any).createdAt,
                  updatedAt: (jobPlan as any).updatedAt,
                  steps: jobPlan.steps,
                  allStepDetails: allStepDetails,
                },
                step: {
                  ...step,
                  id: step.id,
                  stepNo: step.stepNo,
                  stepName: step.stepName,
                  status: step.status,
                  startDate: step.startDate,
                  endDate: step.endDate,
                  user: step.user,
                  createdAt: (step as any).createdAt,
                  updatedAt: (step as any).updatedAt,
                  stepDetails: step.stepDetails,
                  machineDetails: (step as any).machineDetails,
                },
                stepStatus: step.status,
                stepActualStatus: finalStatus,
                isCompleted: isCompleted,
                hasAcceptStatus: true,
              });
            }
          } else {
            // Otherwise, count as stop and in progress
            stepSummary[stepKey].stop++;
            stepSummary[stepKey].inProgress++;
            finalStatus = "stopped";
          }
        } else if (step.status === "accept") {
          // Treat 'accept' status as completed
          stepSummary[stepKey].completed++;
          completedSteps++;
          finalStatus = "completed";

          // Track this exact completed job for the detail modal
          completedJobsByStep[stepKey].push({
            jobPlan: jobPlan as JobPlan,
            step: step as unknown as ProductionStep,
          });

          // 🔥 DEBUG: Collect Corrugation completed jobs (accept status)
          if (stepKey === "corrugation") {
            corrugationCompletedJobs.push({
              jobPlan: {
                ...jobPlan,
                jobPlanId: jobPlan.jobPlanId,
                nrcJobNo: jobPlan.nrcJobNo,
                jobDemand: (jobPlan as any).jobDemand,
                createdAt: (jobPlan as any).createdAt,
                updatedAt: (jobPlan as any).updatedAt,
                steps: jobPlan.steps,
                allStepDetails: allStepDetails,
              },
              step: {
                ...step,
                id: step.id,
                stepNo: step.stepNo,
                stepName: step.stepName,
                status: step.status,
                startDate: step.startDate,
                endDate: step.endDate,
                user: step.user,
                createdAt: (step as any).createdAt,
                updatedAt: (step as any).updatedAt,
                stepDetails: step.stepDetails,
                machineDetails: (step as any).machineDetails,
              },
              stepStatus: step.status,
              stepActualStatus: finalStatus,
              isCompleted: true,
              hasAcceptStatus: true,
            });
          }
        } else {
          // Default to planned
          stepSummary[stepKey].planned++;
          finalStatus = "planned";

          // 🔥 DEBUG: Collect Flute Lamination planned jobs with complete data (default case)
          if (stepKey === "fluteLamination") {
            fluteLaminationPlannedJobs.push({
              jobPlan: {
                ...jobPlan,
                // Include all job plan properties
                jobPlanId: jobPlan.jobPlanId,
                nrcJobNo: jobPlan.nrcJobNo,
                jobDemand: (jobPlan as any).jobDemand,
                createdAt: (jobPlan as any).createdAt,
                updatedAt: (jobPlan as any).updatedAt,
                steps: jobPlan.steps,
                allStepDetails: allStepDetails,
              },
              step: {
                ...step,
                // Include all step properties
                id: step.id,
                stepNo: step.stepNo,
                stepName: step.stepName,
                status: step.status,
                startDate: step.startDate,
                endDate: step.endDate,
                user: step.user,
                createdAt: (step as any).createdAt,
                updatedAt: (step as any).updatedAt,
                stepDetails: step.stepDetails,
                machineDetails: (step as any).machineDetails,
              },
              stepStatus: step.status,
              stepActualStatus: finalStatus,
            });
          }
        }

        // Console log for debugging
        console.log(
          `[${stepKey.toUpperCase()}] Job: ${jobPlan.nrcJobNo}, Step: ${step.stepName}, Status: ${step.status}, FinalStatus: ${finalStatus}, isCompleted: ${isCompleted}`,
          {
            stepStatus: step.status,
            stepDetailsDataStatus: step.stepDetails?.data?.status,
            stepDetailsStatus: step.stepDetails?.status,
            allStepDetails: allStepDetails ? Object.keys(allStepDetails) : null,
            jobPlanNrcJobNo: jobPlan.nrcJobNo,
          },
        );
      });
    });

    // Include completed jobs that are not present in current job-planning payload.
    // This keeps Production Steps "Completed" counts aligned with Completed Jobs cards after API clubbing.
    const jobPlanJobNos = new Set(filteredJobPlansData.map((jp) => jp.nrcJobNo));
    const alreadyCountedCompleted = new Set<string>();
    filteredCompletedJobsData.forEach((completedJob: any, jobIndex: number) => {
      const nrcJobNo = String(completedJob?.nrcJobNo || "").trim();
      if (!nrcJobNo || jobPlanJobNos.has(nrcJobNo)) return;

      const allSteps = Array.isArray(completedJob?.allSteps)
        ? completedJob.allSteps
        : [];
      allSteps.forEach((rawStep: any, stepIndex: number) => {
        const stepName = String(rawStep?.stepName || "");
        let stepKey: keyof typeof stepSummary | null = null;
        if (stepName === "Corrugation") stepKey = "corrugation";
        else if (stepName === "FluteLaminateBoardConversion")
          stepKey = "fluteLamination";
        else if (stepName === "Punching") stepKey = "punching";
        else if (isFlapPastingStepName(stepName)) stepKey = "flapPasting";
        else if (stepName === "PrintingDetails") stepKey = "printing";
        else if (stepName === "QualityDept") stepKey = "qualityDept";
        if (!stepKey) return;

        const token = `${nrcJobNo}|${stepKey}`;
        if (alreadyCountedCompleted.has(token)) return;
        alreadyCountedCompleted.add(token);

        stepSummary[stepKey].total++;
        stepSummary[stepKey].completed++;
        completedSteps++;

        const syntheticStep: ProductionStep = {
          id: -1 * (jobIndex * 100 + stepIndex + 1),
          stepNo: Number(rawStep?.stepNo || stepIndex + 1),
          stepName:
            stepKey === "flapPasting"
              ? "SideFlapPasting"
              : stepKey === "fluteLamination"
                ? "FluteLaminateBoardConversion"
                : stepName,
          status: "accept",
          startDate: rawStep?.startDate || null,
          endDate:
            rawStep?.endDate ||
            completedJob?.completedAt ||
            rawStep?.updatedAt ||
            null,
          user: rawStep?.user || null,
          machineDetails: Array.isArray(rawStep?.machineDetails)
            ? rawStep.machineDetails
            : [],
          createdAt:
            rawStep?.createdAt ||
            completedJob?.createdAt ||
            completedJob?.completedAt ||
            new Date().toISOString(),
          updatedAt:
            rawStep?.updatedAt ||
            completedJob?.completedAt ||
            new Date().toISOString(),
        };

        const syntheticJobPlan: JobPlan = {
          jobPlanId: Number(completedJob?.jobPlanId || 0),
          nrcJobNo,
          jobDemand: String(completedJob?.jobDemand ?? ""),
          createdAt:
            completedJob?.createdAt ||
            completedJob?.completedAt ||
            new Date().toISOString(),
          updatedAt:
            completedJob?.updatedAt ||
            completedJob?.completedAt ||
            new Date().toISOString(),
          steps: [syntheticStep],
          allStepDetails: completedJob?.allStepDetails,
        };

        completedJobsByStep[stepKey].push({
          jobPlan: syntheticJobPlan,
          step: syntheticStep,
        });
      });

      // Fallback for payloads where allSteps is missing but allStepDetails is present
      if (!allSteps.length && completedJob?.allStepDetails) {
        const detailsToStep: Record<string, keyof typeof stepSummary> = {
          corrugation: "corrugation",
          flutelam: "fluteLamination",
          punching: "punching",
          sideFlapPasting: "flapPasting",
          printingDetails: "printing",
          qualityDept: "qualityDept",
        };
        Object.entries(detailsToStep).forEach(([detailsKey, stepKey]) => {
          const token = `${nrcJobNo}|${stepKey}`;
          if (alreadyCountedCompleted.has(token)) return;
          const details = completedJob.allStepDetails[detailsKey];
          if (!Array.isArray(details)) return;
          if (!details.some((d: any) => d?.status === "accept")) return;

          alreadyCountedCompleted.add(token);
          stepSummary[stepKey].total++;
          stepSummary[stepKey].completed++;
          completedSteps++;
        });
      }
    });

    // Calculate overall efficiency
    const overallEfficiency =
      totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    // 🔥 DEBUG: Console log all Flute Lamination planned jobs with complete data
    console.log("=== FLUTE LAMINATION PLANNED JOBS (14 jobs counted) ===", {
      count: fluteLaminationPlannedJobs.length,
      jobs: fluteLaminationPlannedJobs.map((item, index) => ({
        index: index + 1,
        jobPlanId: item.jobPlan.jobPlanId,
        nrcJobNo: item.jobPlan.nrcJobNo,
        jobDemand: item.jobPlan.jobDemand,
        stepId: item.step.id,
        stepNo: item.step.stepNo,
        stepName: item.step.stepName,
        stepStatus: item.stepStatus,
        stepActualStatus: item.stepActualStatus,
        startDate: item.step.startDate,
        endDate: item.step.endDate,
        user: item.step.user,
        stepDetails: item.step.stepDetails,
        machineDetails: item.step.machineDetails,
        completeJobPlan: item.jobPlan,
        completeStep: item.step,
      })),
    });
    console.log(
      "=== FLUTE LAMINATION PLANNED JOBS - COMPLETE JSON ===",
      JSON.stringify(fluteLaminationPlannedJobs, null, 2),
    );

    // 🔥 DEBUG: Console log all Corrugation completed jobs with complete data
    console.log("=== CORRUGATION COMPLETED JOBS (6 jobs counted) ===", {
      count: corrugationCompletedJobs.length,
      jobs: corrugationCompletedJobs.map((item, index) => ({
        index: index + 1,
        jobPlanId: item.jobPlan.jobPlanId,
        nrcJobNo: item.jobPlan.nrcJobNo,
        jobDemand: item.jobPlan.jobDemand,
        stepId: item.step.id,
        stepNo: item.step.stepNo,
        stepName: item.step.stepName,
        stepStatus: item.stepStatus,
        stepActualStatus: item.stepActualStatus,
        isCompleted: item.isCompleted,
        hasAcceptStatus: item.hasAcceptStatus,
        startDate: item.step.startDate,
        endDate: item.step.endDate,
        user: item.step.user,
        stepUpdatedAt: (item.step as any).updatedAt,
        jobCreatedAt: (item.jobPlan as any).createdAt,
        stepDetails: item.step.stepDetails,
        stepDetailsData: (item.step.stepDetails as any)?.data,
        stepDetailsDataCorrugation: (item.step.stepDetails as any)?.data
          ?.corrugation,
        machineDetails: item.step.machineDetails,
        allStepDetails: item.jobPlan.allStepDetails,
        completeJobPlan: item.jobPlan,
        completeStep: item.step,
      })),
    });
    console.log(
      "=== CORRUGATION COMPLETED JOBS - COMPLETE JSON ===",
      JSON.stringify(corrugationCompletedJobs, null, 2),
    );

    // Console log summary for debugging
    console.log("=== PRODUCTION STEPS STATUS OVERVIEW - SUMMARY ===", {
      totalJobs,
      totalSteps,
      completedSteps,
      overallEfficiency,
      stepSummary: {
        corrugation: {
          total: stepSummary.corrugation.total,
          completed: stepSummary.corrugation.completed,
          inProgress: stepSummary.corrugation.inProgress,
          stopped: stepSummary.corrugation.stop,
          planned: stepSummary.corrugation.planned,
        },
        fluteLamination: {
          total: stepSummary.fluteLamination.total,
          completed: stepSummary.fluteLamination.completed,
          inProgress: stepSummary.fluteLamination.inProgress,
          stopped: stepSummary.fluteLamination.stop,
          planned: stepSummary.fluteLamination.planned,
        },
        punching: {
          total: stepSummary.punching.total,
          completed: stepSummary.punching.completed,
          inProgress: stepSummary.punching.inProgress,
          stopped: stepSummary.punching.stop,
          planned: stepSummary.punching.planned,
        },
        flapPasting: {
          total: stepSummary.flapPasting.total,
          completed: stepSummary.flapPasting.completed,
          inProgress: stepSummary.flapPasting.inProgress,
          stopped: stepSummary.flapPasting.stop,
          planned: stepSummary.flapPasting.planned,
        },
        printing: {
          total: stepSummary.printing.total,
          completed: stepSummary.printing.completed,
          inProgress: stepSummary.printing.inProgress,
          stopped: stepSummary.printing.stop,
          planned: stepSummary.printing.planned,
        },
        qualityDept: {
          total: stepSummary.qualityDept.total,
          completed: stepSummary.qualityDept.completed,
          inProgress: stepSummary.qualityDept.inProgress,
          stopped: stepSummary.qualityDept.stop,
          planned: stepSummary.qualityDept.planned,
        },
      },
    });

    return {
      totalJobs,
      stepSummary,
      overallEfficiency,
      completedJobsByStep,
    };
  }, [
    filteredJobPlansData,
    filteredCompletedJobsData,
    filteredPrintingDetails,
    dateFilter,
    customDateRange,
  ]);

  const heldJobHasMajorHold = useCallback((heldJob: HeldJob): boolean => {
    return (
      heldJob.steps?.some(
        (step: HeldJobStep) =>
          (step as any).stepSpecificData?.status === "major_hold" ||
          (step as any).status === "major_hold",
      ) ?? false
    );
  }, []);

  const fetchProductionDashboardData = useCallback(
    async (
      filterType?: DateFilterType,
      customRange?: { start: string; end: string } | null,
    ) => {
      if (!authStatus?.isAuthenticated) return;
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return;
      try {
        setIsLoadingJobStats(true);
        const baseUrl =
          import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";

        // Ensure cache exists early so loadAggregatedData (and others) can attach data when they complete
        const filter = filterType ?? dateFilter;
        const range = customRange ?? customDateRange;
        const cacheKey = getProductionDashboardCacheKey(filter, range);
        if (!productionDashboardCache) {
          productionDashboardCache = {
            jobPlansData: [],
            completedJobsData: [],
            heldJobsData: [],
            dateFilter: filter,
            customDateRange: range,
            cacheKey,
          };
        }

        // Build query params for date filtering (same as Admin Dashboard)
        const queryParams = new URLSearchParams();
        if (filter && filter !== "custom") {
          queryParams.append("filter", filter);
        } else if (range?.start && range?.end) {
          queryParams.append("startDate", range.start);
          queryParams.append("endDate", range.end);
        }
        const queryString = queryParams.toString();
        const bundleUrl = `${baseUrl}/api/dashboard/role-bundle${queryString ? `?${queryString}` : ""}`;

        const bundleResponse = await fetch(bundleUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!bundleResponse.ok) {
          throw new Error(`Dashboard bundle failed: ${bundleResponse.status}`);
        }

        const bundle = await bundleResponse.json();
        if (!bundle.success || !bundle.data?.jobPlanning) {
          throw new Error("Invalid dashboard bundle response");
        }

        const majorHoldPayload = bundle.data.majorHoldCount;
        const majorCount =
          majorHoldPayload?.success &&
          typeof majorHoldPayload.count === "number"
            ? majorHoldPayload.count
            : 0;
        setMajorHoldJobsCount(majorCount);
        if (productionDashboardCache) {
          productionDashboardCache.majorHoldJobsCount = majorCount;
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

        let jobPlans: JobPlanForStats[] = [];
        let completedJobs: CompletedJob[] = [];

        const jobPlanningResult = bundle.data.jobPlanning;
        if (
          jobPlanningResult.success &&
          Array.isArray(jobPlanningResult.data)
        ) {
          jobPlans = jobPlanningResult.data;
          const stepIndexList = jobPlans.flatMap((jp: JobPlanForStats) =>
            jp.steps.map((s: JobPlanStep) => ({
              stepId: s.id,
              stepName: s.stepName,
            })),
          );
          const detailsByStepId = await fetchStepDetailsBatch(
            baseUrl,
            accessToken,
            stepIndexList,
          );
          const jobPlansWithDetails = jobPlans.map(
            (jobPlan: JobPlanForStats) => ({
              ...jobPlan,
              steps: jobPlan.steps.map((step: JobPlanStep) => {
                const row = detailsByStepId[String(step.id)];
                const stepDetails = row != null ? { data: row } : undefined;
                return { ...step, stepDetails };
              }),
            }),
          );
          setJobPlansData(jobPlansWithDetails);
          jobPlans = jobPlansWithDetails;
        }

        const completedJobsResult = bundle.data.completedJobs;
        if (
          completedJobsResult?.success &&
          Array.isArray(completedJobsResult.data)
        ) {
          completedJobs = completedJobsResult.data;
          setCompletedJobsData(completedJobs);
        }

        setHeldJobsData(heldJobsData);

        let plannedJobs = 0;
        let inProgressJobs = 0;
        jobPlans.forEach((jobPlan: JobPlanForStats) => {
          let jobInProgress = false;
          let jobOnHold = false;
          let jobCompleted = true;
          jobPlan.steps.forEach((step: JobPlanStep) => {
            const stepStatus = getStepActualStatus(step);
            if (stepStatus === "hold") {
              jobOnHold = true;
              jobCompleted = false;
            } else if (stepStatus === "in_progress") {
              jobInProgress = true;
              jobCompleted = false;
            } else if (stepStatus !== "completed") {
              jobCompleted = false;
            }
          });
          if (jobOnHold) {
            // skip
          } else if (jobInProgress) {
            inProgressJobs++;
          } else if (!jobCompleted) {
            plannedJobs++;
          }
        });

        setJobStats({
          totalJobs: jobPlans.length + completedJobs.length,
          plannedJobs,
          inProgressJobs,
          completedJobs: completedJobs.length,
        });

        // Update cache (mutate so aggregatedData/printingDetails/majorHoldJobsCount from other effects are kept)
        productionDashboardCache.jobPlansData = jobPlans;
        productionDashboardCache.completedJobsData = completedJobs;
        productionDashboardCache.heldJobsData = heldJobsData;
        productionDashboardCache.dateFilter = filter;
        productionDashboardCache.customDateRange = range;
        productionDashboardCache.cacheKey = cacheKey;
      } catch (error) {
        console.error("Error loading job statistics:", error);
      } finally {
        setIsLoadingJobStats(false);
      }
    },
    [authStatus?.isAuthenticated, dateFilter, customDateRange],
  );

  /** Same as Admin: refetch role-bundle (job planning + completed jobs + held + major hold) when date filter changes */
  const handleProductionFilterChange = useCallback(
    (
      newFilter: DateFilterType,
      customRange?: { start: string; end: string } | null,
    ) => {
      fetchProductionDashboardData(newFilter, customRange ?? null);
    },
    [fetchProductionDashboardData],
  );

  // When no cache, fetch job/held data (aggregated, printing, major hold are loaded by their own effects)
  useEffect(() => {
    if (productionDashboardCache) return;
    if (!authStatus?.isAuthenticated) return;
    fetchProductionDashboardData(dateFilter, customDateRange);
  }, [authStatus?.isAuthenticated]);

  useEffect(() => {
    if (returnedState) {
      window.history.replaceState({}, document.title);
    }
  }, [returnedState]);

  // Click handlers for statistics cards (using filtered data)
  const handleTotalJobsClick = () => {
    navigate("/dashboard/job-details", {
      state: {
        jobData: {
          totalJobs: filteredJobStats.totalJobs,
          completedJobs: filteredJobStats.completedJobs,
          inProgressJobs: filteredJobStats.inProgressJobs,
          plannedJobs: filteredJobStats.plannedJobs,
        },
        filteredJobPlans: filteredJobPlansData,
        filteredCompletedJobs: filteredCompletedJobsData,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  const handleCompletedJobsClick = () => {
    navigate("/dashboard/completed-jobs", {
      state: {
        completedJobs: filteredCompletedJobsData,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  const handleInProgressJobsClick = () => {
    navigate("/dashboard/in-progress-jobs", {
      state: {
        inProgressJobs: dashboardFiltered.inProgressJobPlans,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  const heldJobsDataExcludingMajorHold = useMemo(
    () => heldJobsData.filter((h) => !heldJobHasMajorHold(h)),
    [heldJobsData, heldJobHasMajorHold],
  );
  const heldJobsCount = heldJobsDataExcludingMajorHold.length;

  const handleHeldJobsClick = useCallback(() => {
    navigate("/dashboard/held-jobs", {
      state: {
        heldJobs: heldJobsDataExcludingMajorHold,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  }, [navigate, heldJobsDataExcludingMajorHold, dateFilter, customDateRange]);

  const handlePlannedJobsClick = () => {
    navigate("/dashboard/planned-jobs", {
      state: {
        plannedJobs: dashboardFiltered.plannedJobPlans,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Search jobs with partial matching and suggestions
  const searchJobsLocally = (
    term: string,
  ): Array<{
    nrcJobNo: string;
    jobDemand: string;
    totalSteps: number;
    hasProductionSteps: boolean;
  }> => {
    if (!term.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return [];
    }

    const searchLower = term.toLowerCase().trim();

    // Use filteredJobPlansData and filteredCompletedJobsData for search
    const allJobNumbers = new Set<string>();

    // Add job numbers from filtered job plans
    filteredJobPlansData.forEach((jobPlan) => {
      allJobNumbers.add(jobPlan.nrcJobNo);
    });

    // Add job numbers from filtered completed jobs
    filteredCompletedJobsData.forEach((job) => {
      allJobNumbers.add(job.nrcJobNo);
    });

    // Filter jobs that match the search term (partial match)
    const matchingJobs = Array.from(allJobNumbers)
      .filter((nrcJobNo) => nrcJobNo.toLowerCase().includes(searchLower))
      .slice(0, 10) // Limit to 10 suggestions
      .map((nrcJobNo) => {
        // Find the job plan to get additional details
        const jobPlan = filteredJobPlansData.find(
          (jp) => jp.nrcJobNo === nrcJobNo,
        );
        const completedJob = filteredCompletedJobsData.find(
          (cj) => cj.nrcJobNo === nrcJobNo,
        );

        const hasProductionSteps =
          jobPlan?.steps?.some(
            (step) =>
              step.stepName === "Corrugation" ||
              step.stepName === "FluteLaminateBoardConversion" ||
              step.stepName === "Punching" ||
              isFlapPastingStepName(step.stepName) ||
              step.stepName === "PrintingDetails" ||
              step.stepName === "QualityDept",
          ) || false;

        return {
          nrcJobNo,
          jobDemand: jobPlan?.jobDemand || completedJob?.jobDemand || "unknown",
          totalSteps: jobPlan?.steps?.length || 0,
          hasProductionSteps,
        };
      });

    setSearchSuggestions(matchingJobs);
    setShowSuggestions(matchingJobs.length > 0);
    return matchingJobs;
  };

  // Handle search input change with debouncing
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(() => {
      searchJobsLocally(searchTerm);
    }, 300); // Debounce for 300ms

    return () => clearTimeout(timer);
  }, [searchTerm, filteredJobPlansData, filteredCompletedJobsData]);

  // Search jobs (for button click or Enter)
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsSearching(true);
      // Use suggestions if available, otherwise trigger new search
      if (searchSuggestions.length > 0) {
        setSearchResults(searchSuggestions);
      } else {
        const results = searchJobsLocally(searchTerm);
        setSearchResults(results);
      }
      setShowSuggestions(false);
    } catch (error) {
      console.error("Error searching jobs:", error);
      setError("Failed to search jobs. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Load production data for specific job
  const loadJobProductionData = async (nrcJobNo: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await productionService.getProductionDataByJob(nrcJobNo);
      setProductionData(data);
      setSelectedJob(nrcJobNo);
    } catch (error) {
      console.error("Error loading job production data:", error);
      setError("Failed to load job production data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle job selection from search results
  const handleJobSelect = async (nrcJobNo: string) => {
    await loadJobProductionData(nrcJobNo);
    setSearchResults([]);
    setSearchTerm("");
  };

  // Handle View Steps button click - opens modal
  // Handler for Continue to Production button
  // Calls the continue-step API to mark the step as continued by Production Head
  const handleContinueToProduction = async (
    printingDetail: PrintingDetails,
  ) => {
    const apiBase = (
      import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"
    ).replace(/\/$/, "");

    try {
      if (!printingDetail.jobStepId) {
        setError("Job step ID not found. Cannot continue to production.");
        return;
      }

      if (!printingDetail.jobNrcJobNo) {
        setError("Job number not found. Cannot continue to production.");
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Authentication token not found");
        return;
      }

      // PrintingDetails is always step 2 in the workflow
      const stepNo = 2;

      // Prefer jobPlanCode from API (no extra fetch); fallback to fetching by nrcJobNo to get jobPlanId
      let continueBody: {
        stepNo: number;
        jobPlanCode?: string;
        jobPlanId?: number;
      };
      if (printingDetail.jobPlanCode) {
        continueBody = { stepNo, jobPlanCode: printingDetail.jobPlanCode };
      } else {
        const jobStepResponse = await fetch(
          `${apiBase}/api/job-planning/${encodeURIComponent(
            printingDetail.jobNrcJobNo,
          )}/steps/${stepNo}?jobStepId=${printingDetail.jobStepId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!jobStepResponse.ok) {
          throw new Error(
            "Failed to fetch job step details for this printing job",
          );
        }

        const jobStepResult = await jobStepResponse.json();
        if (!jobStepResult.success || !jobStepResult.data) {
          throw new Error(
            "Invalid job step data received for this printing job",
          );
        }

        const jobStepData = jobStepResult.data;
        const jobPlanId: number | undefined =
          jobStepData?.jobPlanning?.jobPlanId;

        if (!jobPlanId) {
          throw new Error("Job plan ID not found for this printing step");
        }
        continueBody = { stepNo, jobPlanId };
      }

      // Call the continue-step API (accepts jobPlanCode or jobPlanId)
      const continueResponse = await fetch(
        `${apiBase}/api/job-planning/continue-step`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(continueBody),
        },
      );

      let continueResult: { success?: boolean; message?: string } = {};
      const ct = continueResponse.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        try {
          continueResult = await continueResponse.json();
        } catch {
          continueResult = {};
        }
      }

      if (!continueResponse.ok) {
        throw new Error(
          (continueResult as { message?: string }).message ||
            "Failed to continue step",
        );
      }
      if (!continueResult.success) {
        throw new Error(continueResult.message || "Failed to continue step");
      }

      /**
       * Continue-step is done; DB is updated. Previously we awaited getAllPrintingDetails +
       * getAggregatedProductionData + full job-planning + step-details-batch (~30s+). Any
       * failure or slow JSON there surfaced as "Failed to continue step" even on HTTP 200.
       * Optimistic UI + background refresh fixes that.
       */
      if (printingDetail.jobStepId) {
        setContinuedSteps((prev) => ({
          ...prev,
          [printingDetail.jobStepId]: true,
        }));
      }
      setError(null);
      alert(
        continueResult.message ||
          `Job ${printingDetail.jobNrcJobNo} has been continued to production successfully!`,
      );

      void (async () => {
        try {
          const data = await printingService.getAllPrintingDetails();
          setPrintingDetails(data);
          if (productionDashboardCache) {
            productionDashboardCache.printingDetails = data;
          }
        } catch (e) {
          console.warn("Refresh printing details after continue:", e);
        }
        try {
          const aggregatedData =
            await productionService.getAggregatedProductionData();
          setAggregatedData(aggregatedData);
          if (productionDashboardCache) {
            productionDashboardCache.aggregatedData = aggregatedData;
          }
        } catch (e) {
          console.warn("Refresh aggregated data after continue:", e);
        }
        try {
          await fetchProductionDashboardData(dateFilter, customDateRange);
        } catch (e) {
          console.warn("Refresh role-bundle after continue:", e);
        }
      })();
    } catch (error) {
      console.error("Error continuing to production:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to continue to production",
      );
      alert(
        `Error: ${error instanceof Error ? error.message : "Failed to continue to production"}`,
      );
    }
  };

  const handleViewSteps = (jobPlan: JobPlanForStats) => {
    setSelectedJobPlanForModal(jobPlan);
    setIsJobStepsModalOpen(true);
  };

  // Show job details in side panel
  const handleShowJobDetails = async (nrcJobNo: string) => {
    try {
      const jobDetails = await productionService.getJobPlanByNrcJobNo(nrcJobNo);
      if (jobDetails) {
        setSelectedJobDetails(jobDetails);
        setShowDetailPanel(true);
      }
    } catch (error) {
      console.error("Error loading job details:", error);
      setError("Failed to load job details. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "accept":
      case "accepted":
        return "bg-green-100 text-green-800 border-green-200";
      case "start":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "stop":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "planned":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "accepted":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "start":
        return <ClockIcon className="h-5 w-5 text-blue-600" />;
      case "stop":
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />;
      case "planned":
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not started";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStepDisplayName = (stepName: string) => {
    switch (stepName) {
      case "Corrugation":
        return "Corrugation";
      case "FluteLaminateBoardConversion":
        return "Flute Lamination";
      case "Punching":
        return "Punching";
      case "SideFlapPasting":
      case "Flap Pasting":
      case "FlapPasting":
        return "Flap Pasting";
      case "PrintingDetails":
        return "Printing";
      case "QualityDept":
        return "Quality Checks";
      default:
        return stepName;
    }
  };

  // Show loading if authentication is still pending
  if (!authStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Checking authentication..." />
      </div>
    );
  }

  if (isLoadingAggregated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading production overview..." />
      </div>
    );
  }

  const handleStatusCardClick = async (
    stepKey: string,
    status: string,
    stepName: string,
  ) => {
    try {
      setIsLoadingModalData(true);
      let jobData: Array<{ jobPlan: JobPlan; step: ProductionStep }> = [];
      let title = "";
      let usedCompletedList = false;

      // 🔥 IMPORTANT: Use filteredJobPlansData (which has stepDetails populated) instead of calling service
      // This ensures we use the same data source as the counting logic
      if (stepKey === "all") {
        // Show all jobs with this status across all steps
        jobData = await productionService.getAllStepsByStatus(status);
        title = `All ${status.charAt(0).toUpperCase() + status.slice(1)} Steps`;
      } else {
        // Map step key to step name
        const stepNameMapping: { [key: string]: string } = {
          corrugation: "Corrugation",
          fluteLamination: "FluteLaminateBoardConversion",
          punching: "Punching",
          flapPasting: "SideFlapPasting",
          printing: "PrintingDetails",
          qualityDept: "QualityDept",
        };
        const targetStepName = stepNameMapping[stepKey];

        // For completed: use the exact same list that was used for the card count (completedJobsByStep)
        // so the number on the card always matches the number of jobs shown in the modal
        if (status === "completed") {
          const byStep = filteredAggregatedData?.completedJobsByStep as
            | Record<string, Array<{ jobPlan: JobPlan; step: ProductionStep }>>
            | undefined;
          const list = byStep?.[stepKey] ?? [];
          jobData = Array.isArray(list) ? list : [];
          title = `${stepName} - Completed Jobs`;
          usedCompletedList = true;
        }

        if (!usedCompletedList) {
          // Use filteredJobPlansData directly (same as counting logic) to ensure stepDetails are available
          const completedJobsMap = new Map<string, any>();
          filteredCompletedJobsData.forEach((job: any) => {
            completedJobsMap.set(job.nrcJobNo, job);
          });

          const printingAcceptedStepIds = new Set<number>();
          filteredPrintingDetails.forEach((p) => {
            if (p.status !== "accept") return;
            const jid = Number(
              (p as { jobStepId?: number | string }).jobStepId,
            );
            if (Number.isFinite(jid) && jid > 0) {
              printingAcceptedStepIds.add(jid);
            }
          });

          const localJobData: Array<{
            jobPlan: JobPlan;
            step: ProductionStep;
          }> = [];

          filteredJobPlansData.forEach((jobPlan) => {
            const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
            const allStepDetails =
              (completedJob as any)?.allStepDetails ||
              (jobPlan as any).allStepDetails;

            const matchingSteps = jobPlan.steps.filter((step) => {
              if (stepKey === "flapPasting") {
                if (!isFlapPastingStepName(step.stepName)) return false;
              } else if (step.stepName !== targetStepName) {
                return false;
              }

              // Use the same hasAcceptStatus logic as counting
              const hasAcceptStatus = () => {
                // FIRST: Check stepDetails.data[stepName].status
                if ((step as any).stepDetails?.data) {
                  const stepDataKey =
                    step.stepName === "FluteLaminateBoardConversion"
                      ? "flutelam"
                      : isFlapPastingStepName(step.stepName)
                        ? "sideFlapPasting"
                        : step.stepName === "PrintingDetails"
                          ? "printingDetails"
                          : step.stepName === "QualityDept"
                            ? "qualityDept"
                            : step.stepName.toLowerCase();

                  const stepData = ((step as any).stepDetails.data as any)[
                    stepDataKey
                  ];
                  if (stepData && stepData.status === "accept") {
                    return true;
                  }
                }

                // SECOND: Check stepDetails.data.status
                if ((step as any).stepDetails?.data?.status === "accept") {
                  return true;
                }
                if ((step as any).stepDetails?.status === "accept") {
                  return true;
                }

                // THIRD: Check allStepDetails
                if (allStepDetails) {
                  const stepDetailKey =
                    step.stepName === "FluteLaminateBoardConversion"
                      ? "flutelam"
                      : isFlapPastingStepName(step.stepName)
                        ? "sideFlapPasting"
                        : step.stepName === "PrintingDetails"
                          ? "printingDetails"
                          : step.stepName === "QualityDept"
                            ? "qualityDept"
                            : step.stepName.toLowerCase();

                  const stepDetails =
                    allStepDetails[
                      stepDetailKey as keyof typeof allStepDetails
                    ];
                  if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                    if (
                      stepDetails.some(
                        (detail: any) => detail.status === "accept",
                      )
                    ) {
                      return true;
                    }
                  }
                }

                // FOURTH: Check step-level details
                const stepDetailProp =
                  step.stepName === "FluteLaminateBoardConversion"
                    ? "flutelam"
                    : isFlapPastingStepName(step.stepName)
                      ? "sideFlapPasting"
                      : step.stepName === "PrintingDetails"
                        ? "printingDetails"
                        : step.stepName === "QualityDept"
                          ? "qualityDept"
                          : step.stepName.toLowerCase();

                const stepDetails = (step as any)[stepDetailProp];
                if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                  if (
                    stepDetails.some(
                      (detail: any) => detail.status === "accept",
                    )
                  ) {
                    return true;
                  }
                }

                return false;
              };

              // Filter by status using the same logic as counting
              if (status === "completed") {
                // step.status can be "accept" but not "completed" (TypeScript type)
                if (step.status === "accept") {
                  return true;
                }
                if (
                  step.stepName === "PrintingDetails" &&
                  printingAcceptedStepIds.has(Number(step.id))
                ) {
                  return true;
                }
                if (step.status === "stop" && hasAcceptStatus()) {
                  return true;
                }
                return false;
              }

              if (status === "stop") {
                if (step.status === "stop" && !hasAcceptStatus()) {
                  return true;
                }
                return false;
              }

              if (status === "start") {
                // For Start Jobs view, show only true 'start' status steps
                return step.status === "start";
              }

              if (status === "in_progress") {
                // For In Progress view, include 'start' and 'stop' without accept
                if (step.status === "start") return true;
                if (step.status === "stop" && !hasAcceptStatus()) return true;
                return false;
              }

              // For planned, return steps with planned status
              return step.status === status;
            });

            matchingSteps.forEach((step) => {
              localJobData.push({
                jobPlan: jobPlan as JobPlan,
                step: step as ProductionStep,
              });
            });
          });

          jobData = localJobData;
          title = `${stepName} - ${
            status.charAt(0).toUpperCase() + status.slice(1)
          } Jobs`;
        }
      }

      // 🔥 DEBUG: Log before completed/stopped filtering
      if (status === "completed" && stepKey === "corrugation") {
        console.log(
          `[handleStatusCardClick] BEFORE COMPLETED FILTER - Corrugation Completed`,
          {
            count: jobData.length,
            jobs: jobData.map((item) => {
              const step = item.step;
              // Check accept status using the same logic
              const hasAccept = (() => {
                if (step.stepDetails?.data) {
                  const stepData = (step.stepDetails.data as any).corrugation;
                  if (stepData && stepData.status === "accept") return true;
                }
                if ((step.stepDetails as any)?.data?.status === "accept")
                  return true;
                if ((step.stepDetails as any)?.status === "accept") return true;
                const allStepDetails = (item.jobPlan as any).allStepDetails;
                if (allStepDetails?.corrugation) {
                  if (
                    Array.isArray(allStepDetails.corrugation) &&
                    allStepDetails.corrugation.some(
                      (d: any) => d.status === "accept",
                    )
                  )
                    return true;
                }
                return false;
              })();

              return {
                nrcJobNo: item.jobPlan.nrcJobNo,
                jobPlanId: item.jobPlan.jobPlanId,
                stepId: step.id,
                stepStatus: step.status,
                hasAcceptStatus: hasAccept,
                stepDetails: step.stepDetails,
                stepDetailsData: (step.stepDetails as any)?.data,
                stepDetailsDataCorrugation: (step.stepDetails as any)?.data
                  ?.corrugation,
                stepDetailsDataCorrugationStatus: (step.stepDetails as any)
                  ?.data?.corrugation?.status,
                allStepDetails: (item.jobPlan as any).allStepDetails,
                allStepDetailsCorrugation: (item.jobPlan as any).allStepDetails
                  ?.corrugation,
              };
            }),
          },
        );
      }

      // Apply additional filtering to ensure completed/stopped logic matches the counting logic
      // Skip when we already used completedJobsByStep (card count and modal list are already in sync)
      if (status === "completed" && !usedCompletedList) {
        // Filter to only include steps that should be counted as completed
        // This includes: status === "accept", status === "completed", or status === "stop" with accept
        const beforeFilterCount = jobData.length;
        const filteredOutJobs: any[] = [];

        jobData = jobData.filter((item) => {
          const step = item.step;

          // Check if step has accept status using the EXACT same logic as counting in filteredAggregatedData
          const hasAcceptStatus = () => {
            // If the step.status itself is "accept", always treat as completed (matches counting logic)
            if ((step.status as any) === "accept") {
              return true;
            }

            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            // This is the most direct way to check accept status for each step
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : isFlapPastingStepName(step.stepName)
                    ? "sideFlapPasting"
                    : step.stepName === "PrintingDetails"
                      ? "printingDetails"
                      : step.stepName === "QualityDept"
                        ? "qualityDept"
                        : step.stepName.toLowerCase();

              const stepData = ((step as any).stepDetails.data as any)[
                stepDataKey
              ];
              if (stepData && stepData.status === "accept") {
                return true;
              }
            }

            // SECOND: Check stepDetails.data.status (fallback)
            if ((step as any).stepDetails?.data?.status === "accept") {
              return true;
            }
            if ((step as any).stepDetails?.status === "accept") {
              return true;
            }

            // THIRD: Check allStepDetails (same as counting logic)
            const allStepDetails = (item.jobPlan as any).allStepDetails;
            if (allStepDetails) {
              const stepDetailKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : isFlapPastingStepName(step.stepName)
                    ? "sideFlapPasting"
                    : step.stepName.toLowerCase();

              const stepDetails =
                allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                if (
                  stepDetails.some((detail: any) => detail.status === "accept")
                ) {
                  return true;
                }
              }
            }

            // FOURTH: Check step-level details (direct properties on step) - same as counting logic
            const stepDetailProp =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : isFlapPastingStepName(step.stepName)
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();

            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              if (
                stepDetails.some((detail: any) => detail.status === "accept")
              ) {
                return true;
              }
            }

            return false;
          };

          // Include if status is accept (step.status type doesn't include "completed")
          if (step.status === "accept") {
            return true;
          }

          // Include if status is stop but has accept status
          const hasAccept = hasAcceptStatus();
          if (step.status === "stop" && hasAccept) {
            return true;
          }

          // Log filtered out jobs for debugging
          if (stepKey === "corrugation") {
            filteredOutJobs.push({
              nrcJobNo: item.jobPlan.nrcJobNo,
              jobPlanId: item.jobPlan.jobPlanId,
              stepId: step.id,
              stepStatus: step.status,
              hasAcceptStatus: hasAccept,
              stepDetails: step.stepDetails,
              stepDetailsData: (step.stepDetails as any)?.data,
              stepDetailsDataCorrugation: (step.stepDetails as any)?.data
                ?.corrugation,
              allStepDetails: (item.jobPlan as any).allStepDetails,
              reason:
                step.status === "stop" && !hasAccept
                  ? "stop without accept"
                  : "other",
            });
          }

          return false;
        });

        // 🔥 DEBUG: Log after completed filtering for Corrugation
        if (stepKey === "corrugation") {
          console.log(
            `[handleStatusCardClick] AFTER COMPLETED FILTER - Corrugation Completed`,
            {
              beforeFilterCount,
              afterFilterCount: jobData.length,
              filteredOutCount: filteredOutJobs.length,
              filteredOutJobs,
              remainingJobs: jobData.map((item) => ({
                nrcJobNo: item.jobPlan.nrcJobNo,
                jobPlanId: item.jobPlan.jobPlanId,
                stepId: item.step.id,
                stepStatus: item.step.status,
              })),
            },
          );
        }
      } else if (status === "stop") {
        // Filter to only include steps that should be counted as stopped
        // This excludes steps with status === "stop" that have accept status
        jobData = jobData.filter((item) => {
          const step = item.step;

          // Check if step has accept status using the same logic as counting
          const hasAcceptStatus = () => {
            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : isFlapPastingStepName(step.stepName)
                    ? "sideFlapPasting"
                    : step.stepName === "PrintingDetails"
                      ? "printingDetails"
                      : step.stepName === "QualityDept"
                        ? "qualityDept"
                        : step.stepName.toLowerCase();

              const stepData = ((step as any).stepDetails.data as any)[
                stepDataKey
              ];
              if (stepData && stepData.status === "accept") {
                return true;
              }
            }

            // SECOND: Check stepDetails.data.status (fallback)
            if ((step as any).stepDetails?.data?.status === "accept") {
              return true;
            }
            if ((step as any).stepDetails?.status === "accept") {
              return true;
            }

            return false;
          };

          // Only include if status is stop AND does NOT have accept status
          if (step.status === "stop" && !hasAcceptStatus()) {
            return true;
          }

          return false;
        });
      }

      // 🔥 DEBUG: Log before date filtering
      console.log(
        `[handleStatusCardClick] BEFORE DATE FILTER - Status: ${status}, Step: ${stepName}, Count: ${jobData.length}`,
        {
          jobs: jobData.map((item) => ({
            nrcJobNo: item.jobPlan.nrcJobNo,
            jobPlanId: item.jobPlan.jobPlanId,
            stepId: item.step.id,
            stepStatus: item.step.status,
            stepUpdatedAt: (item.step as any).updatedAt,
            stepStartDate: item.step.startDate,
            stepEndDate: item.step.endDate,
            jobCreatedAt: (item.jobPlan as any).createdAt,
          })),
        },
      );

      // Apply date filter to the results - filter based on the specific step's date
      // Skip when we used completedJobsByStep (that list is already date-filtered in filteredAggregatedData)
      const dateRange = getDateRange(dateFilter, customDateRange);
      if (dateRange && !usedCompletedList) {
        const { startDate, endDate } = dateRange;
        const beforeFilterCount = jobData.length;
        const filteredOutJobs: any[] = [];

        jobData = jobData.filter((item) => {
          const step = item.step;
          const jobPlan = item.jobPlan;

          // 🔥 SPECIAL HANDLING: For completed Corrugation steps, check stepDetails.data.corrugation.date first
          // This is the actual completion date when status is "accept"
          if (
            status === "completed" &&
            step.stepName === "Corrugation" &&
            (step.stepDetails as any)?.data?.corrugation?.date
          ) {
            const completionDate = new Date(
              (step.stepDetails as any).data.corrugation.date,
            );
            if (isDateInRange(completionDate, startDate, endDate)) {
              return true;
            }
          }

          // Use the same logic as filteredJobPlansData: check step updatedAt first
          if ((step as any).updatedAt) {
            const stepUpdateDate = new Date((step as any).updatedAt);
            if (isDateInRange(stepUpdateDate, startDate, endDate)) {
              return true;
            }
          }

          // Also check the job plan's step updatedAt (in case step.updatedAt is not available)
          const jobPlanStep = jobPlan.steps.find((s) => s.id === step.id);
          if (jobPlanStep && (jobPlanStep as any).updatedAt) {
            const stepUpdateDate = new Date((jobPlanStep as any).updatedAt);
            if (isDateInRange(stepUpdateDate, startDate, endDate)) {
              return true;
            }
          }

          // Check step start date
          if (step.startDate) {
            const stepStartDate = new Date(step.startDate);
            if (isDateInRange(stepStartDate, startDate, endDate)) {
              return true;
            }
          }

          // Check step end date (for completed/stopped steps)
          if (step.endDate) {
            const stepEndDate = new Date(step.endDate);
            if (isDateInRange(stepEndDate, startDate, endDate)) {
              return true;
            }
          }

          // Fall back to job creation date if step dates are not available
          // This matches the logic in filteredJobPlansData
          const jobDate = new Date((jobPlan as any).createdAt || Date.now());
          const isInRange = isDateInRange(jobDate, startDate, endDate);

          if (!isInRange) {
            filteredOutJobs.push({
              nrcJobNo: jobPlan.nrcJobNo,
              jobPlanId: jobPlan.jobPlanId,
              stepId: step.id,
              stepStatus: step.status,
              stepUpdatedAt: (step as any).updatedAt,
              stepStartDate: step.startDate,
              stepEndDate: step.endDate,
              stepDetailsDataCorrugationDate: (step.stepDetails as any)?.data
                ?.corrugation?.date,
              jobCreatedAt: (jobPlan as any).createdAt,
              reason: "Date filter excluded",
            });
          }

          return isInRange;
        });

        // 🔥 DEBUG: Log after date filtering
        console.log(
          `[handleStatusCardClick] AFTER DATE FILTER - Status: ${status}, Step: ${stepName}`,
          {
            beforeFilterCount,
            afterFilterCount: jobData.length,
            filteredOutCount: filteredOutJobs.length,
            dateRange: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              filterType: dateFilter,
            },
            filteredOutJobs,
            remainingJobs: jobData.map((item) => ({
              nrcJobNo: item.jobPlan.nrcJobNo,
              jobPlanId: item.jobPlan.jobPlanId,
              stepId: item.step.id,
              stepStatus: item.step.status,
            })),
          },
        );
      }

      // Console log for debugging
      console.log(
        `[handleStatusCardClick] FINAL - Status: ${status}, Step: ${stepName}, Filtered Count: ${jobData.length}`,
        jobData,
      );

      setModalJobData(jobData);
      setModalTitle(title);
      setShowJobDetailsModal(true);
    } catch (error) {
      console.error("Error loading job details:", error);
      setError("Failed to load job details. Please try again.");
    } finally {
      setIsLoadingModalData(false);
    }
  };

  console.log("productionData:", aggregatedData);

  return (
    <div className="min-h-screen sm:p-6 lg:p-8">
      {/* Header */}
      <div className="bg-[#00AEEF] rounded-lg text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            {/* Left side */}
            <div>
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <CogIcon className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    Production Head Dashboard
                  </h1>
                  <p className="text-blue-100">
                    Monitor and manage production operations across all jobs
                  </p>
                </div>
              </div>

              {/* Auth Status (mobile & tablet only) */}
              {authStatus && (
                <div
                  className={`mt-3 px-3 py-2 rounded-lg text-sm font-medium lg:hidden ${
                    authStatus.isAuthenticated
                      ? authStatus.message.includes("expiring")
                        ? "bg-yellow-500/20 text-yellow-100"
                        : "bg-green-500/20 text-green-100"
                      : "bg-red-500/20 text-red-100"
                  }`}
                >
                  {authStatus.message}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              {/* Auth Status (desktop only) */}
              {authStatus && (
                <div
                  className={`px-3 py-2 rounded-lg text-sm font-medium hidden lg:block ${
                    authStatus.isAuthenticated
                      ? authStatus.message.includes("expiring")
                        ? "bg-yellow-500/20 text-yellow-100"
                        : "bg-green-500/20 text-green-100"
                      : "bg-red-500/20 text-red-100"
                  }`}
                >
                  {authStatus.message}
                </div>
              )}

              {/* Refresh Button: reload dashboard job data + aggregated data */}
              <button
                onClick={async () => {
                  try {
                    setIsLoadingAggregated(true);
                    setError(null);
                    const [data] = await Promise.all([
                      productionService.getAggregatedProductionData(),
                      (async () => {
                        await fetchProductionDashboardData(
                          dateFilter,
                          customDateRange,
                        );
                      })(),
                    ]);
                    setAggregatedData(data);
                    if (productionDashboardCache) {
                      productionDashboardCache.aggregatedData = data;
                    }
                  } catch (error) {
                    console.error("Error refreshing data:", error);
                    setError(
                      "Failed to refresh production data. Please try again.",
                    );
                  } finally {
                    setIsLoadingAggregated(false);
                  }
                }}
                className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingAggregated}
              >
                {isLoadingAggregated ? (
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

              {/* Last Updated */}
              <div className="bg-white/20 px-4 py-2 rounded-lg">
                <span className="text-sm">
                  Last Updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DateFilterComponent
                dateFilter={dateFilter}
                setDateFilter={(filter) => {
                  setDateFilter(filter);
                  handleProductionFilterChange(filter);
                }}
                customDateRange={customDateRange}
                setCustomDateRange={(range) => {
                  setCustomDateRange(range);
                  handleProductionFilterChange("custom", range);
                }}
                className="w-full"
              />
            </div>
            {/* Major Hold Jobs – in filter row */}
            <button
              type="button"
              onClick={() => navigate("/dashboard/major-hold-jobs")}
              title="View and resume major hold jobs"
              className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00AEEF] text-red-500 shrink-0"
            >
              <ExclamationTriangleIcon
                className={`h-6 w-6 ${majorHoldJobsCount > 0 ? "animate-pulse" : ""}`}
              />
              {majorHoldJobsCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {majorHoldJobsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Job Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoadingJobStats ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" text="Loading job statistics..." />
          </div>
        ) : (
          <StatisticsGrid
            totalJobs={
              filteredJobStats.plannedJobs +
              filteredJobStats.inProgressJobs +
              filteredJobStats.completedJobs +
              heldJobsCount
            }
            completedJobs={filteredJobStats.completedJobs}
            inProgressJobs={filteredJobStats.inProgressJobs}
            plannedJobs={filteredJobStats.plannedJobs}
            activeUsers={filteredJobStats.activeUsers}
            heldJobs={heldJobsCount}
            onTotalJobsClick={undefined}
            onCompletedJobsClick={handleCompletedJobsClick}
            onInProgressJobsClick={handleInProgressJobsClick}
            onPlannedJobsClick={handlePlannedJobsClick}
            onHeldJobsClick={handleHeldJobsClick}
          />
        )}
      </div>

      {/* Completed Jobs Summary — same visibility as Admin: only when date-filtered completed jobs exist */}
      {!isLoadingJobStats && filteredCompletedJobsData.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-[#00AEEF] px-6 py-4">
              <div className="flex items-center gap-3">
                <CurrencyRupeeIcon className="h-8 w-8 shrink-0 text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Completed Jobs Summary
                  </h2>
                  <p className="text-blue-100 text-sm">
                    Daily Production &amp; Revenue Tracking
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <CalendarDaysIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by date..."
                    value={completedSummaryDateFilter}
                    onChange={(e) =>
                      setCompletedSummaryDateFilter(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by customer..."
                    value={completedSummaryCustomerFilter}
                    onChange={(e) =>
                      setCompletedSummaryCustomerFilter(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by unit..."
                    value={completedSummaryUnitFilter}
                    onChange={(e) =>
                      setCompletedSummaryUnitFilter(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {(
                      [
                        ["recordDateIso", "Date"],
                        ["customerName", "Customer Name"],
                        ["unitLabel", "Unit"],
                        ["dispatchDateIso", "Dispatch Date"],
                        ["dispatchQty", "Dispatch Qty"],
                        ["totalValue", "Total Value"],
                      ] as const
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
                        onClick={() =>
                          handleCompletedSummarySort(
                            key as keyof CompletedJobSummaryRow,
                          )
                        }
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          <span className="text-gray-400 font-normal">
                            {completedSummarySort.key === key
                              ? completedSummarySort.dir === "asc"
                                ? "↑"
                                : "↓"
                              : "↕"}
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedJobsSummaryFilteredSorted.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-gray-500"
                      >
                        No completed jobs match these filters
                        {completedSummaryDateFilter ||
                        completedSummaryCustomerFilter ||
                        completedSummaryUnitFilter
                          ? " — try adjusting filters"
                          : ""}
                        .
                      </td>
                    </tr>
                  ) : (
                    completedJobsSummaryFilteredSorted.map((row, index) => {
                      /** Same row/value styling as Admin CompletedJobsTable */
                      const rowBg =
                        row.totalValue > 10000
                          ? "bg-green-50"
                          : row.totalValue > 5000
                            ? "bg-yellow-50"
                            : "";
                      const valueClass =
                        row.totalValue > 10000
                          ? "text-green-600 font-bold"
                          : row.totalValue > 5000
                            ? "text-yellow-600 font-bold"
                            : "text-gray-900 font-bold";
                      return (
                        <tr
                          key={`${row.id}-${row.nrcJobNo}-${index}`}
                          className={`hover:bg-gray-50 transition-colors ${rowBg}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.recordDateDisplay}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate"
                            title={row.customerName}
                          >
                            {row.customerName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {row.unitLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {row.dispatchDateDisplay}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums">
                            {row.dispatchQty.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                            <span className={`text-sm ${valueClass}`}>
                              {formatInr(row.totalValue)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                <span>
                  Showing {completedJobsSummaryFilteredSorted.length} of{" "}
                  {completedJobsSummaryRows.length} completed jobs
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">
                  Total Revenue: {formatInr(completedJobsSummaryTotalRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tables Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center">
        <div className="bg-white rounded-lg border border-gray-200 p-1 flex w-fit">
          <button
            onClick={() => setActiveMainTab("jobCards")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeMainTab === "jobCards"
                ? "bg-[#00AEEF] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Job Cards Overview
          </button>

          <button
            onClick={() => setActiveMainTab("printing")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              activeMainTab === "printing"
                ? "bg-[#00AEEF] text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Printing Details
          </button>
        </div>
      </div>

      {/* Job Cards Overview */}
      {activeMainTab === "jobCards" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 sm:mb-0">
                Job Cards Overview
              </h3>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search job plans..."
                    value={jobCardsSearchTerm}
                    onChange={(e) => setJobCardsSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF] w-full sm:w-64"
                  />
                </div>

                {/* Demand Filter */}
                <select
                  value={jobCardsDemandFilter}
                  onChange={(e) =>
                    setJobCardsDemandFilter(e.target.value as any)
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
                >
                  <option value="all">All Demands</option>
                  <option value="high">Urgent</option>
                  <option value="medium">Regular</option>
                </select>

                {/* Status Filter */}
                <select
                  value={jobCardsStatusFilter}
                  onChange={(e) =>
                    setJobCardsStatusFilter(e.target.value as any)
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="inProgress">In Progress</option>
                  <option value="majorHold">Major Hold</option>
                  <option value="planned">Planned</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Demand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Filter job plans based on search and filters
                    const filteredJobCards = filteredJobPlansData.filter(
                      (jobPlan) => {
                        const matchesSearch = jobPlan.nrcJobNo
                          .toLowerCase()
                          .includes(jobCardsSearchTerm.toLowerCase());

                        const jobDemand =
                          (jobPlan as any).jobDemand?.toLowerCase() || "";
                        const matchesDemand =
                          jobCardsDemandFilter === "all" ||
                          (jobCardsDemandFilter === "low" &&
                            jobDemand === "low") ||
                          (jobCardsDemandFilter === "medium" &&
                            jobDemand === "medium") ||
                          (jobCardsDemandFilter === "high" &&
                            jobDemand === "high");

                        let matchesStatus = true;
                        if (jobCardsStatusFilter !== "all") {
                          const stepStatuses = jobPlan.steps.map((step) =>
                            getStepActualStatus(step),
                          );
                          const hasInProgress = stepStatuses.some(
                            (status) => status === "in_progress",
                          );
                          const hasHold = stepStatuses.some(
                            (status) => status === "hold",
                          );
                          const allCompleted = stepStatuses.every(
                            (status) => status === "completed",
                          );

                          if (jobCardsStatusFilter === "completed")
                            matchesStatus = allCompleted;
                          else if (jobCardsStatusFilter === "majorHold")
                            matchesStatus = hasMajorHold(jobPlan);
                          else if (jobCardsStatusFilter === "inProgress")
                            matchesStatus =
                              (hasInProgress || hasHold) &&
                              !hasMajorHold(jobPlan);
                          else if (jobCardsStatusFilter === "planned")
                            matchesStatus =
                              !hasInProgress && !hasHold && !allCompleted;
                        }

                        return matchesSearch && matchesDemand && matchesStatus;
                      },
                    );

                    const getProgressPercentage = (
                      jobPlan: JobPlanForStats,
                    ) => {
                      const completedSteps = jobPlan.steps.filter(
                        (step) => getStepActualStatus(step) === "completed",
                      ).length;
                      const totalSteps = jobPlan.steps.length;
                      return totalSteps > 0
                        ? (completedSteps / totalSteps) * 100
                        : 0;
                    };

                    // Sort by progress descending (highest progress first), same as Admin Dashboard
                    const sortedJobCards = [...filteredJobCards].sort(
                      (a, b) =>
                        getProgressPercentage(b) - getProgressPercentage(a),
                    );

                    const getJobStatus = (jobPlan: JobPlanForStats) => {
                      const stepStatuses = jobPlan.steps.map((step) =>
                        getStepActualStatus(step),
                      );
                      const hasInProgress = stepStatuses.some(
                        (status) => status === "in_progress",
                      );
                      const hasHold = stepStatuses.some(
                        (status) => status === "hold",
                      );
                      const allCompleted = stepStatuses.every(
                        (status) => status === "completed",
                      );

                      if (allCompleted)
                        return {
                          text: "Completed",
                          color: "bg-green-100 text-green-800",
                        };
                      if (hasMajorHold(jobPlan))
                        return {
                          text: "Major Hold",
                          color: "bg-red-100 text-red-800",
                        };
                      if (hasInProgress || hasHold)
                        return {
                          text: "In Progress",
                          color: "bg-yellow-100 text-yellow-800",
                        };
                      return {
                        text: "Planned",
                        color: "bg-gray-100 text-gray-800",
                      };
                    };

                    const formatDate = (dateString: string | null) => {
                      if (!dateString) return "-";
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return sortedJobCards.length > 0 ? (
                      sortedJobCards.map((jobPlan) => {
                        const status = getJobStatus(jobPlan);
                        const progressPercentage =
                          getProgressPercentage(jobPlan);
                        const jobDemand = (jobPlan as any).jobDemand || "low";

                        return (
                          <tr
                            key={jobPlan.jobPlanId}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {jobPlan.nrcJobNo}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {(jobPlan as any).jobPlanCode
                                    ? `Job Plan Code: ${(jobPlan as any).jobPlanCode}`
                                    : `ID: ${jobPlan.jobPlanId}`}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  jobDemand === "high"
                                    ? "bg-red-100 text-red-800"
                                    : jobDemand === "medium"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {jobDemand === "high"
                                  ? "Urgent"
                                  : jobDemand === "medium"
                                    ? "Regular"
                                    : jobDemand}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-[#00AEEF] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progressPercentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {Math.round(progressPercentage)}%
                                </span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {
                                  jobPlan.steps.filter(
                                    (step) =>
                                      getStepActualStatus(step) === "completed",
                                  ).length
                                }
                                /{jobPlan.steps.length} steps
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                              >
                                {status.text}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate((jobPlan as any).createdAt)}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleViewSteps(jobPlan)}
                                className="text-[#00AEEF] hover:text-[#0099cc] transition-colors duration-200 flex items-center space-x-1"
                              >
                                <EyeIcon className="h-4 w-4" />
                                <span>View Steps</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center">
                          <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">
                            No job plans found matching your criteria.
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Try adjusting your search or filters.
                          </p>
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printing Details Table */}
      {activeMainTab === "printing" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Printing Details
                </h3>
                <p className="text-sm text-gray-600">
                  All printing jobs - Continue completed jobs to production
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-48">
                  <label htmlFor="printing-details-status" className="sr-only">
                    Filter by status
                  </label>
                  <select
                    id="printing-details-status"
                    value={printingDetailsStatusFilter}
                    onChange={(e) =>
                      setPrintingDetailsStatusFilter(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF] bg-white"
                  >
                    <option value="">All statuses</option>
                    <option value="accept">Printed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="planned">Planned</option>
                    <option value="hold">On Hold</option>
                    <option value="major_hold">Major Hold</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="w-full sm:w-72">
                  <label htmlFor="printing-details-search" className="sr-only">
                    Search by Job Plan Code or NRC Job Number
                  </label>
                  <input
                    id="printing-details-search"
                    type="text"
                    placeholder="Search by Job Plan Code or NRC Job No..."
                    value={printingDetailsSearchTerm}
                    onChange={(e) =>
                      setPrintingDetailsSearchTerm(e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
                  />
                </div>
              </div>
            </div>

            {isLoadingPrintingDetails ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" text="Loading printing details..." />
              </div>
            ) : printingDetailsError ? (
              <div className="text-center py-8 text-red-500">
                {printingDetailsError}
              </div>
            ) : (
              <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job No
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      const searchLower = printingDetailsSearchTerm
                        .trim()
                        .toLowerCase();
                      const statusFilter = printingDetailsStatusFilter.trim();
                      let filteredPrinting =
                        searchLower === ""
                          ? filteredPrintingDetails
                          : filteredPrintingDetails.filter((p) => {
                              const nrc = (p.jobNrcJobNo ?? "").toLowerCase();
                              const code = (p.jobPlanCode ?? "").toLowerCase();
                              return (
                                nrc.includes(searchLower) ||
                                code.includes(searchLower)
                              );
                            });
                      // Apply status filter
                      if (statusFilter !== "") {
                        filteredPrinting = filteredPrinting.filter((p) => {
                          const displayStatus =
                            p.stepStatus === "start" && p.status === "pending"
                              ? "in_progress"
                              : p.status;
                          if (statusFilter === "planned") {
                            return (
                              displayStatus === "pending" ||
                              (displayStatus as string) === "planned"
                            );
                          }
                          return displayStatus === statusFilter;
                        });
                      }
                      // Sort: Printed (accept) first, then In Progress, then Planned
                      const getStatusSortOrder = (
                        p: (typeof filteredPrinting)[0],
                      ) => {
                        const status =
                          p.stepStatus === "start" && p.status === "pending"
                            ? "in_progress"
                            : p.status;
                        if (status === "accept") return 0;
                        if (
                          status === "in_progress" ||
                          p.stepStatus === "start"
                        )
                          return 1;
                        if (
                          status === "pending" ||
                          (status as string) === "planned"
                        )
                          return 2;
                        return 3;
                      };
                      const sortedPrinting = [...filteredPrinting].sort(
                        (a, b) => getStatusSortOrder(a) - getStatusSortOrder(b),
                      );

                      if (filteredPrinting.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center">
                              <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">
                                {printingDetails.length === 0
                                  ? "No printing details found"
                                  : "No jobs match your search or status filter"}
                              </p>
                            </td>
                          </tr>
                        );
                      }
                      return sortedPrinting.map((printing) => {
                        const formatDate = (dateString: string | null) => {
                          if (!dateString) return "-";
                          try {
                            const date = new Date(dateString);
                            const day = String(date.getDate()).padStart(2, "0");
                            const month = String(date.getMonth() + 1).padStart(
                              2,
                              "0",
                            );
                            const year = date.getFullYear();
                            return `${day}/${month}/${year}`;
                          } catch {
                            return "-";
                          }
                        };

                        const getStatusInfo = (status: string) => {
                          switch (status) {
                            case "accept":
                              return {
                                label: "Printed",
                                color: "bg-green-100 text-green-800",
                              };
                            case "in_progress":
                              return {
                                label: "In Progress",
                                color: "bg-yellow-100 text-yellow-800",
                              };
                            case "pending":
                              return {
                                label: "Pending",
                                color: "bg-gray-100 text-gray-800",
                              };
                            case "hold":
                              return {
                                label: "On Hold",
                                color: "bg-orange-100 text-orange-800",
                              };
                            case "major_hold":
                              return {
                                label: "Major Hold",
                                color: "bg-red-100 text-red-800",
                              };
                            case "rejected":
                              return {
                                label: "Rejected",
                                color: "bg-red-100 text-red-800",
                              };
                            case "planned":
                              return {
                                label: "Planned",
                                color: "bg-gray-100 text-gray-800",
                              };
                            default:
                              return {
                                label: status,
                                color: "bg-gray-100 text-gray-800",
                              };
                          }
                        };

                        const displayStatus =
                          printing.stepStatus === "start" &&
                          printing.status === "pending"
                            ? "in_progress"
                            : printing.status;
                        const statusInfo = getStatusInfo(displayStatus);

                        // Show button when:
                        // - Printing is in progress (step status = start), OR
                        // - Printing is accepted AND stopped (completed)
                        const isInProgress = printing.stepStatus === "start";
                        const isCompletedAndAccepted =
                          (printing.status === "accept" ||
                            displayStatus === "accept") &&
                          printing.stepStatus === "stop";

                        const alreadyContinued =
                          printing.productionHeadContinued === true ||
                          (typeof printing.jobStepId === "number" &&
                            continuedSteps[printing.jobStepId] === true);

                        const canShowContinueButton =
                          isInProgress || isCompletedAndAccepted;
                        const canContinue =
                          canShowContinueButton && !alreadyContinued;

                        // Use a stable, unique key: prefer jobStepId, fall back to combination
                        const rowKey =
                          typeof printing.jobStepId === "number" &&
                          printing.jobStepId > 0
                            ? `step-${printing.jobStepId}`
                            : `job-${printing.jobNrcJobNo}-${printing.id}`;

                        return (
                          <tr key={rowKey} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 font-mono">
                                {printing.jobNrcJobNo}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {printing.jobPlanCode || "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(
                                ((printing as any).deliveryDate as
                                  | string
                                  | null) || printing.date,
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm font-medium text-gray-900">
                                {printing.quantity?.toLocaleString() || "0"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}
                              >
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              {canShowContinueButton ? (
                                <button
                                  onClick={(e) => {
                                    if (!canContinue) return;
                                    e.stopPropagation();
                                    handleContinueToProduction(printing);
                                  }}
                                  disabled={!canContinue}
                                  className={`px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium ${
                                    canContinue
                                      ? "bg-[#00AEEF] hover:bg-[#0099cc] text-white"
                                      : "bg-gray-300 text-gray-600 cursor-not-allowed"
                                  }`}
                                >
                                  {alreadyContinued
                                    ? "Continued"
                                    : "Continue to Production"}
                                </button>
                              ) : printing.stepStatus === "stop" &&
                                printing.status !== "accept" ? (
                                <span className="text-green-600 text-sm font-medium">
                                  Completed
                                </span>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  Not Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <label
                htmlFor="jobSearch"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search Jobs by NRC Job No
              </label>
              <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 relative">
                <div className="flex-1 relative">
                  <input
                    id="jobSearch"
                    type="text"
                    placeholder="Type to search jobs (partial match supported)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                        setShowSuggestions(false);
                      }
                    }}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow click events
                      setTimeout(() => setShowSuggestions(false), 200);
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* Dropdown Suggestions */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchSuggestions.map((job, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setSearchTerm(job.nrcJobNo);
                            setShowSuggestions(false);
                            handleJobSelect(job.nrcJobNo);
                          }}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {job.nrcJobNo}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Demand: {job.jobDemand} • Steps:{" "}
                                {job.totalSteps}
                              </p>
                            </div>
                            {!job.hasProductionSteps && (
                              <span className="text-xs text-orange-600 font-medium ml-2">
                                ⚠️
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {searchSuggestions.length === 10 && (
                        <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-200">
                          Showing first 10 results. Type more to refine search.
                        </div>
                      )}
                    </div>
                  )}

                  {showSuggestions &&
                    searchTerm.trim() &&
                    searchSuggestions.length === 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3">
                        <p className="text-sm text-gray-500">
                          No jobs found matching "{searchTerm}"
                        </p>
                      </div>
                    )}
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchTerm.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>{isSearching ? "Searching..." : "Search"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Search Results:
              </h3>
              <div className="space-y-2">
                {searchResults.map((job, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {job.nrcJobNo}
                      </p>
                      <p className="text-sm text-gray-600">
                        Demand: {job.jobDemand} • Steps: {job.totalSteps}
                        {!job.hasProductionSteps && (
                          <span className="ml-2 text-orange-600 font-medium">
                            ⚠️ No Production Steps
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleJobSelect(job.nrcJobNo)}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          job.hasProductionSteps
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-gray-400 text-white cursor-not-allowed"
                        }`}
                        disabled={!job.hasProductionSteps}
                        title={
                          !job.hasProductionSteps
                            ? "This job has no production steps to view"
                            : "View production steps"
                        }
                      >
                        {job.hasProductionSteps
                          ? "View Production"
                          : "No Production Steps"}
                      </button>
                      <button
                        onClick={() => handleShowJobDetails(job.nrcJobNo)}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Job Info */}
          {selectedJob && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-blue-800">
                    Selected Job:
                  </span>
                  <span className="ml-2 text-sm text-blue-600 font-mono">
                    {selectedJob}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedJob("");
                    setProductionData({
                      corrugation: [],
                      fluteLamination: [],
                      punching: [],
                      flapPasting: [],
                    });
                  }}
                  className="text-blue-400 hover:text-blue-600 text-sm"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row sm:space-x-1 p-1 space-y-1 sm:space-y-0">
            {[
              {
                id: "overview",
                label: "Production Overview",
                icon: ChartBarIcon,
              },
              { id: "details", label: "Job Details", icon: DocumentTextIcon },
              {
                id: "analytics",
                label: "Analytics",
                icon: ArrowTrendingUpIcon,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[#00AEEF] text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg
                  className="h-5 w-5"
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
          </div>
        )}

        {/* Overview Tab - Aggregated Data */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Overall Efficiency
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {filteredAggregatedData?.overallEfficiency ||
                        aggregatedData?.overallEfficiency ||
                        0}
                      %
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${aggregatedData?.overallEfficiency || 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Jobs
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {filteredJobStats.totalJobs}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <DocumentTextIcon className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Jobs in system</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Production Steps
                    </p>
                    <p className="text-3xl font-bold text-purple-600">
                      {filteredAggregatedData
                        ? Object.values(
                            filteredAggregatedData.stepSummary,
                          ).reduce((total, step) => total + step.total, 0)
                        : 0}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-xl">
                    <UserGroupIcon className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">Across all jobs</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Active Steps
                    </p>
                    <p className="text-3xl font-bold text-orange-600">
                      {filteredAggregatedData
                        ? Object.values(
                            filteredAggregatedData.stepSummary,
                          ).reduce((total, step) => total + step.inProgress, 0)
                        : 0}
                    </p>
                  </div>
                  <div className="bg-orange-100 p-3 rounded-xl">
                    <CogIcon className="h-8 w-8 text-orange-600" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Currently in progress
                </p>
              </div>
            </div>

            {/* Production Steps Overview */}
            {/* Production Steps Overview - Make it clickable */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Production Steps Status Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    name: "Printing",
                    key: "printing",
                    color: "cyan",
                    icon: PrinterIcon,
                  },
                  {
                    name: "Corrugation",
                    key: "corrugation",
                    color: "blue",
                    icon: CogIcon,
                  },
                  {
                    name: "Flute Lamination",
                    key: "fluteLamination",
                    color: "green",
                    icon: BuildingOfficeIcon,
                  },
                  {
                    name: "Punching",
                    key: "punching",
                    color: "purple",
                    icon: DocumentTextIcon,
                  },
                  {
                    name: "Flap Pasting",
                    key: "flapPasting",
                    color: "orange",
                    icon: TruckIcon,
                  },
                  {
                    name: "Quality Checks",
                    key: "qualityDept",
                    color: "indigo",
                    icon: CheckCircleIcon,
                  },
                ].map((step, index) => {
                  const dataSource = filteredAggregatedData;
                  const stepKey = step.key as
                    | "corrugation"
                    | "fluteLamination"
                    | "punching"
                    | "flapPasting"
                    | "printing"
                    | "qualityDept";
                  const stepData = dataSource?.stepSummary[stepKey];

                  return (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`bg-${step.color}-100 p-2 rounded-lg`}>
                          <step.icon
                            className={`h-6 w-6 text-${step.color}-600`}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {step.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Production Step {index + 1}
                          </p>
                        </div>
                      </div>

                      {stepData ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* Completed - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "completed",
                                  step.name,
                                )
                              }
                              className="text-center p-2 bg-green-100 rounded hover:bg-green-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-green-800">
                                {stepData.completed}
                              </p>
                              <p className="text-green-600">Completed</p>
                            </button>

                            {/* In Progress - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "start",
                                  step.name,
                                )
                              }
                              className="text-center p-2 bg-blue-100 rounded hover:bg-blue-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-blue-800">
                                {stepData.start}
                              </p>
                              <p className="text-blue-600">In Progress</p>
                            </button>

                            {/* Planned - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "planned",
                                  step.name,
                                )
                              }
                              className="text-center p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-gray-800">
                                {stepData.planned}
                              </p>
                              <p className="text-gray-600">Planned</p>
                            </button>

                            {/* Stopped - Clickable */}
                            <button
                              onClick={() =>
                                handleStatusCardClick(
                                  step.key,
                                  "stop",
                                  step.name,
                                )
                              }
                              className="text-center p-2 bg-yellow-100 rounded hover:bg-yellow-200 transition-colors cursor-pointer"
                              disabled={isLoadingModalData}
                            >
                              <p className="font-semibold text-yellow-800">
                                {stepData.stop}
                              </p>
                              <p className="text-yellow-600">Stopped</p>
                            </button>
                          </div>
                          <div className="text-center pt-2 border-t border-gray-200">
                            <p className="text-sm font-semibold text-gray-900">
                              Total: {stepData.total}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">
                            No data available
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Job Details Tab */}
        {activeTab === "details" && (
          <div className="space-y-6">
            {selectedJob ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Production Details - {selectedJob}
                </h2>

                {/* Check if job has production steps */}
                {(() => {
                  const hasProductionSteps =
                    productionData.corrugation.length > 0 ||
                    productionData.fluteLamination.length > 0 ||
                    productionData.punching.length > 0 ||
                    productionData.flapPasting.length > 0;

                  if (!hasProductionSteps) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center space-x-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                          <div>
                            <h3 className="text-sm font-medium text-yellow-800">
                              No Production Steps Found
                            </h3>
                            <p className="text-sm text-yellow-700">
                              This job doesn't contain the 4 production steps
                              (Corrugation, Flute Lamination, Punching, Flap
                              Pasting). It may be a different type of job or use
                              different step names.
                            </p>
                            <p className="text-sm text-yellow-600 mt-1">
                              Use the "View Details" button to see all steps for
                              this job.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {isLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner
                      size="md"
                      text="Loading production data..."
                    />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[
                      {
                        name: "Corrugation",
                        data: productionData.corrugation,
                        color: "blue",
                        icon: CogIcon,
                      },
                      {
                        name: "Flute Lamination",
                        data: productionData.fluteLamination,
                        color: "green",
                        icon: BuildingOfficeIcon,
                      },
                      {
                        name: "Punching",
                        data: productionData.punching,
                        color: "purple",
                        icon: DocumentTextIcon,
                      },
                      {
                        name: "Flap Pasting",
                        data: productionData.flapPasting,
                        color: "orange",
                        icon: TruckIcon,
                      },
                    ].map((step, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-3 mb-4">
                          <div
                            className={`bg-${step.color}-100 p-2 rounded-lg`}
                          >
                            <step.icon
                              className={`h-6 w-6 text-${step.color}-600`}
                            />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {step.name}
                          </h3>
                        </div>

                        {step.data.length > 0 ? (
                          <div className="space-y-3">
                            {step.data.map((stepDetail, stepIndex) => (
                              <div
                                key={stepIndex}
                                className="bg-gray-50 rounded-lg p-3"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                                      stepDetail.status,
                                    )}`}
                                  >
                                    {getStatusIcon(stepDetail.status)}
                                    <span className="ml-1">
                                      {stepDetail.status}
                                    </span>
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    Step {stepDetail.stepNo}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600">
                                      Started:{" "}
                                      {formatDate(stepDetail.startDate)}
                                    </p>
                                    <p className="text-gray-600">
                                      Ended: {formatDate(stepDetail.endDate)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600">
                                      Operator:{" "}
                                      {stepDetail.user
                                        ? getUserName(stepDetail.user)
                                        : "Not assigned"}
                                    </p>
                                    <p className="text-gray-600">
                                      Machine:{" "}
                                      {stepDetail.machineDetails[0]
                                        ?.machineType || "Not assigned"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-gray-500">
                              No {step.name} steps found for this job
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Job Selected
                </h3>
                <p className="text-gray-600 mb-4">
                  Search for a job above to view its production details
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Search by NRC Job No to find specific jobs</p>
                  <p>• View production status for all 4 production steps</p>
                  <p>• Monitor step progress and machine assignments</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Production Analytics
              </h2>

              {selectedJob ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-800">
                    Analytics for {selectedJob}
                  </h3>

                  {/* Check if job has production steps */}
                  {(() => {
                    const hasProductionSteps =
                      productionData.corrugation.length > 0 ||
                      productionData.fluteLamination.length > 0 ||
                      productionData.punching.length > 0 ||
                      productionData.flapPasting.length > 0;

                    if (!hasProductionSteps) {
                      return (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                          <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                            <div>
                              <h3 className="text-sm font-medium text-yellow-800">
                                No Production Analytics Available
                              </h3>
                              <p className="text-sm text-yellow-700">
                                This job doesn't contain the 4 production steps,
                                so production analytics are not available.
                              </p>
                              <p className="text-sm text-yellow-600 mt-1">
                                Use the "View Details" button to see all steps
                                and their status for this job.
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Step Efficiency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { name: "Corrugation", data: productionData.corrugation },
                      {
                        name: "Flute Lamination",
                        data: productionData.fluteLamination,
                      },
                      { name: "Punching", data: productionData.punching },
                      {
                        name: "Flap Pasting",
                        data: productionData.flapPasting,
                      },
                    ].map((step, index) => {
                      const efficiency =
                        step.data.length > 0
                          ? (step.data.filter(
                              (s) =>
                                s.status === "completed" ||
                                s.status === "accept",
                            ).length /
                              step.data.length) *
                            100
                          : 0;

                      return (
                        <div
                          key={index}
                          className="bg-gray-50 rounded-lg p-4 text-center"
                        >
                          <h4 className="font-medium text-gray-900 mb-2">
                            {step.name}
                          </h4>
                          <p className="text-2xl font-bold text-blue-600">
                            {Math.round(efficiency)}%
                          </p>
                          <p className="text-sm text-gray-600">Efficiency</p>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${efficiency}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Machine Utilization */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      Machine Utilization
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          name: "Corrugation",
                          data: productionData.corrugation,
                        },
                        {
                          name: "Flute Lamination",
                          data: productionData.fluteLamination,
                        },
                        { name: "Punching", data: productionData.punching },
                        {
                          name: "Flap Pasting",
                          data: productionData.flapPasting,
                        },
                      ].map((step, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <h5 className="font-medium text-gray-800 mb-2">
                            {step.name}
                          </h5>
                          <div className="space-y-1">
                            {step.data.map((stepDetail, stepIndex) => (
                              <div key={stepIndex} className="text-sm">
                                <span className="text-gray-600">Machine: </span>
                                <span className="font-medium">
                                  {stepDetail.machineDetails[0]?.machineType ||
                                    "Not assigned"}
                                </span>
                                {stepDetail.machineDetails[0]?.machine && (
                                  <span className="text-gray-500 ml-2">
                                    (Capacity:{" "}
                                    {stepDetail.machineDetails[0].machine.capacity.toLocaleString()}
                                    )
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Job Selected for Analytics
                  </h3>
                  <p className="text-gray-600">
                    Select a job to view detailed analytics and performance
                    metrics
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Detail Side Panel */}
      {showDetailPanel && selectedJobDetails && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Job Details
                </h2>
                <button
                  onClick={() => setShowDetailPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                {/* Job Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Job Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">
                        {(selectedJobDetails as any).jobPlanCode
                          ? "Job Plan Code"
                          : "NRC Job No"}
                        :
                      </p>
                      <p className="font-medium text-gray-900">
                        {(selectedJobDetails as any).jobPlanCode ??
                          selectedJobDetails.nrcJobNo}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Demand Level:</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {selectedJobDetails.jobDemand}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Created:</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedJobDetails.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Last Updated:</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedJobDetails.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* All Steps */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    All Production Steps
                  </h3>
                  <div className="space-y-3">
                    {selectedJobDetails.steps.map((step, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                              Step {step.stepNo}
                            </span>
                            <h4 className="font-medium text-gray-900">
                              {getStepDisplayName(step.stepName)}
                            </h4>
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              step.status,
                            )}`}
                          >
                            {getStatusIcon(step.status)}
                            <span className="ml-1">{step.status}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-600">
                              Started: {formatDate(step.startDate)}
                            </p>
                            <p className="text-gray-600">
                              Ended: {formatDate(step.endDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              Operator:{" "}
                              {step.user
                                ? getUserName(step.user)
                                : "Not assigned"}
                            </p>
                            <p className="text-gray-600">
                              Machine:{" "}
                              {step.machineDetails[0]?.machineType ||
                                "Not assigned"}
                            </p>
                          </div>
                        </div>

                        {step.machineDetails.length > 0 &&
                          step.machineDetails[0].machine && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <h5 className="font-medium text-gray-800 mb-2">
                                Machine Details
                              </h5>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-600">Machine ID:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.id}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Capacity:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.capacity.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Status:</p>
                                  <p className="font-medium capitalize">
                                    {step.machineDetails[0].machine.status}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Description:</p>
                                  <p className="font-medium">
                                    {step.machineDetails[0].machine.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {showJobDetailsModal && (
        <ProductionDetailModal
          jobs={modalJobData}
          title={modalTitle}
          onClose={() => {
            setShowJobDetailsModal(false);
            setModalJobData([]);
            setModalTitle("");
          }}
        />
      )}

      {/* Loading overlay for modal data */}
      {isLoadingModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <LoadingSpinner size="md" />
              <span className="text-gray-700">Loading job details...</span>
            </div>
          </div>
        </div>
      )}

      {/* Job Steps Modal */}
      {isJobStepsModalOpen && selectedJobPlanForModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-6 relative overflow-y-auto max-h-[90vh]">
            {/* Close button */}
            <button
              onClick={() => {
                setIsJobStepsModalOpen(false);
                setSelectedJobPlanForModal(null);
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
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

            {/* Header */}
            <h2 className="text-xl font-semibold mb-4">
              Job Card Steps - {selectedJobPlanForModal.nrcJobNo}
            </h2>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                {
                  label: "NRC Job No",
                  value: selectedJobPlanForModal.nrcJobNo,
                  color: "blue",
                },
                {
                  label: "Job Plan Code",
                  value:
                    (selectedJobPlanForModal as any).jobPlanCode ??
                    selectedJobPlanForModal.jobPlanId ??
                    "—",
                  color: "green",
                },
                {
                  label: "Demand",
                  value:
                    (selectedJobPlanForModal as any).jobDemand === "high"
                      ? "Urgent"
                      : (selectedJobPlanForModal as any).jobDemand === "medium"
                        ? "Regular"
                        : (selectedJobPlanForModal as any).jobDemand || "Low",
                  color: "purple",
                },
                {
                  label: "Created",
                  value: (() => {
                    const createdAt = (selectedJobPlanForModal as any)
                      .createdAt;
                    if (!createdAt) return "-";
                    const date = new Date(createdAt);
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = date.getFullYear();
                    const hours = String(date.getHours()).padStart(2, "0");
                    const minutes = String(date.getMinutes()).padStart(2, "0");
                    return `${day}/${month}/${year} ${hours}:${minutes}`;
                  })(),
                  color: "orange",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex flex-col p-3 rounded-md shadow-sm border-l-4 border-${item.color}-500 bg-white`}
                >
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 mt-0.5">
                    {item.value || "-"}
                  </span>
                </div>
              ))}
            </div>

            {/* Steps */}
            <h3 className="text-lg font-medium mb-2">Steps</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-emerald-50 to-green-100 sticky top-0">
                  <tr>
                    {[
                      "Step No",
                      "Step Name",
                      "Status",
                      "Machine",
                      "Start Date",
                      "End Date",
                      "User",
                    ].map((col, i) => (
                      <th
                        key={i}
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {selectedJobPlanForModal.steps.map((step) => {
                    const stepStatus = getStepActualStatus(step);
                    const formatStepName = (stepName: string): string => {
                      return stepName
                        .replace(/([a-z])([A-Z])/g, "$1 $2")
                        .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
                        .trim();
                    };
                    const formatDate = (dateString: string | null) => {
                      if (!dateString) return "-";
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(
                        2,
                        "0",
                      );
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    const getStatusStyle = (status: string) => {
                      const baseClasses =
                        "px-3 py-1 rounded-full text-sm font-medium";
                      switch (status) {
                        case "completed":
                          return `${baseClasses} bg-green-100 text-green-800`;
                        case "in_progress":
                          return `${baseClasses} bg-blue-100 text-blue-800`;
                        case "hold":
                          return `${baseClasses} bg-yellow-100 text-yellow-800`;
                        case "planned":
                          return `${baseClasses} bg-gray-100 text-gray-600`;
                        default:
                          return `${baseClasses} bg-gray-100 text-gray-600`;
                      }
                    };

                    return (
                      <tr
                        key={step.id}
                        className="hover:bg-indigo-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          {step.stepNo}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {formatStepName(step.stepName)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(
                              stepStatus,
                            )}`}
                          >
                            {stepStatus.charAt(0).toUpperCase() +
                              stepStatus.slice(1).replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {(step as any).machineDetails?.[0]?.machineCode ||
                            "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(step.startDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(step.endDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {step.user ? getUserName(step.user) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionHeadDashboard;
