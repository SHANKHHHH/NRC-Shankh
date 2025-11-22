import React, { useState, useEffect } from "react";
import AddStepsModal from "./AddStepsModal";
import SelectDemandModal from "./SelectDemandModal";
import { type JobStep, type Machine } from "../Types/job.ts";

interface PurchaseOrder {
  id: number;
  boardSize: string | null;
  customer: string;
  deliveryDate: string;
  dieCode: number | null;
  dispatchDate: string | null;
  dispatchQuantity: number | null;
  fluteType: string | null;
  jockeyMonth: string | null;
  noOfUps: number | null;
  nrcDeliveryDate: string | null;
  noOfSheets: number | null;
  poDate: string;
  poNumber: string;
  pendingQuantity: number | null;
  pendingValidity: number | null;
  plant: string | null;
  shadeCardApprovalDate: string | null;
  sharedCardDiffDate: number | null;
  srNo: number | null;
  style: string | null;
  totalPOQuantity: number | null;
  unit: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobNrcJobNo: string | null;
  userId: string | null;
  job: {
    nrcJobNo: string;
    customerName: string;
    styleItemSKU: string;
  } | null;
  user: any | null;
  boxDimensions: string | null;
  processColors?: string;
  jobBoardSize: string | null;
}

interface SingleJobPlanningModalProps {
  po: PurchaseOrder;
  onSave: (jobPlanningData: any) => void;
  onClose: () => void;
}

// Add the same mapping as bulk modal
const STEP_TO_MACHINE_MAPPING: Record<string, string[]> = {
  SideFlapPasting: ["auto flap", "manual fi"],
  Punching: ["auto pund", "manual pu"],
  FluteLaminateBoardConversion: ["flute lam"],
  Corrugation: ["corrugatic"],
  PrintingDetails: ["printing"],
  PaperStore: [],
  QualityDept: [],
  DispatchProcess: [],
};

