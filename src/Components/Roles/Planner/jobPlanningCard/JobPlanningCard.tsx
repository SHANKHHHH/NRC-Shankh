// src/Components/Roles/Planner/JobPlanningCard.tsx
import React from "react";
import { type JobPlan } from "../Types/job.ts"; // Adjust path as needed
import {
  LuClipboardList,
  LuTruck,
  LuCalendarDays,
  LuTrendingUp,
} from "react-icons/lu"; // Using lucide-react for icons

interface JobPlanningCardProps {
  jobPlan: JobPlan;
  onClick: (jobPlan: JobPlan) => void; // This is for the "View Complete Details" button
  onCardClick: (jobPlan: JobPlan) => void; // NEW: For clicking the card itself
}

const JobPlanningCard: React.FC<JobPlanningCardProps> = ({
  jobPlan,
  onClick,
  onCardClick,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  return (
    <div
      className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between h-full cursor-pointer" // Added cursor-pointer
      onClick={() => onCardClick(jobPlan)} // ADDED: Card click navigates to steps view
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
        WORK ASSIGNMENT SUMMARY
      </h3>

      <div className="space-y-3 mb-4">
        <div className="flex items-center bg-blue-50 p-3 rounded-md">
          <LuClipboardList className="text-blue-600 text-xl mr-3" />
          <div className="flex flex-col">
            <p className="text-sm text-gray-600">Job Plan ID</p>
            <p className="font-medium text-gray-900">{jobPlan.jobPlanId}</p>
          </div>
        </div>

        <div className="flex items-center bg-green-50 p-3 rounded-md">
          <LuTruck className="text-green-600 text-xl mr-3" />
          <div className="flex flex-col">
            <p className="text-sm text-gray-600">NRC Job No</p>
            <p className="font-medium text-gray-900">{jobPlan.nrcJobNo}</p>
          </div>
        </div>

        <div
          className={`flex items-center p-3 rounded-md ${
            jobPlan.jobDemand === "high"
              ? "bg-red-200"
              : jobPlan.jobDemand === "medium"
              ? "bg-purple-50"
              : "bg-purple-50"
          }`}
        >
          <LuTrendingUp
            className={`text-xl mr-3 ${
              jobPlan.jobDemand === "high" ? "text-black" : "text-purple-600"
            }`}
          />
          <div className="flex flex-col">
            <p
              className={`text-sm ${
                jobPlan.jobDemand === "high" ? "text-black" : "text-gray-600"
              }`}
            >
              Job Demand
            </p>
            <p
              className={`font-medium capitalize ${
                jobPlan.jobDemand === "high"
                  ? "text-black font-bold"
                  : "text-gray-900"
              }`}
            >
              {jobPlan.jobDemand === "high"
                ? "Urgent"
                : jobPlan.jobDemand === "medium"
                ? "Regular"
                : jobPlan.jobDemand || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-yellow-50 p-3 rounded-md">
          <LuCalendarDays className="text-yellow-600 text-xl mr-3" />
          <div className="flex flex-col">
            <p className="text-sm text-gray-600">Created At</p>
            <p className="font-medium text-gray-900">
              {formatDate(jobPlan.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <button
        className="w-full bg-[#00AEEF] text-white py-2 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer shadow-md"
        onClick={(e) => {
          e.stopPropagation(); // Prevent card's onClick from firing
          onClick(jobPlan); // This now only handles the button click
        }}
      >
        View Complete Details
      </button>
    </div>
  );
};

export default JobPlanningCard;
