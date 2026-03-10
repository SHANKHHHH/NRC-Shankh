import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  PlayCircle,
  Clock,
} from "lucide-react";
import JobSearchBar from "./JobSearchBar";
import JobBarsChart from "./JobBarsChart";
import DetailedJobModal from "./DetailedJobModal";

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
}

interface JobPlanStep {
  id: number;
  stepName: string;
  status: string;
  stepDetails?: any;
}

interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobPlanCode?: string | null;
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
}

interface JobDetailsContainerProps {
  // This will be populated from route params or API call
}

const JobDetailsContainer: React.FC<JobDetailsContainerProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedCategory, setSelectedCategory] = useState<
    "completed" | "inProgress" | "planned" | null
  >(null);
  const [isDirectCompleted, setIsDirectCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<CompletedJob | JobPlan | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false); // Set to false initially
  const [error, setError] = useState<string | null>(null);

  // State for real job data
  const [jobPlans, setJobPlans] = useState<JobPlan[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);

  // Extract state data passed from dashboard
  const {
    jobData,
    filteredJobPlans,
    filteredCompletedJobs,
    dateFilter,
    customDateRange,
  } = location.state || {};

  // Fetch real job data from APIs
  const fetchJobData = async () => {
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

      // Fetch completed jobs data with better error handling
      let completedJobsData: CompletedJob[] = [];
      try {
        const completedJobsUrl = `https://nrprod.nrcontainers.com/api/completed-jobs?${queryParams.toString()}`;
        const completedJobsResponse = await fetch(completedJobsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (completedJobsResponse.status === 401) {
          console.warn(
            "Authentication failed for completed-jobs API. Token may be expired."
          );
          completedJobsData = [];
        } else if (completedJobsResponse.ok) {
          const completedJobsResult = await completedJobsResponse.json();
          if (
            completedJobsResult.success &&
            Array.isArray(completedJobsResult.data)
          ) {
            completedJobsData = completedJobsResult.data;
          }
        } else {
          console.warn(
            `Completed jobs API returned status: ${completedJobsResponse.status}`
          );
          completedJobsData = [];
        }
      } catch (completedJobsError) {
        console.warn("Failed to fetch completed jobs:", completedJobsError);
        completedJobsData = [];
      }

      if (jobPlanningResult.success && Array.isArray(jobPlanningResult.data)) {
        setJobPlans(jobPlanningResult.data);
        setCompletedJobs(completedJobsData);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch job data");
      console.error("Job data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if we have passed data from dashboard
    if (
      filteredJobPlans &&
      Array.isArray(filteredJobPlans) &&
      filteredCompletedJobs &&
      Array.isArray(filteredCompletedJobs)
    ) {
      console.log("Using passed job data:", {
        filteredJobPlans,
        filteredCompletedJobs,
      });
      setJobPlans(filteredJobPlans);
      setCompletedJobs(filteredCompletedJobs);
      setLoading(false);
    } else {
      // Fallback: fetch data if no state was passed (direct URL access)
      console.log("No passed data found, fetching job data...");
      fetchJobData();
    }

    // Check if we should go directly to completed jobs view
    const directToCompleted = localStorage.getItem("directToCompleted");
    console.log(
      "JobDetailsContainer localStorage directToCompleted:",
      directToCompleted
    );
    if (directToCompleted === "true") {
      console.log("Setting isDirectCompleted to true");
      setIsDirectCompleted(true);
      localStorage.removeItem("directToCompleted");
    }
  }, [filteredJobPlans, filteredCompletedJobs]);

  // Categorize jobs using the same logic as dashboard
  // Categorize jobs
  // Categorize jobs using the same logic as dashboard
  // 🔥 SAFER VERSION: Ensure every job gets categorized
  // 🔥 UPDATED: Use the exact same logic as admin dashboard
  const getJobsByCategory = () => {
    console.log("🔍 getJobsByCategory - Input jobPlans:", jobPlans.length);

    const completed: CompletedJob[] = completedJobs;
    const inProgress: JobPlan[] = [];
    const planned: JobPlan[] = [];

    // 🔥 Use the EXACT same logic as your admin dashboard processJobPlanData
    jobPlans.forEach((jobPlan, index) => {
      console.log(
        `Processing job ${index + 1}/${jobPlans.length}: ${jobPlan.nrcJobNo}`
      );

      let jobCompleted = true;
      let jobInProgress = false;
      let jobOnHold = false;

      // If job has no steps, it's planned
      if (!jobPlan.steps || jobPlan.steps.length === 0) {
        console.log(`  → PLANNED (no steps)`);
        planned.push(jobPlan);
        return;
      }

      // Process each step using EXACT same logic as admin dashboard
      jobPlan.steps.forEach((step) => {
        // Check for hold status first (highest priority)
        if (
          step.stepDetails?.data?.status === "hold" ||
          step.stepDetails?.status === "hold"
        ) {
          jobOnHold = true;
          jobCompleted = false;
        } else if (
          step.status === "stop" ||
          (step.stepDetails && step.stepDetails.status === "accept")
        ) {
          // This step is completed - continue checking other steps
        } else if (
          step.status === "start" ||
          (step.stepDetails && step.stepDetails.status === "in_progress")
        ) {
          // This step is in progress
          jobInProgress = true;
          jobCompleted = false;
        } else {
          // This step is planned (not started)
          jobCompleted = false;
        }
      });

      // Determine job status using EXACT same logic as admin dashboard
      if (jobCompleted) {
        // This job is completed, but we're not counting it here since it comes from completed jobs API
        console.log(`  → Should be in completed jobs API (not job plans)`);
        // Note: This case should not happen for job plans
      } else if (jobOnHold) {
        console.log(`  → HELD (has hold status) - excluding from in progress`);
        // Exclude held jobs from in progress category
        // They should be handled by the separate HeldJobs component
        // Don't add to any category in this component
      } else if (jobInProgress) {
        console.log(`  → IN PROGRESS`);
        inProgress.push(jobPlan);
      } else {
        console.log(`  → PLANNED`);
        planned.push(jobPlan);
      }
    });

    console.log("📊 Final counts (using admin dashboard logic):");
    console.log(`  Completed (API): ${completed.length}`);
    console.log(`  In Progress: ${inProgress.length}`);
    console.log(`  Planned: ${planned.length}`);
    console.log(
      `  TOTAL: ${completed.length + inProgress.length + planned.length}`
    );

    // Safety check
    const totalCategorized = inProgress.length + planned.length;
    if (totalCategorized !== jobPlans.length) {
      console.error(
        `❌ JOBS LOST! Input: ${jobPlans.length}, Categorized: ${totalCategorized}`
      );
    }

    return { completed, inProgress, planned };
  };

  const { completed, inProgress, planned } = getJobsByCategory();

  const handleCategoryClick = (
    category: "completed" | "inProgress" | "planned"
  ) => {
    setSelectedCategory(category);
    setIsDirectCompleted(false);
    setSearchTerm("");
    setSelectedJob(null);
    setIsModalOpen(false);
  };

  const handleDirectCompletedClick = () => {
    setIsDirectCompleted(true);
    setSelectedCategory(null);
    setSearchTerm("");
    setSelectedJob(null);
    setIsModalOpen(false);
  };

  const handleJobClick = (job: CompletedJob | JobPlan) => {
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

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setIsDirectCompleted(false);
    setSearchTerm("");
  };

  const handleBackFromDirectCompleted = () => {
    setIsDirectCompleted(false);
    setSearchTerm("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job details...</p>
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
            Error Loading Jobs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchJobData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show direct completed jobs view (bypassing category selection)
  console.log(
    "Current state - isDirectCompleted:",
    isDirectCompleted,
    "selectedCategory:",
    selectedCategory
  );
  if (isDirectCompleted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with Back Button and Filter Info */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleBackFromDirectCompleted}
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

          {/* Search Bar - Only for completed jobs */}
          <div className="mb-8">
            <JobSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search by NRC Job Number..."
            />
          </div>

          {/* Job Bars for Completed Jobs */}
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Completed Jobs
                  {dateFilter && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({dateFilter})
                    </span>
                  )}
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {completed.length}
                </p>
              </div>
            </div>

            <JobBarsChart
              jobs={completed}
              category="completed"
              onJobClick={handleJobClick}
              searchTerm={searchTerm}
            />
          </div>

          {/* Show message if no jobs found */}
          {completed.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
              <div className="text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  No Completed Jobs Found
                </h3>
                <p className="text-sm">
                  {dateFilter
                    ? `No completed jobs found for the selected ${dateFilter} period.`
                    : "No completed jobs available at the moment."}
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
  }

  // Show category view (bars + search) when a category is selected
  if (selectedCategory) {
    const categoryData = {
      completed: {
        jobs: completed,
        title: "Completed Jobs",
        icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        color: "green",
        borderColor: "border-green-500",
      },
      inProgress: {
        jobs: inProgress,
        title: "In Progress Jobs",
        icon: <PlayCircle className="h-6 w-6 text-yellow-600" />,
        color: "yellow",
        borderColor: "border-yellow-500",
      },
      planned: {
        jobs: planned,
        title: "Planned Jobs",
        icon: <Clock className="h-6 w-6 text-gray-600" />,
        color: "gray",
        borderColor: "border-gray-500",
      },
    };

    const currentCategory = categoryData[selectedCategory];

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header with Back Button and Filter Info */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={handleBackToCategories}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors hover:cursor-pointer"
            >
              <ArrowLeft size={20} />
              <span>Back to Categories</span>
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

          {/* Search Bar - Only for this category */}
          <div className="mb-8">
            <JobSearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              placeholder="Search by NRC Job Number..."
            />
          </div>

          {/* Job Bars for Selected Category */}
          <div
            className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${currentCategory.borderColor}`}
          >
            <div className="flex items-center space-x-3 mb-6">
              <div
                className={`bg-${currentCategory.color}-100 p-3 rounded-full`}
              >
                {currentCategory.icon}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  {currentCategory.title}
                  {dateFilter && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({dateFilter})
                    </span>
                  )}
                </h3>
                <p
                  className={`text-3xl font-bold text-${currentCategory.color}-600`}
                >
                  {currentCategory.jobs.length}
                </p>
              </div>
            </div>

            <JobBarsChart
              jobs={currentCategory.jobs}
              category={selectedCategory}
              onJobClick={handleJobClick}
              searchTerm={searchTerm}
            />
          </div>

          {/* Show message if no jobs found */}
          {currentCategory.jobs.length === 0 && (
            <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
              <div className="text-gray-500">
                <div
                  className={`bg-${currentCategory.color}-100 p-3 rounded-full w-fit mx-auto mb-4`}
                >
                  {React.cloneElement(currentCategory.icon, {
                    className: `h-12 w-12 text-${currentCategory.color}-600 opacity-50`,
                  })}
                </div>
                <h3 className="text-lg font-medium mb-2">
                  No {currentCategory.title} Found
                </h3>
                <p className="text-sm">
                  {dateFilter
                    ? `No ${currentCategory.title.toLowerCase()} found for the selected ${dateFilter} period.`
                    : `No ${currentCategory.title.toLowerCase()} available at the moment.`}
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
  }

  // Show main dashboard with category grid cards
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

        {/* Summary Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white mb-8">
          <div className="flex items-center space-x-3">
            <TrendingUp size={32} />
            <div>
              <h2 className="text-2xl font-bold">
                Total Jobs
                {dateFilter && (
                  <span className="text-lg font-normal text-blue-100 ml-2">
                    ({dateFilter})
                  </span>
                )}
              </h2>
              <p className="text-blue-100">
                Complete overview of all job categories
              </p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-4xl font-bold">
                {jobPlans.length + completedJobs.length}
              </div>
              <div className="text-blue-100">Total Count</div>
            </div>
          </div>
        </div>

        {/* Job Category Cards - Clickable Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Completed Jobs Card */}
          <div
            onClick={handleDirectCompletedClick}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="text-green-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Completed Jobs
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {completed.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Click to view all completed jobs
            </p>
          </div>

          {/* In Progress Jobs Card */}
          <div
            onClick={() => handleCategoryClick("inProgress")}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 p-3 rounded-full">
                <PlayCircle className="text-yellow-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  In Progress
                </h3>
                <p className="text-3xl font-bold text-yellow-600">
                  {inProgress.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Click to view all active jobs
            </p>
          </div>

          {/* Planned Jobs Card */}
          <div
            onClick={() => handleCategoryClick("planned")}
            className="bg-white rounded-lg shadow-md p-6 border-l-4 border-gray-500 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-gray-100 p-3 rounded-full">
                <Clock className="text-gray-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Planned Jobs
                </h3>
                <p className="text-3xl font-bold text-gray-600">
                  {planned.length}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              Click to view all planned jobs
            </p>
          </div>
        </div>

        {/* Show message if no jobs found */}
        {completed.length + inProgress.length + planned.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-8 text-center">
            <div className="text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Jobs Found</h3>
              <p className="text-sm">
                {dateFilter
                  ? `No jobs found for the selected ${dateFilter} period.`
                  : "No jobs available at the moment."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailsContainer;
