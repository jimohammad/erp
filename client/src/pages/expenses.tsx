import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus, Trash2, Tag, Receipt, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ExpenseCategory, ExpenseWithDetails, Account } from "@shared/schema";

const expenseFormSchema = z.object({
  expenseDate: z.string().min(1, "Date is required"),
  categoryId: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  reference: z.string().optional(),
});

const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function ExpensesPage() {
  const { toast } = useToast();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const categorySelectRef = useRef<HTMLButtonElement>(null);

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<ExpenseWithDetails[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["/api/expense-categories"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      categoryId: "",
      accountId: "",
      amount: "",
      description: "",
      reference: "",
    },
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    setTimeout(() => categorySelectRef.current?.focus(), 100);
  }, []);

  const resetExpenseForm = () => {
    expenseForm.reset({
      expenseDate: format(new Date(), "yyyy-MM-dd"),
      categoryId: "",
      accountId: "",
      amount: "",
      description: "",
      reference: "",
    });
    setTimeout(() => categorySelectRef.current?.focus(), 100);
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const payload = {
        expenseDate: data.expenseDate,
        categoryId: data.categoryId ? parseInt(data.categoryId) : null,
        accountId: parseInt(data.accountId),
        amount: data.amount,
        description: data.description || null,
        reference: data.reference || null,
      };
      console.log("Creating expense with payload:", payload);
      return apiRequest("POST", "/api/expenses", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      resetExpenseForm();
      toast({ title: "Expense recorded successfully" });
    },
    onError: (error: any) => {
      console.error("Expense creation error:", error);
      toast({ title: "Failed to record expense", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete expense", variant: "destructive" });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      console.log("Creating category with data:", data);
      return apiRequest("POST", "/api/expense-categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      toast({ title: "Category created successfully" });
    },
    onError: (error: any) => {
      console.error("Category creation error:", error);
      toast({ title: "Failed to create category", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/expense-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete category", 
        description: error.message || "Category may be in use",
        variant: "destructive" 
      });
    },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <h1 className="text-2xl font-semibold" data-testid="heading-expenses">Expenses</h1>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList data-testid="tabs-expense-type">
            <TabsTrigger value="expenses" data-testid="tab-expenses">
              <Receipt className="w-4 h-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">
              <Tag className="w-4 h-4 mr-2" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Record New Expense</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetExpenseForm}
                  title="Reset form"
                  data-testid="button-reset-expense-form"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit((data) => createExpenseMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <FormField
                        control={expenseForm.control}
                        name="expenseDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                data-testid="input-expense-date" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger ref={categorySelectRef} data-testid="select-expense-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pay From Account</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-expense-account">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {accounts.map((acc) => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>
                                    {acc.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount (KWD)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.001" min="0" className="text-2xl" data-testid="input-expense-amount" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={expenseForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea data-testid="input-expense-description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createExpenseMutation.isPending} data-testid="button-submit-expense">
                      {createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Expense Records</CardTitle>
                <div className="text-sm text-muted-foreground">
                  Total: <span className="font-medium text-foreground">{totalExpenses.toFixed(3)} KWD</span>
                </div>
              </CardHeader>
              <CardContent>
                {expensesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading expenses...</div>
                ) : expenses.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No expenses recorded yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount (KWD)</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                          <TableCell>{expense.expenseDate}</TableCell>
                          <TableCell>{expense.category?.name || "-"}</TableCell>
                          <TableCell>{expense.account?.name || "-"}</TableCell>
                          <TableCell>{expense.description || "-"}</TableCell>
                          <TableCell>{expense.reference || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {parseFloat(expense.amount).toFixed(3)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteExpenseMutation.mutate(expense.id)}
                              disabled={deleteExpenseMutation.isPending}
                              data-testid={`button-delete-expense-${expense.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>Expense Categories</CardTitle>
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-category">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Category</DialogTitle>
                    </DialogHeader>
                    <Form {...categoryForm}>
                      <form onSubmit={categoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={categoryForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input data-testid="input-category-name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={createCategoryMutation.isPending} data-testid="button-submit-category">
                          {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading categories...</div>
                ) : categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No categories created yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category Name</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((cat) => (
                        <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                          <TableCell>{cat.name}</TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteCategoryMutation.mutate(cat.id)}
                              disabled={deleteCategoryMutation.isPending}
                              data-testid={`button-delete-category-${cat.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
