import React, { useState, useEffect } from "react";
import { Search, User, Edit3, Trash2, Eye } from "lucide-react";
import UserDetailsModal from "./UserDetailsModal";
import EditUserModal from "./EditUserModal";
import DeleteWarningModal from "./DeleteWarningModal";
import { type UserData, getRoleDisplayName, formatDate } from "./types";

interface UserDetailsPageProps {
  onClose: () => void;
}

const UserDetailsPage: React.FC<UserDetailsPageProps> = ({ onClose }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);

  // Fetch all users
  const fetchUsers = async () => {
    try {
      console.log("Fetching users...");
      setLoading(true);
      setError(null);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) throw new Error("Authentication token not found.");

      console.log("Making API call to fetch users...");
      const response = await fetch(
        "https://nrprod.nrcontainers.com/api/auth/users",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log("API response status:", response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const result = await response.json();
      console.log("API response result:", result);

      if (result.success && Array.isArray(result.data)) {
        // Map API response to match UserData interface
        // API returns 'isActive' but component expects 'active'
        // API might return 'role' as JSON string or 'roles' as array, normalize to 'roles' array
        const mappedUsers = result.data.map((user: any) => ({
          ...user,
          active:
            user.isActive !== undefined
              ? user.isActive
              : user.active !== undefined
              ? user.active
              : true,
          // Ensure roles is always an array - prioritize roles array, fallback to parsing role string
          roles: Array.isArray(user.roles)
            ? user.roles
            : typeof user.role === "string"
            ? (() => {
                try {
                  const parsed = JSON.parse(user.role);
                  return Array.isArray(parsed)
                    ? parsed.filter((r: any) => r !== null && r !== undefined)
                    : [];
                } catch {
                  return [];
                }
              })()
            : [],
        }));
        console.log("Setting users data:", mappedUsers);
        setUsers(mappedUsers);
        setFilteredUsers(mappedUsers);
      } else {
        throw new Error("Invalid API response format");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Search functionality
  useEffect(() => {
    console.log("Search effect triggered:", {
      searchTerm,
      usersCount: users.length,
    });

    if (!searchTerm.trim()) {
      console.log("Empty search term, showing all users");
      setFilteredUsers(users);
      return;
    }

    try {
      const filtered = users.filter((user) => {
        const searchLower = searchTerm.toLowerCase();
        const matchesId = user.id?.toLowerCase().includes(searchLower);
        const matchesName = user.name?.toLowerCase().includes(searchLower);
        const matchesEmail = user.email?.toLowerCase().includes(searchLower);

        return matchesId || matchesName || matchesEmail;
      });

      console.log("Search results:", {
        searchTerm,
        totalUsers: users.length,
        filteredCount: filtered.length,
        filteredUsers: filtered,
      });

      setFilteredUsers(filtered);
    } catch (error) {
      console.error("Error during search:", error);
      // Fallback to showing all users if search fails
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  // Handle user actions
  const handleViewUser = (user: UserData) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setSelectedUser(user);
    setShowDeleteWarning(true);
  };

  const handleUserDeleted = () => {
    setShowDeleteWarning(false);
    setSelectedUser(null);
    fetchUsers(); // Refresh the list
  };

  const handleUserUpdated = () => {
    setShowEditUser(false);
    setSelectedUser(null);
    fetchUsers(); // Refresh the list
  };

  if (loading) {
    return (
      <div className="bg-gray-50 flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  // Safety check to prevent crashes
  if (!Array.isArray(users) || !Array.isArray(filteredUsers)) {
    console.error("Users data is not in expected format:", {
      users,
      filteredUsers,
    });
    return (
      <div className="bg-gray-50 w-full">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Data Error
            </h2>
            <p className="text-gray-600 mb-4">
              There was an issue loading the user data.
            </p>
            <button
              onClick={fetchUsers}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 w-full min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors hover:cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by ID or First Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              {/* User Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {user.name}
                    </h3>
                    <p className="text-sm text-gray-500">{user.id}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {user.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* User Details */}
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Roles:</span>{" "}
                  {user.roles.map(getRoleDisplayName).join(", ")}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Last Login:</span>{" "}
                  {formatDate(user.lastLogin)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span>{" "}
                  {formatDate(user.createdAt)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Updated:</span>{" "}
                  {formatDate(user.updatedAt)}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewUser(user)}
                  className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1"
                >
                  <Eye size={16} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handleEditUser(user)}
                  className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded text-sm font-medium hover:bg-green-200 transition-colors flex items-center justify-center space-x-1"
                >
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="flex-1 bg-red-100 text-red-700 px-3 py-2 rounded text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center space-x-1"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && !loading && (
          <div className="text-center py-12">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No users found
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? "Try adjusting your search terms"
                : "No users have been created yet"}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showUserDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setShowUserDetails(false)}
          onEdit={() => {
            setShowUserDetails(false);
            setShowEditUser(true);
          }}
          onDelete={() => {
            setShowUserDetails(false);
            setShowDeleteWarning(true);
          }}
        />
      )}

      {showEditUser && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => setShowEditUser(false)}
          onSuccess={handleUserUpdated}
        />
      )}

      {showDeleteWarning && selectedUser && (
        <DeleteWarningModal
          user={selectedUser}
          onClose={() => setShowDeleteWarning(false)}
          onConfirm={handleUserDeleted}
        />
      )}
    </div>
  );
};

export default UserDetailsPage;
