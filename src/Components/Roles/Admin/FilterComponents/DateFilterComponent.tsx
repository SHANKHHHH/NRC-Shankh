import React from "react";
import { Calendar, Filter } from "lucide-react";

export type DateFilterType =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

interface DateFilterComponentProps {
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  customDateRange: { start: string; end: string };
  setCustomDateRange: (range: { start: string; end: string }) => void;
  className?: string;
}

const DateFilterComponent: React.FC<DateFilterComponentProps> = ({
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  className = "",
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Filter className="text-gray-500" size={16} />
        <span className="text-sm font-medium text-gray-700">Filter by:</span>
      </div>

      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
      >
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
        <option value="quarter">This Quarter</option>
        <option value="year">This Year</option>
        <option value="custom">Custom Range</option>
      </select>

      {dateFilter === "custom" && (
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-500" size={16} />
            <input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                setCustomDateRange({
                  ...customDateRange,
                  start: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
            />
          </div>
          <span className="text-gray-500">to</span>
          <div className="flex items-center space-x-2">
            <Calendar className="text-gray-500" size={16} />
            <input
              type="date"
              value={customDateRange.end}
              onChange={(e) =>
                setCustomDateRange({ ...customDateRange, end: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-[#00AEEF]"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilterComponent;
