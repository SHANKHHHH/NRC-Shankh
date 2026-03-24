import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CheckCircleIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  XCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  CubeIcon,
  ArrowPathIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  printingService,
  type PrintingDetails,
} from "./printingService";
import LoadingSpinner from "../../../common/LoadingSpinner";
import JobAndPODetailsModal from "../../../common/JobAndPODetailsModal";
import {
  fetchJobWithPODetails,
  type JobDetailsWithPOData,
} from "../../../../utils/jobPoDetailsFetch";
import { fetchStepDetailsBatch } from "../../../../utils/dashboardStepDetailsBatch";
import { useUsers } from "../../../../context/UsersContext";
import StatisticsGrid from "../StatisticsCards/StatisticsGrid";
import DateFilterComponent, {
  type DateFilterType,
} from "../FilterComponents/DateFilterComponent";

type BundleStep = {
  id?: number;
  stepNo?: number;
  stepName?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  user?: string | null;
  machineDetails?: Array<{
    machineCode?: string | null;
    machine?: { capacity?: number | string | null } | null;
  }>;
  stepDetails?: { data?: { status?: string }; status?: string } | null;
};

type BundleJobPlan = {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand?: string;
  createdAt?: string;
  updatedAt?: string;
  steps: BundleStep[];
  [key: string]: any;
};

type BundleCompletedJob = {
  id: number;
  nrcJobNo: string;
  completedAt: string;
  jobDetails?: any;
  purchaseOrderDetails?: any;
  allSteps?: any[];
  allStepDetails?: any;
  [key: string]: any;
};

type PrintingDashboardCache = {
  cacheKey: string;
  accessToken: string;
  dateFilter: DateFilterType;
  customDateRange: { start: string; end: string };
  lastRefreshedAt: string | null;
  printingData: PrintingDetails[];
  completedJobs: any[];
  bundleJobPlans: BundleJobPlan[];
  bundleCompletedJobs: BundleCompletedJob[];
  bundleHeldJobs: any[];
};

let printingDashboardCache: PrintingDashboardCache | null = null;

const formatDdMmYyyy = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatInr = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

