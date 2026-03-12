import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ArrowLeft, PlayCircle } from "lucide-react";
import JobSearchBar from "./JobDetailsComponents/JobSearchBar";
import JobBarsChart from "./JobDetailsComponents/JobBarsChart";
import DetailedJobModal from "./JobDetailsComponents/DetailedJobModal";
interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobDemand: string;
  jobDetails: {
    id: number;
    srNo: number;
    noUps: string;
    width: number;
    height: string;
    length: number;
    status: string;
    preRate: number;
    styleId: string;
    clientId: string;
    boardSize: string;
    jobDemand: string;
    customerName: string;
    boxDimensions: string;
    processColors: string;
    artworkApprovedDate: string;
    artworkReceivedDate: string;
    shadeCardApprovalDate: string;
  };
  purchaseOrderDetails: {
    id: number;
    unit: string;
    poDate: string;
    status: string;
    customer: string;
    poNumber: string;
    noOfSheets: number;
    totalPOQuantity: number;
    deliveryDate: string;
  };
  allSteps: Array<{
    id: number;
    stepName: string;
    status: string;
    startDate: string;
    endDate: string;
    machineDetails: Array<{
      unit: string;
      machineId: string;
      machineCode: string;
      machineType: string;
    }>;
  }>;
  completedAt: string;
  completedBy: string;
  finalStatus: string;
  createdAt: string;
  // Keep the optional properties for backward compatibility
  status?: string;
  company?: string;
  customerName?: string;
  totalDuration?: number;
  steps?: any[];
}

interface JobPlan {
  id: number;
  nrcJobNo: string;
  company: string;
  boardSize: string;
  gsm: string;
  artwork: string;
  approvalDate: string;
  dispatchDate: string;
  status: string;
  steps: JobPlanStep[];
  createdAt: string;
  jobPlanCode?: string | null;
  // Enhanced with the new API response structure
  jobDetails?: EnhancedJobDetails;
  purchaseOrderDetails?: PurchaseOrderDetails[];
  poJobPlannings?: POJobPlanning[];
}

interface JobPlanStep {
  id: number;
  stepName: string;
  status: string;
  stepDetails?: any;
  updatedAt?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  user?: string;
}

// Updated interface to match your new API response
interface EnhancedJobDetails {
  nrcJobNo: string;
  styleItemSKU: string;
  customerName: string;
  fluteType: string;
  status: string;
  latestRate: number;
  preRate: number;
  length: number;
  width: number;
  height: string;
  boxDimensions: string;
  diePunchCode: number;
  boardCategory: string;
  noOfColor: string;
  processColors: string | null;
  specialColor1: string | null;
  specialColor2: string | null;
  specialColor3: string | null;
  specialColor4: string | null;
  overPrintFinishing: string | null;
  topFaceGSM: string;
  flutingGSM: string;
  bottomLinerGSM: string;
  decalBoardX: string;
  lengthBoardY: string;
  boardSize: string;
  noUps: string;
  artworkReceivedDate: string;
  artworkApprovedDate: string;
  shadeCardApprovalDate: string;
  sharedCardDiffDate: string | null;
  srNo: number;
  jobDemand: string;
  imageURL: string | null;
  noOfSheets: number | null;
  isMachineDetailsFilled: boolean;
  createdAt: string | null;
  updatedAt: string;
  userId: string | null;
  machineId: string;
  clientId: string;
  styleId: string;
  hasPurchaseOrders: boolean;
}

interface PurchaseOrderDetails {
  id: number;
  boardSize: string;
  customer: string;
  deliveryDate: string;
  dieCode: number;
  dispatchDate: string;
  dispatchQuantity: number;
  fluteType: string;
  jockeyMonth: string;
  noOfUps: number;
  nrcDeliveryDate: string;
  noOfSheets: number;
  poDate: string;
  poNumber: string;
  pendingQuantity: number;
  pendingValidity: number;
  plant: string;
  shadeCardApprovalDate: string;
  sharedCardDiffDate: number;
  srNo: number;
  style: string;
  totalPOQuantity: number;
  unit: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobNrcJobNo: string;
  userId: string | null;
}

interface POJobPlanning {
  poId: number;
  poNumber: string;
  poQuantity: number;
  poStatus: string;
  poDate: string;
  hasJobPlanning: boolean;
  jobPlanId: number;
  steps: JobPOStep[];
  assignedMachines: any[];
  completedSteps: number;
  totalSteps: number;
}

interface JobPOStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: MachineDetail[];
  jobPlanningId: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  user: string | null;
  startDate: string | null;
  endDate: string | null;
  poId: number;
  poSpecificQuantity: number;
}

