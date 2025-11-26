import React, { useState, useEffect } from "react";
import { User, X, Check } from "lucide-react";
import { type UserData, roleOptions, type UpdateUserPayload } from "./types";

interface EditUserModalProps {
  user: UserData;
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
  });

  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Machine-related state
  const [machines, setMachines] = useState<
    Array<{ id: string; machineCode: string; machineType: string }>
  >([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [userMachinesLoading, setUserMachinesLoading] = useState(false);
  const [originalMachineIds, setOriginalMachineIds] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleToggle = (roleValue: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleValue)
        ? prev.filter((role) => role !== roleValue)
        : [...prev, roleValue]
    );
  };

  const handleMachineToggle = (machineId: string) => {
    setSelectedMachines((prev) =>
      prev.includes(machineId)
        ? prev.filter((id) => id !== machineId)
        : [...prev, machineId]
    );
  };

  // Helper function to categorize machines
  const getMachineCategory = (machineName: string): string => {
    const name = machineName.toLowerCase();

    if (name.includes("printing")) return "Printing";
    if (name.includes("corrugatic")) return "Corrugation";
    if (name.includes("flute lam")) return "Lamination";
    if (name.includes("manual fi") || name.includes("auto flap"))
      return "Pasting";
    if (name.includes("manual pu") || name.includes("auto pund"))
      return "Punching";
    if (name.includes("paper cut")) return "Cutting";
    if (name.includes("thin blade")) return "Cutting";
    if (name.includes("pinning")) return "Finishing";
    if (name.includes("foiling")) return "Finishing";
    if (name.includes("die cut")) return "Cutting";
    if (name.includes("gluing")) return "Assembly";
    if (name.includes("stapling")) return "Assembly";
    if (name.includes("packaging")) return "Packaging";
    if (name.includes("quality")) return "Quality";
    if (name.includes("dispatch")) return "Dispatch";

    return "Other";
  };

  // Helper function to get machine categories allowed for a role
  const getRoleMachineCategories = (role: string): string[] => {
    const roleCategoryMap: Record<string, string[]> = {
      printer: ["Printing"],
      corrugator: ["Corrugation"],
      flutelaminator: ["Lamination"],
      pasting_operator: ["Pasting"],
      punching_operator: ["Punching"],
      paperstore: ["Cutting", "Quality"],
      qc_manager: ["Quality"],
      dispatch_executive: ["Dispatch"],
      production_head: [
        "Printing",
        "Corrugation",
        "Lamination",
        "Pasting",
        "Punching",
        "Cutting",
        "Finishing",
        "Assembly",
        "Packaging",
      ],
      admin: [
        "Printing",
        "Corrugation",
        "Lamination",
        "Pasting",
        "Punching",
        "Cutting",
        "Finishing",
        "Assembly",
        "Packaging",
        "Quality",
        "Dispatch",
      ],
      planner: [
        "Printing",
        "Corrugation",
        "Lamination",
        "Pasting",
        "Punching",
        "Cutting",
        "Finishing",
        "Assembly",
        "Packaging",
        "Quality",
        "Dispatch",
      ],
      flyingsquad: [
        "Printing",
        "Corrugation",
        "Lamination",
        "Pasting",
        "Punching",
        "Cutting",
        "Finishing",
        "Assembly",
        "Packaging",
        "Quality",
        "Dispatch",
      ],
    };

    return roleCategoryMap[role] || [];
  };

  // Get filtered machines based on selected roles
  const getFilteredMachines = () => {
    if (selectedRoles.length === 0) return machines;

    const allowedCategories = new Set<string>();
    selectedRoles.forEach((role) => {
      const categories = getRoleMachineCategories(role);
      categories.forEach((category) => allowedCategories.add(category));
    });

    return machines.filter((machine) => {
      const machineCategory = getMachineCategory(machine.machineType);
      return allowedCategories.has(machineCategory);
    });
  };

  // Fetch all machines
  const fetchMachines = async () => {
    setMachinesLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/machines",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMachines(data.data.filter((machine: any) => machine.isActive));
        }
      }
    } catch (err) {
      console.error("Error fetching machines:", err);
    } finally {
      setMachinesLoading(false);
    }
  };

  // Fetch user's current machine assignments
  const fetchUserMachines = async () => {
    setUserMachinesLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("No access token found");
        return;
      }

      const response = await fetch(
        `https://nrprod.nrcontainers.com/api/machine-assignments/users/${user.id}/machines`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.assignedMachines) {
          const machineIds = data.data.assignedMachines.map(
            (assignment: any) => assignment.machine.id
          );
          setSelectedMachines(machineIds);
          setOriginalMachineIds(machineIds); // Store original assignments for comparison
        }
      }
    } catch (err) {
      console.error("Error fetching user machines:", err);
    } finally {
      setUserMachinesLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchMachines();
    fetchUserMachines();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRoles.length === 0) {
      setError("Please select at least one role");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      // Step 1: Update user data (name, email, roles, password)
      const nameParts = form.name.trim().split(/\s+/);
      const firstName = nameParts.shift() || "";
      const lastName = nameParts.length > 0 ? nameParts.join(" ") : firstName;

      const userPayload: UpdateUserPayload = {
        firstName,
        lastName,
        email: form.email,
        roles: selectedRoles,
        machineId: [], // Empty array since machine assignments are handled separately
      };

      // Only include password if it's been set
      if (password.trim()) {
        userPayload.password = password;
      }

      const userResponse = await fetch(
        `https://nrprod.nrcontainers.com/api/auth/users/${user.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(userPayload),
        }
      );

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        // Handle both 'error' and 'message' fields from backend
        const errorMessage =
          errorData.error || errorData.message || "Failed to update user";
        throw new Error(errorMessage);
      }

      const userResult = await userResponse.json();
      if (!userResult.success) {
        // Handle both 'error' and 'message' fields from backend
        const errorMessage =
          userResult.error || userResult.message || "Failed to update user";
        throw new Error(errorMessage);
      }

      // Step 2: Update machine assignments intelligently
      try {
        // Calculate which machines to remove and which to add
        const machinesToRemove = originalMachineIds.filter(
          (id) => !selectedMachines.includes(id)
        );
        const machinesToAdd = selectedMachines.filter(
          (id) => !originalMachineIds.includes(id)
        );

        console.log("Machine assignment changes:", {
          original: originalMachineIds,
          selected: selectedMachines,
          toRemove: machinesToRemove,
          toAdd: machinesToAdd,
        });

        // Remove machines that are no longer selected
        if (machinesToRemove.length > 0) {
          const removeResponse = await fetch(
            "https://nrprod.nrcontainers.com/api/machine-assignments/users/remove-machines",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                userId: user.id,
                machineIds: machinesToRemove,
              }),
            }
          );

          if (!removeResponse.ok) {
            const errorData = await removeResponse.json();
            throw new Error(
              errorData.message || "Failed to remove machine assignments"
            );
          }

          const removeResult = await removeResponse.json();
          if (!removeResult.success) {
            throw new Error(
              removeResult.message || "Failed to remove machine assignments"
            );
          }

          console.log(`Removed ${machinesToRemove.length} machines`);
        }

        // Add new machines
        if (machinesToAdd.length > 0) {
          const assignResponse = await fetch(
            "https://nrprod.nrcontainers.com/api/machine-assignments/users/assign-machines",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                userId: user.id,
                machineIds: machinesToAdd,
              }),
            }
          );

          if (!assignResponse.ok) {
            const errorData = await assignResponse.json();
            throw new Error(
              errorData.message || "Failed to assign new machines"
            );
          }

          const assignResult = await assignResponse.json();
          if (!assignResult.success) {
            throw new Error(
              assignResult.message || "Failed to assign new machines"
            );
          }

          console.log(`Added ${machinesToAdd.length} machines`);
        }

        console.log("Machine assignments updated successfully");
      } catch (machineError) {
        // If machine assignment fails, show a warning but don't fail the entire operation
        console.error("Machine assignment error:", machineError);
        setError(
          `User updated successfully, but machine assignments failed: ${
            machineError instanceof Error
              ? machineError.message
              : "Unknown error"
          }`
        );
        return; // Don't call onSuccess() if there was a machine assignment error
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-transparent bg-opacity-50 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-0 flex flex-col items-center max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="w-full px-8 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit User</h2>
                {selectedMachines.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {selectedMachines.length} machine
                    {selectedMachines.length !== 1 ? "s" : ""} assigned
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full px-8 py-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {userMachinesLoading && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded text-sm">
              Loading user's current machine assignments...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
                required
              />
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Roles (Multiple)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleToggle(role.value)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedRoles.includes(role.value)
                        ? "bg-[#00AEEF] text-white shadow-lg"
                        : "bg-purple-100 text-gray-700 hover:bg-purple-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{role.label}</span>
                      {selectedRoles.includes(role.value) && (
                        <Check size={16} className="text-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Roles Display */}
              {selectedRoles.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <strong>Selected:</strong> {selectedRoles.join(", ")}
                </div>
              )}
            </div>

            {/* Machine Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Machines (Multiple)
                {selectedRoles.length > 0 && (
                  <span className="ml-2 text-xs text-blue-600">
                    (Filtered by selected roles - {getFilteredMachines().length}{" "}
                    of {machines.length} machines)
                  </span>
                )}
              </label>
              {machinesLoading || userMachinesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00AEEF]"></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                    {getFilteredMachines().length === 0 ? (
                      <div className="col-span-full text-center text-gray-500 text-sm py-4">
                        {selectedRoles.length === 0
                          ? "No machines available"
                          : "No machines available for selected roles"}
                      </div>
                    ) : (
                      getFilteredMachines().map((machine) => (
                        <button
                          key={machine.id}
                          type="button"
                          onClick={() => handleMachineToggle(machine.id)}
                          className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                            selectedMachines.includes(machine.id)
                              ? "bg-[#00AEEF] text-white shadow-lg"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">
                                {machine.machineCode}
                              </div>
                              <div className="text-xs opacity-75">
                                {machine.machineType} •{" "}
                                {getMachineCategory(
                                  machine.machineCode || machine.machineType
                                )}
                              </div>
                            </div>
                            {selectedMachines.includes(machine.id) && (
                              <Check size={16} className="text-white ml-2" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Selected Machines Display */}
                  {selectedMachines.length > 0 && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                      <strong>
                        Selected Machines ({selectedMachines.length}):
                      </strong>{" "}
                      {selectedMachines
                        .map((machineId) => {
                          const machine = machines.find(
                            (m) => m.id === machineId
                          );
                          return machine?.machineCode;
                        })
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (leave blank to keep current)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00AEEF]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to keep current password
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || selectedRoles.length === 0}
              className="w-full bg-[#00AEEF] text-white py-3 rounded-lg font-semibold text-base hover:bg-[#0099cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading && (
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
