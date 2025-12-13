import React from "react";
import {
  XMarkIcon,
  UserIcon,
  PlayIcon,
  StopIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { useUsers } from "../../../context/UsersContext";

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

interface StepDetailsModalProps {
  job: JobPlan;
  stepDetails: StepDetails;
  onClose: () => void;
  onUpdateStatus: (step: JobStep) => void;
  onEditMachine: (step: JobStep) => void;
  onViewDetails: (step: JobStep) => void;
}

const StepDetailsModal: React.FC<StepDetailsModalProps> = ({
  job,
  // stepDetails,
  onClose,
  onUpdateStatus,
  onEditMachine,
  onViewDetails,
}) => {
  const { getUserName } = useUsers();
  const formatStepName = (stepName: string): string => {
    return stepName
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Handle consecutive capitals
      .trim();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "start":
        return "bg-green-100 text-green-800";
      case "stop":
        return "bg-red-100 text-red-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
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

  // const getStepIcon = (stepName: string) => {
  //   // Return appropriate icon based on step name
  //   return <WrenchScrewdriverIcon className="h-5 w-5" />;
  // };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-transparent backdrop-blur-md bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-[#00AEEF] px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              Edit Working Details
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors hover:cursor-pointer"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div
            className="px-6 py-4 overflow-y-auto"
            style={{ maxHeight: "calc(90vh - 120px)" }}
          >
            {/* Job Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-xl font-bold text-gray-900 mb-2">
                {job.nrcJobNo}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Plan ID:</span> {job.jobPlanId}
                </div>
                <div>
                  <span className="font-medium">Priority:</span>{" "}
                  {job.jobDemand === "high"
                    ? "Urgent"
                    : job.jobDemand === "medium"
                    ? "Regular"
                    : job.jobDemand === "low"
                    ? "Low Priority"
                    : "Not set"}
                </div>
                <div>
                  <span className="font-medium">Created:</span>{" "}
                  {formatDate(job.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Updated:</span>{" "}
                  {formatDate(job.updatedAt)}
                </div>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              {job.steps.map((step) => (
                <div
                  key={step.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {step.stepNo}
                        </span>
                      </div>
                      <h5 className="text-lg font-semibold text-gray-900">
                        {formatStepName(step.stepName)}
                      </h5>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                        step.status
                      )}`}
                    >
                      {step.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Step Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {step.user && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <UserIcon className="h-4 w-4" />
                        <span>Assigned to: {getUserName(step.user)}</span>
                      </div>
                    )}
                    {step.startDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <PlayIcon className="h-4 w-4" />
                        <span>Started: {formatDate(step.startDate)}</span>
                      </div>
                    )}
                    {step.endDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <StopIcon className="h-4 w-4" />
                        <span>Completed: {formatDate(step.endDate)}</span>
                      </div>
                    )}
                  </div>

                  {/* Machine Details */}
                  {step.machineDetails.length > 0 && (
                    <div className="mb-4">
                      <h6 className="font-medium text-gray-900 mb-2">
                        Machines:
                      </h6>
                      {step.machineDetails.map((machine, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <WrenchScrewdriverIcon className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              ID: {machine.machineId || machine.id}
                            </span>
                          </div>
                          {machine.machineCode && (
                            <div className="text-sm text-gray-600">
                              Code: {machine.machineCode}
                            </div>
                          )}
                          <div className="text-sm text-gray-600">
                            Type: {machine.machineType}
                          </div>
                          {machine.unit && (
                            <div className="text-sm text-gray-600">
                              Unit: {machine.unit}
                            </div>
                          )}
                          {machine.machine && (
                            <>
                              <div className="text-sm text-gray-600">
                                Description: {machine.machine.description}
                              </div>
                              <div className="text-sm text-gray-600">
                                Status: {machine.machine.status}
                              </div>
                              <div className="text-sm text-gray-600">
                                Capacity: {machine.machine.capacity}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => onUpdateStatus(step)}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <span>Update Status</span>
                    </button>
                    <button
                      onClick={() => onEditMachine(step)}
                      className="bg-orange-600 text-white px-3 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <WrenchScrewdriverIcon className="h-4 w-4" />
                      <span>Edit Machine</span>
                    </button>
                    <button
                      onClick={() => onViewDetails(step)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                    >
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepDetailsModal;
