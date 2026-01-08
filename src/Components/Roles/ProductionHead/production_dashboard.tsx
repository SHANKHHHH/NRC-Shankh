import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

const ProductionHeadDashboard: React.FC = () => {
  const { getUserName } = useUsers();
  const navigate = useNavigate();
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
    null
  );
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [modalJobData, setModalJobData] = useState<
    Array<{ jobPlan: JobPlan; step: ProductionStep }>
  >([]);
  const [modalTitle, setModalTitle] = useState("");
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);

  // Job Steps Modal state
  const [isJobStepsModalOpen, setIsJobStepsModalOpen] = useState(false);
  const [selectedJobPlanForModal, setSelectedJobPlanForModal] = useState<JobPlanForStats | null>(null);

  // Job Cards Overview filters
  const [jobCardsSearchTerm, setJobCardsSearchTerm] = useState("");
  const [jobCardsDemandFilter, setJobCardsDemandFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [jobCardsStatusFilter, setJobCardsStatusFilter] = useState<
    "all" | "completed" | "inProgress" | "planned"
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
  const [completedJobsData, setCompletedJobsData] = useState<CompletedJob[]>([]);

  // Date filter state (default to "month")
  const [dateFilter, setDateFilter] = useState<DateFilterType>("month");
  const [customDateRange, setCustomDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    end: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0],
  });

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

  // Load aggregated production data
  useEffect(() => {
    const loadAggregatedData = async () => {
      if (authStatus?.isAuthenticated) {
        try {
          setIsLoadingAggregated(true);
          setError(null);
          const data = await productionService.getAggregatedProductionData();
          
          // Console log the aggregated data
          console.log("=== AGGREGATED PRODUCTION DATA ===", JSON.stringify(data, null, 2));
          console.log("=== AGGREGATED PRODUCTION DATA (parsed) ===", data);
          
          setAggregatedData(data);
        } catch (error) {
          console.error("Error loading aggregated data:", error);
          setError(
            "Failed to load production overview data. Please try again."
          );
        } finally {
          setIsLoadingAggregated(false);
        }
      }
    };

    loadAggregatedData();
  }, [authStatus]);

  // Helper function to get step actual status (same as AdminDashboard)
  const getStepActualStatus = (
    step: JobPlanStep
  ): "completed" | "in_progress" | "hold" | "planned" => {
    // Check for hold status first (highest priority)
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

  // Helper function to get date range based on filter
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
          const startParts = customRange.start.split('-');
          const endParts = customRange.end.split('-');
          
          if (startParts.length === 3 && endParts.length === 3) {
            // Create dates in local timezone
            startDate = new Date(
              parseInt(startParts[0]),
              parseInt(startParts[1]) - 1, // Month is 0-indexed
              parseInt(startParts[2])
            );
            startDate.setHours(0, 0, 0, 0); // Start of day
            
            endDate = new Date(
              parseInt(endParts[0]),
              parseInt(endParts[1]) - 1, // Month is 0-indexed
              parseInt(endParts[2])
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
    endDate: Date
  ): boolean => {
    const checkDate = typeof date === "string" ? new Date(date) : date;
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return checkDate >= start && checkDate <= end;
  };

  // Filter job plans and completed jobs based on date filter
  const filteredJobPlansData = useMemo(() => {
    if (!dateFilter) return jobPlansData;

    const dateRange = getDateRange(dateFilter, customDateRange);
    if (!dateRange) return jobPlansData;

    const { startDate, endDate } = dateRange;

    return jobPlansData.filter((jobPlan) => {
      // Check if any step has been updated within the date range
      const hasRecentStepActivity = jobPlan.steps.some((step) => {
        if ((step as any).updatedAt) {
          const stepUpdateDate = new Date((step as any).updatedAt);
          return isDateInRange(stepUpdateDate, startDate, endDate);
        }
        return false;
      });

      // If no step activity found, fall back to job creation date
      if (!hasRecentStepActivity) {
        const jobDate = new Date((jobPlan as any).createdAt || Date.now());
        return isDateInRange(jobDate, startDate, endDate);
      }

      return hasRecentStepActivity;
    });
  }, [jobPlansData, dateFilter, customDateRange]);

  const filteredCompletedJobsData = useMemo(() => {
    if (!dateFilter) return completedJobsData;

    const dateRange = getDateRange(dateFilter, customDateRange);
    if (!dateRange) return completedJobsData;

    const { startDate, endDate } = dateRange;

    return completedJobsData.filter((completedJob) => {
      const completedAt = completedJob.completedAt;
      if (!completedAt) return false;
      return isDateInRange(completedAt, startDate, endDate);
    });
  }, [completedJobsData, dateFilter, customDateRange]);

  // Recalculate job statistics based on filtered data - use the SAME logic as AdminDashboard
  const filteredJobStats = useMemo(() => {
    // Count completed jobs from the completed jobs API (same as AdminDashboard)
    const completedJobs = filteredCompletedJobsData.length;
    
    // Count jobs from job planning API (these are in progress or planned)
    const totalJobPlans = filteredJobPlansData.length;
    let inProgressJobs = 0;
    let plannedJobs = 0;

    // Process each job plan using the EXACT same logic as AdminDashboard
    filteredJobPlansData.forEach((jobPlan: JobPlanForStats) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;

      jobPlan.steps.forEach((step: JobPlanStep) => {
        // Use helper function to get actual step status (same as AdminDashboard)
        const stepStatus = getStepActualStatus(step);

        if (stepStatus === "hold") {
          jobOnHold = true;
          jobCompleted = false;
        } else if (stepStatus === "completed") {
          // This step is completed
        } else if (stepStatus === "in_progress") {
          // This step is in progress (only if not on hold)
          jobInProgress = true;
          jobCompleted = false;
        } else {
          // This step is planned (not started)
          jobCompleted = false;
        }
      });

      // 🔥 FIXED: Use the exact same job categorization logic as AdminDashboard
      if (jobCompleted) {
        // This job is completed, but we're not counting it here since it comes from completed jobs API
        // NOTE: This case should not happen for job plans
      }
      // Don't increment heldJobs here - we use the count from the API
      if (jobOnHold) {
        // Job is on hold - don't count it as in progress or planned
      } else if (jobInProgress) {
        inProgressJobs++;
      } else {
        plannedJobs++;
      }
    });

    // Total includes both in-progress/planned jobs and completed jobs (same as AdminDashboard)
    const totalJobs = totalJobPlans + completedJobs;

    return {
      totalJobs,
      plannedJobs,
      inProgressJobs,
      completedJobs,
    };
  }, [filteredJobPlansData, filteredCompletedJobsData]);

  // Calculate filtered aggregated data based on filtered job plans
  const filteredAggregatedData = useMemo(() => {
    if (!aggregatedData) return null;

    // Create a map of completed jobs by nrcJobNo
    const completedJobsMap = new Map<string, any>();
    filteredCompletedJobsData.forEach((job: any) => {
      completedJobsMap.set(job.nrcJobNo, job);
    });

    // Get date range for filtering steps individually
    const dateRange = getDateRange(dateFilter, customDateRange);

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
      const allStepDetails = (completedJob as any)?.allStepDetails || (jobPlan as any).allStepDetails;

      // Filter only the 4 production steps
      const productionSteps = jobPlan.steps.filter(
        (step) =>
          step.stepName === "Corrugation" ||
          step.stepName === "FluteLaminateBoardConversion" ||
          step.stepName === "Punching" ||
          step.stepName === "SideFlapPasting"
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
          if (step.stepName === "Corrugation" && step.status === "stop" && (step.stepDetails as any)?.data?.corrugation?.date) {
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
          
          // Fall back to job creation date if step dates are not available
          if (!stepInDateRange) {
            const jobDate = new Date((jobPlan as any).createdAt || Date.now());
            stepInDateRange = isDateInRange(jobDate, startDate, endDate);
          }
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
            stepKey = "flapPasting";
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
              : step.stepName === "SideFlapPasting"
              ? "sideFlapPasting"
              : step.stepName.toLowerCase();

          // Check allStepDetails from completed job or jobPlan
          if (allStepDetails) {
            const stepDetails =
              allStepDetails[stepDetailKey as keyof typeof allStepDetails];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              // Check if any step detail has "accept" status
              const hasAcceptStatus = stepDetails.some(
                (detail: any) => detail.status === "accept"
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
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();

            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              const hasAcceptStatus = stepDetails.some(
                (detail: any) => detail.status === "accept"
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
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();
            
            // Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            if (step.stepDetails?.data && (step.stepDetails.data as any)[stepDataKey]) {
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
          stepSummary[stepKey].start++;
          stepSummary[stepKey].inProgress++;
          finalStatus = "in_progress";
        } else if (step.status === "stop") {
          if (isCompleted) {
            // If step detail has "accept", count as completed (NOT as stop)
            stepSummary[stepKey].completed++;
            completedSteps++;
            finalStatus = "completed";
            
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
        console.log(`[${stepKey.toUpperCase()}] Job: ${jobPlan.nrcJobNo}, Step: ${step.stepName}, Status: ${step.status}, FinalStatus: ${finalStatus}, isCompleted: ${isCompleted}`, {
          stepStatus: step.status,
          stepDetailsDataStatus: step.stepDetails?.data?.status,
          stepDetailsStatus: step.stepDetails?.status,
          allStepDetails: allStepDetails ? Object.keys(allStepDetails) : null,
          jobPlanNrcJobNo: jobPlan.nrcJobNo
        });
      });
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
    console.log("=== FLUTE LAMINATION PLANNED JOBS - COMPLETE JSON ===", JSON.stringify(fluteLaminationPlannedJobs, null, 2));

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
        stepDetailsDataCorrugation: (item.step.stepDetails as any)?.data?.corrugation,
        machineDetails: item.step.machineDetails,
        allStepDetails: item.jobPlan.allStepDetails,
        completeJobPlan: item.jobPlan,
        completeStep: item.step,
      })),
    });
    console.log("=== CORRUGATION COMPLETED JOBS - COMPLETE JSON ===", JSON.stringify(corrugationCompletedJobs, null, 2));

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
      },
    });

    return {
      totalJobs,
      stepSummary,
      overallEfficiency,
    };
  }, [filteredJobPlansData, filteredCompletedJobsData, aggregatedData]);

  // Helper function to fetch step details (same as AdminDashboard)
  const fetchStepDetails = async (
    stepName: string,
    stepId: number,
    accessToken: string
  ) => {
    try {
      let endpoint = "";
      switch (stepName) {
        case "PaperStore":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/paper-store/by-step-id/${stepId}`;
          break;
        case "PrintingDetails":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/printing-details/by-step-id/${stepId}`;
          break;
        case "Corrugation":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/corrugation/by-step-id/${stepId}`;
          break;
        case "FluteLaminateBoardConversion":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/flute-laminate-board-conversion/by-step-id/${stepId}`;
          break;
        case "Punching":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/punching/by-step-id/${stepId}`;
          break;
        case "SideFlapPasting":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/side-flap-pasting/by-step-id/${stepId}`;
          break;
        case "QualityDept":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/quality-dept/by-step-id/${stepId}`;
          break;
        case "DispatchProcess":
          endpoint = `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/dispatch-process/by-step-id/${stepId}`;
          break;
        default:
          return null;
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        console.warn(
          `Failed to fetch ${stepName} details for step ${stepId}: ${response.status}`
        );
        return null;
      }

      const result = await response.json();
      if (result.success && result.data) {
        return { data: result.data };
      }
      return null;
    } catch (error) {
      console.warn(`Error fetching ${stepName} details:`, error);
      return null;
    }
  };

  // Load job statistics (total, planned, in progress, completed)
  useEffect(() => {
    const loadJobStatistics = async () => {
      if (authStatus?.isAuthenticated) {
        try {
          setIsLoadingJobStats(true);
          const accessToken = localStorage.getItem("accessToken");
          if (!accessToken) {
            throw new Error("Authentication token not found");
          }

          // Fetch job planning data
          const jobPlanningResponse = await fetch(
            `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/job-planning/`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          // Fetch completed jobs data
          const completedJobsResponse = await fetch(
            `${import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"}/api/completed-jobs`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          let jobPlans: JobPlanForStats[] = [];
          let completedJobs: CompletedJob[] = [];

          if (jobPlanningResponse.ok) {
            const jobPlanningResult = await jobPlanningResponse.json();
            
            // Console log the complete original JSON from API
            console.log("=== COMPLETE ORIGINAL JSON - JOB PLANNING API ===", JSON.stringify(jobPlanningResult, null, 2));
            console.log("=== JOB PLANNING DATA (parsed) ===", jobPlanningResult);
            
            if (jobPlanningResult.success && Array.isArray(jobPlanningResult.data)) {
              jobPlans = jobPlanningResult.data;
              
              // Console log the job plans array
              console.log("=== JOB PLANS ARRAY (jobPlans) ===", jobPlans);

              // Fetch step details for each job plan (same as AdminDashboard)
              const jobPlansWithDetails = await Promise.all(
                jobPlans.map(async (jobPlan: JobPlanForStats) => {
                  const stepsWithDetails = await Promise.all(
                    jobPlan.steps.map(async (step: JobPlanStep) => {
                      let stepDetails = null;
                      if (step.status === "start" || step.status === "stop") {
                        stepDetails = await fetchStepDetails(
                          step.stepName,
                          step.id,
                          accessToken
                        );
                      }

                      return {
                        ...step,
                        stepDetails: stepDetails || undefined,
                      };
                    })
                  );

                  return {
                    ...jobPlan,
                    steps: stepsWithDetails,
                  };
                })
              );

              // Console log the enriched job plans with step details
              console.log("=== JOB PLANS WITH STEP DETAILS (jobPlansWithDetails) ===", jobPlansWithDetails);
              
              setJobPlansData(jobPlansWithDetails);
              jobPlans = jobPlansWithDetails; // Use the enriched data for calculations
            }
          }

          if (completedJobsResponse.ok) {
            const completedJobsResult = await completedJobsResponse.json();
            
            // Console log the complete original JSON from API
            console.log("=== COMPLETE ORIGINAL JSON - COMPLETED JOBS API ===", JSON.stringify(completedJobsResult, null, 2));
            console.log("=== COMPLETED JOBS DATA (parsed) ===", completedJobsResult);
            
            if (completedJobsResult.success && Array.isArray(completedJobsResult.data)) {
              completedJobs = completedJobsResult.data;
              
              // Console log the completed jobs array
              console.log("=== COMPLETED JOBS ARRAY (completedJobs) ===", completedJobs);
              
              setCompletedJobsData(completedJobs);
            }
          }

          // Calculate statistics using getStepActualStatus for accurate categorization
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
              } else if (stepStatus === "completed") {
                // Continue checking other steps
              } else if (stepStatus === "in_progress") {
                jobInProgress = true;
                jobCompleted = false;
              } else {
                jobCompleted = false;
              }
            });

            // Categorize job
            if (jobOnHold) {
              // Don't count held jobs as in progress or planned
            } else if (jobInProgress) {
              inProgressJobs++;
            } else if (!jobCompleted) {
              plannedJobs++;
            }
          });

          const totalJobs = jobPlans.length + completedJobs.length;
          const completedJobsCount = completedJobs.length;

          // Note: jobStats will be recalculated by filteredJobStats useMemo
          // This initial calculation is kept for backward compatibility
          setJobStats({
            totalJobs,
            plannedJobs,
            inProgressJobs,
            completedJobs: completedJobsCount,
          });
        } catch (error) {
          console.error("Error loading job statistics:", error);
          // Don't set error state here to avoid breaking the dashboard
        } finally {
          setIsLoadingJobStats(false);
        }
      }
    };

    loadJobStatistics();
  }, [authStatus]);

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
    const inProgressJobPlans = filteredJobPlansData.filter((jobPlan) => {
      let jobInProgress = false;
      let jobOnHold = false;

      jobPlan.steps.forEach((step) => {
        const stepStatus = getStepActualStatus(step);

        if (stepStatus === "hold") {
          jobOnHold = true;
        } else if (stepStatus === "in_progress") {
          jobInProgress = true;
        }
      });

      return jobInProgress && !jobOnHold;
    });

    navigate("/dashboard/in-progress-jobs", {
      state: {
        inProgressJobs: inProgressJobPlans,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  const handlePlannedJobsClick = () => {
    const plannedJobPlans = filteredJobPlansData.filter((jobPlan) => {
      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;

      jobPlan.steps.forEach((step) => {
        const stepStatus = getStepActualStatus(step);

        if (stepStatus === "hold") {
          jobOnHold = true;
          jobCompleted = false;
        } else if (stepStatus === "completed") {
          // Continue checking
        } else if (stepStatus === "in_progress") {
          jobInProgress = true;
          jobCompleted = false;
        } else {
          jobCompleted = false;
        }
      });

      return !jobCompleted && !jobInProgress && !jobOnHold;
    });

    navigate("/dashboard/planned-jobs", {
      state: {
        plannedJobs: plannedJobPlans,
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Search jobs with partial matching and suggestions
  const searchJobsLocally = (term: string): Array<{
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
      .filter((nrcJobNo) => 
        nrcJobNo.toLowerCase().includes(searchLower)
      )
      .slice(0, 10) // Limit to 10 suggestions
      .map((nrcJobNo) => {
        // Find the job plan to get additional details
        const jobPlan = filteredJobPlansData.find((jp) => jp.nrcJobNo === nrcJobNo);
        const completedJob = filteredCompletedJobsData.find((cj) => cj.nrcJobNo === nrcJobNo);
        
        const hasProductionSteps = jobPlan?.steps?.some(
          (step) =>
            step.stepName === "Corrugation" ||
            step.stepName === "FluteLaminateBoardConversion" ||
            step.stepName === "Punching" ||
            step.stepName === "SideFlapPasting"
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
        return "Flap Pasting";
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
    stepName: string
  ) => {
    try {
      setIsLoadingModalData(true);
      let jobData: Array<{ jobPlan: JobPlan; step: ProductionStep }> = [];
      let title = "";

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
        };
        const targetStepName = stepNameMapping[stepKey];
        
        // Use filteredJobPlansData directly (same as counting logic) to ensure stepDetails are available
        const completedJobsMap = new Map<string, any>();
        filteredCompletedJobsData.forEach((job: any) => {
          completedJobsMap.set(job.nrcJobNo, job);
        });
        
        const localJobData: Array<{ jobPlan: JobPlan; step: ProductionStep }> = [];
        
        filteredJobPlansData.forEach((jobPlan) => {
          const completedJob = completedJobsMap.get(jobPlan.nrcJobNo);
          const allStepDetails = (completedJob as any)?.allStepDetails || (jobPlan as any).allStepDetails;
          
          const matchingSteps = jobPlan.steps.filter((step) => {
            if (step.stepName !== targetStepName) return false;
            
            // Use the same hasAcceptStatus logic as counting
            const hasAcceptStatus = () => {
              // FIRST: Check stepDetails.data[stepName].status
              if ((step as any).stepDetails?.data) {
                const stepDataKey =
                  step.stepName === "FluteLaminateBoardConversion"
                    ? "flutelam"
                    : step.stepName === "SideFlapPasting"
                    ? "sideFlapPasting"
                    : step.stepName.toLowerCase();
                
                const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
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
                    : step.stepName === "SideFlapPasting"
                    ? "sideFlapPasting"
                    : step.stepName.toLowerCase();
                
                const stepDetails = allStepDetails[stepDetailKey as keyof typeof allStepDetails];
                if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                  if (stepDetails.some((detail: any) => detail.status === "accept")) {
                    return true;
                  }
                }
              }
              
              // FOURTH: Check step-level details
              const stepDetailProp =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepDetails = (step as any)[stepDetailProp];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                if (stepDetails.some((detail: any) => detail.status === "accept")) {
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
            
            if (status === "start" || status === "in_progress") {
              // For in progress, include "start" status and "stop" without accept
              if (step.status === "start") {
                return true;
              }
              if (step.status === "stop" && !hasAcceptStatus()) {
                return true;
              }
              return false;
            }
            
            // For planned, return steps with planned status
            return step.status === status;
          });
          
          matchingSteps.forEach((step) => {
            localJobData.push({ jobPlan: jobPlan as JobPlan, step: step as ProductionStep });
          });
        });
        
        jobData = localJobData;
        title = `${stepName} - ${
          status.charAt(0).toUpperCase() + status.slice(1)
        } Jobs`;
      }

      // 🔥 DEBUG: Log before completed/stopped filtering
      if (status === "completed" && stepKey === "corrugation") {
        console.log(`[handleStatusCardClick] BEFORE COMPLETED FILTER - Corrugation Completed`, {
          count: jobData.length,
          jobs: jobData.map((item) => {
            const step = item.step;
            // Check accept status using the same logic
            const hasAccept = (() => {
              if (step.stepDetails?.data) {
                const stepData = (step.stepDetails.data as any).corrugation;
                if (stepData && stepData.status === "accept") return true;
              }
              if ((step.stepDetails as any)?.data?.status === "accept") return true;
              if ((step.stepDetails as any)?.status === "accept") return true;
              const allStepDetails = (item.jobPlan as any).allStepDetails;
              if (allStepDetails?.corrugation) {
                if (Array.isArray(allStepDetails.corrugation) && allStepDetails.corrugation.some((d: any) => d.status === "accept")) return true;
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
              stepDetailsDataCorrugation: (step.stepDetails as any)?.data?.corrugation,
              stepDetailsDataCorrugationStatus: (step.stepDetails as any)?.data?.corrugation?.status,
              allStepDetails: (item.jobPlan as any).allStepDetails,
              allStepDetailsCorrugation: (item.jobPlan as any).allStepDetails?.corrugation,
            };
          }),
        });
      }

      // Apply additional filtering to ensure completed/stopped logic matches the counting logic
      // This is a safety check to ensure the detail view matches the card counts
      if (status === "completed") {
        // Filter to only include steps that should be counted as completed
        // This includes: status === "accept", status === "completed", or status === "stop" with accept
        const beforeFilterCount = jobData.length;
        const filteredOutJobs: any[] = [];
        
        jobData = jobData.filter((item) => {
          const step = item.step;
          
          // Check if step has accept status using the EXACT same logic as counting in filteredAggregatedData
          const hasAcceptStatus = () => {
            // FIRST: Check stepDetails.data[stepName].status (e.g., stepDetails.data.corrugation.status)
            // This is the most direct way to check accept status for each step
            if ((step as any).stepDetails?.data) {
              const stepDataKey =
                step.stepName === "FluteLaminateBoardConversion"
                  ? "flutelam"
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
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
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepDetails = allStepDetails[stepDetailKey as keyof typeof allStepDetails];
              if (Array.isArray(stepDetails) && stepDetails.length > 0) {
                if (stepDetails.some((detail: any) => detail.status === "accept")) {
                  return true;
                }
              }
            }
            
            // FOURTH: Check step-level details (direct properties on step) - same as counting logic
            const stepDetailProp =
              step.stepName === "FluteLaminateBoardConversion"
                ? "flutelam"
                : step.stepName === "SideFlapPasting"
                ? "sideFlapPasting"
                : step.stepName.toLowerCase();
            
            const stepDetails = (step as any)[stepDetailProp];
            if (Array.isArray(stepDetails) && stepDetails.length > 0) {
              if (stepDetails.some((detail: any) => detail.status === "accept")) {
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
              stepDetailsDataCorrugation: (step.stepDetails as any)?.data?.corrugation,
              allStepDetails: (item.jobPlan as any).allStepDetails,
              reason: step.status === "stop" && !hasAccept ? "stop without accept" : "other",
            });
          }
          
          return false;
        });
        
        // 🔥 DEBUG: Log after completed filtering for Corrugation
        if (stepKey === "corrugation") {
          console.log(`[handleStatusCardClick] AFTER COMPLETED FILTER - Corrugation Completed`, {
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
          });
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
                  : step.stepName === "SideFlapPasting"
                  ? "sideFlapPasting"
                  : step.stepName.toLowerCase();
              
              const stepData = ((step as any).stepDetails.data as any)[stepDataKey];
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
      console.log(`[handleStatusCardClick] BEFORE DATE FILTER - Status: ${status}, Step: ${stepName}, Count: ${jobData.length}`, {
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
      });

      // Apply date filter to the results - filter based on the specific step's date
      // This ensures the detail view matches the count shown on the card
      // IMPORTANT: Use the same date filtering logic as filteredJobPlansData
      // 🔥 SPECIAL: For completed Corrugation steps, use stepDetails.data.corrugation.date (the actual completion date)
      const dateRange = getDateRange(dateFilter, customDateRange);
      if (dateRange) {
        const { startDate, endDate } = dateRange;
        const beforeFilterCount = jobData.length;
        const filteredOutJobs: any[] = [];
        
        jobData = jobData.filter((item) => {
          const step = item.step;
          const jobPlan = item.jobPlan;
          
          // 🔥 SPECIAL HANDLING: For completed Corrugation steps, check stepDetails.data.corrugation.date first
          // This is the actual completion date when status is "accept"
          if (status === "completed" && step.stepName === "Corrugation" && (step.stepDetails as any)?.data?.corrugation?.date) {
            const completionDate = new Date((step.stepDetails as any).data.corrugation.date);
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
              stepDetailsDataCorrugationDate: (step.stepDetails as any)?.data?.corrugation?.date,
              jobCreatedAt: (jobPlan as any).createdAt,
              reason: "Date filter excluded",
            });
          }
          
          return isInRange;
        });
        
        // 🔥 DEBUG: Log after date filtering
        console.log(`[handleStatusCardClick] AFTER DATE FILTER - Status: ${status}, Step: ${stepName}`, {
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
        });
      }
      
      // Console log for debugging
      console.log(`[handleStatusCardClick] FINAL - Status: ${status}, Step: ${stepName}, Filtered Count: ${jobData.length}`, jobData);

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

              {/* Refresh Button */}
              <button
                onClick={() => {
                  const loadAggregatedData = async () => {
                    try {
                      setIsLoadingAggregated(true);
                      setError(null);
                      const data =
                        await productionService.getAggregatedProductionData();
                      setAggregatedData(data);
                    } catch (error) {
                      console.error("Error refreshing data:", error);
                      setError(
                        "Failed to refresh production data. Please try again."
                      );
                    } finally {
                      setIsLoadingAggregated(false);
                    }
                  };
                  loadAggregatedData();
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
          <DateFilterComponent
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            customDateRange={customDateRange}
            setCustomDateRange={setCustomDateRange}
            className="w-full"
          />
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
            totalJobs={filteredJobStats.totalJobs}
            completedJobs={filteredJobStats.completedJobs}
            inProgressJobs={filteredJobStats.inProgressJobs}
            plannedJobs={filteredJobStats.plannedJobs}
            activeUsers={0}
            heldJobs={0}
            onTotalJobsClick={handleTotalJobsClick}
            onCompletedJobsClick={handleCompletedJobsClick}
            onInProgressJobsClick={handleInProgressJobsClick}
            onPlannedJobsClick={handlePlannedJobsClick}
            onHeldJobsClick={() => {}}
          />
        )}
      </div>

      {/* Job Cards Overview */}
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
                onChange={(e) => setJobCardsDemandFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
              >
                <option value="all">All Demands</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>

              {/* Status Filter */}
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
                  const filteredJobCards = filteredJobPlansData.filter((jobPlan) => {
                    const matchesSearch = jobPlan.nrcJobNo
                      .toLowerCase()
                      .includes(jobCardsSearchTerm.toLowerCase());
                    
                    const jobDemand = (jobPlan as any).jobDemand?.toLowerCase() || "";
                    const matchesDemand =
                      jobCardsDemandFilter === "all" ||
                      (jobCardsDemandFilter === "low" && jobDemand === "low") ||
                      (jobCardsDemandFilter === "medium" && jobDemand === "medium") ||
                      (jobCardsDemandFilter === "high" && jobDemand === "high");

                    let matchesStatus = true;
                    if (jobCardsStatusFilter !== "all") {
                      const stepStatuses = jobPlan.steps.map((step) =>
                        getStepActualStatus(step)
                      );
                      const hasInProgress = stepStatuses.some(
                        (status) => status === "in_progress"
                      );
                      const hasHold = stepStatuses.some((status) => status === "hold");
                      const allCompleted = stepStatuses.every(
                        (status) => status === "completed"
                      );

                      if (jobCardsStatusFilter === "completed") matchesStatus = allCompleted;
                      else if (jobCardsStatusFilter === "inProgress")
                        matchesStatus = hasInProgress || hasHold;
                      else if (jobCardsStatusFilter === "planned")
                        matchesStatus = !hasInProgress && !hasHold && !allCompleted;
                    }

                    return matchesSearch && matchesDemand && matchesStatus;
                  });

                  const getJobStatus = (jobPlan: JobPlanForStats) => {
                    const stepStatuses = jobPlan.steps.map((step) => getStepActualStatus(step));
                    const hasInProgress = stepStatuses.some(
                      (status) => status === "in_progress"
                    );
                    const hasHold = stepStatuses.some((status) => status === "hold");
                    const allCompleted = stepStatuses.every((status) => status === "completed");

                    if (allCompleted)
                      return { text: "Completed", color: "bg-green-100 text-green-800" };
                    if (hasInProgress || hasHold)
                      return { text: "In Progress", color: "bg-yellow-100 text-yellow-800" };
                    return { text: "Planned", color: "bg-gray-100 text-gray-800" };
                  };

                  const getProgressPercentage = (jobPlan: JobPlanForStats) => {
                    const completedSteps = jobPlan.steps.filter(
                      (step) => getStepActualStatus(step) === "completed"
                    ).length;
                    const totalSteps = jobPlan.steps.length;
                    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
                  };

                  const formatDate = (dateString: string | null) => {
                    if (!dateString) return "-";
                    const date = new Date(dateString);
                    const day = String(date.getDate()).padStart(2, "0");
                    const month = String(date.getMonth() + 1).padStart(2, "0");
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                  };

                  return filteredJobCards.length > 0 ? (
                    filteredJobCards.map((jobPlan) => {
                      const status = getJobStatus(jobPlan);
                      const progressPercentage = getProgressPercentage(jobPlan);
                      const jobDemand = (jobPlan as any).jobDemand || "low";

                      return (
                        <tr key={jobPlan.jobPlanId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {jobPlan.nrcJobNo}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {jobPlan.jobPlanId}
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
                                  (step) => getStepActualStatus(step) === "completed"
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
                        <p className="text-gray-500">No job plans found matching your criteria.</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                                Demand: {job.jobDemand} • Steps: {job.totalSteps}
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
                  
                  {showSuggestions && searchTerm.trim() && searchSuggestions.length === 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3">
                      <p className="text-sm text-gray-500">No jobs found matching "{searchTerm}"</p>
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
                      {filteredAggregatedData?.overallEfficiency || aggregatedData?.overallEfficiency || 0}%
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
                      {filteredAggregatedData?.totalJobs || aggregatedData?.totalJobs || 0}
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
                        ? Object.values(filteredAggregatedData.stepSummary).reduce(
                            (total, step) => total + step.total,
                            0
                          )
                        : aggregatedData
                        ? Object.values(aggregatedData.stepSummary).reduce(
                            (total, step) => total + step.total,
                            0
                          )
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
                        ? Object.values(filteredAggregatedData.stepSummary).reduce(
                            (total, step) => total + step.inProgress,
                            0
                          )
                        : aggregatedData
                        ? Object.values(aggregatedData.stepSummary).reduce(
                            (total, step) => total + step.inProgress,
                            0
                          )
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
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
                ].map((step, index) => {
                  const dataSource = filteredAggregatedData || aggregatedData;
                  const stepKey = step.key as "corrugation" | "fluteLamination" | "punching" | "flapPasting";
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
                                  step.name
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
                                  step.name
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
                                  step.name
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
                                  step.name
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
                                      stepDetail.status
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
                                s.status === "accept"
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
                      <p className="text-gray-600">NRC Job No:</p>
                      <p className="font-medium text-gray-900">
                        {selectedJobDetails.nrcJobNo}
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
                              step.status
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
                  label: "Job Card No",
                  value: selectedJobPlanForModal.nrcJobNo,
                  color: "blue",
                },
                {
                  label: "Job Card ID",
                  value: selectedJobPlanForModal.jobPlanId,
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
                    const createdAt = (selectedJobPlanForModal as any).createdAt;
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
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };
                    const getStatusStyle = (status: string) => {
                      const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";
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
                              stepStatus
                            )}`}
                          >
                            {stepStatus.charAt(0).toUpperCase() +
                              stepStatus.slice(1).replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {(step as any).machineDetails?.[0]?.machineCode || "-"}
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
