import React, { useState, useMemo } from "react";

// interface MachineStats {
//   total: number;
//   available: number;
//   inUse: number;
// }

interface MachineDetails {
  id: string;
  machineCode: string;
  machineType: string;
  description: string;
  status: string;
  capacity: number;
  unit: string;
  totalQuantityProduced?: number;
  jobs: Array<{
    id?: number;
    jobPlanId?: number | null;
    jobPlanCode?: string | null;
    nrcJobNo: string;
    customerName: string | null;
    status: string | null;
    workedSteps?: Array<{
      jobStepId: number | null;
      stepName: string;
      stepStatus: string | null;
      quantityProduced: number;
      workedAt: string | null;
      startDate: string | null;
      endDate: string | null;
    }>;
  }>;
}

interface MachineUtilizationDashboardProps {
  machineData: {
    machineStats: Record<
      string,
      { total: number; available: number; inUse: number }
    >;
    machineDetails: MachineDetails[];
  };
  className?: string;
}
const MachineUtilizationDashboard: React.FC<
  MachineUtilizationDashboardProps
> = ({ machineData, className = "" }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);

  // Process and sort data
  // Process and sort data
  const processedData = useMemo(() => {
    return Object.entries(machineData.machineStats)
      .map(([machineType, stats]) => ({
        originalMachine: machineType,
        machine: machineType.replace(/Machine$/, "").trim(),
        ...stats,
        utilizationRate:
          stats.total > 0 ? Math.round((stats.inUse / stats.total) * 100) : 0,
        availabilityRate:
          stats.total > 0
            ? Math.round((stats.available / stats.total) * 100)
            : 0,
        category: getMachineCategory(machineType),
      }))
      .sort((a, b) => b.utilizationRate - a.utilizationRate);
  }, [machineData.machineStats]);

  // Group machines by category
  const categorizedMachines = useMemo(() => {
    const grouped = machineData.machineDetails.reduce((acc, machine) => {
      const category = getMachineCategory(machine.machineType);
      if (!acc[category]) {
        acc[category] = [];
      }

      // Calculate utilization for individual machine
      const utilizationRate =
        machine.capacity > 0
          ? Math.round(((machine.jobs?.length || 0) / machine.capacity) * 100)
          : 0;

      acc[category].push({
        ...machine,
        category,
        utilizationRate,
        // Map status to our standard format
        available: machine.status.toLowerCase() === "available" ? 1 : 0,
        inUse: ["busy", "in_use", "occupied"].includes(
          machine.status.toLowerCase()
        )
          ? 1
          : 0,
        total: 1,
      });

      return acc;
    }, {} as Record<string, any[]>);

    return grouped;
  }, [machineData.machineDetails]);

  // Calculate category stats
  const categoryStats = useMemo(() => {
    const categoryOrder = [
      "Printing",
      "Corrugation",
      "Lamination",
      "Punching",
      "Pasting",
      "Other",
    ];
    return Object.entries(categorizedMachines)
      .map(([category, machines]) => {
        const totalMachines = machines.length;
        const totalCapacity = machines.reduce((sum, m) => sum + m.total, 0);
        const totalInUse = machines.reduce((sum, m) => sum + m.inUse, 0);
        const totalAvailable = machines.reduce(
          (sum, m) => sum + m.available,
          0
        );
        const totalProducedQty = machines.reduce(
          (sum, m) => sum + Number(m.totalQuantityProduced ?? 0),
          0
        );
        const avgUtilization =
          totalCapacity > 0
            ? Math.round((totalInUse / totalCapacity) * 100)
            : 0;

        return {
          category,
          totalMachines,
          totalProducedQty,
          totalCapacity,
          totalInUse,
          totalAvailable,
          avgUtilization,
          machines,
        };
      })
      .sort((a, b) => {
        const ai = categoryOrder.indexOf(a.category);
        const bi = categoryOrder.indexOf(b.category);
        const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        if (aRank !== bRank) return aRank - bRank;
        return a.category.localeCompare(b.category);
      });
  }, [categorizedMachines]);

  // Update getMachineCategory to align with new machine type naming
  function getMachineCategory(machineName: string): string {
    const name = machineName.toLowerCase();

    // Printing machines
    if (
      name.includes("printing") ||
      name.includes("heidelber") ||
      name.includes("lithrone")
    ) {
      return "Printing";
    }

    // Corrugation machines
    if (name.includes("corrugation") || name.includes("corrugator")) {
      return "Corrugation";
    }

    // Lamination / Flute laminator machines
    if (name.includes("flute laminator") || name.includes("lamination")) {
      return "Lamination";
    }

    // Pasting / flap pasting machines
    if (
      name.includes("flap pasting") ||
      name.includes("pasting") ||
      name.includes("side flap")
    ) {
      return "Pasting";
    }

    // Punching / die cutting machines
    if (
      name.includes("punching") ||
      name.includes("die cutting") ||
      name.includes("die-cutting")
    ) {
      return "Punching";
    }

    // Processing / QC / Dispatch
    if (name.includes("quality") || name.includes("dispatch")) {
      return "Processing";
    }

    return "Other";
  }

  // Get status color based on utilization rate
  function getStatusColor(utilizationRate: number): string {
    if (utilizationRate >= 80) return "#ef4444"; // High utilization - Red
    if (utilizationRate >= 50) return "#f59e0b"; // Medium utilization - Orange
    if (utilizationRate >= 20) return "#10b981"; // Low utilization - Green
    return "#6b7280"; // No utilization - Gray
  }

  function getCategoryColor(category: string): string {
    const colors = {
      Printing: "#3B82F6", // Blue
      Corrugation: "#10B981", // Green
      Pasting: "#F59E0B", // Orange
      Lamination: "#8B5CF6", // Purple
      Punching: "#EF4444", // Red
      Processing: "#6B7280", // Gray
      Other: "#374151", // Dark Gray
    };
    return colors[category as keyof typeof colors] || colors.Other;
  }
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalMachines = processedData.reduce(
      (sum, item) => sum + item.total,
      0
    );
    const totalQtyProduced = machineData.machineDetails.reduce(
      (sum, m) => sum + Number((m as any).totalQuantityProduced ?? 0),
      0
    );

    return {
      totalMachines,
      totalQtyProduced,
      categories: [...new Set(processedData.map((item) => item.category))]
        .length,
    };
  }, [processedData, machineData.machineDetails]);

  console.log("categorized machine", categorizedMachines);
  return (
    <div
      className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Machine Utilization Dashboard
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Real-time machine availability and usage statistics
            </p>
          </div>

        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.totalMachines}
            </div>
            <div className="text-sm text-blue-800">Total Machines</div>
          </div>
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-emerald-700">
              {summaryStats.totalQtyProduced.toLocaleString()}
            </div>
            <div className="text-sm text-emerald-800">Total Qty Produced</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">
              {summaryStats.categories}
            </div>
            <div className="text-sm text-gray-800">Categories</div>
          </div>
        </div>
      </div>

      {/* Content based on view type */}
      <div className="p-6">
        <>
          {!selectedCategory ? (
              // Category Cards View - Show categories, not individual machines
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Machine Categories
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {categoryStats.map((categoryData) => (
                      <div
                        key={categoryData.category}
                        onClick={() =>
                          setSelectedCategory(categoryData.category)
                        }
                        className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300"
                        style={{
                          borderColor:
                            getCategoryColor(categoryData.category) + "40",
                        }}
                      >
                        <div className="text-center">
                          <div
                            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg mb-3"
                            style={{
                              backgroundColor: getCategoryColor(
                                categoryData.category
                              ),
                            }}
                          >
                            {categoryData.totalMachines}
                          </div>
                          <h3 className="font-semibold text-gray-900 text-sm mb-2">
                            {categoryData.category}
                          </h3>
                          <div className="space-y-1 text-xs">
                            <div className="text-gray-600">
                              Total Machines: {categoryData.totalMachines}
                            </div>
                            <div className="text-emerald-700 font-semibold">
                              Produced Qty:{" "}
                              {Number(
                                categoryData.totalProducedQty ?? 0
                              ).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
          ) : (
              // Individual Machines in Selected Category - Show machines when category is selected
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="flex items-center text-blue-600 hover:text-blue-800 font-medium mb-2"
                    >
                      ← Back to Categories
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedCategory} Machines (
                      {categorizedMachines[selectedCategory]?.length || 0}{" "}
                      total)
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {categorizedMachines[selectedCategory]?.map(
                    (machine, index) => (
                      <div
                        key={`${machine.originalMachine}-${index}`}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedMachine(machine)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">
                              {machine.machineCode ||
                                machine.originalMachine ||
                                machine.description}
                            </h3>
                            <span
                              className="inline-block px-2 py-1 text-white text-xs rounded mt-1"
                              style={{
                                backgroundColor: getCategoryColor(
                                  machine.category
                                ),
                              }}
                            >
                              {machine.category}
                            </span>
                          </div>
                          {/* <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: getStatusColor(machine.utilizationRate) }}
                >
                  {machine.utilizationRate}%
                </div> */}
                        </div>

                        <div className="mt-4 p-2.5 bg-emerald-50 border border-emerald-100 rounded-md">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-emerald-700">
                              Produced Qty
                            </span>
                            <span className="text-sm font-semibold text-emerald-800">
                              {Number(machine.totalQuantityProduced ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </>
          )}
        </>
      </div>

      {selectedMachine && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedMachine.machineCode} - Jobs Worked
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedMachine.machineType} | {selectedMachine.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMachine(null)}
                className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(85vh-72px)]">
              <div className="mb-4 text-sm text-gray-700">
                Total Produced:{" "}
                <span className="font-semibold text-emerald-700">
                  {Number(selectedMachine.totalQuantityProduced ?? 0).toLocaleString()}
                </span>
              </div>

              {selectedMachine.jobs?.length ? (
                <div className="space-y-3">
                  {selectedMachine.jobs.map((job: any) => (
                    <div key={`${job.jobPlanId ?? "na"}-${job.nrcJobNo}`} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-800">
                            {job.jobPlanCode ?? job.jobPlanId ?? "Plan"} | {job.nrcJobNo}
                          </p>
                          <p className="text-xs text-gray-600">
                            {job.customerName ?? "N/A"} | {job.status ?? "N/A"}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          Steps: {job.workedSteps?.length ?? 0}
                        </span>
                      </div>

                      {job.workedSteps?.length ? (
                        <div className="mt-3 space-y-2">
                          {job.workedSteps.slice(0, 25).map((s: any) => (
                            <div
                              key={`${job.nrcJobNo}-${s.jobStepId}-${s.stepName}-${s.workedAt ?? ""}`}
                              className="text-xs text-gray-700 bg-gray-50 border rounded px-2 py-1.5 flex flex-wrap items-center gap-3"
                            >
                              <span className="font-medium">{s.stepName}</span>
                              <span>Status: {s.stepStatus ?? "N/A"}</span>
                              <span>Qty: {Number(s.quantityProduced ?? 0).toLocaleString()}</span>
                              <span>
                                Date:{" "}
                                {s.workedAt
                                  ? new Date(s.workedAt).toLocaleDateString()
                                  : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No jobs found for this machine in selected period.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineUtilizationDashboard;