const SingleJobPlanningModal: React.FC<SingleJobPlanningModalProps> = ({
  po,
  onSave,
  onClose,
}) => {
  const [jobDemand, setJobDemand] = useState<"high" | "medium" | "low" | null>(
    null
  );
  const [selectedSteps, setSelectedSteps] = useState<JobStep[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔥 NEW: State for tracking step-machine mappings (multiple machines per step)
  const [stepMachines, setStepMachines] = useState<Record<string, string[]>>(
    {}
  );
  const [allMachines, setAllMachines] = useState<Machine[]>([]);

  const [showDemandModal, setShowDemandModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);

  // Finished goods state
  const [availableFinishedGoods, setAvailableFinishedGoods] = useState<number>(0);
  const [useFinishedGoods, setUseFinishedGoods] = useState<boolean>(false);
  const [isLoadingFinishedGoods, setIsLoadingFinishedGoods] = useState<boolean>(true);

  // 🔥 NEW: Fetch machines on component mount
  useEffect(() => {
    fetchMachines();
  }, []);

  // Fetch finished goods when PO changes
  useEffect(() => {
    // Reset state when PO changes
    setAvailableFinishedGoods(0);
    setUseFinishedGoods(false);
    setIsLoadingFinishedGoods(true);
    // Fetch finished goods with a small delay to ensure PO is fully loaded
    const timer = setTimeout(() => {
      fetchFinishedGoods();
    }, 100);
    return () => clearTimeout(timer);
  }, [po]);

  const fetchMachines = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/machines?",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAllMachines(data.data);
      }
    } catch (err) {
      console.error("Machine fetch error:", err);
    }
  };

  const fetchFinishedGoods = async () => {
    setIsLoadingFinishedGoods(true);
    try {
      // Try multiple ways to get the job number
      const jobNo = po.jobNrcJobNo || po.job?.nrcJobNo || (po as any).nrcJobNo;
      
      console.log("🔍 Fetching finished goods for job:", jobNo, "PO:", po);
      
      if (!jobNo) {
        console.log("⚠️ No job number found for PO:", po.poNumber);
        setAvailableFinishedGoods(0);
        setIsLoadingFinishedGoods(false);
        return;
      }

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("No access token found");
        setIsLoadingFinishedGoods(false);
        return;
      }

      // Use the same approach as the table - fetch all finished goods and filter by job number
      const allUrl = `https://nrprod.nrcontainers.com/api/finish-quantity/`;
      console.log("📡 Fetching all finished goods from:", allUrl);
      
      const response = await fetch(allUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        console.warn(`⚠️ Finished goods API returned ${response.status}`);
        setAvailableFinishedGoods(0);
        setIsLoadingFinishedGoods(false);
        return;
      }

      const data = await response.json();
      console.log("📦 All finished goods response:", data);
      
      if (data.success && Array.isArray(data.data)) {
        // Find the job data that matches this job number
        const jobData = data.data.find((job: any) => job.nrcJobNo === jobNo);
        
        if (jobData && jobData.finishQuantities && Array.isArray(jobData.finishQuantities)) {
          // Calculate total available finished goods (same logic as table)
          const totalAvailable = jobData.finishQuantities
            .filter((fq: any) => fq.status === "available")
            .reduce((sum: number, fq: any) => sum + (fq.overDispatchedQuantity || 0), 0);
          
          console.log("✅ Found finished goods for job:", jobNo, "Available:", totalAvailable);
          setAvailableFinishedGoods(totalAvailable);
        } else {
          console.log("⚠️ No finished goods data found for job:", jobNo);
          setAvailableFinishedGoods(0);
        }
      } else {
        console.log("⚠️ Invalid response format");
        setAvailableFinishedGoods(0);
      }
    } catch (err) {
      console.error("❌ Finished goods fetch error:", err);
      setAvailableFinishedGoods(0);
    } finally {
      setIsLoadingFinishedGoods(false);
    }
  };

  const getDemandDisplayLabel = (demand: "high" | "medium" | "low" | null) => {
    switch (demand) {
      case "high":
        return "Urgent";
      case "medium":
        return "Regular";
      case "low":
        return "Low Priority";
      default:
        return "Choose Demand Level";
    }
  };

  const getDemandStyling = (demand: "high" | "medium" | "low" | null) => {
    switch (demand) {
      case "high":
        return "border-red-400 bg-red-50 text-red-700";
      case "medium":
        return "border-[#00AEEF] bg-[#00AEEF]/10 text-[#00AEEF]";
      case "low":
        return "border-green-400 bg-green-50 text-green-700";
      default:
        return "border-gray-300 bg-white text-gray-500";
    }
  };

  // 🔥 FIXED: Enhanced steps selection handler
  const handleStepsSelect = (
    steps: JobStep[],
    machines: Machine[],
    stepMachineMapping: Record<string, string[]>
  ) => {
    console.log("🔍 handleStepsSelect called with:");
    console.log("📋 Steps:", steps);
    console.log("🏭 Machines:", machines);
    console.log("🔧 Step-Machine mapping:", stepMachineMapping);

    setSelectedSteps(steps);
    setSelectedMachines(machines);

    // 🔥 CRITICAL: Always update step-machine mapping
    console.log("✅ Updating stepMachines with:", stepMachineMapping);
    setStepMachines(stepMachineMapping);

    setShowStepsModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    if (!jobDemand) {
      setError("Please select a demand level.");
      setIsSubmitting(false);
      return;
    }

    if (!selectedSteps || selectedSteps.length === 0) {
      setError("Please select at least one production step.");
      setIsSubmitting(false);
      return;
    }

    // 🔥 FIXED: Better validation for step-specific machine assignments
    if (jobDemand === "medium") {
      const stepsRequiringMachines = selectedSteps.filter((step) => {
        const machineTypes = STEP_TO_MACHINE_MAPPING[step.stepName];
        return machineTypes && machineTypes.length > 0;
      });

      const stepsWithoutMachines = stepsRequiringMachines.filter((step) => {
        const assignedMachineIds = stepMachines[step.stepName] || [];
        return assignedMachineIds.length === 0;
      });

      if (stepsWithoutMachines.length > 0) {
        setError(
          `Regular demand requires machine assignment for steps: ${stepsWithoutMachines
            .map((s) => s.stepName)
            .join(", ")}`
        );
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 🔥 FIXED: Create job planning data in the correct format expected by the API
      const jobPlanningData = {
        nrcJobNo: po.jobNrcJobNo || po.job?.nrcJobNo,
        jobDemand: jobDemand,
        purchaseOrderId: po.id, // Include PO ID
        finishedGoodsQty: useFinishedGoods ? availableFinishedGoods : 0, // Include finished goods if selected

        // 🔥 CRITICAL: This is the steps array the API expects at root level
        steps: selectedSteps.map((step, stepIndex) => {
          // Get ALL machines assigned to this step
          const assignedMachineIds = stepMachines[step.stepName] || [];
          const assignedMachines = assignedMachineIds
            .map((machineId) => allMachines.find((m) => m.id === machineId))
            .filter(Boolean) as Machine[];

          // Create machineDetails array for multiple machines
          const machineDetails = assignedMachines.map((machine) => ({
            id: machine.id,
            unit: po.unit || machine.unit || "Unit 1",
            machineCode: machine.machineCode,
            machineType: machine.machineType,
          }));

          return {
            jobStepId: stepIndex + 1,
            stepNo: step.stepNo || stepIndex + 1,
            stepName: step.stepName,
            machineDetails: machineDetails, // 🔥 This gets stored as JSON in DB
            status: "planned" as const,
            startDate: null,
            endDate: null,
            user: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }),
      };

      console.log(
        "📤 Single job planning API payload:",
        JSON.stringify(jobPlanningData, null, 2)
      );
      console.log("📦 Finished Goods in payload:", {
        useFinishedGoods,
        availableFinishedGoods,
        finishedGoodsQty: jobPlanningData.finishedGoodsQty
      });

      // 🔥 NEW: Validate the payload before sending
      if (!jobPlanningData.nrcJobNo) {
        throw new Error("NRC Job Number is missing");
      }
      if (!jobPlanningData.jobDemand) {
        throw new Error("Job Demand is missing");
      }
      if (!jobPlanningData.steps || jobPlanningData.steps.length === 0) {
        throw new Error("Steps array is missing or empty");
      }

      console.log("✅ Payload validation passed");

      await onSave(jobPlanningData);
      onClose();
    } catch (err) {
      console.error("❌ Error saving job plan:", err);
      setError(
        `Failed to save job planning: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl p-0 flex flex-col items-center">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold hover:cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>

        <div className="w-full px-8 pt-10 pb-8 flex flex-col items-center overflow-y-auto max-h-[85vh]">
          <h2 className="text-2xl font-bold mb-2 text-center text-gray-900">
            Job Planning
          </h2>
          <p className="text-gray-500 text-center mb-2">
            Create job plan for {po.jobNrcJobNo || po.job?.nrcJobNo || "N/A"}
          </p>
          {/* Debug: Show job number and finished goods status */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mb-2">
              Job: {po.jobNrcJobNo || po.job?.nrcJobNo || "Not found"} | 
              FG: {availableFinishedGoods > 0 ? `${availableFinishedGoods} available` : "None"}
            </div>
          )}

          {/* Show PO details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 w-full">
            <p className="text-sm text-blue-800 text-center">
              <strong>Customer:</strong> {po.customer} | <strong>PO:</strong>{" "}
              {po.poNumber}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm mb-4">
                {error}
              </div>
            )}

            {/* Select Demand */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Demand
              </label>
              <div
                className={`w-full px-3 py-2 border-2 rounded-md flex justify-between items-center transition-all duration-200 cursor-pointer hover:scale-105 ${getDemandStyling(
                  jobDemand
                )}`}
                onClick={() => setShowDemandModal(true)}
              >
                <span className="font-medium">
                  {getDemandDisplayLabel(jobDemand)}
                </span>
                <span>&#9660;</span>
              </div>

              {jobDemand === "high" && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <strong>Urgent:</strong> Flexible machine assignment - not all
                  machines required
                </div>
              )}
              {jobDemand === "medium" && (
                <div className="mt-2 p-2 bg-[#00AEEF]/20 border border-[#00AEEF]/30 rounded text-xs text-[#00AEEF]">
                  <strong>Regular:</strong> Machine assignment is mandatory for
                  all selected steps
                </div>
              )}
            </div>

            {/* Finished Goods Checkbox */}
            {availableFinishedGoods > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFinishedGoods}
                    onChange={(e) => setUseFinishedGoods(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">
                      Use Finished Goods
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      Available: {availableFinishedGoods.toLocaleString()} units
                    </div>
                  </div>
                </label>
              </div>
            )}

            {/* Add Steps */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Add Steps{" "}
                {jobDemand === "medium" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <div
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center cursor-pointer"
                onClick={() => setShowStepsModal(true)}
              >
                <span>
                  {selectedSteps.length > 0
                    ? `${selectedSteps.length} step(s) selected`
                    : "Choose the steps of the job"}
                </span>
                <span>&#9660;</span>
              </div>

              {jobDemand === "medium" && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <strong>Required:</strong> All selected steps must have
                  machine assignments for Regular demand
                </div>
              )}
              {jobDemand === "high" && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                  <strong>Flexible:</strong> Machine assignment is optional for
                  Urgent demand
                </div>
              )}

              {/* Show selected steps with their assigned machines */}
              {selectedSteps.length > 0 && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {selectedSteps.map((step) => {
                    const assignedMachineIds =
                      stepMachines[step.stepName] || [];
                    const assignedMachines = assignedMachineIds
                      .map((machineId) =>
                        allMachines.find((m) => m.id === machineId)
                      )
                      .filter(Boolean) as Machine[];

                    return (
                      <div
                        key={step.stepName}
                        className="bg-white rounded p-2 border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">
                            {step.stepName.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          {assignedMachines.length > 0 && (
                            <span className="text-xs text-[#00AEEF] font-semibold">
                              {assignedMachines.length} machine
                              {assignedMachines.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {assignedMachines.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {assignedMachines.map((machine) => (
                              <span
                                key={machine.id}
                                className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full"
                              >
                                {machine.machineCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 mt-1 block">
                            No machines assigned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              )}
              {isSubmitting ? "Creating Job Plan..." : "Create Job Plan"}
            </button>
          </form>
        </div>

        {/* Sub-modals */}
        {showDemandModal && (
          <SelectDemandModal
            currentDemand={jobDemand}
            onSelect={(demand) => {
              setJobDemand(demand);
              setShowDemandModal(false);
            }}
            onClose={() => setShowDemandModal(false)}
          />
        )}
        {showStepsModal && (
          <AddStepsModal
            currentSteps={selectedSteps}
            selectedMachines={selectedMachines}
            stepMachines={stepMachines} // 🔥 NEW: Pass current step-machine mapping
            allMachines={allMachines} // 🔥 NEW: Pass fetched machines
            onSelect={handleStepsSelect}
            onClose={() => setShowStepsModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default SingleJobPlanningModal;
