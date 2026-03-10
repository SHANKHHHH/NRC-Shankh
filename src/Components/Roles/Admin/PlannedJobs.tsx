import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import JobSearchBar from "./JobDetailsComponents/JobSearchBar";
import JobBarsChart from "./JobDetailsComponents/JobBarsChart";
import DetailedJobModal from "./JobDetailsComponents/DetailedJobModal";

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
  stepNo: number;
  stepName: string;
  status: string;
  machineDetails: any[];
}

const PlannedJobs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Set to false initially
  const [error, setError] = useState<string | null>(null);
  const [plannedJobs, setPlannedJobs] = useState<JobPlan[]>([]);

  // Extract state data passed from dashboard
  const {
    plannedJobs: passedPlannedJobs,
    dateFilter,
    customDateRange,
  } = location.state || {};

  // Function to fetch job details with PO information
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
      console.error(`Error fetching details for job ${nrcJobNo}:`, error);
    }
    return {
      jobDetails: null,
      purchaseOrderDetails: [],
      poJobPlannings: [],
    };
  };

  // Fetch planned jobs data
  const fetchPlannedJobs = async () => {
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
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!jobPlanningResponse.ok) {
        throw new Error(
          `Failed to fetch job planning data: ${jobPlanningResponse.status}`
        );
      }

      const jobPlanningResult = await jobPlanningResponse.json();

      if (jobPlanningResult.success && Array.isArray(jobPlanningResult.data)) {
        // Filter only planned jobs (no started or completed steps)
        const planned = jobPlanningResult.data.filter(
          (job: JobPlan) =>
            !job.steps.some(
              (step) =>
                step.status === "start" ||
                step.status === "stop" ||
                (step.stepDetails &&
                  (step.stepDetails.status === "in_progress" ||
                    step.stepDetails.status === "accept"))
            )
        );

        // Fetch additional details for each planned job using the new combined API
        const jobsWithDetails = await Promise.all(
          planned.map(async (job: JobPlan) => {
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

        setPlannedJobs(jobsWithDetails);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch planned jobs"
      );
      console.error("Planned jobs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Function to enhance passed jobs with additional details using the new API
  const enhancePassedJobsWithDetails = async (jobs: JobPlan[]) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      const jobsWithDetails = await Promise.all(
        jobs.map(async (job: JobPlan) => {
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

      setPlannedJobs(jobsWithDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enhance job details"
      );
      console.error("Job details enhancement error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if we have passed data from dashboard
    if (passedPlannedJobs && Array.isArray(passedPlannedJobs)) {
      console.log("Using passed planned jobs data:", passedPlannedJobs);
      enhancePassedJobsWithDetails(passedPlannedJobs);
    } else {
      // Fallback: fetch data if no state was passed (direct URL access)
      console.log("No passed data found, fetching planned jobs...");
      fetchPlannedJobs();
    }
  }, [passedPlannedJobs]);

  const handleJobClick = (job: JobPlan) => {
    setSelectedJob(job);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading planned jobs...</p>
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
            Error Loading Planned Jobs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPlannedJobs}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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

        {/* Planned Jobs Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gray-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Planned Jobs
                {dateFilter && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({dateFilter})
                  </span>
                )}
              </h3>
              <p className="text-3xl font-bold text-gray-600">
                {plannedJobs.length}
              </p>
            </div>
          </div>

          <JobBarsChart
            jobs={plannedJobs}
            category="planned"
            onJobClick={handleJobClick}
            searchTerm={searchTerm}
          />
        </div>

        {/* Show message if no jobs found */}
        {plannedJobs.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
            <div className="text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Planned Jobs Found
              </h3>
              <p className="text-sm">
                {dateFilter
                  ? `No planned jobs found for the selected ${dateFilter} period.`
                  : "No planned jobs available at the moment."}
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

export default PlannedJobs;

// export default PlannedJobs;