const PrintingDashboard: React.FC = () => {
  const { getUserName } = useUsers();
  const navigate = useNavigate();
  const location = useLocation();
  const returnedState = (location.state ||
    {}) as Partial<{
    dateFilter: DateFilterType;
    customDateRange: { start: string; end: string };
  }>;
  const defaultCustomRange = {
    start: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
    end: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()).padStart(2, "0")}`,
  };
  const [printingData, setPrintingData] = useState<PrintingDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPrinting, setSelectedPrinting] =
    useState<PrintingDetails | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAllData, setShowAllData] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [majorHoldJobsCount, setMajorHoldJobsCount] = useState<number>(0);
  const [isLoadingMajorHoldJobs, setIsLoadingMajorHoldJobs] = useState(false);

  // Added block (bundle-backed) for Printing dashboard header cards + completed summary + job cards overview.
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleJobPlans, setBundleJobPlans] = useState<BundleJobPlan[]>([]);
  const [bundleCompletedJobs, setBundleCompletedJobs] = useState<
    BundleCompletedJob[]
  >([]);
  const [bundleHeldJobs, setBundleHeldJobs] = useState<any[]>([]);
  const [dashboardDateFilter, setDashboardDateFilter] =
    useState<DateFilterType>(
      () =>
        returnedState.dateFilter ??
        printingDashboardCache?.dateFilter ??
        "today"
    );
  const [dashboardCustomDateRange, setDashboardCustomDateRange] = useState<{
    start: string;
    end: string;
  }>(() => returnedState.customDateRange ?? printingDashboardCache?.customDateRange ?? defaultCustomRange);

  const [jobCardsSearchTerm, setJobCardsSearchTerm] = useState("");
  const [jobCardsDemandFilter, setJobCardsDemandFilter] = useState<
    "all" | "medium" | "high"
  >("all");
  const [jobCardsStatusFilter, setJobCardsStatusFilter] = useState<
    "all" | "completed" | "inProgress" | "planned"
  >("all");
  const [isJobStepsModalOpen, setIsJobStepsModalOpen] = useState(false);
  const [selectedJobPlanForModal, setSelectedJobPlanForModal] =
    useState<BundleJobPlan | null>(null);
  const [jobDetailsWithPO, setJobDetailsWithPO] =
    useState<JobDetailsWithPOData | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState<string | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<"job" | "po">("job");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const manualRefreshPendingRef = useRef(false);
  const [completedSummaryDateFilter, setCompletedSummaryDateFilter] =
    useState("");
  const [completedSummaryCustomerFilter, setCompletedSummaryCustomerFilter] =
    useState("");
  const [completedSummaryUnitFilter, setCompletedSummaryUnitFilter] =
    useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(
    () => printingDashboardCache?.lastRefreshedAt ?? null
  );

  const getDashboardCacheKey = (
    filter: DateFilterType,
    customRange: { start: string; end: string }
  ) => `${filter}-${customRange.start}-${customRange.end}`;

  const refreshCompletionRef = useRef<{
    key: string;
    main: boolean;
    bundle: boolean;
  }>({
    key: "",
    main: false,
    bundle: false,
  });

  const markApisCompleted = (source: "main" | "bundle", key: string) => {
    if (refreshCompletionRef.current.key !== key) return;
    refreshCompletionRef.current[source] = true;
    if (refreshCompletionRef.current.main && refreshCompletionRef.current.bundle) {
      const refreshedAt = new Date().toISOString();
      setLastRefreshedAt(refreshedAt);
      if (printingDashboardCache && printingDashboardCache.cacheKey === key) {
        printingDashboardCache.lastRefreshedAt = refreshedAt;
      }
    }
  };

  useEffect(() => {
    const key = getDashboardCacheKey(dashboardDateFilter, dashboardCustomDateRange);
    refreshCompletionRef.current = { key, main: false, bundle: false };
  }, [dashboardDateFilter, dashboardCustomDateRange, refreshNonce]);

  // Guarantee timestamp update on explicit Refresh click
  useEffect(() => {
    if (!manualRefreshPendingRef.current) return;
    if (loading || bundleLoading) return;

    const refreshedAt = new Date().toISOString();
    setLastRefreshedAt(refreshedAt);
    if (printingDashboardCache) {
      printingDashboardCache.lastRefreshedAt = refreshedAt;
    }
    manualRefreshPendingRef.current = false;
  }, [loading, bundleLoading]);

  useEffect(() => {
    const loadData = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        printingDashboardCache = null;
        setPrintingData([]);
        setCompletedJobs([]);
        setLoading(false);
        return;
      }
      const currentCacheKey = getDashboardCacheKey(
        dashboardDateFilter,
        dashboardCustomDateRange
      );
      if (
        printingDashboardCache?.cacheKey === currentCacheKey &&
        printingDashboardCache.accessToken === accessToken
      ) {
        setPrintingData(printingDashboardCache.printingData);
        setCompletedJobs(printingDashboardCache.completedJobs);
        setLoading(false);
        return;
      }
      setLoading(true);
      let mainApisLoaded = false;
      try {
        const baseUrl = (import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com").replace(/\/$/, "");
        const range = getDateRange(dashboardDateFilter, dashboardCustomDateRange);
        const queryParams = new URLSearchParams();
        if (range) {
          queryParams.append("startDate", range.start);
          queryParams.append("endDate", range.end);
        }

        const [data, completedJobsResponse] = await Promise.all([
          printingService.getAllPrintingDetails(),
          fetch(
            `${baseUrl}/api/completed-jobs${queryParams.toString() ? `?${queryParams.toString()}` : ""}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          ),
        ]);

        setPrintingData(data);
        // Main refresh should be considered successful once printing details API responds.
        mainApisLoaded = true;

        // Process completed jobs data
        if (completedJobsResponse.ok) {
          const completedJobsResult = await completedJobsResponse.json();
          if (
            completedJobsResult.success &&
            Array.isArray(completedJobsResult.data)
          ) {
            // Filter for PrintingDetails steps and map to PrintingDetails format
            const printingCompletedJobs = completedJobsResult.data.flatMap(
              (job: any) => {
                const printingSteps = job.allStepDetails?.printingDetails || [];
                return printingSteps.map((step: any) => ({
                  id: step.id || 0,
                  jobNrcJobNo: step.jobNrcJobNo || job.nrcJobNo || "-",
                  status: step.status || "accept", // Use the actual status from step
                  date:
                    step.date || job.completedAt || new Date().toISOString(),
                  shift: step.shift || null,
                  oprName: step.oprName || "-",
                  noOfColours: step.noOfColours || null,
                  inksUsed: step.inksUsed || null,
                  quantity: step.quantity || 0,
                  wastage: step.wastage || 0,
                  coatingType: step.coatingType || null,
                  separateSheets: step.separateSheets || null,
                  extraSheets: step.extraSheets || null,
                  machine: step.machine || "-",
                  jobStepId: step.jobStepId || null,
                  stepStatus: "stop",
                  stepName: "PrintingDetails",
                  user: step.oprName || null,
                  startDate: step.date || null,
                  endDate: step.date || null,
                  jobDemand: job.jobDemand || null,
                  machineDetails: [],
                }));
              }
            );
            setCompletedJobs(printingCompletedJobs);
            printingDashboardCache = {
              cacheKey: currentCacheKey,
              accessToken,
              dateFilter: dashboardDateFilter,
              customDateRange: dashboardCustomDateRange,
              lastRefreshedAt: printingDashboardCache?.lastRefreshedAt ?? null,
              printingData: data,
              completedJobs: printingCompletedJobs,
              bundleJobPlans: printingDashboardCache?.bundleJobPlans ?? [],
              bundleCompletedJobs:
                printingDashboardCache?.bundleCompletedJobs ?? [],
              bundleHeldJobs: printingDashboardCache?.bundleHeldJobs ?? [],
            };
          } else {
            setCompletedJobs([]);
            // Keep cache in sync even when completed-jobs payload is empty/shape-different.
            printingDashboardCache = {
              cacheKey: currentCacheKey,
              accessToken,
              dateFilter: dashboardDateFilter,
              customDateRange: dashboardCustomDateRange,
              lastRefreshedAt: printingDashboardCache?.lastRefreshedAt ?? null,
              printingData: data,
              completedJobs: [],
              bundleJobPlans: printingDashboardCache?.bundleJobPlans ?? [],
              bundleCompletedJobs:
                printingDashboardCache?.bundleCompletedJobs ?? [],
              bundleHeldJobs: printingDashboardCache?.bundleHeldJobs ?? [],
            };
          }
        } else {
          // Still treat refresh as successful for "Last updated" when printing API succeeded.
          setCompletedJobs([]);
        }
      } catch (error) {
        console.error("Error loading printing data:", error);
      } finally {
        setLoading(false);
        if (mainApisLoaded) {
          markApisCompleted("main", currentCacheKey);
        }
      }
    };
    loadData();
  }, [dashboardDateFilter, dashboardCustomDateRange, refreshNonce]);

  // Fetch major hold jobs count (lightweight single API call)
  useEffect(() => {
    const fetchMajorHoldJobsCount = async () => {
      try {
        setIsLoadingMajorHoldJobs(true);
        const accessToken = localStorage.getItem("accessToken");
        if (!accessToken) {
          setMajorHoldJobsCount(0);
          return;
        }
        const baseUrl = import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
        const response = await fetch(`${baseUrl}/api/job-planning/major-hold/count`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
          setMajorHoldJobsCount(0);
          return;
        }
        const json = await response.json();
        setMajorHoldJobsCount(json.success && typeof json.count === "number" ? json.count : 0);
      } catch (_) {
        setMajorHoldJobsCount(0);
      } finally {
        setIsLoadingMajorHoldJobs(false);
      }
    };
    fetchMajorHoldJobsCount();
  }, []);

  const getDateRange = (
    filter: DateFilterType,
    customRange?: { start: string; end: string }
  ) => {
    const today = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const toDateKey = (d: Date) =>
      `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    switch (filter) {
      case "today":
        return {
          start: toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
          end: toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
        };
      case "yesterday": {
        const d = new Date(today);
        d.setDate(d.getDate() - 1);
        return { start: toDateKey(d), end: toDateKey(d) };
      }
      case "week": {
        const start = new Date(today);
        const dow = today.getDay();
        const mondayDiff = dow === 0 ? -6 : 1 - dow;
        start.setDate(today.getDate() + mondayDiff);
        return { start: toDateKey(start), end: toDateKey(today) };
      }
      case "month": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: toDateKey(start), end: toDateKey(end) };
      }
      case "quarter": {
        const qStartMonth = Math.floor(today.getMonth() / 3) * 3;
        const start = new Date(today.getFullYear(), qStartMonth, 1);
        const end = new Date(today.getFullYear(), qStartMonth + 3, 0);
        return { start: toDateKey(start), end: toDateKey(end) };
      }
      case "year": {
        const start = new Date(today.getFullYear(), 0, 1);
        const end = new Date(today.getFullYear(), 11, 31);
        return { start: toDateKey(start), end: toDateKey(end) };
      }
      case "custom":
        if (customRange?.start && customRange?.end) return customRange;
        return null;
      default:
        return null;
    }
  };

  const isDateInRange = (
    dateLike: string | null | undefined,
    startKey: string,
    endKey: string
  ): boolean => {
    if (!dateLike) return false;
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return false;
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    return key >= startKey && key <= endKey;
  };

  const getStepActualStatus = (step: BundleStep): "completed" | "in_progress" | "hold" | "planned" => {
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

    // Keep same PaperStore handling as Admin dashboard
    if (step.stepName === "PaperStore") {
      const paperStore = (step as any).paperStore;
      if (paperStore?.status) {
        if (paperStore.status === "accept") return "completed";
        if (paperStore.status === "in_progress") return "in_progress";
        if (paperStore.status === "hold") return "hold";
      }
    }

    // Priority 1: stepDetails.data.status
    if (step.stepDetails?.data?.status) {
      if (step.stepDetails.data.status === "accept") {
        if (step.status === "stop") return "completed";
        if (step.status === "start") return "in_progress";
      }
      if (step.stepDetails.data.status === "in_progress") return "in_progress";
      if (step.stepDetails.data.status === "hold") return "hold";
    }

    // Priority 2: stepDetails.status
    if (step.stepDetails?.status) {
      if (step.stepDetails.status === "accept") {
        if (step.status === "stop") return "completed";
        if (step.status === "start") return "in_progress";
      }
      if (step.stepDetails.status === "in_progress") return "in_progress";
      if (step.stepDetails.status === "hold") return "hold";
    }

    // Priority 3/4: direct step status (same as Admin)
    if ((step.status as any) === "accept") return "completed";
    if ((step.status as any) === "in_progress") return "in_progress";
    if (step.status === "stop") return "completed";
    if (step.status === "start") return "in_progress";
    return "planned";
  };

  const isMajorHoldJob = (jobPlan: BundleJobPlan): boolean =>
    (jobPlan.steps || []).some((step: any) => {
      if (step.status === "major_hold") return true;
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
      if (
        step.stepDetails?.data?.status === "major_hold" ||
        step.stepDetails?.status === "major_hold"
      ) {
        return true;
      }
      return false;
    });

  useEffect(() => {
    const loadRoleBundle = async () => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        printingDashboardCache = null;
        setBundleJobPlans([]);
        setBundleCompletedJobs([]);
        setBundleHeldJobs([]);
        setBundleLoading(false);
        return;
      }
      const currentCacheKey = getDashboardCacheKey(
        dashboardDateFilter,
        dashboardCustomDateRange
      );
      let bundleApisLoaded = false;
      if (
        printingDashboardCache?.cacheKey === currentCacheKey &&
        printingDashboardCache.accessToken === accessToken
      ) {
        setBundleJobPlans(printingDashboardCache.bundleJobPlans);
        setBundleCompletedJobs(printingDashboardCache.bundleCompletedJobs);
        setBundleHeldJobs(printingDashboardCache.bundleHeldJobs);
        setBundleLoading(false);
        return;
      }
      try {
        setBundleLoading(true);
        const baseUrl = (import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com").replace(/\/$/, "");
        const range = getDateRange(dashboardDateFilter, dashboardCustomDateRange);
        const query = new URLSearchParams();
        if (range) {
          query.set("startDate", range.start);
          query.set("endDate", range.end);
        }
        const response = await fetch(
          `${baseUrl}/api/dashboard/role-bundle${query.toString() ? `?${query.toString()}` : ""}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!response.ok) return;
        const json = await response.json();
        if (!json?.success || !json?.data) return;
        bundleApisLoaded = true;
        const jobPlanning = json.data.jobPlanning;
        const completed = json.data.completedJobs;
        const held = json.data.heldMachines;
        if (jobPlanning?.success && Array.isArray(jobPlanning.data)) {
          const jobPlans = jobPlanning.data as BundleJobPlan[];
          const stepIndexList = jobPlans.flatMap((jp: BundleJobPlan) =>
            (jp.steps || []).map((s: BundleStep) => ({
              stepId: Number(s.id),
              stepName: String(s.stepName || ""),
            }))
          );
          const detailsByStepId = await fetchStepDetailsBatch(
            baseUrl,
            accessToken,
            stepIndexList.filter(
              (s) => Number.isFinite(s.stepId) && s.stepId > 0 && !!s.stepName
            )
          );
          const jobPlansWithDetails = jobPlans.map((jobPlan: BundleJobPlan) => ({
            ...jobPlan,
            steps: (jobPlan.steps || []).map((step: BundleStep) => ({
              ...step,
              stepDetails:
                (detailsByStepId[String(step.id)] as
                  | { data?: { status?: string }; status?: string }
                  | null
                  | undefined) ?? null,
            })),
          }));
          setBundleJobPlans(jobPlansWithDetails);
          printingDashboardCache = {
            cacheKey: currentCacheKey,
            accessToken,
            dateFilter: dashboardDateFilter,
            customDateRange: dashboardCustomDateRange,
            lastRefreshedAt: printingDashboardCache?.lastRefreshedAt ?? null,
            printingData: printingDashboardCache?.printingData ?? [],
            completedJobs: printingDashboardCache?.completedJobs ?? [],
            bundleJobPlans: jobPlansWithDetails,
            bundleCompletedJobs: completed?.success && Array.isArray(completed.data) ? completed.data : [],
            bundleHeldJobs:
              held?.success && Array.isArray(held.data?.heldJobs)
                ? held.data.heldJobs
                : held?.success && Array.isArray(held.data)
                  ? held.data
                  : Array.isArray(json.data?.heldJobs)
                    ? json.data.heldJobs
                    : [],
          };
        } else {
          setBundleJobPlans([]);
        }
        if (completed?.success && Array.isArray(completed.data)) {
          setBundleCompletedJobs(completed.data);
        } else {
          setBundleCompletedJobs([]);
        }
        if (held?.success) {
          if (Array.isArray(held.data?.heldJobs)) {
            setBundleHeldJobs(held.data.heldJobs);
          } else if (Array.isArray(held.data)) {
            setBundleHeldJobs(held.data);
          } else {
            setBundleHeldJobs([]);
          }
        } else if (Array.isArray(json.data?.heldJobs)) {
          setBundleHeldJobs(json.data.heldJobs);
        } else {
          setBundleHeldJobs([]);
        }
      } catch (e) {
        console.warn("Printing dashboard role-bundle load failed:", e);
      } finally {
        setBundleLoading(false);
        if (bundleApisLoaded) {
          markApisCompleted("bundle", currentCacheKey);
        }
      }
    };
    loadRoleBundle();
  }, [dashboardDateFilter, dashboardCustomDateRange]);

  // Combine printingData with completed jobs, then apply the top dashboard date filter.
  const allPrintingData = useMemo(() => {
    const combined = [...printingData, ...completedJobs];
    const range = getDateRange(dashboardDateFilter, dashboardCustomDateRange);
    if (!range) return combined;
    const filtered = combined.filter((item) => {
      const main = isDateInRange(item.date, range.start, range.end);
      const delivery = isDateInRange(
        (item as any).deliveryDate as string | null | undefined,
        range.start,
        range.end
      );
      return main || delivery;
    });
    return filtered;
  }, [
    printingData,
    completedJobs,
    dashboardDateFilter,
    dashboardCustomDateRange,
  ]);

  // Calculate updated summary data including completed jobs
  const updatedSummaryData = useMemo(() => {
    const totalPrintJobs = allPrintingData.length;
    const totalQuantityPrinted = allPrintingData.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );
    const totalWastage = allPrintingData.reduce(
      (sum, item) => sum + (item.wastage || 0),
      0
    );
    const acceptedJobs = allPrintingData.filter(
      (item) => item.status === "accept"
    ).length;
    // Count pending jobs (excluding those with stepStatus "start" which are in_progress)
    const pendingJobs = allPrintingData.filter(
      (item) => item.status === "pending" && item.stepStatus !== "start"
    ).length;
    const rejectedJobs = allPrintingData.filter(
      (item) => item.status === "rejected"
    ).length;
    // Count in_progress jobs (including those with stepStatus "start" and status "pending")
    const inProgressJobs = allPrintingData.filter(
      (item) =>
        item.status === "in_progress" ||
        (item.stepStatus === "start" && item.status === "pending")
    ).length;
    const holdJobs = allPrintingData.filter(
      (item) => item.status === "hold"
    ).length;
    const plannedJobs = allPrintingData.filter(
      (item) => item.status === "planned"
    ).length;
    const averageWastagePercentage =
      totalQuantityPrinted > 0
        ? Math.round((totalWastage / totalQuantityPrinted) * 100)
        : 0;

    return {
      totalPrintJobs,
      totalQuantityPrinted,
      totalWastage,
      acceptedJobs,
      pendingJobs,
      rejectedJobs,
      inProgressJobs,
      holdJobs,
      plannedJobs,
      averageWastagePercentage,
    };
  }, [allPrintingData]);

  // Filter data based on search and status
  const filteredData = useMemo(() => {
    const filtered = allPrintingData.filter((item) => {
      const matchesSearch =
        item.jobNrcJobNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.oprName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.machine.toLowerCase().includes(searchTerm.toLowerCase());

      // For filtering, check both status and stepStatus
      // If stepStatus is "start" and status is "pending", treat it as "in_progress" for filtering
      const effectiveStatus =
        item.stepStatus === "start" && item.status === "pending"
          ? "in_progress"
          : item.status;
      const matchesStatus =
        statusFilter === "all" || effectiveStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
    return filtered;
  }, [allPrintingData, searchTerm, statusFilter]);

  // Sort by date (latest first) and limit to 5 items
  const sortedData = useMemo(() => {
    const sorted = [...filteredData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted;
  }, [filteredData]);

  // Show all data or limit to 5 based on state
  const displayData = useMemo(() => {
    return showAllData ? sortedData : sortedData.slice(0, 5);
  }, [sortedData, showAllData]);

  const filteredBundleData = useMemo(() => {
    const range = getDateRange(dashboardDateFilter, dashboardCustomDateRange);
    if (!range) {
      return {
        jobPlans: bundleJobPlans,
        completedJobs: bundleCompletedJobs,
      };
    }
    const inRange = (raw: string | null | undefined) =>
      isDateInRange(raw, range.start, range.end);

    const jobPlans = bundleJobPlans.filter((jp) => {
      const steps = Array.isArray(jp.steps) ? jp.steps : [];
      const hasStepActivity = steps.some((s: any) => {
        const sd = s?.stepDetails?.data;
        return (
          inRange(s?.updatedAt) ||
          inRange(s?.startDate) ||
          inRange(s?.endDate) ||
          inRange(sd?.date) ||
          inRange(sd?.updatedAt)
        );
      });
      if (hasStepActivity) return true;
      return inRange((jp as any).updatedAt) || inRange((jp as any).createdAt);
    });

    const completedJobs = bundleCompletedJobs.filter((cj) =>
      inRange(cj.completedAt)
    );

    return { jobPlans, completedJobs };
  }, [
    bundleJobPlans,
    bundleCompletedJobs,
    dashboardDateFilter,
    dashboardCustomDateRange,
  ]);

  const bundleDerivedStats = useMemo(() => {
    const planned: BundleJobPlan[] = [];
    const inProgress: BundleJobPlan[] = [];
    const uniqueUsers = new Set<string>();
    filteredBundleData.jobPlans.forEach((jp) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;
      (jp.steps || []).forEach((step) => {
        if (step.user) uniqueUsers.add(step.user);
        const st = getStepActualStatus(step);
        if (st === "hold") {
          jobOnHold = true;
          jobCompleted = false;
        } else if (st === "in_progress") {
          jobInProgress = true;
          jobCompleted = false;
        } else if (st !== "completed") {
          jobCompleted = false;
        }
      });
      if (jobCompleted) {
        // counted in completedJobs list from bundle
      } else if (jobOnHold && !isMajorHoldJob(jp)) {
        // held count comes from held API; don't double-count
      } else if (jobInProgress) {
        inProgress.push(jp);
      } else {
        planned.push(jp);
      }
    });
    const completed = filteredBundleData.completedJobs.length;
    const held = bundleHeldJobs.length;
    return {
      planned,
      inProgress,
      completed,
      held,
      activeUsers: uniqueUsers.size,
      total: planned.length + inProgress.length + completed + held,
    };
  }, [filteredBundleData, bundleHeldJobs]);

  const completedSummaryRows = useMemo(() => {
    return filteredBundleData.completedJobs.map((job) => {
      const dispatch = Array.isArray(job.allStepDetails?.dispatchProcess)
        ? job.allStepDetails.dispatchProcess[0]
        : null;
      const dispatchQty = Number(
        dispatch?.totalDispatchedQty ?? dispatch?.quantity ?? 0
      );
      const rate = Number(job.jobDetails?.latestRate ?? 0);
      const unit =
        (Array.isArray(job.allSteps)
          ? job.allSteps.find((s: any) => s?.stepName === "DispatchProcess")
              ?.machineDetails?.[0]?.unit
          : null) || "N/A";
      const dispatchDate =
        dispatch?.dispatchDate ?? dispatch?.date ?? job.purchaseOrderDetails?.deliveryDate ?? null;
      return {
        id: job.id,
        date: formatDdMmYyyy(job.completedAt),
        customer:
          job.jobDetails?.customerName || job.purchaseOrderDetails?.customer || "—",
        unit,
        dispatchDate: formatDdMmYyyy(dispatchDate),
        dispatchQty,
        totalValue: rate > 0 && dispatchQty > 0 ? rate * dispatchQty : 0,
      };
    });
  }, [filteredBundleData.completedJobs]);

  const completedSummaryRevenue = useMemo(
    () => completedSummaryRows.reduce((s, r) => s + r.totalValue, 0),
    [completedSummaryRows]
  );

  const completedSummaryFilteredRows = useMemo(() => {
    const df = completedSummaryDateFilter.trim().toLowerCase();
    const cf = completedSummaryCustomerFilter.trim().toLowerCase();
    const uf = completedSummaryUnitFilter.trim().toLowerCase();

    return completedSummaryRows.filter((r) => {
      const matchesDate = !df
        ? true
        : `${r.date} ${r.dispatchDate}`.toLowerCase().includes(df);
      const matchesCustomer = !cf ? true : String(r.customer).toLowerCase().includes(cf);
      const matchesUnit = !uf ? true : String(r.unit).toLowerCase().includes(uf);
      return matchesDate && matchesCustomer && matchesUnit;
    });
  }, [
    completedSummaryRows,
    completedSummaryDateFilter,
    completedSummaryCustomerFilter,
    completedSummaryUnitFilter,
  ]);

  const completedSummaryFilteredRevenue = useMemo(
    () => completedSummaryFilteredRows.reduce((s, r) => s + r.totalValue, 0),
    [completedSummaryFilteredRows]
  );

  const jobCardsRows = useMemo(() => {
    const getProgress = (jp: BundleJobPlan) => {
      const steps = jp.steps || [];
      const done = steps.filter((s) => getStepActualStatus(s) === "completed").length;
      return steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
    };
    const getJobStatus = (jp: BundleJobPlan) => {
      const statuses = (jp.steps || []).map((s) => getStepActualStatus(s));
      const hasInProgress = statuses.includes("in_progress");
      const hasHold = statuses.includes("hold");
      const allCompleted = statuses.length > 0 && statuses.every((s) => s === "completed");
      if (allCompleted) return "completed";
      if (hasInProgress || hasHold) return "inProgress";
      return "planned";
    };
    return filteredBundleData.jobPlans
      .filter((jp) => {
        const matchesSearch = jp.nrcJobNo
          ?.toLowerCase()
          .includes(jobCardsSearchTerm.toLowerCase());
        const rawDemand = String(jp.jobDemand || "").toLowerCase();
        const demand = rawDemand === "low" ? "medium" : rawDemand;
        const matchesDemand =
          jobCardsDemandFilter === "all" || demand === jobCardsDemandFilter;
        const status = getJobStatus(jp);
        const matchesStatus =
          jobCardsStatusFilter === "all" || status === jobCardsStatusFilter;
        return !!matchesSearch && matchesDemand && matchesStatus;
      })
      .sort((a, b) => getProgress(b) - getProgress(a))
      .map((jp) => ({
        jobPlan: jp,
        progress: getProgress(jp),
        status: getJobStatus(jp),
      }));
  }, [
    filteredBundleData.jobPlans,
    jobCardsSearchTerm,
    jobCardsDemandFilter,
    jobCardsStatusFilter,
  ]);

  // Get status color and label
  const getStatusInfo = (status: string) => {
    switch (status) {
      case "accept":
        return {
          color: "bg-green-100 text-green-800 border-green-200",
          label: "Accepted",
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
          icon: XCircleIcon,
        };
      case "in_progress":
        return {
          color: "bg-blue-100 text-blue-800 border-blue-200",
          label: "In Progress",
          icon: PlayCircleIcon,
        };
      case "hold":
        return {
          color: "bg-orange-100 text-orange-800 border-orange-200",
          label: "On Hold",
          icon: PauseCircleIcon,
        };
      case "major_hold":
        return {
          color: "bg-red-100 text-red-800 border-red-200",
          label: "Major Hold",
          icon: ExclamationTriangleIcon,
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          label: "Unknown",
          icon: ExclamationTriangleIcon,
        };
    }
  };

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleViewSteps = (jobPlan: BundleJobPlan) => {
    setSelectedJobPlanForModal(jobPlan);
    setIsJobStepsModalOpen(true);
  };

  const handleJobCardClick = async (nrcJobNo: string) => {
    setLoadingJobDetails(true);
    setJobDetailsError(null);
    setActiveJobTab("job");
    try {
      const details = await fetchJobWithPODetails(nrcJobNo);
      setJobDetailsWithPO(details);
    } catch (error) {
      setJobDetailsError("Failed to fetch job details. Please try again.");
      console.error("Error fetching job details:", error);
    } finally {
      setLoadingJobDetails(false);
    }
  };

  const getStepDisplayStatus = (step: BundleStep): string => {
    const raw =
      (step as any).stepSpecificData?.status ??
      (step as any).paperStore?.status ??
      (step as any).printingDetails?.status ??
      (step as any).corrugation?.status ??
      (step as any).flutelam?.status ??
      (step as any).fluteLaminateBoardConversion?.status ??
      (step as any).punching?.status ??
      (step as any).sideFlapPasting?.status ??
      (step as any).qualityDept?.status ??
      (step as any).dispatchProcess?.status ??
      step.stepDetails?.data?.status ??
      step.stepDetails?.status ??
      step.status ??
      "planned";
    return typeof raw === "string" ? raw : "planned";
  };

  const formatStepStatusLabel = (status: string): string =>
    String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const getStepStatusBadgeClass = (status: string): string => {
    const base = "inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap";
    switch (status) {
      case "stop":
      case "accept":
        return `${base} bg-green-100 text-green-800`;
      case "start":
      case "in_progress":
        return `${base} bg-blue-100 text-blue-800`;
      case "planned":
        return `${base} bg-gray-100 text-gray-600`;
      case "major_hold":
        return `${base} bg-red-100 text-red-800`;
      case "hold":
        return `${base} bg-orange-100 text-orange-800`;
      default:
        return `${base} bg-gray-100 text-gray-600`;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      
    });
  };

  // Handle row click to show details
  const handleRowClick = (printing: PrintingDetails) => {
    setSelectedPrinting(printing);
    setShowDetailPanel(true);
  };

  // Close detail panel
  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedPrinting(null);
  };

  // Refresh data
  const handleRefresh = async () => {
    // Force full dashboard refresh (all APIs/effects), not only printing details.
    printingDashboardCache = null;
    const key = getDashboardCacheKey(dashboardDateFilter, dashboardCustomDateRange);
    refreshCompletionRef.current = { key, main: false, bundle: false };
    manualRefreshPendingRef.current = true;
    setRefreshNonce((n) => n + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" text="Loading Printing Dashboard..." />
      </div>
    );
  }

  // Show message when no data is available
  if (allPrintingData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-2">
            <div className="bg-blue-500 p-3 rounded-xl">
              <PrinterIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Printing Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Monitor and manage printing operations
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <PrinterIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Printing Data Available
          </h3>
          <p className="text-gray-600 mb-4">
            No printing jobs found in the system.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || bundleLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-500 p-3 rounded-xl">
              <PrinterIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Printing Dashboard
              </h1>
              <p className="text-gray-600 text-lg">
                Monitor and manage printing operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Major Hold Jobs – same blinking icon as Admin/Planner/Production Head */}
            <button
              type="button"
              onClick={() => navigate("/dashboard/major-hold-jobs")}
              title="View and resume major hold jobs"
              className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ExclamationTriangleIcon
                className={`h-6 w-6 text-red-500 ${majorHoldJobsCount > 0 ? "animate-pulse" : ""}`}
              />
              {majorHoldJobsCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white bg-red-600 rounded-full animate-pulse">
                  {majorHoldJobsCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || bundleLoading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
            {loading || bundleLoading ? (
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
        </div>
        <p className="text-sm text-gray-500">
          Last updated:{" "}
          {lastRefreshedAt
            ? new Date(lastRefreshedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-"}
        </p>
      </div>

      {/* Added sections (keeps existing printing dashboard intact below) */}
      <div className="mb-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
          <DateFilterComponent
            dateFilter={dashboardDateFilter}
            setDateFilter={setDashboardDateFilter}
            customDateRange={dashboardCustomDateRange}
            setCustomDateRange={setDashboardCustomDateRange}
          />
        </div>

        {bundleLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <LoadingSpinner size="md" text="Loading bundled dashboard data..." />
          </div>
        ) : (
          <>
            <StatisticsGrid
              totalJobs={bundleDerivedStats.total}
              completedJobs={bundleDerivedStats.completed}
              inProgressJobs={bundleDerivedStats.inProgress.length}
              plannedJobs={bundleDerivedStats.planned.length}
              activeUsers={bundleDerivedStats.activeUsers}
              heldJobs={bundleDerivedStats.held}
              onCompletedJobsClick={() =>
                navigate("/dashboard/completed-jobs", {
                  state: {
                    completedJobs: filteredBundleData.completedJobs,
                    dateFilter: dashboardDateFilter,
                    customDateRange: dashboardCustomDateRange,
                    fromPrintingDashboard: true,
                  },
                })
              }
              onInProgressJobsClick={() =>
                navigate("/dashboard/in-progress-jobs", {
                  state: {
                    inProgressJobs: bundleDerivedStats.inProgress,
                    dateFilter: dashboardDateFilter,
                    customDateRange: dashboardCustomDateRange,
                    fromPrintingDashboard: true,
                  },
                })
              }
              onPlannedJobsClick={() =>
                navigate("/dashboard/planned-jobs", {
                  state: {
                    plannedJobs: bundleDerivedStats.planned,
                    dateFilter: dashboardDateFilter,
                    customDateRange: dashboardCustomDateRange,
                    fromPrintingDashboard: true,
                  },
                })
              }
              onHeldJobsClick={() =>
                navigate("/dashboard/held-jobs", {
                  state: {
                    heldJobs: bundleHeldJobs,
                    dateFilter: dashboardDateFilter,
                    customDateRange: dashboardCustomDateRange,
                    fromPrintingDashboard: true,
                  },
                })
              }
            />

            {completedSummaryRows.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
                <div className="bg-[#00AEEF] px-6 py-4">
                  <h2 className="text-2xl font-bold text-white">Completed Jobs Summary</h2>
                  <p className="text-blue-100 text-sm">Daily Production & Revenue Tracking</p>
                </div>
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <CalendarDaysIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter by date..."
                        value={completedSummaryDateFilter}
                        onChange={(e) => setCompletedSummaryDateFilter(e.target.value)}
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
                        onChange={(e) => setCompletedSummaryUnitFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto overflow-y-auto max-h-[420px]">
                  <table className="w-full min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Date", "Customer Name", "Unit", "Dispatch Date", "Dispatch Qty", "Total Value"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {completedSummaryFilteredRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            No completed jobs match these filters.
                          </td>
                        </tr>
                      ) : (
                        completedSummaryFilteredRows.map((r, idx) => (
                          <tr
                            key={`${r.id}-${idx}`}
                            className={`hover:bg-gray-50 ${
                              r.totalValue > 10000 ? "bg-green-50" : r.totalValue > 5000 ? "bg-yellow-50" : ""
                            }`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{r.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{r.customer}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {r.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{r.dispatchDate}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{r.dispatchQty.toLocaleString("en-IN")}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">{formatInr(r.totalValue)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                  <span>Showing {completedSummaryFilteredRows.length} of {completedSummaryRows.length} completed jobs</span>
                  <span className="font-semibold text-gray-900">Total Revenue: {formatInr(completedSummaryFilteredRevenue)}</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 sm:mb-0">
                  Job Cards Overview
                </h3>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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

                  <select
                    value={jobCardsDemandFilter}
                    onChange={(e) => setJobCardsDemandFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
                  >
                    <option value="all">All Demands</option>
                    <option value="high">Urgent</option>
                    <option value="medium">Regular</option>
                  </select>

                  <select
                    value={jobCardsStatusFilter}
                    onChange={(e) => setJobCardsStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="inProgress">In Progress</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
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
                    {jobCardsRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                          No job plans found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      jobCardsRows.map(({ jobPlan, progress, status }) => {
                        const demand = String(jobPlan.jobDemand || "").toLowerCase();
                        const normalizedDemand = demand === "low" ? "medium" : demand;
                        return (
                          <tr key={jobPlan.jobPlanId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {jobPlan.nrcJobNo}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Id: {(jobPlan as any).jobPlanCode || jobPlan.jobPlanId}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  normalizedDemand === "high"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {normalizedDemand === "high" ? "Urgent" : "Regular"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className="bg-[#00AEEF] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-500">{progress}%</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                {
                                  (jobPlan.steps || []).filter(
                                    (step) => getStepActualStatus(step) === "completed"
                                  ).length
                                }
                                /{(jobPlan.steps || []).length} steps
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  status === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : status === "inProgress"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {status === "inProgress"
                                  ? "In Progress"
                                  : status === "completed"
                                    ? "Completed"
                                    : "Planned"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDdMmYyyy(jobPlan.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => handleViewSteps(jobPlan)}
                                className="text-[#00AEEF] hover:text-[#0099cc] transition-colors duration-200 inline-flex items-center gap-1"
                              >
                                <EyeIcon className="h-4 w-4" />
                                <span>View Steps</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Print Jobs
              </p>
              <p className="text-xl font-bold text-blue-600">
                {updatedSummaryData?.totalPrintJobs || 0}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <PrinterIcon className="h-4 w-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Quantity Printed
              </p>
              <p className="text-xl font-bold text-indigo-600">
                {(
                  updatedSummaryData?.totalQuantityPrinted || 0
                ).toLocaleString()}
              </p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-xl">
              <CubeIcon className="h-4 w-4 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Wastage</p>
              <p className="text-xl font-bold text-orange-600">
                {(updatedSummaryData?.totalWastage || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-xl">
              <ArrowPathIcon className="h-4 w-4 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Accepted Jobs</p>
              <p className="text-xl font-bold text-green-600">
                {updatedSummaryData?.acceptedJobs || 0}
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
              <p className="text-sm font-medium text-gray-600">Pending Jobs</p>
              <p className="text-xl font-bold text-yellow-600">
                {updatedSummaryData?.pendingJobs || 0}
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
              <p className="text-sm font-medium text-gray-600">Wastage %</p>
              <p className="text-xl font-bold text-red-600">
                {updatedSummaryData?.averageWastagePercentage || 0}%
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-xl">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Job No, Operator, or Machine..."
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
                <option value="accept">Accepted</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="in_progress">In Progress</option>
                <option value="hold">On Hold</option>
                <option value="major_hold">Major Hold</option>
                <option value="planned">Planned</option>
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Showing {displayData.length} of {filteredData.length} print jobs (
            {showAllData ? "all" : "latest 5"} by date)
          </div>
        </div>
      </div>

      {/* Printing Details Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Printing Details
          </h3>
          <p className="text-sm text-gray-600">
            Click on any row to view detailed information
          </p>
        </div>

        <div className="overflow-x-hidden overflow-y-auto max-h-96">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operator
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Machine
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colours
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wastage
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wastage %
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
              {displayData.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <PrinterIcon className="h-8 w-8 text-gray-300" />
                      <p>No print jobs found matching the current filters</p>
                      <p className="text-sm text-gray-400">
                        Try adjusting your search or filter criteria
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayData.map((printing) => {
                  // If stepStatus is "start" and status is "pending", show as "in_progress"
                  const displayStatus =
                    printing.stepStatus === "start" &&
                    printing.status === "pending"
                      ? "in_progress"
                      : printing.status;
                  const statusInfo = getStatusInfo(displayStatus);
                  const StatusIcon = statusInfo.icon;
                  const wastagePercentage =
                    printing.quantity > 0
                      ? (printing.wastage / printing.quantity) * 100
                      : 0;

                  // Use a stable, unique key:
                  // - Prefer jobStepId (unique per step)
                  // - Fallback to combination of job number and printing id
                  const rowKey =
                    typeof printing.jobStepId === "number" && printing.jobStepId > 0
                      ? `step-${printing.jobStepId}`
                      : `job-${printing.jobNrcJobNo}-${printing.id}`;

                  return (
                    <tr
                      key={rowKey}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleRowClick(printing)}
                    >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 font-mono">
                      {printing.jobNrcJobNo}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Id: {printing.jobPlanCode || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(
                      ((printing as any).deliveryDate as string | null) ||
                        printing.date
                    )}
                  </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {printing.oprName ? getUserName(printing.oprName) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {printing.machine}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {printing.noOfColours || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {printing.quantity.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm font-medium text-gray-900">
                          {printing.wastage.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            {Math.round(wastagePercentage)}%
                          </div>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-red-600 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(wastagePercentage, 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.color}`}
                        >
                          <StatusIcon className="h-4 w-4 mr-1" />
                          {statusInfo.label}
                        </span>
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
                  ? `Showing all ${displayData.length} print jobs`
                  : `Showing latest 5 of ${filteredData.length} print jobs`}
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

      {isJobStepsModalOpen && selectedJobPlanForModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-7xl p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              type="button"
              onClick={() => setIsJobStepsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <h2 className="text-3xl font-semibold mb-4">
              Job Card Steps - {selectedJobPlanForModal.nrcJobNo}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col p-4 rounded-md shadow-sm border-l-4 border-blue-500 bg-white">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Job Card No
                </span>
                <button
                  type="button"
                  onClick={() => handleJobCardClick(selectedJobPlanForModal.nrcJobNo)}
                  className="text-base font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mt-0.5 text-left"
                >
                  {selectedJobPlanForModal.nrcJobNo} <span className="ml-1">›</span>
                </button>
              </div>
              <div className="flex flex-col p-4 rounded-md shadow-sm border-l-4 border-green-500 bg-white">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Job Plan Code
                </span>
                <span className="text-base font-semibold text-gray-900 mt-0.5">
                  {(selectedJobPlanForModal as any).jobPlanCode ??
                    selectedJobPlanForModal.jobPlanId}
                </span>
              </div>
              <div className="flex flex-col p-4 rounded-md shadow-sm border-l-4 border-black bg-white">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Demand
                </span>
                <span className="text-base font-semibold text-gray-900 mt-0.5">
                  {String(selectedJobPlanForModal.jobDemand || "").toLowerCase() ===
                  "high"
                    ? "Urgent"
                    : "Regular"}
                </span>
              </div>
              <div className="flex flex-col p-4 rounded-md shadow-sm border-l-4 border-orange-500 bg-white">
                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </span>
                <span className="text-base font-semibold text-gray-900 mt-0.5">
                  {formatDateTime(selectedJobPlanForModal.createdAt)}
                </span>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-2">Steps</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-emerald-50 to-green-100 sticky top-0">
                  <tr>
                    {[
                      "Step No",
                      "Step Name",
                      "Status",
                      "Machine",
                      "Capacity",
                      "Start Date",
                      "End Date",
                      "User",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(selectedJobPlanForModal.steps || []).map((step, idx) => {
                    const stepStatus = getStepDisplayStatus(step);
                    const isSelectedStep = String(step.stepName || "") === "PrintingDetails";
                    return (
                      <tr
                        key={step.id ?? `${selectedJobPlanForModal.jobPlanId}-${idx}`}
                        className={isSelectedStep ? "bg-indigo-50" : "hover:bg-indigo-50 transition-colors"}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          {step.stepNo ?? idx + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-800">
                          {String(step.stepName || "-").replace(/([a-z])([A-Z])/g, "$1 $2")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={getStepStatusBadgeClass(stepStatus)}>
                            {formatStepStatusLabel(stepStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {step.machineDetails?.[0]?.machineCode || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {step.machineDetails?.[0]?.machine?.capacity || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDdMmYyyy(step.startDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDdMmYyyy(step.endDate)}
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

      <JobAndPODetailsModal
        open={!!(jobDetailsWithPO || loadingJobDetails)}
        onClose={() => {
          setJobDetailsWithPO(null);
          setLoadingJobDetails(false);
          setJobDetailsError(null);
        }}
        loadingJobDetails={loadingJobDetails}
        jobDetailsError={jobDetailsError}
        jobDetailsWithPO={jobDetailsWithPO}
        activeJobTab={activeJobTab}
        setActiveJobTab={setActiveJobTab}
        selectedJobPlan={
          selectedJobPlanForModal
            ? ({ jobPlanId: selectedJobPlanForModal.jobPlanId } as {
                jobPlanId: number;
              })
            : null
        }
        zIndexClass="z-[60]"
      />

      {/* Detail Side Panel */}
      {showDetailPanel && selectedPrinting && (
        <div className="fixed inset-0 bg-transparent bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Printing Details
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
                    Job Information
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Job No:</span>
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {selectedPrinting.jobNrcJobNo}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusInfo(
                            selectedPrinting.stepStatus === "start" &&
                              selectedPrinting.status === "pending"
                              ? "in_progress"
                              : selectedPrinting.status
                          ).color
                        }`}
                      >
                        {
                          getStatusInfo(
                            selectedPrinting.stepStatus === "start" &&
                              selectedPrinting.status === "pending"
                              ? "in_progress"
                              : selectedPrinting.status
                          ).label
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Shift:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.shift || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Operator & Machine
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Operator:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.oprName
                          ? getUserName(selectedPrinting.oprName)
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Machine:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.machine}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Printing Specifications
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        No. of Colours:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.noOfColours || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Inks Used:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.inksUsed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Coating Type:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.coatingType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Separate Sheets:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.separateSheets ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Extra Sheets:
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.extraSheets || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Output Summary
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Quantity:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.quantity.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wastage:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedPrinting.wastage.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${
                            (selectedPrinting.wastage /
                              selectedPrinting.quantity) *
                            100
                          }%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {Math.round(
                        (selectedPrinting.wastage / selectedPrinting.quantity) *
                          100
                      )}
                      % wastage
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Timeline
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Print Date:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(selectedPrinting.date)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingDashboard;
