// src/Components/Roles/Planner/PODetailsForm.tsx
import React, { useState, useEffect } from "react";
import { type Job, type PoDetailsPayload } from "../Types/job.ts";

interface PODetailsFormProps {
  job: Job;
  onSave: (poDetails: PoDetailsPayload) => Promise<void>;
  onClose: () => void;
  onNext: () => void;
  isReadOnly: boolean;
}

const PODetailsForm: React.FC<PODetailsFormProps> = ({
  job,
  onSave,
  onClose,
  onNext,
  isReadOnly,
}) => {
  const toDateInput = (isoDateString: string | null | undefined) => {
    if (!isoDateString) return "";
    try {
      const date = new Date(isoDateString);
      if (isNaN(date.getTime())) {
        return "";
      }
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const toISOString = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return new Date(dateString + "T00:00:00.000Z").toISOString();
    } catch {
      return null;
    }
  };

  // Simplified state with only the required fields
  const [poData, setPoData] = useState({
    poDate: toDateInput(job.poDate) || new Date().toISOString().split("T")[0], // Default to today
    poNumber: job.poNumber || "",
    deliveryDate: toDateInput(job.deliveryDate) || "",
    totalPOQuantity: job.totalPOQuantity || 0,
    unit: job.unit || "", // This maps to "Location" in UI
    noOfUps: Number(job.noUps) || 1, // For calculation
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-calculate Number of Sheets
  const calculatedNoOfSheets =
    poData.totalPOQuantity > 0 && poData.noOfUps > 0
      ? Math.ceil(poData.totalPOQuantity / poData.noOfUps)
      : 0;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (isReadOnly) {
      console.log(
        "[PODetailsForm] Read-only mode - change prevented for field:",
        e.target.name,
      );
      return;
    }
    const { name, value, type } = e.target;
    setPoData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }));
    console.log("[PODetailsForm] Field changed:", name, "New value:", value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.group("[PODetailsForm] Form submission started");

    if (isReadOnly) {
      console.log("[PODetailsForm] Read-only mode - submission prevented");
      console.groupEnd();
      return;
    }

    console.log("[PODetailsForm] Current form data:", poData);
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    const requiredFields = [
      "poDate",
      "poNumber",
      "deliveryDate",
      "totalPOQuantity",
      "unit",
    ];
    const missingFields = requiredFields.filter((field) => {
      const value = poData[field as keyof typeof poData];
      return (
        value === null ||
        value === "" ||
        (typeof value === "number" && value === 0)
      );
    });

    if (missingFields.length > 0) {
      const errorMsg = `Please fill all required fields: ${missingFields.map((f) => f.replace(/([A-Z])/g, " $1").trim()).join(", ")}.`;
      console.error(
        "[PODetailsForm] Validation failed - missing fields:",
        missingFields,
      );
      setError(errorMsg);
      setIsSubmitting(false);
      console.groupEnd();
      return;
    }

    try {
      console.log("[PODetailsForm] Preparing payload...");

      // Create the full payload with all required backend fields
      const payload: PoDetailsPayload = {
        jobNrcJobNo: job.nrcJobNo,
        boardSize: job.boxDimensions || "",
        customer: job.customerName || "",
        deliveryDate: toISOString(poData.deliveryDate) as string,
        dieCode: job.diePunchCode || 0,
        dispatchDate: toISOString(poData.poDate) as string, // Use PO date as dispatch date
        dispatchQuantity: poData.totalPOQuantity, // Use total quantity as dispatch quantity
        fluteType: job.fluteType || "",
        jockeyMonth: new Date().toLocaleDateString("en-US", { month: "long" }),
        noOfUps: poData.noOfUps,
        nrcDeliveryDate: toISOString(poData.deliveryDate) as string, // Use delivery date
        noOfSheets: calculatedNoOfSheets,
        poDate: toISOString(poData.poDate) as string,
        poNumber: poData.poNumber,
        pendingQuantity: 0, // Set to 0 as it's not in the simplified form
        pendingValidity: 30, // Default value
        plant: "Plant A", // Default value
        shadeCardApprovalDate:
          job.shadeCardApprovalDate || new Date().toISOString(),
        srNo: job.srNo || 1,
        style: job.styleItemSKU || "",
        totalPOQuantity: poData.totalPOQuantity,
        unit: poData.unit,
      };

      console.log("[PODetailsForm] Final payload:", payload);
      console.log("[PODetailsForm] Calling onSave callback...");

      await onSave(payload);

      console.log("[PODetailsForm] Save successful, proceeding to next step");
      onNext();
    } catch (err) {
      const errorMsg = `Failed to save P.O. details: ${err instanceof Error ? err.message : "Unknown error"}`;
      console.error("[PODetailsForm] Submission error:", err);
      setError(errorMsg);
    } finally {
      console.log("[PODetailsForm] Submission process completed");
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

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
          P.O. Details
        </h2>
        <p className="text-gray-500 text-center mb-6">
          Please fill in the Purchase Order details for Job: {job.nrcJobNo}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm mb-4">
              {error}
            </div>
          )}

          {/* PO Date */}
          <div>
            <label
              htmlFor="poDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              PO Date
            </label>
            <input
              type="date"
              id="poDate"
              name="poDate"
              value={poData.poDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* PO Number */}
          <div>
            <label
              htmlFor="poNumber"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              PO Number
            </label>
            <input
              type="text"
              id="poNumber"
              name="poNumber"
              value={poData.poNumber}
              onChange={handleChange}
              placeholder="#"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Delivery Date */}
          <div>
            <label
              htmlFor="deliveryDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Delivery Date
            </label>
            <input
              type="date"
              id="deliveryDate"
              name="deliveryDate"
              value={poData.deliveryDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Total PO Quantity */}
          <div>
            <label
              htmlFor="totalPOQuantity"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Total PO Quantity
            </label>
            <input
              type="number"
              id="totalPOQuantity"
              name="totalPOQuantity"
              value={poData.totalPOQuantity === 0 ? "" : poData.totalPOQuantity}
              onFocus={(e) => {
                if (e.target.value === "0") {
                  e.target.value = "";
                }
              }}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Location (maps to unit) */}
          <div>
            <label
              htmlFor="unit"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              type="text"
              id="unit"
              name="unit"
              value={poData.unit}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF] disabled:bg-gray-50 disabled:cursor-not-allowed"
              required
              disabled={isReadOnly}
            />
          </div>

          {/* Number of Sheets (Auto-calculated) */}
          <div>
            <label
              htmlFor="noOfSheets"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Number of Sheets (Calculated)
            </label>
            <input
              type="text"
              id="noOfSheets"
              name="noOfSheets"
              value={`Auto-calculated: ${calculatedNoOfSheets} sheets`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
              disabled={true}
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1">
              Formula: Total PO Quantity ÷ No. of Ups = {poData.totalPOQuantity}{" "}
              ÷ {poData.noOfUps} = {calculatedNoOfSheets}
            </p>
          </div>

          {/* Hidden field for noOfUps to preserve the calculation */}
          <input type="hidden" name="noOfUps" value={poData.noOfUps} />

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
            {isSubmitting ? "Saving..." : "Save & Next"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PODetailsForm;
