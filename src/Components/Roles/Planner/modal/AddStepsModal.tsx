// src/Components/Roles/Planner/AddStepsModal.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { type JobStep } from "../Types/job.ts"; // Adjust path as needed
import { type Machine } from "../Types/job.ts";

interface AddStepsModalProps {
  currentSteps: JobStep[];
  selectedMachines: Machine[]; // Add this to pass current machines
  onSelect: (
    steps: JobStep[],
    machines: Machine[],
    stepMachineMapping: Record<string, string> // Changed to single string per step
  ) => void; // 🔥 FIXED: Added third parameter
  stepMachines?: Record<string, string>; // 🔥 CHANGED: Single machine ID per step (not array)
  allMachines?: Machine[]; // 🔥 NEW: Add this prop
  onClose: () => void;
}

const allStepsOptions: { stepName: string; description: string }[] = [
  {
    stepName: "PaperStore",
    description: "Responsible : Store Manager, Inventory Officer",
  },
  {
    stepName: "PrintingDetails",
    description:
      "Responsible : Print Operator, Print Supervisor, Quality Inspector",
  },
  {
    stepName: "Corrugation",
    description: "Responsible : Corrugation Operator, Line Supervisor",
  },
  {
    stepName: "FluteLaminateBoardConversion",
    description: "Responsible : Lamination Operator, Machine Operator",
  },
  { stepName: "Punching", description: "Responsible : Punching Operator" },
  {
    stepName: "SideFlapPasting",
    description: "Responsible : Pasting Operator, Assembly Worker",
  },
  {
    stepName: "QualityDept",
    description: "Responsible : QC Inspector, Quality Manager",
  },
  {
    stepName: "DispatchProcess",
    description: "Responsible : Dispatch Officer, Logistics Coordinator",
  },
  // { stepName: 'Die Cutting', description: 'Responsible : Dispatch Officer, Logistics Coordinator' },
];

const STEP_TO_MACHINE_MAPPING: Record<string, string[]> = {
  // Steps with machines
  SideFlapPasting: ["auto flap", "manual fi"],
  Punching: ["auto pund", "manual pu"],
  FluteLaminateBoardConversion: ["flute lam"],
  Corrugation: ["corrugatic"],
  PrintingDetails: ["printing"],

  // Steps without machines (no machine assignment needed)
  PaperStore: [],
  QualityDept: [],
  DispatchProcess: [],
};

