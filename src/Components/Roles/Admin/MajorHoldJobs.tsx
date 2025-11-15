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
  fluteLaminateBoardConversion?: { id?: number; status?: string; [key: string]: any };
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

  // Fetch major hold jobs with details
  const fetchMajorHoldJobsWithDetails = async () => {
    try {
      setLoading(true);
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // 🔥 IMPORTANT: Major hold jobs should always be fetched regardless of date filters
      // Don't apply date filtering when fetching major hold jobs
      // Fetch job planning data WITHOUT date filter to get ALL major hold jobs
      const jobPlanningUrl = `https://nrprod.nrcontainers.com/api/job-planning/`;
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
        // Fetch step details for each job to determine major hold status
        const jobsWithStepDetails = await Promise.all(
          jobPlanningResult.data.map(async (jobPlan: JobPlan) => {
            const stepsWithDetails = await Promise.all(
              jobPlan.steps.map(async (step: JobPlanStep) => {
                let stepDetails = null;
                if (step.status === "start" || step.status === "stop") {
                  // Fetch step-specific details based on step name
                  try {
                    let endpoint = "";
                    switch (step.stepName) {
                      case "PaperStore":
                        endpoint = `https://nrprod.nrcontainers.com/api/paper-store/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "PrintingDetails":
                        endpoint = `https://nrprod.nrcontainers.com/api/printing-details/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "Corrugation":
                        endpoint = `https://nrprod.nrcontainers.com/api/corrugation/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "FluteLaminateBoardConversion":
                        endpoint = `https://nrprod.nrcontainers.com/api/flute-laminate-board-conversion/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "Punching":
                        endpoint = `https://nrprod.nrcontainers.com/api/punching/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "SideFlapPasting":
                        endpoint = `https://nrprod.nrcontainers.com/api/side-flap-pasting/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "QualityDept":
                        endpoint = `https://nrprod.nrcontainers.com/api/quality-dept/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      case "DispatchProcess":
                        endpoint = `https://nrprod.nrcontainers.com/api/dispatch-process/by-job/${encodeURIComponent(
                          jobPlan.nrcJobNo
                        )}`;
                        break;
                      default:
                        break;
                    }

                    if (endpoint) {
                      const stepResponse = await fetch(endpoint, {
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });

                      if (stepResponse.ok) {
                        const stepResult = await stepResponse.json();
                        if (
                          stepResult.success &&
                          stepResult.data &&
                          stepResult.data.length > 0
                        ) {
                          stepDetails = { data: stepResult.data[0] };
                        }
                      }
                    }
                  } catch (err) {
                    console.warn(
                      `Error fetching ${step.stepName} details:`,
                      err
                    );
                  }
                }

                return {
                  ...step,
                  stepDetails,
                };
              })
            );

            return {
              ...jobPlan,
              steps: stepsWithDetails,
            };
          })
        );

        // Filter only major hold jobs
        const majorHold = jobsWithStepDetails.filter((job: JobPlan) =>
          isMajorHold(job)
        );

        // Fetch additional details for each major hold job
        const jobsWithDetails = await Promise.all(
          majorHold.map(async (job: JobPlan) => {
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
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch major hold jobs"
      );
      console.error("Major hold jobs fetch error:", err);
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

      // First, fetch step details for all jobs to properly detect major hold
      const jobsWithStepDetails = await Promise.all(
        jobs.map(async (jobPlan: JobPlan) => {
          const stepsWithDetails = await Promise.all(
            jobPlan.steps.map(async (step: JobPlanStep) => {
              // If step already has stepDetails, use it
              if (step.stepDetails) {
                return step;
              }

              // Otherwise fetch step details if step is started or stopped
              let stepDetails = null;
              if (step.status === "start" || step.status === "stop") {
                try {
                  let endpoint = "";
                  switch (step.stepName) {
                    case "PaperStore":
                      endpoint = `https://nrprod.nrcontainers.com/api/paper-store/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "PrintingDetails":
                      endpoint = `https://nrprod.nrcontainers.com/api/printing-details/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "Corrugation":
                      endpoint = `https://nrprod.nrcontainers.com/api/corrugation/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "FluteLaminateBoardConversion":
                      endpoint = `https://nrprod.nrcontainers.com/api/flute-laminate-board-conversion/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "Punching":
                      endpoint = `https://nrprod.nrcontainers.com/api/punching/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "SideFlapPasting":
                      endpoint = `https://nrprod.nrcontainers.com/api/side-flap-pasting/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "QualityDept":
                      endpoint = `https://nrprod.nrcontainers.com/api/quality-dept/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    case "DispatchProcess":
                      endpoint = `https://nrprod.nrcontainers.com/api/dispatch-process/by-job/${encodeURIComponent(
                        jobPlan.nrcJobNo
                      )}`;
                      break;
                    default:
                      break;
                  }

                  if (endpoint) {
                    const stepResponse = await fetch(endpoint, {
                      headers: { Authorization: `Bearer ${accessToken}` },
                    });

                    if (stepResponse.ok) {
                      const stepResult = await stepResponse.json();
                      if (
                        stepResult.success &&
                        stepResult.data &&
                        stepResult.data.length > 0
                      ) {
                        stepDetails = { data: stepResult.data[0] };
                      }
                    }
                  }
                } catch (err) {
                  console.warn(`Error fetching ${step.stepName} details:`, err);
                }
              }

              return {
                ...step,
                stepDetails: stepDetails || step.stepDetails,
              };
            })
          );

          return {
            ...jobPlan,
            steps: stepsWithDetails,
          };
        })
      );

      // Filter for major hold jobs after fetching step details
      const majorHold = jobsWithStepDetails.filter((job: JobPlan) =>
        isMajorHold(job)
      );

      const jobsWithDetails = await Promise.all(
        majorHold.map(async (job: JobPlan) => {
          // Check if job already has complete details
          if (
            job.jobDetails &&
            job.purchaseOrderDetails &&
            job.poJobPlannings
          ) {
            return job;
          }

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

      setMajorHoldJobs(jobsWithDetails);
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
    if (
      heldJobsData &&
      Array.isArray(heldJobsData) &&
      heldJobsData.length > 0
    ) {
      enhancePassedJobsWithDetails(heldJobsData);
    } else {
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

      // Find all steps that are on hold/major hold
      const stepsOnHold = (job.steps || []).filter((step) => {
        // Check direct step status
        if (step.status === "major_hold" || step.status === "hold") {
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
          step.dispatchProcess?.status === "major_hold" ||
          step.paperStore?.status === "hold" ||
          step.printingDetails?.status === "hold" ||
          step.corrugation?.status === "hold" ||
          step.flutelam?.status === "hold" ||
          step.fluteLaminateBoardConversion?.status === "hold" ||
          step.punching?.status === "hold" ||
          step.sideFlapPasting?.status === "hold" ||
          step.qualityDept?.status === "hold" ||
          step.dispatchProcess?.status === "hold"
        ) {
          return true;
        }
        
        // Check stepDetails
        return (
          step.stepDetails?.data?.status === "major_hold" ||
          step.stepDetails?.data?.status === "hold" ||
          step.stepDetails?.status === "major_hold" ||
          step.stepDetails?.status === "hold"
        );
      });

      console.log("📋 Steps on hold:", stepsOnHold.length, stepsOnHold);

      if (stepsOnHold.length === 0) {
        alert("No steps are currently on hold for this job.");
        setIsResumingJob(false);
        return;
      }

      // Count total machines across all held steps
      const totalMachines = stepsOnHold.reduce((count, step) => {
        return count + (step.machineDetails?.length || 0);
      }, 0);

      console.log("🔧 Total machines on hold:", totalMachines);

      // Find the first step that has a machine
      // Since major hold is job-wide, we can use ANY step's machine (not just held steps)
      let targetStep = null;
      let targetMachine = null;

      // First, try to find a machine from held steps
      for (const step of stepsOnHold) {
        const machineDetails = step.machineDetails || [];
        if (machineDetails.length > 0) {
          const machineId = machineDetails[0].machineId || machineDetails[0].id;
          if (machineId) {
            targetStep = step;
            targetMachine = {
              id: machineId,
              code: machineDetails[0].machineCode || "Unknown",
            };
            break;
          }
        }
      }

      // If no machine found on held steps, try ALL steps (since major hold is job-wide)
      if (!targetStep || !targetMachine) {
        console.log("🔍 No machine found on held steps, searching all steps...");
        const allSteps = job.steps || [];
        for (const step of allSteps) {
          const machineDetails = step.machineDetails || [];
          if (machineDetails.length > 0) {
            const machineId = machineDetails[0].machineId || machineDetails[0].id;
            if (machineId) {
              targetStep = step;
              targetMachine = {
                id: machineId,
                code: machineDetails[0].machineCode || "Unknown",
              };
              console.log(`✅ Found machine on step ${step.stepNo} (${step.stepName}): ${targetMachine.code}`);
              break;
            }
          }
        }
      }

      if (!targetStep || !targetMachine) {
        alert(
          "Cannot resume this job: No machines found with valid IDs on any steps.\n\n" +
            "This may happen if:\n" +
            "- No machines were assigned to any step\n" +
            "- Machine assignments were removed\n\n" +
            "Please contact an administrator to manually resolve this issue."
        );
        setIsResumingJob(false);
        return;
      }

      console.log("🎯 Target machine for resume:", {
        stepNo: targetStep.stepNo,
        stepName: targetStep.stepName,
        machineId: targetMachine.id,
        machineCode: targetMachine.code,
      });

      // Prompt for resume remark
      const resumeRemark = window.prompt(
        `Resume job ${jobNo} from major hold?\n\n` +
          `This will resume ALL ${stepsOnHold.length} held step(s) and ${totalMachines} machine(s).\n\n` +
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
          `• ${stepsOnHold.length} step(s) will be resumed\n` +
          `• ${totalMachines} machine(s) will be resumed\n` +
          `• Resume from: Step ${targetStep.stepNo} (${targetStep.stepName}) - ${targetMachine.code}\n\n` +
          `Note: Major hold is job-wide. This single action will resume the entire job.`
      );

      if (!confirmed) {
        console.log("❌ User cancelled confirmation");
        setIsResumingJob(false);
        return;
      }

      console.log("✅ User confirmed, making API call...");

      // Major hold is job-wide - we only need to resume from ONE machine to resume the ENTIRE job
      const stepNo = targetStep.stepNo || targetStep.id;
      const apiUrl = `https://nrprod.nrcontainers.com/api/job-step-machines/${encodeURIComponent(
        jobNo
      )}/steps/${stepNo}/machines/${targetMachine.id}/admin-resume-major-hold`;

      console.log(`🚀 Making API call to resume entire job:`, {
        jobNo,
        stepNo,
        machineId: targetMachine.id,
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
          `• ${
            result.data?.totalMachinesAffected || totalMachines
          } machine(s) resumed\n` +
          `• All ${stepsOnHold.length} held step(s) are now in progress`
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
