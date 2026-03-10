import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import JobSearchBar from "./JobDetailsComponents/JobSearchBar";
import JobBarsChart from "./JobDetailsComponents/JobBarsChart";
import DetailedJobModal from "./JobDetailsComponents/DetailedJobModal";

interface JobPlanStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: Array<{
    unit: string | null;
    machineId?: string | number;
    id?: string | number;
    machineCode: string | null;
    machineType: string;
  }>;
  status: "planned" | "start" | "stop" | "accept" | "major_hold";
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  createdAt: string;
  updatedAt: string;
  stepDetails?: {
    data?: {
      status?: string;
      majorHoldRemark?: string;
      holdRemark?: string;
      [key: string]: any;
    };
    status?: string;
    [key: string]: any;
  };
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
  id : number;
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  steps: JobPlanStep[];
  jobDetails?: any;
  purchaseOrderDetails?: any[];
  poJobPlannings?: any[];
}

// Helper function to check if a job has major hold
function isMajorHold(job: JobPlan): boolean {
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
}

const MajorHoldJobs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { heldJobsData, dateFilter, customDateRange } = (location.state ||
    {}) as {
    heldJobsData?: JobPlan[];
    dateFilter?: string;
    customDateRange?: { start: string; end: string };
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [majorHoldJobs, setMajorHoldJobs] = useState<JobPlan[]>([]);
  const [isResumingJob, setIsResumingJob] = useState(false);

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

  // Fetch major hold jobs: single API returns list with full step details, then add PO details per job
  const fetchMajorHoldJobsWithDetails = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      const baseUrl = import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com";
      const response = await fetch(`${baseUrl}/api/job-planning/major-hold`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch major hold jobs: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success || !Array.isArray(result.data)) {
        setMajorHoldJobs([]);
        return;
      }

      const majorHoldList = result.data as JobPlan[];
      // Add job + PO details for card display (client name, etc.) – only for these jobs, not all
      const jobsWithDetails = await Promise.all(
        majorHoldList.map(async (job: JobPlan) => {
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
      setMajorHoldJobs(jobsWithDetails);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch major hold jobs"
      );
      console.error("Major hold jobs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // When dashboard passes pre-filtered major hold jobs, only add PO details (steps already on job)
  const enhancePassedJobsWithDetails = async (jobs: JobPlan[]) => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      const jobsWithDetails = await Promise.all(
        jobs.map(async (job: JobPlan) => {
          if (job.jobDetails && job.purchaseOrderDetails && job.poJobPlannings) {
            return job;
          }
          const { jobDetails, purchaseOrderDetails, poJobPlannings } =
            await fetchJobWithPODetails(job.nrcJobNo, accessToken);
          return {
            ...job,
            jobDetails: jobDetails || job.jobDetails,
            purchaseOrderDetails: purchaseOrderDetails || job.purchaseOrderDetails || [],
            poJobPlannings: poJobPlannings || job.poJobPlannings || [],
          };
        })
      );
      setMajorHoldJobs(jobsWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to enhance job details");
      console.error("Job enhancement error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // When dashboard passes pre-filtered major hold jobs, use them so the list shows correctly
    if (heldJobsData && Array.isArray(heldJobsData) && heldJobsData.length > 0) {
      enhancePassedJobsWithDetails(heldJobsData);
    } else {
      // Otherwise fetch ALL major hold jobs regardless of date filter
      fetchMajorHoldJobsWithDetails();
    }
  }, []);

  const handleJobClick = (job: JobPlan | any) => {
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

  // Resume all steps that are on hold for a job
  const handleResumeJob = async (jobNo: string, job: JobPlan) => {
    try {
      console.log("🔄 Starting handleResumeJob for job:", jobNo);
      setIsResumingJob(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Get job plan ID from the job object
      const jobPlanId = job.jobPlanId || job.id;
      if (!jobPlanId) {
        alert("Cannot resume this job: Job plan ID not found.");
        setIsResumingJob(false);
        return;
      }

      console.log("📋 Job Plan ID:", jobPlanId);

      // Prompt for resume remark
      const resumeRemark = window.prompt(
        `Resume job ${jobNo} from major hold?\n\n` +
          `This will resume all steps and machines for this job.\n\n` +
          `Enter a remark for the resume action:`,
        "Issue resolved, resuming work"
      );

      if (resumeRemark === null) {
        console.log("❌ User cancelled resume remark prompt");
        setIsResumingJob(false);
        return;
      }

      if (!resumeRemark.trim()) {
        alert("Resume remark cannot be empty.");
        setIsResumingJob(false);
        return;
      }

      // Confirm before resuming
      const confirmed = window.confirm(
        `Resume entire job ${jobNo}?\n\n` +
          `This will resume all steps and machines for this job plan.\n\n` +
          `Note: Major hold is job-wide. This single action will resume the entire job.`
      );

      if (!confirmed) {
        console.log("❌ User cancelled confirmation");
        setIsResumingJob(false);
        return;
      }

      console.log("✅ User confirmed, making API call...");

      // New simplified API endpoint - only needs job plan ID
      const apiUrl = `https://nrprod.nrcontainers.com/api/job-step-machines/job-plan/${jobPlanId}/resume-major-hold`;

      console.log(`🚀 Making API call to resume entire job:`, {
        jobNo,
        jobPlanId,
        url: apiUrl,
      });

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          resumeRemark: resumeRemark.trim(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `Failed to resume job: ${response.status} ${errorText}`
        );
      }

      const result = await response.json();
      console.log("✅ Resume successful:", result);

      // Refresh the job data
      await fetchMajorHoldJobsWithDetails();

      // Close modal and show success message
      setIsModalOpen(false);
      alert(
        `✅ Successfully resumed job ${jobNo}!\n\n` +
          `All steps and machines for this job have been resumed.`
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resume job";
      alert(`❌ Error: ${errorMessage}`);
      console.error("❌ Error resuming job:", err);
    } finally {
      setIsResumingJob(false);
    }
  };

  const handleRetry = () => {
    if (
      heldJobsData &&
      Array.isArray(heldJobsData) &&
      heldJobsData.length > 0
    ) {
      enhancePassedJobsWithDetails(heldJobsData);
    } else {
      fetchMajorHoldJobsWithDetails();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading major hold jobs...</p>
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
            Error Loading Major Hold Jobs
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
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
            className="flex items-center space-x-2 text-red-600 hover:text-red-800 transition-colors hover:cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>

          {/* Show current filter if available */}
          {dateFilter && (
            <div className="text-sm text-gray-600 bg-red-50 px-3 py-1 rounded-full">
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

        {/* Major Hold Jobs Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                Major Hold Jobs
                {dateFilter && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({dateFilter})
                  </span>
                )}
              </h3>
              <p className="text-3xl font-bold text-red-600">
                {majorHoldJobs.length}
              </p>
            </div>
          </div>

          <JobBarsChart
            jobs={majorHoldJobs as (JobPlan | any)[]}
            category="held"
            onJobClick={handleJobClick}
            searchTerm={searchTerm}
          />
        </div>

        {/* Show message if no jobs found */}
        {majorHoldJobs.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 mt-6 text-center">
            <div className="text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No Major Hold Jobs Found
              </h3>
              <p className="text-sm">
                {dateFilter
                  ? `No major hold jobs found for the selected ${dateFilter} period.`
                  : "No major hold jobs available at the moment."}
              </p>
            </div>
          </div>
        )}

        {/* Detailed Job Modal */}
        <DetailedJobModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          job={
            selectedJob
              ? {
                  id: selectedJob.jobPlanId || 0,
                  nrcJobNo: selectedJob.nrcJobNo,
                  status: undefined,
                  createdAt: selectedJob.createdAt,
                  jobDetails: selectedJob.jobDetails,
                  purchaseOrderDetails: selectedJob.purchaseOrderDetails,
                  purchaseOrderId: (selectedJob as any).purchaseOrderId,
                  allSteps: selectedJob.steps,
                  steps: selectedJob.steps,
                }
              : null
          }
          onResumeJob={
            selectedJob
              ? (jobNo: string) => handleResumeJob(jobNo, selectedJob)
              : undefined
          }
          isResumingJob={isResumingJob}
        />
      </div>
    </div>
  );
};

export default MajorHoldJobs;
