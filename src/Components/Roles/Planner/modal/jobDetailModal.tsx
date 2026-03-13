import React, { useEffect, useState, useRef } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { type Job } from "../Types/job";

// interface Job {
//   id: number;
//   customerName: string;
//   styleItemSKU: string;
//   nrcJobNo: string;
//   fluteType: string | null;
//   status: string;
//   latestRate: number | null;
//   preRate: number | null;
//   length: number | null;
//   width: number | null;
//   height: number | null;
//   boxDimensions: string | null;
//   diePunchCode: string | null;
//   boardCategory: string | null;
//   noOfColor: number | null;
//   processColors: string | null;
//   specialColor1: string | null;
//   specialColor2: string | null;
//   specialColor3: string | null;
//   specialColor4: string | null;
//   overPrintFinishing: string | null;
//   topFaceGSM: number | null;
//   flutingGSM: number | null;
//   bottomLinerGSM: number | null;
//   decalBoardX: number | null;
//   lengthBoardY: number | null;
//   boardSize: string | null;
//   noUps: number | null;
//   artworkReceivedDate: string | null;
//   artworkApprovedDate: string | null;
//   shadeCardApprovalDate: string | null;
//   srNo: string | null;
//   jobDemand: string | null;
//   createdAt: string;
//   updatedAt: string;
//   imageURL?: string;
// }

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onContinueJob: (nrcJobNo: string) => Promise<void>;
  onJobUpdate: (updatedJob: Job) => void; // NEW: Callback for optimistic updates
}

