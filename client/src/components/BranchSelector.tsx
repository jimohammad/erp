import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: number;
  name: string;
  code: string | null;
  isDefault: number | null;
}

interface BranchSelectorProps {
  selectedBranchId: number | null;
  onBranchChange: (branchId: number) => void;
  disabled?: boolean;
}

export function BranchSelector({ selectedBranchId, onBranchChange, disabled }: BranchSelectorProps) {
  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/50 min-w-[140px]">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (branches.length === 0) {
    return null;
  }

  return (
    <Select
      value={selectedBranchId?.toString() || ""}
      onValueChange={(value) => onBranchChange(parseInt(value))}
      disabled={disabled}
    >
      <SelectTrigger 
        className="w-[180px] h-9" 
        data-testid="select-branch"
      >
        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((branch) => (
          <SelectItem 
            key={branch.id} 
            value={branch.id.toString()}
            data-testid={`select-branch-${branch.id}`}
          >
            {branch.name}
            {branch.isDefault ? " (Default)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
