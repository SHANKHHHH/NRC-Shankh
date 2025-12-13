import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  location?: string;
}

interface UsersContextType {
  users: User[];
  loading: boolean;
  error: string | null;
  getUserName: (userId: string | null) => string;
  getUserById: (userId: string | null) => User | null;
  refreshUsers: () => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const useUsers = () => {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error("useUsers must be used within a UsersProvider");
  }
  return context;
};

interface UsersProviderProps {
  children: ReactNode;
}

export const UsersProvider: React.FC<UsersProviderProps> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Authentication token not found. Please log in.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "https://nrprod.nrcontainers.com"
        }/api/auth/users`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        throw new Error("Failed to load users data");
      }
    } catch (err) {
      console.error("Fetch Users Error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getUserName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "-";
      const user = users.find((u) => u.id === userId);
      return user?.name || userId; // Return user ID if name not found
    },
    [users]
  );

  const getUserById = useCallback(
    (userId: string | null): User | null => {
      if (!userId) return null;
      return users.find((u) => u.id === userId) || null;
    },
    [users]
  );

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  const value: UsersContextType = {
    users,
    loading,
    error,
    getUserName,
    getUserById,
    refreshUsers,
  };

  return (
    <UsersContext.Provider value={value}>{children}</UsersContext.Provider>
  );
};