const JobDetailModal: React.FC<JobDetailModalProps> = ({
  job,
  onClose,
  onContinueJob,
  onJobUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedJob, setEditedJob] = useState<Job>({ ...job });
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Image upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    job.imageURL || null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Keep modal state in sync when parent passes updated job (e.g. after save or continue)
  useEffect(() => {
    setEditedJob({ ...job });
    setImagePreview(job.imageURL || null);
  }, [job.id, job.nrcJobNo, job.status, job.updatedAt, job.imageURL]);

  // Helper to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Helper to format date for input
  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof Job,
    value: string | number | null
  ) => {
    setEditedJob((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Image upload helper functions
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      alert("Please select a valid image file (JPEG, PNG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      alert("File size must be less than 5MB");
      return;
    }

    try {
      setImageFile(file);

      // Convert to Base64 for storage
      const base64String = await convertToBase64(file);

      console.log("Image converted to Base64, length:", base64String.length);

      // Set preview to Base64 string (consistent with what we store)
      console.log("Setting imagePreview to Base64 string");
      setImagePreview(base64String);

      // Update the edited job with the Base64 string
      setEditedJob((prev) => {
        console.log(
          "Updating editedJob with new imageURL:",
          base64String.substring(0, 50) + "..."
        );
        return {
          ...prev,
          imageURL: base64String,
        };
      });
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Failed to process image. Please try again.");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const removeImage = () => {
    // Clear any blob URLs to prevent memory leaks
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    setImageFile(null);
    setImagePreview(null);
    setEditedJob((prev) => ({
      ...prev,
      imageURL: null,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Cleanup effect to prevent memory leaks from blob URLs
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // Debug effect to track imagePreview changes
  useEffect(() => {
    console.log(
      "imagePreview changed:",
      imagePreview ? "Has image" : "No image"
    );
    if (imagePreview) {
      console.log(
        "imagePreview type:",
        imagePreview.startsWith("data:") ? "Base64" : "Blob URL"
      );
    }
  }, [imagePreview]);

  // Save changes with optimistic updates
  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Store original job for rollback on error
    const originalJob = { ...job };

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please log in.");
      }

      // Prepare the update payload - only include changed fields
      const updatePayload: Record<string, any> = {};

      // Compare each field and only include changed ones
      Object.keys(editedJob).forEach((key) => {
        const jobKey = key as keyof Job;
        if (editedJob[jobKey] !== job[jobKey]) {
          updatePayload[jobKey] = editedJob[jobKey];
        }
      });

      console.log("=== SAVE DEBUG INFO ===");
      console.log("Original job:", job);
      console.log("Edited job:", editedJob);
      console.log("Update payload:", updatePayload);
      console.log("Payload as JSON:", JSON.stringify(updatePayload));
      console.log("======================");

      // If no changes, just exit edit mode
      if (Object.keys(updatePayload).length === 0) {
        setIsEditing(false);
        setSaveMessage("No changes to save");
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      // 🎯 OPTIMISTIC UPDATE: Immediately update parent with new data
      console.log("✅ Optimistic update: Updating UI with new data");
      onJobUpdate(editedJob);

      // Exit edit mode and show saving message
      setIsEditing(false);
      setSaveMessage("Saving changes...");

      // URL encode the job number for the API endpoint
      const encodedJobNo = encodeURIComponent(job.nrcJobNo);

      console.log("Sending update payload to API:", updatePayload);

      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/jobs/${encodedJobNo}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("=== API ERROR RESPONSE ===");
        console.error("Status:", response.status, response.statusText);
        console.error("Error data:", errorData);
        console.error("========================");
        throw new Error(
          errorData.message ||
            `Failed to update job: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();
      if (result.success) {
        // Use the PUT response as source of truth; do not follow up with GET,
        // as GET can return cached/stale data and overwrite the correct update.
        if (result.data && typeof result.data === "object") {
          onJobUpdate(result.data);
          setEditedJob(result.data);
        }

        setSaveMessage("Job details updated successfully!");

        // Keep modal open to show success message briefly
        setTimeout(() => {
          setSaveMessage(null);
        }, 2000);
      } else {
        throw new Error(result.message || "Failed to update job details.");
      }
    } catch (error) {
      console.error("❌ Save failed, reverting changes:", error);

      // ❌ ROLLBACK: Revert to original data on error
      onJobUpdate(originalJob);
      setEditedJob(originalJob);

      setSaveMessage(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );

      // Auto-clear error message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedJob({ ...job }); // Reset to original values
    setIsEditing(false);
    setSaveMessage(null);
  };

  // Continue job handler
  const handleContinueClick = async () => {
    setIsUpdating(true);
    try {
      await onContinueJob(job.nrcJobNo);
      onClose();
    } catch (error) {
      console.error("Failed to continue job from modal:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Render field - editable or read-only
  const renderField = (
    label: string,
    field: keyof Job,
    type: "text" | "number" | "date" = "text"
  ) => {
    const value = isEditing ? editedJob[field] : job[field];

    // Handle complex types that can't be edited directly in inputs
    const isComplexType =
      Array.isArray(value) || (typeof value === "object" && value !== null);

    return (
      <div className="flex flex-col mb-3">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        {isEditing && !isComplexType ? (
          <input
            type={type}
            value={
              type === "date"
                ? formatDateForInput(value as string)
                : value || ""
            }
            onChange={(e) => {
              let newValue: string | number | null = e.target.value;

              if (type === "number") {
                newValue = newValue === "" ? null : Number(newValue);
              } else if (type === "date") {
                newValue =
                  newValue === "" ? null : new Date(newValue).toISOString();
              } else {
                newValue = newValue === "" ? null : newValue;
              }

              handleInputChange(field, newValue);
            }}
            className="text-gray-800 bg-white p-2 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        ) : (
          <div className="text-gray-800 bg-gray-50 p-2 rounded-md border border-gray-200">
            {/* Handle display for different field types */}
            {isComplexType ? (
              <div>
                {Array.isArray(value) ? (
                  <div>
                    {field === "jobSteps" ? (
                      // Special handling for jobSteps array
                      <div className="space-y-2">
                        {(value as any[]).length > 0 ? (
                          (value as any[]).map((step: any, index: number) => (
                            <div
                              key={index}
                              className="text-sm bg-white p-2 border rounded"
                            >
                              <span className="font-medium">
                                {step.stepNo}. {step.stepName}
                              </span>
                              {step.machineDetails &&
                                step.machineDetails.length > 0 && (
                                  <div className="text-xs text-gray-600 mt-1">
                                    Machine:{" "}
                                    {step.machineDetails[0].machineCode ||
                                      "Not Assigned"}
                                  </div>
                                )}
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-400">
                            No steps defined
                          </span>
                        )}
                      </div>
                    ) : (
                      // Generic array display
                      <span className="text-gray-600">
                        Array with {value.length} item
                        {value.length !== 1 ? "s" : ""}
                        {isEditing && " (Cannot edit complex data)"}
                      </span>
                    )}
                  </div>
                ) : (
                  // Handle other object types
                  <span className="text-gray-600">
                    Complex data {isEditing && "(Cannot edit)"}
                  </span>
                )}
              </div>
            ) : // Handle simple types
            type === "date" && value ? (
              formatDate(value as string)
            ) : value !== null && value !== "" ? (
              value
            ) : (
              "N/A"
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-transparent bg-opacity-30 backdrop-blur-sm min-h-screen"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          console.log("Backdrop clicked - calling onClose");
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl mx-2 sm:mx-auto bg-white rounded-2xl shadow-2xl flex flex-col items-center">
        {/* Close button */}
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Close button clicked - calling onClose");
            onClose();
          }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-full max-w-2xl px-8 pt-10 pb-8 flex flex-col items-center overflow-y-auto max-h-[85vh]">
          {/* Modal Header */}
          <div className="flex justify-between items-center w-full mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Job Details: {job.nrcJobNo}
              </h2>

              <p className="text-gray-500">
                {isEditing
                  ? "Edit job order details"
                  : "Detailed information for this job order."}
              </p>
            </div>

            {/* Edit/Save/Cancel buttons */}
            <div className="flex space-x-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center"
                  >
                    {isSaving && (
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
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
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div
              className={`w-full mb-4 px-4 py-3 rounded-lg text-sm ${
                saveMessage.includes("Error") || saveMessage.includes("Failed")
                  ? "bg-red-100 border border-red-400 text-red-700"
                  : saveMessage.includes("No changes")
                  ? "bg-yellow-100 border border-yellow-400 text-yellow-700"
                  : "bg-green-100 border border-green-400 text-green-700"
              }`}
            >
              {saveMessage}
            </div>
          )}

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 w-full">
            {renderField("Customer Name", "customerName")}
            {renderField("Style Item SKU", "styleItemSKU")}
            {renderField("NRC Job No", "nrcJobNo")}
            {renderField("Flute Type", "fluteType")}
            {renderField("Status", "status")}
            {renderField("Latest Rate", "latestRate", "number")}
            {renderField("Pre Rate", "preRate", "number")}
            {renderField("Length", "length", "number")}
            {renderField("Width", "width", "number")}
            {renderField("Height", "height", "number")}
            {renderField("Box Dimensions", "boxDimensions")}
            {renderField("Die Punch Code", "diePunchCode", "number")}
            {renderField("Board Category", "boardCategory")}
            {renderField("Number of Colors", "noOfColor")}
            {renderField("Process Colors", "processColors")}
            {renderField("Special Color 1", "specialColor1")}
            {renderField("Special Color 2", "specialColor2")}
            {renderField("Special Color 3", "specialColor3")}
            {renderField("Special Color 4", "specialColor4")}
            {renderField("Over Print Finishing", "overPrintFinishing")}
            {renderField("Top Face GSM", "topFaceGSM")}
            {renderField("Fluting GSM", "flutingGSM")}
            {renderField("Bottom Liner GSM", "bottomLinerGSM")}
            {renderField("Decal Board X", "decalBoardX")}
            {renderField("Length Board Y", "lengthBoardY")}
            {renderField("Board Size", "boardSize")}
            {renderField("No Ups", "noUps")}
            {renderField(
              "Artwork Received Date",
              "artworkReceivedDate",
              "date"
            )}
            {renderField(
              "Artwork Approved Date",
              "artworkApprovedDate",
              "date"
            )}
            {renderField(
              "Shade Card Approval Date",
              "shadeCardApprovalDate",
              "date"
            )}
            {renderField("SR No", "srNo")}
            {renderField("Job Demand", "jobDemand")}
          </div>

          {/* Artwork Image Upload */}
          <div className="mt-6 w-full">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Artwork Image
            </h3>

            {isEditing ? (
              <div className="space-y-2">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />

                {!imagePreview ? (
                  /* Upload Area */
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                  >
                    <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, GIF, or WebP (Max 5MB)
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Choose File
                    </button>
                  </div>
                ) : (
                  /* Image Preview */
                  <div className="border-2 border-gray-300 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {imageFile?.name || "Current Image"}
                        </p>
                        {imageFile && (
                          <p className="text-xs text-gray-500">
                            {(imageFile.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={removeImage}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-auto max-h-64 object-contain rounded-md"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 italic">
                  Image will be automatically converted to Base64 format for
                  storage
                </p>
              </div>
            ) : /* Display Mode */
            job.imageURL ? (
              <img
                src={job.imageURL}
                alt="Artwork"
                className="w-full h-auto max-h-64 object-contain rounded-md border border-gray-200"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = `https://placehold.co/150x150/cccccc/000000?text=No+Image`;
                }}
              />
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">No image uploaded</p>
              </div>
            )}
          </div>

          {/* Action Button - Only show if not editing */}
          {!isEditing && (
            <div className="w-full mt-8">
              {job.status === "ACTIVE" ? (
                <button
                  className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer shadow-md"
                  disabled
                >
                  This Job is Active
                </button>
              ) : (
                <button
                  className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition hover:cursor-pointer shadow-md"
                  onClick={handleContinueClick}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating Status..." : "Continue with this job"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailModal;