const AddStepsModal: React.FC<AddStepsModalProps> = ({
  currentSteps,
  selectedMachines,
  stepMachines: initialStepMachines = {}, // 🔥 NEW: Get initial step machines
  allMachines: externalMachines = [], // 🔥 NEW: Get external machines
  onSelect,
  onClose,
}) => {
  const [selectedSteps, setSelectedSteps] = useState<JobStep[]>(currentSteps);
  // Changed to Record<string, string> to store single machine ID per step
  const [stepMachines, setStepMachines] = useState<Record<string, string>>(
    {}
  );
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const isInitialized = useRef(false); // 🔥 NEW: Track if we've initialized

  useEffect(() => {
    // 🔥 CRITICAL FIX: Only run once on mount
    if (isInitialized.current) return;
    isInitialized.current = true;

    // 🔥 UPDATED: Use external machines if available, otherwise fetch
    if (externalMachines.length > 0) {
      setMachines(externalMachines);
      setLoading(false);
    } else {
      fetchMachines();
    }

    // 🔥 UPDATED: Use initialStepMachines if provided
    if (Object.keys(initialStepMachines).length > 0) {
      setStepMachines(initialStepMachines);
    } else {
      // Initialize step machines from current selection - single machine only
      const computedStepMachines: Record<string, string> = {};
      currentSteps.forEach((step) => {
        const machinesForStep = selectedMachines.filter((m) =>
          STEP_TO_MACHINE_MAPPING[step.stepName]?.some((type) =>
            m.machineType.toLowerCase().includes(type.toLowerCase())
          )
        );
        // Only take the first machine (single selection)
        if (machinesForStep.length > 0) {
          computedStepMachines[step.stepName] = machinesForStep[0].id;
        }
      });
      setStepMachines(computedStepMachines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 🔥 CRITICAL FIX: Empty dependency array - only run once
  const fetchMachines = async () => {
    // Your existing fetch logic
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
        setMachines(data.data);
      }
    } catch (err) {
      console.error("Machine fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // const handleStepToggle = (stepName: string) => {
  //   setSelectedSteps(prev => {
  //     const exists = prev.some(step => step.stepName === stepName);
  //     if (exists) {
  //       // Remove step and its machine selection
  //       setStepMachines(prevMachines => {
  //         const newMachines = { ...prevMachines };
  //         delete newMachines[stepName];
  //         return newMachines;
  //       });
  //       return prev.filter(step => step.stepName !== stepName);
  //     } else {
  //       return [...prev, {
  //         stepNo: prev.length + 1,
  //         stepName,
  //         machineDetail: ''
  //       }];
  //     }
  //   });
  // };

  // const handleMachineSelect = (stepName: string, machineId: string) => {
  //   setStepMachines(prev => ({
  //     ...prev,
  //     [stepName]: machineId
  //   }));
  // };

  // Updated to handle single machine selection only - optimized with useCallback
  // Store scroll position to prevent scroll jumps
  const modalContentRef = useRef<HTMLDivElement>(null);
  
  const handleMachineToggle = useCallback((stepName: string, machineId: string) => {
    // Save current scroll position
    const scrollContainer = modalContentRef.current;
    const scrollTop = scrollContainer?.scrollTop || 0;

    setStepMachines((prev) => {
      const currentMachine = prev[stepName];
      const isSelected = currentMachine === machineId;

      if (isSelected) {
        // Deselect machine (remove selection)
        const newMachines = { ...prev };
        delete newMachines[stepName];
        return newMachines;
      } else {
        // Select this machine (replace any existing selection for this step)
        return {
          ...prev,
          [stepName]: machineId, // Single machine ID, not array
        };
      }
    });

    // Restore scroll position after state update
    requestAnimationFrame(() => {
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollTop;
      }
    });
  }, []);

  // Helper function to check if a machine is selected for a step - memoized
  const isMachineSelected = useCallback((stepName: string, machineId: string): boolean => {
    const selectedMachineId = stepMachines[stepName];
    return selectedMachineId === machineId;
  }, [stepMachines]);

  // Updated step toggle to clear multiple machines - optimized with useCallback
  const handleStepToggle = useCallback((stepName: string) => {
    setSelectedSteps((prev) => {
      const exists = prev.some((step) => step.stepName === stepName);
      if (exists) {
        // Remove step and clear all its machine selections
        setStepMachines((prevMachines) => {
          const newMachines = { ...prevMachines };
          delete newMachines[stepName];
          return newMachines;
        });
        return prev.filter((step) => step.stepName !== stepName);
      } else {
        return [
          ...prev,
          {
            stepNo: prev.length + 1,
            stepName,
            machineDetail: "",
          },
        ];
      }
    });
  }, []);

  // Memoize machine filtering to prevent unnecessary recalculations
  const getMachinesForStep = useCallback((stepName: string) => {
    const machineTypes = STEP_TO_MACHINE_MAPPING[stepName];
    if (!machineTypes || machineTypes.length === 0) return [];

    return machines.filter((machine) =>
      machineTypes.some((type) =>
        machine.machineType.toLowerCase().includes(type.toLowerCase())
      )
    );
  }, [machines]);

  const hasMachineRequirement = (stepName: string) => {
    const machineTypes = STEP_TO_MACHINE_MAPPING[stepName];
    return machineTypes && machineTypes.length > 0;
  };

  // Add this helper function at the top of your component
  const sortStepsByPredefinedOrder = (steps: JobStep[]): JobStep[] => {
    return steps
      .slice() // Create a copy
      .sort((a, b) => {
        const indexA = allStepsOptions.findIndex(
          (option) => option.stepName === a.stepName
        );
        const indexB = allStepsOptions.findIndex(
          (option) => option.stepName === b.stepName
        );
        return indexA - indexB;
      })
      .map((step, index) => ({
        ...step,
        stepNo: index + 1, // Update stepNo to reflect correct order
      }));
  };

  // Then use it in handleSave:
  const handleSave = () => {
    const sortedSteps = sortStepsByPredefinedOrder(selectedSteps);

    // Get all unique machine IDs (single per step, but may have duplicates across steps)
    const allSelectedMachineIds = Object.values(stepMachines);
    const uniqueMachineIds = Array.from(new Set(allSelectedMachineIds));
    const machinesArray = uniqueMachineIds
      .map((machineId) => machines.find((m) => m.id === machineId))
      .filter(Boolean) as Machine[];

    console.log("🔍 AddStepsModal - handleSave:");
    console.log("📋 Sorted steps:", sortedSteps);
    console.log("🏭 Machines array:", machinesArray);
    console.log("🔧 Step-Machine mapping:", stepMachines);

    // 🔥 CRITICAL: Always pass stepMachines as third parameter
    onSelect(sortedSteps, machinesArray, stepMachines);
  };

  const formatStepName = useCallback((stepName: string): string => {
    return stepName
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space before capital letters
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2") // Handle consecutive capitals
      .trim();
  }, []);

  // Memoize step items to prevent unnecessary re-renders
  const StepItem = React.memo<{
    option: { stepName: string; description: string };
    isSelected: boolean;
    availableMachines: Machine[];
    selectedMachineId?: string;
    requiresMachine: boolean;
    onStepToggle: (stepName: string) => void;
    onMachineToggle: (stepName: string, machineId: string) => void;
    isMachineSelected: (stepName: string, machineId: string) => boolean;
    formatStepName: (stepName: string) => string;
  }>(({ 
    option, 
    isSelected, 
    availableMachines, 
    selectedMachineId, 
    requiresMachine,
    onStepToggle,
    onMachineToggle,
    isMachineSelected,
    formatStepName
  }) => {
    const handleCardClick = useCallback((e: React.MouseEvent) => {
      // Don't toggle if clicking on machine selection area or checkbox
      const target = e.target as HTMLElement;
      if (
        target.closest('.machine-selection-area') ||
        target.type === 'checkbox' ||
        target.type === 'radio' ||
        target.closest('input[type="radio"]') ||
        target.closest('input[type="checkbox"]')
      ) {
        return;
      }
      onStepToggle(option.stepName);
    }, [option.stepName, onStepToggle]);

    return (
      <div 
        className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={handleCardClick}
      >
        {/* Step Checkbox */}
        <div className="flex items-center p-2 rounded">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onStepToggle(option.stepName)}
            onClick={(e) => e.stopPropagation()}
            className="form-checkbox h-5 w-5 text-[#00AEEF] border-gray-300 focus:ring-[#00AEEF] rounded"
          />
          <div className="ml-3 flex-1">
            <span className="block text-base font-medium text-gray-800">
              {formatStepName(option.stepName)}
            </span>
            <span className="block text-sm text-gray-500">
              {option.description}
            </span>
            {!requiresMachine && (
              <span className="block text-xs text-green-600 mt-1">
                No machine assignment required
              </span>
            )}
          </div>
        </div>

        {/* Machine Selection - Radio List */}
        {isSelected &&
          requiresMachine &&
          availableMachines.length > 0 && (
            <div className="mt-3 pl-8 machine-selection-area" onClick={(e) => e.stopPropagation()}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Machine (
                {STEP_TO_MACHINE_MAPPING[option.stepName]?.join(" / ")})
              </label>

              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded p-2 bg-gray-50">
                {availableMachines.map((machine) => (
                  <label
                    key={machine.id}
                    className="flex items-center cursor-pointer hover:bg-white p-1 rounded text-sm"
                  >
                    <input
                      type="radio"
                      name={`machine-${option.stepName}`}
                      checked={isMachineSelected(option.stepName, machine.id)}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMachineToggle(option.stepName, machine.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Prevent default scroll behavior
                        const target = e.currentTarget;
                        setTimeout(() => {
                          target.blur();
                        }, 0);
                      }}
                      onFocus={(e) => {
                        // Prevent automatic scrolling to focused element
                        e.currentTarget.blur();
                      }}
                      className="form-radio h-4 w-4 text-[#00AEEF] border-gray-300 focus:ring-[#00AEEF] mr-2"
                    />
                    <span className="text-gray-800">
                      {machine.machineCode} - {machine.description}
                    </span>
                  </label>
                ))}
              </div>

              {/* Selected machine summary */}
              {selectedMachineId && (
                <div className="mt-2 text-xs text-gray-600">
                  Selected:{" "}
                  {availableMachines.find((m) => m.id === selectedMachineId)?.machineCode || "Unknown"}
                </div>
              )}
            </div>
          )}

        {/* Show message if step requires machine but none available */}
        {isSelected &&
          requiresMachine &&
          availableMachines.length === 0 && (
            <div className="mt-3 pl-8 text-sm text-amber-600" onClick={(e) => e.stopPropagation()}>
              No machines available for this step
            </div>
          )}
      </div>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for React.memo - only re-render if relevant props change
    // This prevents unnecessary re-renders that could cause scroll issues
    const propsEqual = 
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.selectedMachineId === nextProps.selectedMachineId &&
      prevProps.requiresMachine === nextProps.requiresMachine &&
      prevProps.availableMachines.length === nextProps.availableMachines.length &&
      prevProps.availableMachines.every((m, i) => 
        nextProps.availableMachines[i]?.id === m.id
      );
    
    // If props are equal, don't re-render (prevents scroll reset)
    return propsEqual;
  });
  StepItem.displayName = 'StepItem';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-transparent bg-opacity-30 backdrop-blur-sm min-h-screen">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-0 flex flex-col items-center">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>

        <div 
          ref={modalContentRef}
          className="w-full px-8 pt-10 pb-8 flex flex-col items-center overflow-y-auto max-h-[85vh]"
        >
          <h2 className="text-2xl font-bold mb-2 text-center text-gray-900">
            Select Steps & Machines
          </h2>
          <p className="text-gray-500 text-center mb-6">
            Select steps and assign a machine for each step:
          </p>

          {loading && <div className="text-center py-4">Loading...</div>}

          {!loading && (
            <div className="w-full space-y-4">
              {allStepsOptions.map((option) => {
                const isSelected = selectedSteps.some(
                  (step) => step.stepName === option.stepName
                );
                const availableMachines = getMachinesForStep(option.stepName);
                const selectedMachineId = stepMachines[option.stepName];
                const requiresMachine = hasMachineRequirement(option.stepName);

                return (
                  <StepItem
                    key={option.stepName}
                    option={option}
                    isSelected={isSelected}
                    availableMachines={availableMachines}
                    selectedMachineId={selectedMachineId}
                    requiresMachine={requiresMachine}
                    onStepToggle={handleStepToggle}
                    onMachineToggle={handleMachineToggle}
                    isMachineSelected={isMachineSelected}
                    formatStepName={formatStepName}
                  />
                );
              })}
            </div>
          )}

          <button
            onClick={handleSave}
            className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition shadow-md mt-6"
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddStepsModal;
