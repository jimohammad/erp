import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface Branch {
  id: number;
  name: string;
  code: string | null;
  isDefault: number | null;
}

interface MyPermissions {
  role: string;
  modules: string[];
  assignedBranchId: number | null;
}

interface BranchContextType {
  currentBranchId: number | null;
  setCurrentBranchId: (branchId: number) => void;
  currentBranch: Branch | undefined;
  branches: Branch[];
  isLoading: boolean;
  isLockedToBranch: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [currentBranchId, setCurrentBranchIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedBranchId");
    return saved ? parseInt(saved) : null;
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery<MyPermissions>({
    queryKey: ["/api/my-permissions"],
    retry: false,
  });

  const { data: defaultBranch } = useQuery<Branch | null>({
    queryKey: ["/api/branches/default"],
    enabled: currentBranchId === null && !permissions?.assignedBranchId,
  });

  // Don't wait for permissions to load - just wait for branches
  const isLoading = branchesLoading;
  const isLockedToBranch = !!permissions?.assignedBranchId;

  // If user has an assigned branch, lock them to it
  useEffect(() => {
    if (permissions?.assignedBranchId) {
      setCurrentBranchIdState(permissions.assignedBranchId);
      localStorage.setItem("selectedBranchId", permissions.assignedBranchId.toString());
    }
  }, [permissions?.assignedBranchId]);

  // Fallback to default branch if no assigned branch
  useEffect(() => {
    if (!permissions?.assignedBranchId && currentBranchId === null && defaultBranch) {
      setCurrentBranchIdState(defaultBranch.id);
      localStorage.setItem("selectedBranchId", defaultBranch.id.toString());
    }
  }, [defaultBranch, currentBranchId, permissions?.assignedBranchId]);

  useEffect(() => {
    if (!permissions?.assignedBranchId && currentBranchId === null && branches.length > 0 && !defaultBranch) {
      const defaultBr = branches.find((b) => b.isDefault === 1) || branches[0];
      if (defaultBr) {
        setCurrentBranchIdState(defaultBr.id);
        localStorage.setItem("selectedBranchId", defaultBr.id.toString());
      }
    }
  }, [branches, currentBranchId, defaultBranch, permissions?.assignedBranchId]);

  const setCurrentBranchId = (branchId: number) => {
    // Don't allow changing branch if user is locked to a specific branch
    if (isLockedToBranch) return;
    setCurrentBranchIdState(branchId);
    localStorage.setItem("selectedBranchId", branchId.toString());
  };

  const currentBranch = branches.find((b) => b.id === currentBranchId);

  return (
    <BranchContext.Provider
      value={{
        currentBranchId,
        setCurrentBranchId,
        currentBranch,
        branches,
        isLoading,
        isLockedToBranch,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranch must be used within a BranchProvider");
  }
  return context;
}