interface MachineDetail {
  unit: string;
  machineId: string | null;
  machineCode: string | null;
  machineType: string;
}

const InProgressJobs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inProgressJobs, setInProgressJobs] = useState<JobPlan[]>([]);

  // Extract state data passed from dashboard
  const {
    inProgressJobs: passedInProgressJobs,
    dateFilter,
    customDateRange,
  } = location.state || {};

  // Helper: get the most recent activity date for a step (stepStartDate, stepEndDate, startDate, updatedAt, etc.)
  const getStepActivityDate = (step: JobPlanStep): Date | null => {
    const s = step as any;
    const raw =
      s.stepEndDate ||
      s.stepStartDate ||
      step.updatedAt ||
      (step.stepDetails && step.stepDetails.updatedAt) ||
      step.startDate ||
      (step.stepDetails && step.stepDetails.data && step.stepDetails.data.date);
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Helper function to check if a job has recent step activity within the date range (end = end of day)
  const hasRecentStepActivity = (
    job: JobPlan,
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return job.steps.some((step) => {
      const stepUpdateDate = getStepActivityDate(step);
      if (!stepUpdateDate) return false;
      return stepUpdateDate >= start && stepUpdateDate <= end;
    });
  };

  // Helper function to get date range from filter
  const getDateRangeFromFilter = (
    filter: string,
    customRange?: { start: string; end: string }
  ) => {
    if (filter === "custom" && customRange) {
      return { start: customRange.start, end: customRange.end };
    }

    const today = new Date();
    const start = new Date();

    switch (filter) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "yesterday": {
        start.setDate(today.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        return {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
      }
      case "week":
        start.setDate(today.getDate() - 7);
        break;
      case "month":
        start.setMonth(today.getMonth() - 1);
        break;
      default:
        return null;
    }

    return {
      start: start.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  };

  // Fetch job details with PO details using the new combined API
  const fetchJobWithPODetails = async (
    nrcJobNo: string,
    accessToken: string
  ) => {
    try {
      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/jobs/${encodeURIComponent(
          nrcJobNo
        )}/with-po-details`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return {
            jobDetails: result.data,
            purchaseOrderDetails: result.data.purchaseOrders || [],
            poJobPlannings: result.data.poJobPlannings || [],
          };
        }
      }
    } catch (error) {
      console.error(`Error fetching job+PO details for ${nrcJobNo}:`, error);
    }
    return {
      jobDetails: null,
      purchaseOrderDetails: [],
      poJobPlannings: [],
    };
  };

  // Enhanced fetch function with the new combined API
  const fetchInProgressJobsWithDetails = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Build query parameters for date filtering if available
      const queryParams = new URLSearchParams();
      if (dateFilter && dateFilter !== "custom") {
        queryParams.append("filter", dateFilter);
      } else if (customDateRange) {
        queryParams.append("startDate", customDateRange.start);
        queryParams.append("endDate", customDateRange.end);
      }

      // Fetch job planning data with date filter
      const jobPlanningUrl = `https://nrprod.nrcontainers.com/api/job-planning/?${queryParams.toString()}`;
      const jobPlanningResponse = await fetch(jobPlanningUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!jobPlanningResponse.ok) {
        throw new Error(
          `Failed to fetch job planning data: ${jobPlanningResponse.status}`
        );
      }

      const jobPlanningResult = await jobPlanningResponse.json();

      if (jobPlanningResult.success && Array.isArray(jobPlanningResult.data)) {
        // Filter only in-progress jobs
        const inProgress = jobPlanningResult.data.filter((job: JobPlan) =>
          job.steps.some(
            (step) =>
              step.status === "start" ||
              step.status === "stop" ||
              (step.stepDetails && step.stepDetails.status === "in_progress")
          )
        );

        // Fetch additional details for each in-progress job using the new combined API
        const jobsWithDetails = await Promise.all(
          inProgress.map(async (job: JobPlan) => {
            const { jobDetails, purchaseOrderDetails, poJobPlannings } =
              await fetchJobWithPODetails(job.nrcJobNo, accessToken);

            return {
              ...job,
              jobDetails,
              purchaseOrderDetails,
              poJobPlannings,
            };
          })
        );

        setInProgressJobs(jobsWithDetails);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch in-progress jobs"
      );
      console.error("In-progress jobs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to enhance passed jobs with additional details using the new API
  // When fromDashboard is true, skip date filtering - dashboard already sent the correct list for the selected period
  const enhancePassedJobsWithDetails = async (
    jobs: JobPlan[],
    fromDashboard?: boolean
  ) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Only apply date filtering when not using dashboard-passed data (dashboard already filtered)
      let filteredJobs = jobs;
      if (!fromDashboard && dateFilter) {
        const dateRange = getDateRangeFromFilter(dateFilter, customDateRange);
        if (dateRange) {
          console.log(
            `Filtering in-progress jobs by step activity for ${dateFilter}:`,
            dateRange
          );
          filteredJobs = jobs.filter((job: JobPlan) => {
            const hasActivity = hasRecentStepActivity(
              job,
              dateRange.start,
              dateRange.end
            );
            if (!hasActivity) {
              const jobTimestamp = (job as any).updatedAt ?? job.createdAt;
              const jobDate = new Date(jobTimestamp).toISOString().split("T")[0];
              return jobDate >= dateRange.start && jobDate <= dateRange.end;
            }
            return hasActivity;
          });
          console.log(
            `Filtered ${jobs.length} jobs to ${filteredJobs.length} based on step activity`
          );
        }
      }

      const jobsWithDetails = await Promise.all(
        filteredJobs.map(async (job: JobPlan) => {
          // Check if job already has complete details to avoid unnecessary API calls
          if (
            job.jobDetails &&
            job.purchaseOrderDetails &&
            job.poJobPlannings
          ) {
            return job;
          }

          // Fetch complete details using the new combined API
          const { jobDetails, purchaseOrderDetails, poJobPlannings } =
            await fetchJobWithPODetails(job.nrcJobNo, accessToken);

          return {
            ...job,
            jobDetails: jobDetails || job.jobDetails,
            purchaseOrderDetails:
              purchaseOrderDetails || job.purchaseOrderDetails || [],
            poJobPlannings: poJobPlannings || job.poJobPlannings || [],
          };
        })
      );

      setInProgressJobs(jobsWithDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enhance job details"
      );
      console.error("Job enhancement error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if we have passed data from dashboard
    if (passedInProgressJobs && Array.isArray(passedInProgressJobs)) {
      console.log("Using passed in-progress jobs data:", passedInProgressJobs);
      // Enhance passed data (skip date filter - dashboard already sent the right list)
      enhancePassedJobsWithDetails(passedInProgressJobs, true);
    } else {
      // Fallback: fetch data if no state was passed (direct URL access)
      console.log("No passed data found, fetching in-progress jobs...");
      fetchInProgressJobsWithDetails();
    }
  }, [passedInProgressJobs]);

  const handleJobClick = (job: CompletedJob | JobPlan) => {
    setSelectedJob(job as JobPlan); // Type assertion since we know it's JobPlan for in-progress jobs
    setIsModalOpen(true);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard", {
      state: {
        dateFilter: dateFilter,
        customDateRange: customDateRange,
      },
    });
  };

  // Add a retry function that calls the appropriate fetch method
  const handleRetry = () => {
    if (passedInProgressJobs && Array.isArray(passedInProgressJobs)) {
      enhancePassedJobsWithDetails(passedInProgressJobs, true);
    } else {
      fetchInProgressJobsWithDetails();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading in-progress jobs with complete details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Error Loading In-Progress Jobs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log("in progress jobs with complete details:", inProgressJobs);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Back Button and Filter Info */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors hover:cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>

          {/* Show current filter if available */}
          {dateFilter && (
            <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
              Filter:{" "}
              {dateFilter === "custom"
                ? `${customDateRange?.start} to ${customDateRange?.end}`
                : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <JobSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Search by NRC Job Number..."
          />
        </div>

        {/* In Progress Jobs Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-yellow-100 p-3 rounded-full">
              <PlayCircle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                In Progress Jobs
                {dateFilter && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({dateFilter})
                  </span>
                )}
              </h3>
              <p className="text-3xl font-bold text-yellow-600">
                {inProgressJobs.length}
              </p>
            </div>
          </div>

          <JobBarsChart
            jobs={inProgressJobs}
            category="inProgress"
            onJobClick={handleJobClick}
            searchTerm={searchTerm}
          />
        </div>

        {/* Show message if no jobs found */}
        {inProgressJobs.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
            <div className="text-gray-500">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No In-Progress Jobs Found
              </h3>
              <p className="text-sm">
                {dateFilter
                  ? `No in-progress jobs found for the selected ${dateFilter} period.`
                  : "No in-progress jobs available at the moment."}
              </p>
            </div>
          </div>
        )}

        {/* Detailed Job Modal */}
        <DetailedJobModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          job={selectedJob}
        />
      </div>
    </div>
  );
};

export default InProgressJobs;
