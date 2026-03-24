import React, { useState } from "react";
import {
  Eye,
  Search,
  Filter as FilterIcon,
  X,
  ChevronRight,
} from "lucide-react";
import { useUsers } from "../../../../context/UsersContext";
import JobAndPODetailsModal from "../../../common/JobAndPODetailsModal";
import {
  fetchJobWithPODetails,
  type JobDetailsWithPOData,
} from "../../../../utils/jobPoDetailsFetch";

interface JobPlanStep {
  id: number;
  stepNo: number;
  stepName: string;
  machineDetails: Array<{
    unit: string | null;
    machineId: string | number;
    machineCode: string | null;
    machineType: string;
    machine?: {
      id: string;
      description: string;
      status: string;
      capacity: number;
    };
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
      [key: string]: any;
    };
    [key: string]: any;
  };
  // Step-specific detail fields (optional)
  paperStore?: { status?: string; [key: string]: any };
  printingDetails?: { status?: string; [key: string]: any };
  corrugation?: { status?: string; [key: string]: any };
  flutelam?: { status?: string; [key: string]: any };
  fluteLaminateBoardConversion?: { status?: string; [key: string]: any };
  punching?: { status?: string; [key: string]: any };
  sideFlapPasting?: { status?: string; [key: string]: any };
  qualityDept?: { status?: string; [key: string]: any };
  dispatchProcess?: { status?: string; [key: string]: any };
}

interface JobPlan {
  jobPlanId: number;
  nrcJobNo: string;
  jobDemand: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
  steps: JobPlanStep[];
}

interface JobDetails {
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
  topFaceGSM: string;
  flutingGSM: string;
  bottomLinerGSM: string;
  boardSize: string;
  noUps: string;
  artworkReceivedDate: string;
  artworkApprovedDate: string;
  shadeCardApprovalDate: string;
  jobDemand: string;
  imageURL: string | null;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  customer: string;
  poDate: string;
  deliveryDate: string;
  totalPOQuantity: number;
  dispatchQuantity: number;
  pendingQuantity: number;
  plant: string;
  unit: string;
  status: string;
  boardSize: string;
  fluteType: string;
  style: string;
  jobNrcJobNo: string;
  dieCode: number;
  noOfSheets: number;
  noOfUps: number;
  pendingValidity: number;
  nrcDeliveryDate: string;
  shadeCardApprovalDate: string;
  dispatchDate: string | null;
}

interface JobPlansTableProps {
  jobPlans: JobPlan[];
  onViewDetails: (jobPlan: JobPlan) => void;
  className?: string;
}

