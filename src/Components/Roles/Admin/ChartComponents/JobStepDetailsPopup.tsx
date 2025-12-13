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

interface JobStepDetailsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  jobData: JobPlan;
  stepName: string;
  stepInfo?: JobPlanStep;
}

import React from "react";
import { useUsers } from "../../../../context/UsersContext";

const JobStepDetailsPopup: React.FC<JobStepDetailsPopupProps> = ({
  isOpen,
  onClose,
  jobData,
  stepName,
  stepInfo,
}) => {
  const { getUserName } = useUsers();

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

  // Helper function to get the actual step status (same logic as AdminDashboard)
  const getStepActualStatus = (
    step: JobPlanStep
  ): "completed" | "in_progress" | "hold" | "planned" => {
    if (!step) return "planned";

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

    // Priority 1: Check stepDetails.data.status
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

    // Priority 3: Check step.status directly (for cases like "accept" or "in_progress")
    if ((step.status as any) === "accept") {
      return "completed";
    }
    if ((step.status as any) === "in_progress") {
      return "in_progress";
    }

    // Priority 4: Use step.status for legacy status values
    if (step.status === "stop") {
      return "completed";
    }
    if (step.status === "start") {
      return "in_progress";
    }

    // Default: planned
    return "planned";
  };

  if (!isOpen) return null;

  // Get the actual status for display
  const actualStatus = stepInfo ? getStepActualStatus(stepInfo) : "planned";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-[95vw] mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-800">
            {stepName} - Step Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Job Info */}
        <div className="p-4">
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-700 mb-3">
              Job Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-sm font-medium text-gray-600">
                  NRC Job No:
                </span>
                <p className="text-sm text-gray-800 font-mono break-all">
                  {jobData.nrcJobNo}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Job Demand:
                </span>
                <span
                  className={`inline-block px-2 py-1 text-xs rounded-full capitalize ml-2 ${
                    jobData.jobDemand === "high"
                      ? "bg-red-100 text-red-800"
                      : jobData.jobDemand === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {jobData.jobDemand}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">
                  Created At:
                </span>
                <p className="text-sm text-gray-800">
                  {formatDateTime(jobData.createdAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Step Specific Details */}
          {stepInfo && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">
                {stepName} Step Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-sm font-medium text-blue-700">
                    Status:
                  </span>
                  <span
                    className={`inline-block px-2 py-1 text-xs rounded-full ml-2 ${
                      actualStatus === "completed"
                        ? "bg-green-100 text-green-800"
                        : actualStatus === "in_progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : actualStatus === "hold"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {actualStatus === "completed"
                      ? "Completed"
                      : actualStatus === "in_progress"
                      ? "In Progress"
                      : actualStatus === "hold"
                      ? "On Hold"
                      : "Planned"}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-blue-700">
                    Step Number:
                  </span>
                  <p className="text-sm text-blue-800">{stepInfo.stepNo}</p>
                </div>
                {stepInfo.startDate && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">
                      Start Date:
                    </span>
                    <p className="text-sm text-blue-800">
                      {formatDateTime(stepInfo.startDate)}
                    </p>
                  </div>
                )}
                {stepInfo.endDate && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">
                      End Date:
                    </span>
                    <p className="text-sm text-blue-800">
                      {formatDateTime(stepInfo.endDate)}
                    </p>
                  </div>
                )}
                {stepInfo.user && (
                  <div>
                    <span className="text-sm font-medium text-blue-700">
                      Assigned User:
                    </span>
                    <p className="text-sm text-blue-800">
                      {getUserName(stepInfo.user)}
                    </p>
                  </div>
                )}
              </div>

              {/* Step Details (like Paper Store details) */}
              {stepInfo.stepDetails?.data && (
                <div className="mt-4 p-3 bg-white rounded border">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Additional Details:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(stepInfo.stepDetails?.data).map(
                      ([key, value]) => {
                        // ✅ Helper function to check if the value is a valid date
                        const isDateField = (
                          fieldName: string,
                          fieldValue: any
                        ): boolean => {
                          // Check if field name suggests it's a date
                          const dateKeywords = [
                            "date",
                            "time",
                            "at",
                            "created",
                            "updated",
                            "issued",
                          ];
                          const hasDateKeyword = dateKeywords.some((keyword) =>
                            fieldName.toLowerCase().includes(keyword)
                          );

                          // Check if the value looks like a date string
                          const isDateString =
                            typeof fieldValue === "string" &&
                            !isNaN(Date.parse(fieldValue)) &&
                            fieldValue.includes("-"); // Basic ISO date format check

                          return hasDateKeyword && isDateString;
                        };

                        // ✅ Format the value based on whether it's a date
                        const formatValue = (
                          fieldName: string,
                          fieldValue: any
                        ) => {
                          if (fieldValue === null || fieldValue === undefined) {
                            return "N/A";
                          }

                          if (isDateField(fieldName, fieldValue)) {
                            try {
                              return formatDateTime(fieldValue);
                            } catch (error) {
                              return String(fieldValue); // Fallback to string if date parsing fails
                            }
                          }

                          return String(fieldValue);
                        };

                        return (
                          <div key={key}>
                            <span className="text-xs font-medium text-gray-600 capitalize">
                              {key.replace(/([A-Z])/g, " $1").trim()}:
                            </span>
                            <p className="text-xs text-gray-800 break-all">
                              {formatValue(key, value)}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              {/* Machine Details */}
              {stepInfo.machineDetails &&
                stepInfo.machineDetails.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="font-medium text-gray-700 mb-2">
                      Machine Details:
                    </h4>
                    {stepInfo.machineDetails.map((machine, index) => (
                      <div key={index} className="text-xs text-gray-600 mb-1">
                        Machine ID: {machine.machineId || machine.id} | Code:{" "}
                        {machine.machineCode || "N/A"} | Type:{" "}
                        {machine.machineType} | Unit: {machine.unit || "N/A"}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobStepDetailsPopup;
