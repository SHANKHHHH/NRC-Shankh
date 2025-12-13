import React, { useState } from "react";
import JobStepDetailsPopup from "./JobStepDetailsPopup";

interface JobPlanStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: Array<{
    unit: string | null;
    machineId: string | number;
    id: string | number;
    machineCode: string | null;
    machineType: string;
    machine?: {
      id: string;
      description: string;
      status: string;
      capacity: number;
    };
  }>;
  status: "planned" | "start" | "stop";
  startDate: string | null;
  endDate: string | null;
  user: string | null;
  createdAt: string;
  updatedAt: string;
  stepDetails?: any; // Step-specific details from API endpoints
}

interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  steps: JobPlanStep[];
}
interface StepDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  stepName: string;
  stepData: {
    completed: number;
    inProgress: number;
    planned: number;
    completedData: JobPlan[];
    inProgressData: JobPlan[];
    plannedData: JobPlan[];
  };
}

const StepDetailsPopup: React.FC<StepDetailsPopupProps> = ({
  isOpen,
  onClose,
  stepName,
  stepData,
}) => {
  const [activeTab, setActiveTab] = useState<
    "completed" | "inProgress" | "planned"
  >("completed");
  const [selectedJob, setSelectedJob] = useState<JobPlan | null>(null);
  const [jobDetailsOpen, setJobDetailsOpen] = useState(false);

  if (!isOpen) return null;

  const getCurrentData = () => {
    switch (activeTab) {
      case "completed":
        return stepData.completedData;
      case "inProgress":
        return stepData.inProgressData;
      case "planned":
        return stepData.plannedData;
      default:
        return [];
    }
  };

  const getCurrentCount = () => {
    switch (activeTab) {
      case "completed":
        return stepData.completed;
      case "inProgress":
        return stepData.inProgress;
      case "planned":
        return stepData.planned;
      default:
        return 0;
    }
  };

  const handleJobClick = (job: JobPlan) => {
    setSelectedJob(job);
    setJobDetailsOpen(true);
  };

  const getStepInfo = (job: JobPlan) => {
    // Find the specific step info for this stepName in the job's steps
    return job.steps.find(
      (step) =>
        step.stepName === stepName ||
        (stepName === "Paper Store" && step.stepName === "PaperStore") ||
        (stepName === "Printing" && step.stepName === "PrintingDetails") ||
        (stepName === "Flap Pasting" && step.stepName === "SideFlapPasting") ||
        (stepName === "Dispatch" && step.stepName === "DispatchProcess") ||
        (stepName === "Quality Control" && step.stepName === "QualityDept") ||
        (stepName === "Flute Lamination" &&
          step.stepName === "FluteLaminateBoardConversion")
    );
  };

  // Format date as dd/mm/yyyy, HH:mm:ss AM/PM (12-hour format)
  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "Date not available";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();

      // Convert to 12-hour format
      let hours = date.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      // Format: dd/mm/yyyy H:mm:ss AM/PM
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {stepName} - Step Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === "completed"
                ? "border-b-2 border-green-500 text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({stepData.completed})
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === "inProgress"
                ? "border-b-2 border-yellow-500 text-yellow-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("inProgress")}
          >
            In Progress ({stepData.inProgress})
          </button>
          <button
            className={`px-6 py-3 font-medium ${
              activeTab === "planned"
                ? "border-b-2 border-gray-500 text-gray-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("planned")}
          >
            Planned ({stepData.planned})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {getCurrentCount() === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <div className="text-4xl mb-2">📋</div>
              <div>No {activeTab} jobs found for this step</div>
            </div>
          ) : (
            <div className="grid gap-4">
              {getCurrentData().map((job, index) => (
                <div
                  key={`${job.jobPlanId}-${index}`}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  onClick={() => handleJobClick(job)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="font-semibold text-gray-700">
                        NRC Job No:
                      </span>
                      <p className="text-gray-600 font-mono">{job.nrcJobNo}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">
                        Job Demand:
                      </span>
                      <p
                        className={`capitalize ${
                          job.jobDemand === "high"
                            ? "bg-red-500 text-white px-2 py-1 rounded inline-block mt-1"
                            : "text-gray-600"
                        }`}
                      >
                        {job.jobDemand}
                      </p>
                    </div>

                    <div>
                      <span className="font-semibold text-gray-700">
                        Created At:
                      </span>
                      <p className="text-gray-600">
                        {formatDateTime(job.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedJob && (
            <JobStepDetailsPopup
              isOpen={jobDetailsOpen}
              onClose={() => {
                setJobDetailsOpen(false);
                setSelectedJob(null);
              }}
              jobData={selectedJob}
              stepName={stepName}
              stepInfo={getStepInfo(selectedJob)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default StepDetailsPopup;
