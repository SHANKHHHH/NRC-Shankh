import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ArrowLeft, PauseCircle } from "lucide-react";
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

// Use the same interfaces as your InProgressJobs component
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
  jobDetails?: EnhancedJobDetails;
  purchaseOrderDetails?: PurchaseOrderDetails[];
  poJobPlannings?: POJobPlanning[];
  // Additional properties from the actual data
  jobPlanningId?: number;
  totalHeldMachines?: number;
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
  // Additional properties for held jobs
  jobStepMachineStatus?: string;
  heldMachines?: Array<{
    machineId: string;
    machineCode: string;
    machineType: string;
    unit: string;
    jobStepMachineStatus?: string;
    status?: string;
    heldAt?: string;
    heldBy?: any;
    holdRemark?: string;
    startedAt?: string;
    completedAt?: string | null;
    capacity?: number;
    description?: string;
    formData?: any;
  }>;
  hasHeldMachines?: boolean;
  heldMachinesCount?: number;
  totalHeldMachines?: number;
}

// ... (copy the other interfaces from your InProgressJobs component)

const HeldJobs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heldJobs, setHeldJobs] = useState<JobPlan[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Extract state data passed from dashboard
  const {
    heldJobs: passedHeldJobs,
    dateFilter,
    customDateRange,
  } = location.state || {};

  // Helper function to check if a job has recent step activity
  const hasRecentStepActivity = (
    job: JobPlan,
    startDate: string,
    endDate: string
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const jobIdentifier =
      job.nrcJobNo || job.jobDetails?.nrcJobNo || job.id?.toString();

    console.log(
      `🔍 Checking step activity for job ${jobIdentifier} between ${startDate} and ${endDate}`
    );

    return job.steps.some((step) => {
      // Check step.updatedAt
      if (step.updatedAt) {
        const stepUpdateDate = new Date(step.updatedAt);
        if (!isNaN(stepUpdateDate.getTime())) {
          const isInRange = stepUpdateDate >= start && stepUpdateDate <= end;
          if (isInRange) {
            console.log(
              `✅ Found recent step activity in ${step.stepName}: ${step.updatedAt}`
            );
            return true;
          } else {
            console.log(
              `❌ Step ${step.stepName} update ${step.updatedAt} not in range`
            );
          }
        }
      }

      // Check held machines activity
      if (step.heldMachines && step.heldMachines.length > 0) {
        console.log(
          `🔍 Checking ${step.heldMachines.length} held machines in step ${step.stepName}`
        );
        const hasHeldActivity = step.heldMachines.some((machine: any) => {
          if (machine.heldAt) {
            const heldDate = new Date(machine.heldAt);
            if (!isNaN(heldDate.getTime())) {
              // Convert to date strings for comparison (ignore time)
              const heldDateStr = heldDate.toISOString().split("T")[0];
              const startStr = start.toISOString().split("T")[0];
              const endStr = end.toISOString().split("T")[0];
              const isInRange =
                heldDateStr >= startStr && heldDateStr <= endStr;

              console.log(
                `🔍 Machine ${machine.machineCode} held at ${machine.heldAt}`
              );
              console.log(
                `🔍 Date comparison: ${heldDateStr} >= ${startStr} && ${heldDateStr} <= ${endStr} = ${isInRange}`
              );

              if (isInRange) {
                console.log(
                  `✅ Found recent held machine activity in ${step.stepName}: ${machine.heldAt}`
                );
                return true;
              }
            } else {
              console.log(`❌ Invalid held date: ${machine.heldAt}`);
            }
          } else {
            console.log(`❌ No heldAt date for machine ${machine.machineCode}`);
          }
          return false;
        });
        if (hasHeldActivity) return true;
      } else {
        console.log(`❌ No held machines in step ${step.stepName}`);
      }

      return false;
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

  // Use the same fetchJobWithPODetails function from your InProgressJobs component
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
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const data = result.data || {};
          return {
            jobDetails: data,
            purchaseOrderDetails: data.purchaseOrders || data.purchaseOrderDetails || [],
            poJobPlannings: data.poJobPlannings || [],
            steps: data.steps,
            jobPlanningDetails: data.jobPlanningDetails,
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
      steps: undefined,
      jobPlanningDetails: undefined,
    };
  };

  // Fetch held jobs with details
  const fetchHeldJobsWithDetails = async () => {
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
        // Filter only held jobs
        const heldJobsData = jobPlanningResult.data.filter((job: JobPlan) => {
          const isHeld = job.steps.some((step) => {
            // Check for held status in various possible locations
            const hasHeldStatus =
              step.stepDetails?.data?.status === "hold" ||
              step.stepDetails?.status === "hold" ||
              step.jobStepMachineStatus === "hold" ||
              (step.heldMachines &&
                step.heldMachines.length > 0 &&
                step.heldMachines.some(
                  (machine: any) =>
                    machine.jobStepMachineStatus === "hold" ||
                    machine.status === "hold"
                )) ||
              step.hasHeldMachines === true;

            if (hasHeldStatus) {
              console.log(
                `🔍 Found held job: ${job.nrcJobNo} in step: ${step.stepName}`,
                {
                  stepDetails: step.stepDetails,
                  jobStepMachineStatus: step.jobStepMachineStatus,
                  heldMachines: step.heldMachines,
                  hasHeldMachines: step.hasHeldMachines,
                }
              );
            }

            return hasHeldStatus;
          });

          if (isHeld) {
            console.log(`✅ Job ${job.nrcJobNo} is held`);
          }

          return isHeld;
        });

        console.log(`🔍 Total jobs from API: ${jobPlanningResult.data.length}`);
        console.log(`🔍 Filtered held jobs: ${heldJobsData.length}`);

        // Fetch additional details for each held job using the combined API
        const jobsWithDetails = await Promise.all(
          heldJobsData.map(async (job: JobPlan) => {
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

        console.log(
          `🔍 Final held jobs with details: ${jobsWithDetails.length}`
        );
        setHeldJobs(jobsWithDetails);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch held jobs"
      );
      console.error("Held jobs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to enhance passed jobs with additional details
  const enhancePassedJobsWithDetails = async (jobs: JobPlan[]) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Apply step-based date filtering if dateFilter is available
      let filteredJobs = jobs;
      console.log(`🔍 Starting with ${jobs.length} held jobs before filtering`);

      if (dateFilter) {
        const dateRange = getDateRangeFromFilter(dateFilter, customDateRange);
        if (dateRange) {
          console.log(
            `Filtering held jobs by step activity for ${dateFilter}:`,
            dateRange
          );
          filteredJobs = jobs.filter((job: JobPlan) => {
            const jobIdentifier =
              job.nrcJobNo || job.jobDetails?.nrcJobNo || job.id?.toString();
            console.log(`🔍 Checking job: ${jobIdentifier}`);

            // Check if job has recent step activity within the date range
            const hasActivity = hasRecentStepActivity(
              job,
              dateRange.start,
              dateRange.end
            );

            if (hasActivity) {
              console.log(`✅ Job ${jobIdentifier} has recent step activity`);
              return true;
            }

            console.log(
              `Held job ${jobIdentifier} has no recent step activity, checking creation date`
            );

            // For held jobs, be more lenient with date filtering
            if (!job.createdAt) {
              console.log(
                `Job ${jobIdentifier} has no createdAt date, including it anyway (it's held)`
              );
              return true; // Always include held jobs without creation date
            }

            const jobDate = new Date(job.createdAt);
            if (isNaN(jobDate.getTime())) {
              console.warn(
                `Invalid job creation date: ${job.createdAt}, including anyway`
              );
              return true; // Include held jobs even with invalid creation date
            }

            const jobDateStr = jobDate.toISOString().split("T")[0];
            const isInDateRange =
              jobDateStr >= dateRange.start && jobDateStr <= dateRange.end;
            console.log(
              `Job ${jobIdentifier} creation date ${jobDateStr} in range: ${isInDateRange}`
            );

            return isInDateRange;
          });
          console.log(
            `Filtered ${jobs.length} held jobs to ${filteredJobs.length} based on step activity`
          );
        }
      } else {
        console.log(
          `No date filter applied, keeping all ${jobs.length} held jobs`
        );
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

          // Debug: Check job structure
          console.log(`🔍 Processing job:`, {
            nrcJobNo: job.nrcJobNo,
            jobDetailsNrcJobNo: job.jobDetails?.nrcJobNo,
            id: job.id,
            jobPlanningId: job.jobPlanningId,
            fullJob: job,
          });

          // Use the correct job identifier - check multiple possible locations
          const jobIdentifier =
            job.nrcJobNo ||
            job.jobDetails?.nrcJobNo ||
            job.id?.toString() ||
            job.jobPlanningId?.toString();

          console.log(`🔍 Selected job identifier: ${jobIdentifier}`);

          if (!jobIdentifier) {
            console.error(`❌ No valid job identifier found for job:`, job);
            return job; // Return job as-is if no identifier
          }

          // Fetch complete details using the new combined API
          const { jobDetails, purchaseOrderDetails, poJobPlannings, steps: apiSteps, jobPlanningDetails: apiJobPlanningDetails } =
            await fetchJobWithPODetails(jobIdentifier, accessToken);

          // Prefer API steps when they include held-machines format (hasHeldMachines, stepStatus, etc.)
          const steps = Array.isArray(apiSteps) && apiSteps.length > 0
            ? apiSteps
            : job.steps;

          return {
            ...job,
            jobDetails: jobDetails || job.jobDetails,
            purchaseOrderDetails:
              purchaseOrderDetails || job.purchaseOrderDetails || [],
            poJobPlannings: poJobPlannings || job.poJobPlannings || [],
            steps,
            ...(apiJobPlanningDetails && { jobPlanningDetails: apiJobPlanningDetails }),
          };
        })
      );

      console.log(
        `🔍 Final result: ${jobsWithDetails.length} held jobs after processing`
      );
      console.log(`🔍 Jobs with details:`, jobsWithDetails);
      console.log(
        `🔍 About to set heldJobs state with ${jobsWithDetails.length} jobs`
      );
      setHeldJobs(jobsWithDetails);
      console.log(`🔍 setHeldJobs called with:`, jobsWithDetails);
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
    // Prevent multiple initializations
    if (hasInitialized) {
      console.log("Already initialized, skipping useEffect");
      return;
    }

    console.log("useEffect running - hasInitialized:", hasInitialized);
    console.log("passedHeldJobs:", passedHeldJobs);

    // Check if we have passed data from dashboard
    if (passedHeldJobs && Array.isArray(passedHeldJobs)) {
      console.log("Using passed held jobs data:", passedHeldJobs);
      setHasInitialized(true);
      enhancePassedJobsWithDetails(passedHeldJobs);
    } else {
      console.log("No passed data found, fetching held jobs...");
      setHasInitialized(true);
      fetchHeldJobsWithDetails();
    }
  }, [passedHeldJobs, hasInitialized]);

  const handleJobClick = (job: CompletedJob | JobPlan) => {
    setSelectedJob(job as JobPlan); // Type assertion since we know it's JobPlan for held jobs
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

  const handleRetry = () => {
    console.log("Retry clicked - resetting initialization");
    setHasInitialized(false);
    setHeldJobs([]);
    setError(null);

    if (passedHeldJobs && Array.isArray(passedHeldJobs)) {
      enhancePassedJobsWithDetails(passedHeldJobs);
    } else {
      fetchHeldJobsWithDetails();
    }
  };

  // Debug: Log heldJobs state before render
  console.log(`🔍 RENDER: heldJobs.length = ${heldJobs.length}`);
  console.log(`🔍 RENDER: heldJobs =`, heldJobs);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            Loading held jobs with complete details...
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
            Error Loading Held Jobs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Back Button and Filter Info */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center space-x-2 text-orange-600 hover:text-orange-800 transition-colors hover:cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>

          {/* Show current filter if available */}
          {dateFilter && (
            <div className="text-sm text-gray-600 bg-orange-50 px-3 py-1 rounded-full">
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

        {/* Held Jobs Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-orange-100 p-3 rounded-full">
              <PauseCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Held Jobs
                {dateFilter && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({dateFilter})
                  </span>
                )}
              </h3>
              <p className="text-3xl font-bold text-orange-600">
                {heldJobs.length}
              </p>
            </div>
          </div>

          <JobBarsChart
            jobs={heldJobs}
            category="held"
            onJobClick={handleJobClick}
            searchTerm={searchTerm}
          />
        </div>

        {/* Show message if no jobs found */}
        {heldJobs.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
            <div className="text-gray-500">
              <PauseCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Held Jobs Found</h3>
              <p className="text-sm">
                {dateFilter
                  ? `No held jobs found for the selected ${dateFilter} period.`
                  : "No held jobs available at the moment."}
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

export default HeldJobs;
