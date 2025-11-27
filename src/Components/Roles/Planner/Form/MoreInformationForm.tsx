import React, { useState, useEffect } from "react";
import { type Job, type JobStep, type Machine } from "../Types/job.ts";
import SelectDemandModal from "../modal/SelectDemandModal.tsx";
import AddStepsModal from "../modal/AddStepsModal.tsx";

interface MoreInformationFormProps {
  job: Job;
  onSave: (updatedJob: Partial<Job>, jobPlanningPayload: any) => Promise<void>;
  onClose: () => void;
  isReadOnly: boolean;
}

const MoreInformationForm: React.FC<MoreInformationFormProps> = ({
  job,
  onSave,
  onClose,
  isReadOnly,
}) => {
  const [jobDemand, setJobDemand] = useState<Job["jobDemand"]>(
    job.jobDemand || null
  );
  const [selectedSteps, setSelectedSteps] = useState<JobStep[]>(
    job.jobSteps || []
  );
  const [selectedMachines, setSelectedMachines] = useState<Machine[]>([]);
  const [stepMachines, setStepMachines] = useState<Record<string, string>>(
    {}
  ); // 🔥 NEW: Track step-machine mapping
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showDemandModal, setShowDemandModal] = useState(false);
  const [showStepsModal, setShowStepsModal] = useState(false);

  useEffect(() => {
    if (job.machineId) {
      // Attempt to find the full machine object if job.machineId is already set
      // In a real app, you might fetch this from a list of all machines
      // For now, we'll create a placeholder if the full object isn't available
      setSelectedMachines((prev) =>
        prev.length > 0
          ? prev
          : [
              {
                // FIXED: Check if array is empty
                id: job.machineId || "",
                machineType: "inside Machine" as const,
                description: job.machineId || "",
                unit: "",
                machineCode: "",
                type: "",
                capacity: 0,
                remarks: null,
                status: "",
                isActive: true,
                createdAt: "",
                updatedAt: "",
                jobs: [],
              },
            ]
      );
    }
  }, [job.machineId]);

  // Get demand display label
  const getDemandDisplayLabel = (demand: Job["jobDemand"]) => {
    switch (demand) {
      case "high":
        return "Urgent";
      case "medium":
        return "Regular";
      default:
        return "Choose Demand Level";
    }
  };

  // Get demand styling
  const getDemandStyling = (demand: Job["jobDemand"]) => {
    switch (demand) {
      case "high":
        return "border-red-400 bg-red-50 text-red-700";
      case "medium":
        return "border-[#00AEEF] bg-[#00AEEF]/10 text-[#00AEEF]";
      default:
        return "border-gray-300 bg-white text-gray-500";
    }
  };

  console.log("job in more info", job);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setError(null);
    setIsSubmitting(true);

    // Basic validation
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

    // Demand-specific validation
    if (jobDemand === "medium" && selectedSteps.length === 0) {
      setError(
        "Regular demand requires at least one production step to be selected."
      );
      setIsSubmitting(false);
      return;
    }

    if (
      jobDemand === "medium" &&
      (!selectedMachines || selectedMachines.length === 0)
    ) {
      setError(
        "Regular demand requires machine assignment for all selected steps."
      );
      setIsSubmitting(false);
      return;
    }

    try {
      // 🎯 FIX: Add the missing updatedJobFields
      const updatedJobFields: Partial<Job> = {
        jobDemand: jobDemand,
        machineId: selectedMachines.length > 0 ? selectedMachines[0].id : null,
      };

      const poId = job.poId || job.purchaseOrderId || null;

      if (!poId) {
        console.warn("⚠️ No PO ID found in job object!");
      } else {
        console.log("✅ Using PO ID for job planning:", poId);
      }

      const jobPlanningPayload = {
        nrcJobNo: job.nrcJobNo,
        jobDemand: jobDemand,
        poId: poId,
        steps: selectedSteps.map((step) => {
          // 🔥 UPDATED: Use stepMachines mapping to get assigned machine (single)
          const machineIdForStep = stepMachines[step.stepName];
          const assignedMachine = machineIdForStep
            ? selectedMachines.find((m) => m.id === machineIdForStep)
            : null;

          // 🔥 FIXED: Get unit from job, not from machine
          const jobUnit = job.unit || "Mk"; // Fallback to "Mk" if job.unit is not available

          // 🔥 CHANGED: Create machineDetails array for single machine or default "Not Assigned"
          const machineDetails = assignedMachine
            ? [{
                id: assignedMachine.id,
                unit: jobUnit, // 🔥 FIXED: Use job unit instead of machine unit
                machineCode: assignedMachine.machineCode,
                machineType: assignedMachine.machineType,
              }]
            : [
                {
                  unit: jobUnit, // 🔥 FIXED: Use job unit instead of hardcoded "Mk"
                  machineCode: null,
                  machineType: "Not Assigned",
                },
              ];

          return {
            stepNo: step.stepNo,
            stepName: step.stepName,
            // Keep single machine detail for backward compatibility (use first machine)
            machineDetail:
              assignedMachines.length > 0
                ? assignedMachines[0].machineType ||
                  assignedMachines[0].machineCode
                : "Not Assigned",
            machineId:
              assignedMachines.length > 0 ? assignedMachines[0].id : null,
            machineCode:
              assignedMachines.length > 0
                ? assignedMachines[0].machineCode
                : null,
            // 🔥 NEW: Add array of all machines for this step
            machineDetails: machineDetails,
            allMachineIds: assignedMachines.map((m) => m.id), // Array of all machine IDs
          };
        }),
      };

      console.log(
        "🔍 Updated Job Planning Payload with Multiple Machines:",
        JSON.stringify(jobPlanningPayload, null, 2)
      );

      await onSave(updatedJobFields, jobPlanningPayload);
    } catch (err) {
      setError(
        `Failed to save More Information: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("selected Machine", selectedMachines);

  return (
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
          More Information
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Provide additional details for Job: {job.nrcJobNo}
        </p>

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
              className={`w-full px-3 py-2 border-2 rounded-md flex justify-between items-center transition-all duration-200 ${
                isReadOnly
                  ? "bg-gray-50 cursor-not-allowed"
                  : "cursor-pointer hover:scale-105"
              } ${getDemandStyling(jobDemand)}`}
              onClick={() => !isReadOnly && setShowDemandModal(true)}
            >
              <span className="font-medium">
                {getDemandDisplayLabel(jobDemand)}
              </span>
              <span>&#9660;</span>
            </div>

            {/* Demand-specific info */}
            {jobDemand === 'high' && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Urgent:</strong> Flexible machine assignment - not all machines required
              </div>
            )}
            {jobDemand === "medium" && (
              <div className="mt-2 p-2 bg-[#00AEEF]/20 border border-[#00AEEF]/30 rounded text-xs text-[#00AEEF]">
                <strong>Regular:</strong> Machine assignment is mandatory for
                all selected steps
              </div>
            )}
          </div>

          {/* Add Steps */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Steps{" "}
              {jobDemand === "medium" && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div
              className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center ${
                isReadOnly ? "bg-gray-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => !isReadOnly && setShowStepsModal(true)}
            >
              <span>
                {selectedSteps.length > 0
                  ? `${selectedSteps.length} step(s) selected`
                  : "Choose the steps of the job"}
              </span>
              <span>&#9660;</span>
            </div>

            {/* Steps requirement info */}
            {jobDemand === "medium" && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Required:</strong> All selected steps must have machine
                assignments for Regular demand
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-2">
              {selectedSteps.map((step) => (
                <span
                  key={step.stepName}
                  className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                >
                  {step.stepName}
                </span>
              ))}
            </div>
          </div>

          {/* Machine Assigned */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Machine Assigned {jobDemand === 'medium' && <span className="text-red-500">*</span>}
            </label>
          <div
  className={`w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex justify-between items-center ${
    isReadOnly ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'
  }`}
  onClick={() => !isReadOnly && setShowMachineModal(true)}
>
  <span>
    {selectedMachines && selectedMachines.length > 0
      ? selectedMachines.map(m => m.description || m.machineCode).join(', ')
      : 'Select Machines'}
  </span>
  <span>&#9660;</span>
</div>

            
            
            {jobDemand === 'medium' && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                <strong>Required:</strong> Machine assignment is mandatory for Regular demand
              </div>
            )}
          </div> */}

          <button
            type="submit"
            className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer shadow-md flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting || isReadOnly}
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
            {isSubmitting ? "Submitting..." : "Submit"}
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
          selectedMachines={selectedMachines} // Pass current machines
          onSelect={(steps, machines, stepMachineMapping) => {
            // 🔥 FIXED: Accept third parameter
            setSelectedSteps(steps);
            setSelectedMachines(machines);
            setStepMachines(stepMachineMapping); // 🔥 NEW: Store step-machine mapping
            setShowStepsModal(false);
          }}
          onClose={() => setShowStepsModal(false)}
        />
      )}
      {/* {showMachineModal && (
  <MachineAssignedModal
    currentMachine={selectedMachines} // ✅ pass array instead of single
    onSelect={(machines) => {         // ✅ machines is Machine[]
      setSelectedMachines(machines);
      setShowMachineModal(false);
    }}
    onClose={() => setShowMachineModal(false)}
  />
)} */}
    </div>
  );
};

export default MoreInformationForm;