const JobPlansTable: React.FC<JobPlansTableProps> = ({
  jobPlans,
  className = "",
}) => {
  const { getUserName } = useUsers();
  const [searchTerm, setSearchTerm] = useState("");
  const [demandFilter, setDemandFilter] = useState<
    "all" | "low" | "medium" | "high"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "inProgress" | "majorHold" | "planned"
  >("all");
  const [selectedJobPlan, setSelectedJobPlan] = useState<JobPlan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobDetailsWithPO, setJobDetailsWithPO] =
    useState<JobDetailsWithPOData | null>(null);
  const [loadingJobDetails, setLoadingJobDetails] = useState(false);
  const [jobDetailsError, setJobDetailsError] = useState<string | null>(null);
  const [activeJobTab, setActiveJobTab] = useState<"job" | "po">("job");

  const handleJobCardClick = async (nrcJobNo: string) => {
    setLoadingJobDetails(true);
    setJobDetailsError(null);
    setActiveJobTab("job");

    try {
      const details = await fetchJobWithPODetails(nrcJobNo);
      setJobDetailsWithPO(details);
    } catch (error) {
      setJobDetailsError("Failed to fetch job details. Please try again.");
      console.error("Error fetching job details:", error);
    } finally {
      setLoadingJobDetails(false);
    }
  };

  const handleViewDetails = (jobPlan: JobPlan) => {
    setSelectedJobPlan(jobPlan);
    setIsModalOpen(true);
    setJobDetailsWithPO(null);
  };

  // Helper function to get actual step status (prioritizes stepDetails over step.status)
  const getStepActualStatus = (
    step: JobPlanStep
  ): "completed" | "in_progress" | "hold" | "planned" => {
    // Check for major_hold and hold first (highest priority) - major_hold must not count as in-progress
    if (
      step.stepDetails?.data?.status === "major_hold" ||
      step.stepDetails?.status === "major_hold" ||
      step.status === "major_hold"
    ) {
      return "hold";
    }
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

    // Priority 1: Check stepDetails.data.status first
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

    // Priority 3: Check step.status directly
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

  const hasMajorHold = (jobPlan: JobPlan): boolean =>
    (jobPlan.steps || []).some(
      (step) =>
        step.stepDetails?.data?.status === "major_hold" ||
        step.stepDetails?.status === "major_hold" ||
        step.status === "major_hold"
    );

  const getProgressPercentage = (jobPlan: JobPlan) => {
    const completedSteps = jobPlan.steps.filter(
      (step) => getStepActualStatus(step) === "completed"
    ).length;
    const totalSteps = jobPlan.steps.length;
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  };

  // Filter job plans based on search and filters
  const filteredJobPlans = jobPlans.filter((jobPlan) => {
    const matchesSearch = jobPlan.nrcJobNo
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesDemand =
      demandFilter === "all" || jobPlan.jobDemand === demandFilter;

    let matchesStatus = true;
    if (statusFilter !== "all") {
      // Use helper function to check actual step statuses
      const stepStatuses = jobPlan.steps.map((step) =>
        getStepActualStatus(step)
      );
      const hasInProgress = stepStatuses.some(
        (status) => status === "in_progress"
      );
      const hasHold = stepStatuses.some((status) => status === "hold");
      const allCompleted = stepStatuses.every(
        (status) => status === "completed"
      );

      if (statusFilter === "completed") matchesStatus = allCompleted;
      else if (statusFilter === "majorHold") matchesStatus = hasMajorHold(jobPlan);
      else if (statusFilter === "inProgress")
        matchesStatus = (hasInProgress || hasHold) && !hasMajorHold(jobPlan);
      else if (statusFilter === "planned")
        matchesStatus = !hasInProgress && !hasHold && !allCompleted;
    }

    return matchesSearch && matchesDemand && matchesStatus;
  });

  // Sort filtered rows by progress descending (highest progress first)
  const sortedJobPlans = [...filteredJobPlans].sort(
    (a, b) => getProgressPercentage(b) - getProgressPercentage(a)
  );

  const getJobStatus = (jobPlan: JobPlan) => {
    // Use helper function to check actual step statuses
    const stepStatuses = jobPlan.steps.map((step) => getStepActualStatus(step));

    const hasInProgress = stepStatuses.some(
      (status) => status === "in_progress"
    );
    const hasHold = stepStatuses.some((status) => status === "hold");
    const allCompleted = stepStatuses.every((status) => status === "completed");

    if (allCompleted)
      return { text: "Completed", color: "bg-green-100 text-green-800" };
    if (hasMajorHold(jobPlan))
      return { text: "Major Hold", color: "bg-red-100 text-red-800" };
    if (hasInProgress || hasHold)
      return { text: "In Progress", color: "bg-yellow-100 text-yellow-800" };
    return { text: "Planned", color: "bg-gray-100 text-gray-800" };
  };

  const getStatusStyle = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-sm font-medium";

    switch (status) {
      case "stop":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "start":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "planned":
        return `${baseClasses} bg-gray-100 text-gray-600`;
      case "major_hold":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "hold":
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case "accept":
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getStepDisplayStatus = (step: JobPlanStep): string => {
    const raw =
      step.stepDetails?.status ??
      (step.stepDetails as any)?.data?.status ??
      step.status ??
      "planned";
    return typeof raw === "string" ? raw : "planned";
  };

  const formatStepStatusLabel = (status: string): string =>
    String(status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatStepName = (stepName: string): string => {
    return stepName
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .trim();
  };

  console.log("selectedJobPlan:", selectedJobPlan);
  console.log("jobDetailsWithPO:", jobDetailsWithPO);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 sm:mb-0">
          Job Cards Overview
        </h3>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search job plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF] w-full sm:w-64"
            />
          </div>

          {/* Demand Filter */}
          <select
            value={demandFilter}
            onChange={(e) => setDemandFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
          >
            <option value="all">All Demands</option>
            <option value="high">Urgent</option>
            <option value="medium">Regular</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="inProgress">In Progress</option>
            <option value="majorHold">Major Hold</option>
            <option value="planned">Planned</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job No
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Demand
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {sortedJobPlans.map((jobPlan) => {
              const status = getJobStatus(jobPlan);
              const progressPercentage = getProgressPercentage(jobPlan);

              return (
                <tr key={jobPlan.jobPlanId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {jobPlan.nrcJobNo}
                      </div>
                      <div className="text-sm text-gray-500">
                        Id: {(jobPlan as any).jobPlanCode || jobPlan.jobPlanId}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        jobPlan.jobDemand === "high"
                          ? "bg-red-100 text-red-800"
                          : jobPlan.jobDemand === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {jobPlan.jobDemand === "high"
                        ? "Urgent"
                        : jobPlan.jobDemand === "medium"
                        ? "Regular"
                        : jobPlan.jobDemand}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-[#00AEEF] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {
                        jobPlan.steps.filter(
                          (step) => getStepActualStatus(step) === "completed"
                        ).length
                      }
                      /{jobPlan.steps.length} steps
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}
                    >
                      {status.text}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(jobPlan.createdAt)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(jobPlan)}
                      className="text-[#00AEEF] hover:text-[#0099cc] transition-colors duration-200 flex items-center space-x-1"
                    >
                      <Eye size={16} />
                      <span>View Steps</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredJobPlans.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FilterIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p>No job plans found matching your criteria.</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Job Steps Modal */}
      {isModalOpen && selectedJobPlan && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-6 relative overflow-y-auto max-h-[90vh]">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <h2 className="text-xl font-semibold mb-4">
              Job Card Steps - {selectedJobPlan.nrcJobNo}
            </h2>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                {
                  label: "Job Card No",
                  value: selectedJobPlan.nrcJobNo,
                  color: "blue",
                  clickable: true,
                },
                {
                  label: "Job Plan Code",
                  value: (selectedJobPlan as any).jobPlanCode ?? selectedJobPlan.jobPlanId,
                  color: "green",
                },
                {
                  label: "Demand",
                  value:
                    selectedJobPlan.jobDemand === "high"
                      ? "Urgent"
                      : selectedJobPlan.jobDemand === "medium"
                      ? "Regular"
                      : selectedJobPlan.jobDemand,
                  color: "purple",
                },
                {
                  label: "Created",
                  value: formatDateTime(selectedJobPlan.createdAt),
                  color: "orange",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex flex-col p-3 rounded-md shadow-sm border-l-4 border-${item.color}-500 bg-white`}
                >
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
                    {item.label}
                  </span>
                  {item.clickable ? (
                    <button
                      onClick={() =>
                        handleJobCardClick(selectedJobPlan.nrcJobNo)
                      }
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer mt-0.5 text-left flex items-center"
                    >
                      {item.value || "-"}
                      <ChevronRight size={14} className="ml-1" />
                    </button>
                  ) : (
                    <span className="text-sm font-semibold text-gray-900 mt-0.5">
                      {item.value || "-"}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Steps */}
            <h3 className="text-lg font-medium mb-2">Steps</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-emerald-50 to-green-100 sticky top-0">
                  <tr>
                    {[
                      "Step No",
                      "Step Name",
                      "Status",
                      "Machine",
                      "Capacity",
                      "Start Date",
                      "End Date",
                      "User",
                    ].map((col, i) => (
                      <th
                        key={i}
                        className="px-6 py-3 text-left text-sm font-semibold text-gray-700 border-b border-gray-200 uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(selectedJobPlan.steps ?? []).map((step) => {
                    const stepStatus = getStepDisplayStatus(step);
                    return (
                    <tr
                      key={step.id}
                      className="hover:bg-indigo-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        {step.stepNo}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {formatStepName(step.stepName)}
                      </td>
                      <td className="px-6 py-4 align-middle">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusStyle(
                            stepStatus
                          )}`}
                        >
                          {formatStepStatusLabel(stepStatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {step.machineDetails?.[0]?.machineCode || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {step.machineDetails?.[0]?.machine?.capacity || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(step.startDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(step.endDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {getUserName(step.user)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <JobAndPODetailsModal
        open={!!(jobDetailsWithPO || loadingJobDetails)}
        onClose={() => {
          setJobDetailsWithPO(null);
          setLoadingJobDetails(false);
          setJobDetailsError(null);
        }}
        loadingJobDetails={loadingJobDetails}
        jobDetailsError={jobDetailsError}
        jobDetailsWithPO={jobDetailsWithPO}
        activeJobTab={activeJobTab}
        setActiveJobTab={setActiveJobTab}
        selectedJobPlan={selectedJobPlan}
      />
    </div>
  );
};

export default JobPlansTable;
