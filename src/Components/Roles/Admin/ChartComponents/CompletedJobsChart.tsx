import React, { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Decimation,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Decimation
);

interface CompletedJob {
  id: number;
  nrcJobNo: string;
  jobPlanId: number;
  jobDemand: string;
  jobDetails: {
    preRate: number;
    latestRate?: number;
    unit?: string;
  };
  purchaseOrderDetails: {
    poDate: string;
    totalPOQuantity: number;
    unit: string;
  };
  allSteps?: any[];
  allStepDetails?: any;
}

interface CompletedJobsChartProps {
  data: CompletedJob[];
  height?: number;
  className?: string;
}

const CompletedJobsChart: React.FC<CompletedJobsChartProps> = ({
  data,
  height = 400,
  className = "",
}) => {
  const [filterType, setFilterType] = useState<
    "all" | "weekly" | "monthly" | "custom"
  >("all");
  const [customDateRange, setCustomDateRange] = useState<{
    start: string;
    end: string;
  }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });
  // Filter data based on filter type and generate date intervals
  const { filteredData, dateIntervals } = useMemo(() => {
    if (filterType === "all") {
      // For "All Time", generate date intervals from all available data
      const allDates = [
        ...new Set(data.map((job) => job.purchaseOrderDetails?.poDate)),
      ].filter(Boolean);
      const sortedDates = allDates.sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime()
      );

      // Generate intervals with reasonable gaps based on date range
      const intervals: string[] = [];
      if (sortedDates.length > 0) {
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Use appropriate gap based on date range
        const gap =
          daysDiff <= 7 ? 1 : daysDiff <= 30 ? 3 : daysDiff <= 90 ? 7 : 14;

        for (let i = 0; i <= daysDiff; i += gap) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          if (date <= endDate) {
            intervals.push(
              date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            );
          }
        }
      }

      return {
        filteredData: data,
        dateIntervals: intervals,
      };
    }

    const now = new Date();
    let startDate: Date;
    let intervals: string[] = [];

    switch (filterType) {
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        // Generate 7 daily intervals
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          intervals.push(
            date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          );
        }
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        // Generate monthly intervals with 5-day gaps
        for (let i = 0; i < 7; i++) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i * 5);
          if (date <= now) {
            intervals.push(
              date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            );
          }
        }
        break;
      case "custom":
        startDate = new Date(customDateRange.start);
        const endDate = new Date(customDateRange.end);
        const daysDiff = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Generate custom intervals with 3-day gaps or daily if range is small
        const gap = daysDiff <= 7 ? 1 : 3;
        for (let i = 0; i <= daysDiff; i += gap) {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + i);
          if (date <= endDate) {
            intervals.push(
              date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            );
          }
        }
        break;
      default:
        return {
          filteredData: data,
          dateIntervals: [],
        };
    }

    const filtered = data.filter((job) => {
      const jobDate = new Date(job.purchaseOrderDetails?.poDate || new Date());
      return jobDate >= startDate;
    });

    return { filteredData: filtered, dateIntervals: intervals };
  }, [data, filterType, customDateRange]);

  // Process and aggregate data by date and unit
  const processedData = useMemo(() => {
    const dateUnitMap = new Map<
      string,
      Map<string, { count: number; jobs: CompletedJob[] }>
    >();

    filteredData.forEach((job) => {
      // Extract unit from jobDetails or try to find it in the actual data structure
      let unit = "Unknown Unit";

      // Use the unit from purchaseOrderDetails as the primary source
      if (job.purchaseOrderDetails?.unit) {
        unit = job.purchaseOrderDetails.unit;
      } else if (job.jobDetails?.unit) {
        unit = job.jobDetails.unit;
      } else {
        // Fallback to job number pattern if no unit is specified
        const jobNo = job.nrcJobNo || "";
        if (jobNo.includes("TOK")) {
          unit = "TOKITA";
        } else if (jobNo.includes("NR")) {
          unit = "NRC";
        } else {
          unit = "General";
        }
      }

      // Extract date from PO details
      const poDate = job.purchaseOrderDetails?.poDate
        ? new Date(job.purchaseOrderDetails.poDate).toLocaleDateString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            }
          )
        : "Unknown Date";

      if (!dateUnitMap.has(poDate)) {
        dateUnitMap.set(poDate, new Map());
      }

      const unitMap = dateUnitMap.get(poDate)!;

      if (unitMap.has(unit)) {
        const existing = unitMap.get(unit)!;
        existing.count += 1;
        existing.jobs.push(job);
      } else {
        unitMap.set(unit, {
          count: 1,
          jobs: [job],
        });
      }
    });

    // Convert to array format for chart display
    const chartData: Array<{
      date: string;
      unit: string;
      count: number;
      jobs: CompletedJob[];
    }> = [];

    dateUnitMap.forEach((unitMap, date) => {
      unitMap.forEach((data, unit) => {
        chartData.push({
          date,
          unit,
          count: data.count,
          jobs: data.jobs,
        });
      });
    });

    // Sort by date and then by unit
    return chartData.sort((a, b) => {
      const dateComparison =
        new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) {
        return dateComparison;
      }
      return a.unit.localeCompare(b.unit);
    });
  }, [filteredData]);

  const chartData = useMemo(() => {
    // Always use generated date intervals for consistent X-axis
    const xAxisLabels =
      dateIntervals.length > 0
        ? dateIntervals
        : // Fallback: generate basic intervals if none available
          ["Jan 1", "Jan 2", "Jan 3", "Jan 4", "Jan 5"];

    // Group data by unit for better visualization
    const unitGroups = new Map<string, { dates: string[]; counts: number[] }>();

    processedData.forEach((item) => {
      if (!unitGroups.has(item.unit)) {
        unitGroups.set(item.unit, { dates: [], counts: [] });
      }
      const group = unitGroups.get(item.unit)!;
      group.dates.push(item.date);
      group.counts.push(item.count);
    });

    // Create datasets for each unit
    const datasets = Array.from(unitGroups.entries()).map(
      ([unit, data], index) => {
        // Create data array matching the x-axis labels
        const unitData = xAxisLabels.map((date) => {
          const matchingData = data.dates.findIndex((d) => d === date);
          return matchingData >= 0 ? data.counts[matchingData] : 0;
        });

        return {
          label: unit,
          data: unitData,
          backgroundColor: [
            "#00AEEF",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#3B82F6",
            "#8B5CF6",
            "#EC4899",
            "#06B6D4",
            "#84CC16",
            "#F97316",
          ][index % 10],
          borderColor: [
            "#0099cc",
            "#059669",
            "#D97706",
            "#DC2626",
            "#2563EB",
            "#7C3AED",
            "#DB2777",
            "#0891B2",
            "#65A30D",
            "#EA580C",
          ][index % 10],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          barThickness: "flex" as const,
          maxBarThickness: 60,
          minBarLength: 4,
        };
      }
    );

    return {
      labels: xAxisLabels,
      datasets,
    };
  }, [processedData, dateIntervals]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            font: {
              size: 12,
              weight: "bold" as const,
            },
            color: "#374151",
            usePointStyle: true,
            pointStyle: "rect",
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleColor: "#ffffff",
          bodyColor: "#ffffff",
          borderColor: "#374151",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (tooltipItems: any[]) => {
              const date = tooltipItems[0].label;
              const unit = tooltipItems[0].dataset.label;
              return [`Date: ${date}`, `Unit: ${unit}`];
            },
            label: (context: any) => {
              const value = context.parsed.y;
              const unit = context.label;
              const date = context.dataset.label;

              // Find the data for this specific unit and date
              const unitData = processedData.find(
                (item) => item.unit === unit && item.date === date
              );

              if (unitData) {
                const totalQuantity = unitData.jobs.reduce(
                  (sum, job) =>
                    sum + (job.purchaseOrderDetails?.totalPOQuantity || 0),
                  0
                );
                const totalValue = unitData.jobs.reduce((sum, job) => {
                  const rate =
                    job.jobDetails?.latestRate ?? job.jobDetails?.preRate ?? 0;
                  const quantity =
                    job.purchaseOrderDetails?.totalPOQuantity || 0;
                  return sum + rate * quantity;
                }, 0);

                return [
                  `Unit: ${unit}`,
                  `Date: ${date}`,
                  `Jobs Count: ${value}`,
                  `Total Quantity: ${totalQuantity.toLocaleString()}`,
                  `Total Value: ₹${totalValue.toLocaleString()}`,
                  `Job Numbers: ${unitData.jobs
                    .map((job) => job.nrcJobNo)
                    .slice(0, 3)
                    .join(", ")}${unitData.jobs.length > 3 ? "..." : ""}`,
                ];
              }
              return `Unit: ${unit}`;
            },
          },
        },
        decimation: {
          enabled: true,
          algorithm: "min-max" as const,
          samples: 50,
        },
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
            drawBorder: false,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 11,
              weight: "normal" as const,
            },
            color: "#374151",
          },
          title: {
            display: true,
            text: "Units",
            font: {
              size: 14,
              weight: "bold" as const,
            },
            color: "#374151",
            padding: { top: 10 },
          },
        },
        y: {
          display: true,
          grid: {
            display: true,
            color: "rgba(0, 0, 0, 0.1)",
            drawBorder: false,
          },
          beginAtZero: true,
          ticks: {
            font: {
              size: 11,
              weight: "normal" as const,
            },
            color: "#374151",
            callback: (value: any) => {
              return value.toString();
            },
          },
          title: {
            display: true,
            text: "PO Date",
            font: {
              size: 14,
              weight: "bold" as const,
            },
            color: "#374151",
            padding: { bottom: 10 },
          },
        },
      },
      elements: {
        bar: {
          backgroundColor: "rgba(0, 0, 0, 0.1)",
          borderWidth: 2,
          borderColor: "rgba(0, 0, 0, 0.2)",
        },
      },
      animation: {
        duration: 1000,
        easing: "easeInOutQuart" as const,
      },
      interaction: {
        intersect: false,
        mode: "index" as const,
      },
    }),
    [processedData]
  );

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalJobs = filteredData.length;
    const totalValue = filteredData.reduce((sum, job) => {
      const rate = job.jobDetails?.latestRate ?? job.jobDetails?.preRate ?? 0;
      const quantity = job.purchaseOrderDetails?.totalPOQuantity || 0;
      return sum + rate * quantity;
    }, 0);
    const avgValuePerJob = totalJobs > 0 ? totalValue / totalJobs : 0;

    // Find the unit with the highest job count
    const unitJobCounts = new Map<string, number>();
    processedData.forEach((item) => {
      unitJobCounts.set(
        item.unit,
        (unitJobCounts.get(item.unit) || 0) + item.count
      );
    });

    const topUnit = Array.from(unitJobCounts.entries()).sort(
      ([, a], [, b]) => b - a
    )[0];

    return {
      totalJobs,
      totalValue,
      avgValuePerJob,
      topUnit: topUnit ? { unit: topUnit[0], count: topUnit[1] } : null,
    };
  }, [filteredData, processedData]);

  if (data.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg shadow-lg p-6 border border-gray-100 ${className}`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">
            Completed Jobs Analysis
          </h3>
        </div>
        <div
          style={{ height: height }}
          className="flex items-center justify-center text-gray-400"
        >
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <div>No completed jobs data available</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border border-gray-100 ${className}`}
    >
      {/* Header with Summary Stats */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Units vs PO Date Analysis -{" "}
          {filterType === "all"
            ? "All Time"
            : filterType === "weekly"
            ? "Last 7 Days"
            : filterType === "monthly"
            ? "This Month"
            : "Custom Range"}
        </h3>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-600">Total Jobs</div>
            <div className="text-lg font-bold text-blue-800">
              {summaryStats.totalJobs}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm font-medium text-green-600">
              Total Value
            </div>
            <div className="text-lg font-bold text-green-800">
              ₹
              {summaryStats.totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <div className="text-sm font-medium text-purple-600">
              Avg Value/Job
            </div>
            <div className="text-lg font-bold text-purple-800">
              ₹
              {summaryStats.avgValuePerJob.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-600">Top Unit</div>
            <div className="text-lg font-bold text-orange-800">
              {summaryStats.topUnit?.unit || "N/A"} (
              {summaryStats.topUnit?.count || 0} jobs)
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">
            Filter by:
          </label>
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(
                e.target.value as "all" | "weekly" | "monthly" | "custom"
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="weekly">Last 7 Days</option>
            <option value="monthly">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {filterType === "custom" && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Custom Range:
            </label>
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange((prev: { start: string; end: string }) => ({
                  ...prev,
                  start: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange((prev: { start: string; end: string }) => ({
                  ...prev,
                  end: e.target.value,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height: height }} className="relative">
        <Bar data={chartData} options={options} />
      </div>

      {/* Data Table */}
      {processedData.length > 0 && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold text-gray-700 mb-3">
            Unit-wise Breakdown by Date
          </h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jobs Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value (₹)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Value/Job (₹)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {processedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      ₹
                      {item.jobs
                        .reduce((sum, job) => {
                          const rate =
                            job.jobDetails?.latestRate ??
                            job.jobDetails?.preRate ??
                            0;
                          const quantity =
                            job.purchaseOrderDetails?.totalPOQuantity || 0;
                          return sum + rate * quantity;
                        }, 0)
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      ₹
                      {(
                        item.jobs.reduce((sum, job) => {
                          const rate =
                            job.jobDetails?.latestRate ??
                            job.jobDetails?.preRate ??
                            0;
                          const quantity =
                            job.purchaseOrderDetails?.totalPOQuantity || 0;
                          return sum + rate * quantity;
                        }, 0) / item.count
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompletedJobsChart;
