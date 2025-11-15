import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import StepDetailsModal from "./StepDetailsModal";
import UpdateStatusModal from "./UpdateStatusModal";
import EditMachineModal from "./EditMachineModal";
import ViewDetailsModal from "./ViewDetailsModal";
import EditDetailsModal from "./EditDetailsModal";

interface MachineDetail {
  unit: string | null;
  machineId: string;
  id: string;
  machineCode: string | null;
  machineType: string;
  machine?: {
    id: string;
    description: string;
    status: string;
    capacity: number;
  };
}

interface JobStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: MachineDetail[];
  status: "planned" | "start" | "stop" | "completed";
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: "high" | "medium" | "low" | null;
  createdAt: string;
  updatedAt: string;
  steps: JobStep[];
}

interface StepDetails {
  paperStore?: any;
  printingDetails?: any;
  corrugation?: any;
  fluteLaminate?: any;
  punching?: any;
  sideFlapPasting?: any;
  qualityDept?: any;
  dispatchProcess?: any;
}

const EditWorkingDetails: React.FC = () => {
  const [jobs, setJobs] = useState<JobPlan[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [showStepDetailsModal, setShowStepDetailsModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showEditMachineModal, setShowEditMachineModal] = useState(false);
  const [showViewDetailsModal, setShowViewDetailsModal] = useState(false);
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<JobStep | null>(null);
  const [stepDetails, setStepDetails] = useState<StepDetails>({});
  const [selectedStepData, setSelectedStepData] = useState<any>(null);
  const [selectedStepName, setSelectedStepName] = useState<string>("");

  // Debug logging
  console.log("EditWorkingDetails component rendered");
  console.log("Current state:", { jobs, filteredJobs, loading, error });

  // Fetch jobs on component mount
  useEffect(() => {
    console.log("EditWorkingDetails useEffect triggered");
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    console.log("fetchJobs function called");
    try {
      setLoading(true);
      console.log("Making API call to fetch jobs...");

      // Get the access token from localStorage
      const accessToken = localStorage.getItem("accessToken");
      console.log("Access token:", accessToken ? "Present" : "Missing");

      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/job-planning/",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("API response received:", response);
      const data = await response.json();
      console.log("API data:", data);

      if (data.success) {
        // Filter jobs that have steps with "stop" or "start" status
        const jobsWithStoppedOrStartedSteps = data.data.filter((job: JobPlan) =>
          job.steps.some(
            (step) => step.status === "stop" || step.status === "start"
          )
        );
        console.log("Filtered jobs:", jobsWithStoppedOrStartedSteps);

        setJobs(jobsWithStoppedOrStartedSteps);
        setFilteredJobs(jobsWithStoppedOrStartedSteps);
      }
    } catch (err) {
      console.error("Error in fetchJobs:", err);
      setError("Failed to fetch jobs");
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
      console.log("fetchJobs completed, loading set to false");
    }
  };

  const handleJobCardClick = async (job: JobPlan) => {
    setSelectedJob(job);
    setShowStepDetailsModal(true);
    await fetchStepDetails(job.nrcJobNo);
  };

  const fetchStepDetails = async (nrcJobNo: string) => {
    try {
      const stepTypes = [
        "paper-store",
        "printing-details",
        "corrugation",
        "flute-laminate-board-conversion",
        "punching",
        "side-flap-pasting",
        "quality-dept",
        "dispatch-process",
      ];

      const details: StepDetails = {};

      for (const stepType of stepTypes) {
        try {
          const accessToken = localStorage.getItem("accessToken");
          const response = await fetch(
            `https://nrprod.nrcontainers.com/api/${stepType}/by-job/${encodeURIComponent(
              nrcJobNo
            )}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            details[stepType.replace(/-/g, "") as keyof StepDetails] = data;
          }
        } catch (err) {
          console.error(`Error fetching ${stepType} details:`, err);
        }
      }

      setStepDetails(details);
    } catch (err) {
      console.error("Error fetching step details:", err);
    }
  };

  const handleUpdateStatus = (step: JobStep) => {
    setSelectedStep(step);
    setShowUpdateStatusModal(true);
  };

  const handleEditMachine = (step: JobStep) => {
    setSelectedStep(step);
    setShowEditMachineModal(true);
  };

  const handleViewDetails = async (step: JobStep) => {
    try {
      setSelectedStep(step);
      setSelectedStepName(step.stepName);

      // Map step names to API endpoints
      const stepTypeMap: { [key: string]: string } = {
        PaperStore: "paper-store",
        PrintingDetails: "printing-details",
        Corrugation: "corrugation",
        FluteLaminateBoardConversion: "flute-laminate-board-conversion",
        Punching: "punching",
        SideFlapPasting: "side-flap-pasting",
        QualityDept: "quality-dept",
        DispatchProcess: "dispatch-process",
      };

      const stepType = stepTypeMap[step.stepName];
      if (!stepType) {
        console.error("Unknown step type:", step.stepName);
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      const apiUrl = `https://nrprod.nrcontainers.com/api/${stepType}/by-step-id/${step.id}`;
      console.log("🔍 Fetching from URL:", apiUrl);
      console.log("🔍 Step ID:", step.id);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Extract the nested step details based on step name
          const stepDataMap: { [key: string]: string } = {
            PaperStore: "paperStore",
            PrintingDetails: "printingDetails",
            Corrugation: "corrugation",
            FluteLaminateBoardConversion: "flutelam",
            Punching: "punching",
            SideFlapPasting: "sideFlapPasting",
            QualityDept: "qualityDept",
            DispatchProcess: "dispatchProcess",
          };
          const dataKey = stepDataMap[step.stepName];
          const stepData = dataKey ? result.data[dataKey] : result.data;

          if (stepData) {
            setSelectedStepData(stepData);
            setShowViewDetailsModal(true);
          } else {
            console.error("No data found for step:", step.stepName);
            alert(`No data found for ${step.stepName} step`);
          }
        } else {
          console.error("No data found for step:", step.stepName);
          alert(`No data found for ${step.stepName} step`);
        }
      } else {
        console.error(
          "Failed to fetch step details:",
          response.status,
          response.statusText
        );
        alert(
          `Failed to fetch ${step.stepName} details: ${response.status} ${response.statusText}`
        );
      }
    } catch (err) {
      console.error("Error fetching step details:", err);
      alert(
        `Error fetching ${step.stepName} details: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleEditDetails = () => {
    setShowViewDetailsModal(false);
    setShowEditDetailsModal(true);
  };

  const handleUpdateDetails = async (updatedData: any) => {
    try {
      // Map step names to API endpoints
      const stepTypeMap: { [key: string]: string } = {
        PaperStore: "paper-store",
        PrintingDetails: "printing-details",
        Corrugation: "corrugation",
        FluteLaminateBoardConversion: "flute-laminate-board-conversion",
        Punching: "punching",
        SideFlapPasting: "side-flap-pasting",
        QualityDept: "quality-dept",
        DispatchProcess: "dispatch-process",
      };

      const stepType = stepTypeMap[selectedStepName];
      if (!stepType) {
        throw new Error("Unknown step type");
      }

      const accessToken = localStorage.getItem("accessToken");

      // Try the ALB URL first, then fallback to onrender.com
      let putUrl = `https://nrprod.nrcontainers.com/api/${stepType}/${encodeURIComponent(
        updatedData.jobNrcJobNo
      )}`;
      let response = await fetch(putUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      // If ALB fails, try onrender.com
      if (!response.ok) {
        console.log("🔍 ALB PUT failed, trying onrender.com...");
        putUrl = `https://nrprod.nrcontainers.com/api/${stepType}/${encodeURIComponent(
          updatedData.jobNrcJobNo
        )}`;
        console.log("🔍 PUT request to onrender.com URL:", putUrl);

        response = await fetch(putUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedData),
        });
      }

      console.log("🔍 PUT request to URL:", putUrl);
      console.log("🔍 PUT payload:", updatedData);
      console.log("🔍 Step Type:", stepType);
      console.log("🔍 Job NRC:", updatedData.jobNrcJobNo);
      console.log(
        "🔍 Encoded Job NRC:",
        encodeURIComponent(updatedData.jobNrcJobNo)
      );

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.status}`);
      }

      // Refresh the data
      await fetchStepDetails(selectedJob!.nrcJobNo);
      setShowEditDetailsModal(false);
    } catch (err) {
      console.error("Error updating step details:", err);
      throw err;
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading jobs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    );
  }

  const refreshJobsAndSelected = async () => {
    console.log("🔄 Refreshing jobs...");
    await fetchJobs();

    // Use functional update to access latest jobs state
    setJobs((currentJobs) => {
      if (selectedJob) {
        const updatedJob = currentJobs.find(
          (job) => job.jobPlanId === selectedJob.jobPlanId
        );
        if (updatedJob) {
          console.log("✅ Updating selectedJob with fresh data");
          setSelectedJob(updatedJob);
        }
      }
      return currentJobs; // Return the same jobs array
    });
  };

  return (
    <div className="p-3 sm:p-6 min-h-screen">
      {" "}
      {/* Reduced mobile padding */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
          {" "}
          {/* Smaller mobile title */}
          Edit Working Details
        </h1>

        {/* Debug Info - Hidden on mobile for cleaner UI */}
        {/* Mobile-first approach: keep essential content only */}

        {/* Stopped Jobs Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Stopped Jobs
            </h2>
            <span className="text-sm sm:text-base text-gray-600 self-start sm:self-auto">
              {filteredJobs.length} Stopped Jobs
            </span>
          </div>

          {/* Job Cards */}
          <div className="space-y-3 sm:space-y-4">
            {" "}
            {/* Reduced mobile spacing */}
            {filteredJobs.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-500 text-sm sm:text-base">
                  No stopped or started jobs found
                </p>
                {loading && (
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">
                    Loading...
                  </p>
                )}
                {error && (
                  <p className="text-xs sm:text-sm text-red-500 mt-2">
                    Error: {error}
                  </p>
                )}
              </div>
            ) : (
              filteredJobs.map((job) => {
                const stoppedSteps = job.steps.filter(
                  (step) => step.status === "stop" || step.status === "start"
                );

                return (
                  <div
                    key={job.jobPlanId}
                    className="bg-white rounded-lg shadow-md p-4 sm:p-6 cursor-pointer hover:shadow-lg transition-shadow active:bg-gray-50" // Added active state for mobile
                    onClick={() => handleJobCardClick(job)}
                  >
                    {/* Job Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                      <div className="flex-1">
                        {/* Mobile-optimized title with better truncation */}
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 break-words">
                          {job.nrcJobNo.length > 20
                            ? `${job.nrcJobNo.substring(0, 20)}...`
                            : job.nrcJobNo}
                        </h3>

                        {/* Mobile-stacked info with better spacing */}
                        <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:space-x-4 text-xs sm:text-sm text-gray-600">
                          <span className="block sm:inline">
                            Plan ID: {job.jobPlanId}
                          </span>
                          <div className="flex items-center">
                            <ClockIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">
                              Created: {formatDate(job.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <ArrowPathIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">
                              Updated: {formatDate(job.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Priority badge - responsive sizing */}
                      <div className="self-start sm:self-auto">
                        <span
                          className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${getPriorityColor(
                            job.jobDemand
                          )} whitespace-nowrap`}
                        >
                          {job.jobDemand === "high"
                            ? "Urgent"
                            : job.jobDemand === "medium"
                            ? "Regular"
                            : job.jobDemand === "low"
                            ? "Low Priority"
                            : "No Priority"}
                        </span>
                      </div>
                    </div>

                    {/* Stopped Steps */}
                    <div className="border-t pt-3 sm:pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-base sm:text-lg font-bold text-gray-900">
                          Stopped Steps ({stoppedSteps.length})
                        </h4>
                        <ChevronDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      {/* Step Details Modal */}
      {showStepDetailsModal && selectedJob && (
        <StepDetailsModal
          job={selectedJob}
          stepDetails={stepDetails}
          onClose={() => setShowStepDetailsModal(false)}
          onUpdateStatus={handleUpdateStatus}
          onEditMachine={handleEditMachine}
          onViewDetails={handleViewDetails}
        />
      )}
      {/* Update Status Modal */}
      {showUpdateStatusModal && selectedStep && (
        <UpdateStatusModal
          step={selectedStep}
          job={selectedJob!}
          onClose={() => setShowUpdateStatusModal(false)}
          onUpdate={refreshJobsAndSelected} // Use the new function
        />
      )}
      {/* Edit Machine Modal */}
      {showEditMachineModal && selectedStep && (
        <EditMachineModal
          step={selectedStep as any} // Type cast to avoid type mismatch
          job={selectedJob as any} // Type cast to avoid type mismatch
          onClose={() => setShowEditMachineModal(false)}
          onUpdate={refreshJobsAndSelected}
        />
      )}
      {/* View Details Modal */}
      {showViewDetailsModal && selectedStepData && (
        <ViewDetailsModal
          isOpen={showViewDetailsModal}
          onClose={() => setShowViewDetailsModal(false)}
          stepName={selectedStepName}
          stepData={selectedStepData}
          onEditDetails={handleEditDetails}
        />
      )}
      {/* Edit Details Modal */}
      {showEditDetailsModal && selectedStepData && (
        <EditDetailsModal
          isOpen={showEditDetailsModal}
          onClose={() => setShowEditDetailsModal(false)}
          stepName={selectedStepName}
          stepData={selectedStepData}
          onUpdate={handleUpdateDetails}
        />
      )}
    </div>
  );
};

export default EditWorkingDetails;
