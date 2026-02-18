'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Plus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const BranchTestingDashboard = () => {
    const [branches, setBranches] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Test data states
    const [feePlans, setFeePlans] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [batches, setBatches] = useState([]);
    const [stats, setStats] = useState(null);

    // Form states
    const [newBranch, setNewBranch] = useState({ name: '', code: '', status: 'active' });
    const [newExpense, setNewExpense] = useState({
        category: 'administrative',
        title: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        status: 'paid'
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    // const [token, setToken] = useState(null); // Cookie based auth

    /*
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            console.log('Token retrieved from localStorage:', storedToken ? 'Yes' : 'No');
            setToken(storedToken);
        }
    }, []);
    */

    const headers = {
        'Content-Type': 'application/json',
        ...(selectedBranch && { 'X-Branch-Id': selectedBranch._id })
    };

    // Fetch user's branches
    useEffect(() => {
        fetchBranches();
    }, []);


    const fetchBranches = async () => {
        console.log('Fetching branches...');
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/branches/my`, {
                headers,
                credentials: 'include' // Important for cookies
            });
            if (response.status === 401) {
                console.error('Session expired or invalid token');
                setError('Session expired. Please log in again.');
                localStorage.removeItem('token');
                // Optional: Redirect to login
                // window.location.href = '/login';
                return;
            }
            const data = await response.json();
            if (data.success) {
                setBranches(data.branches);
                if (data.branches.length > 0 && !selectedBranch) {
                    setSelectedBranch(data.branches[0]);
                }
            } else {
                setError(data.message || 'Failed to fetch branches');
            }
        } catch (err) {
            console.error('Error fetching branches:', err);
            setError('Failed to fetch branches: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create new branch
    const createBranch = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/branches`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newBranch),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Branch created successfully!');
                setNewBranch({ name: '', code: '', status: 'active' });
                fetchBranches();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to create branch: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch fee plans
    const fetchFeePlans = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/fee-plans`, { headers, credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setFeePlans(data.plans);
                setSuccess(`Loaded ${data.plans.length} fee plans for ${selectedBranch?.name}`);
            }
        } catch (err) {
            setError('Failed to fetch fee plans: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch expenses
    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/expenses`, { headers, credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setExpenses(data.expenses);
                setSuccess(`Loaded ${data.expenses.length} expenses for ${selectedBranch?.name}`);
            }
        } catch (err) {
            setError('Failed to fetch expenses: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch expense stats
    const fetchExpenseStats = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/expenses/stats`, { headers, credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setStats(data);
                setSuccess(`Loaded expense stats for ${selectedBranch?.name}`);
            }
        } catch (err) {
            setError('Failed to fetch stats: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch batches
    const fetchBatches = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/batches?page=1&limit=20`, { headers, credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setBatches(data.batches);
                setSuccess(`Loaded ${data.batches.length} batches for ${selectedBranch?.name}`);
            }
        } catch (err) {
            setError('Failed to fetch batches: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Create expense
    const createExpense = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_URL}/api/expenses`, {
                method: 'POST',
                headers,
                body: JSON.stringify(newExpense),
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('Expense created successfully!');
                setNewExpense({
                    category: 'administrative',
                    title: '',
                    amount: '',
                    date: new Date().toISOString().split('T')[0],
                    payment_method: 'cash',
                    status: 'paid'
                });
                fetchExpenses();
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to create expense: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Building2 className="h-8 w-8" />
                        Branch Testing Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Test multi-branch filtering functionality
                    </p>
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            {/* Branch Selector */}
            <Card>
                <CardHeader>
                    <CardTitle>Select Branch</CardTitle>
                    <CardDescription>Choose which branch to view data for</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Select
                            value={selectedBranch?._id}
                            onValueChange={(id) => setSelectedBranch(branches.find(b => b._id === id))}
                        >
                            <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Select a branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(branch => (
                                    <SelectItem key={branch._id} value={branch._id}>
                                        {branch.name} ({branch.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedBranch && (
                            <Badge variant="outline" className="flex items-center gap-2">
                                <Building2 className="h-3 w-3" />
                                {selectedBranch.name}
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Main Tabs */}
            <Tabs defaultValue="branches" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="branches">Branches</TabsTrigger>
                    <TabsTrigger value="feeplans">Fee Plans</TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="batches">Batches</TabsTrigger>
                    <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>

                {/* Branches Tab */}
                <TabsContent value="branches">
                    <Card>
                        <CardHeader>
                            <CardTitle>Branch Management</CardTitle>
                            <CardDescription>Create and manage branches</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>Branch Name</Label>
                                    <Input
                                        value={newBranch.name}
                                        onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                        placeholder="Downtown Branch"
                                    />
                                </div>
                                <div>
                                    <Label>Branch Code</Label>
                                    <Input
                                        value={newBranch.code}
                                        onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value.toUpperCase() })}
                                        placeholder="DTN"
                                        maxLength={10}
                                    />
                                </div>
                                <div>
                                    <Label>Status</Label>
                                    <Select value={newBranch.status} onValueChange={(val) => setNewBranch({ ...newBranch, status: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button onClick={createBranch} disabled={loading || !newBranch.name || !newBranch.code}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Branch
                            </Button>

                            <div className="mt-6">
                                <h3 className="font-semibold mb-3">Existing Branches</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {branches.map(branch => (
                                        <Card key={branch._id}>
                                            <CardContent className="pt-6">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-semibold">{branch.name}</h4>
                                                        <p className="text-sm text-muted-foreground">Code: {branch.code}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">ID: {branch._id}</p>
                                                    </div>
                                                    <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                                                        {branch.status}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Fee Plans Tab */}
                <TabsContent value="feeplans">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fee Plans</CardTitle>
                            <CardDescription>
                                Fee plans for {selectedBranch?.name || 'selected branch'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={fetchFeePlans} disabled={loading || !selectedBranch}>
                                Load Fee Plans
                            </Button>
                            <div className="mt-4 space-y-2">
                                {feePlans.map(plan => (
                                    <Card key={plan._id}>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-semibold">
                                                        {plan.batch_id?.name || 'Unknown Batch'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        ₹{plan.total_amount} in {plan.num_installments} installments
                                                    </p>
                                                </div>
                                                <Badge variant="outline">
                                                    Branch: {plan.branchId?.substring(0, 8)}...
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {feePlans.length === 0 && (
                                    <p className="text-muted-foreground text-center py-8">
                                        No fee plans found. Click "Load Fee Plans" to fetch data.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Expenses Tab */}
                <TabsContent value="expenses">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expenses</CardTitle>
                            <CardDescription>
                                Expenses for {selectedBranch?.name || 'selected branch'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label>Title</Label>
                                    <Input
                                        value={newExpense.title}
                                        onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                                        placeholder="Office Supplies"
                                    />
                                </div>
                                <div>
                                    <Label>Amount</Label>
                                    <Input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        placeholder="5000"
                                    />
                                </div>
                                <div>
                                    <Label>Category</Label>
                                    <Select value={newExpense.category} onValueChange={(val) => setNewExpense({ ...newExpense, category: val })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="administrative">Administrative</SelectItem>
                                            <SelectItem value="academic_teaching">Academic/Teaching</SelectItem>
                                            <SelectItem value="marketing_advertising">Marketing</SelectItem>
                                            <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={newExpense.date}
                                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button onClick={createExpense} disabled={loading || !selectedBranch || !newExpense.title || !newExpense.amount}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Expense
                            </Button>

                            <div className="flex gap-2 mt-4">
                                <Button onClick={fetchExpenses} disabled={loading || !selectedBranch} variant="outline">
                                    Load Expenses
                                </Button>
                            </div>

                            <div className="mt-4 space-y-2">
                                {expenses.map(expense => (
                                    <Card key={expense._id}>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-semibold">{expense.title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {expense.category} • ₹{expense.amount} • {new Date(expense.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Badge variant={expense.status === 'paid' ? 'default' : 'secondary'}>
                                                    {expense.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {expenses.length === 0 && (
                                    <p className="text-muted-foreground text-center py-8">
                                        No expenses found. Create one or click "Load Expenses".
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Batches Tab */}
                <TabsContent value="batches">
                    <Card>
                        <CardHeader>
                            <CardTitle>Batches</CardTitle>
                            <CardDescription>
                                Batches for {selectedBranch?.name || 'selected branch'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={fetchBatches} disabled={loading || !selectedBranch}>
                                Load Batches
                            </Button>
                            <div className="mt-4 space-y-2">
                                {batches.map(batch => (
                                    <Card key={batch._id}>
                                        <CardContent className="pt-4">
                                            <div className="flex justify-between">
                                                <div>
                                                    <p className="font-semibold">{batch.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {batch.course_id?.name || 'Unknown Course'}
                                                    </p>
                                                </div>
                                                <Badge variant="outline">
                                                    Students: {batch.studentCount || 0}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {batches.length === 0 && (
                                    <p className="text-muted-foreground text-center py-8">
                                        No batches found. Click "Load Batches" to fetch data.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Stats Tab */}
                <TabsContent value="stats">
                    <Card>
                        <CardHeader>
                            <CardTitle>Expense Statistics</CardTitle>
                            <CardDescription>
                                Stats for {selectedBranch?.name || 'selected branch'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={fetchExpenseStats} disabled={loading || !selectedBranch}>
                                Load Stats
                            </Button>
                            {stats && (
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-muted-foreground">Total Amount</p>
                                            <p className="text-2xl font-bold">₹{stats.stats?.totalAmount || 0}</p>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <p className="text-sm text-muted-foreground">Pending</p>
                                            <p className="text-2xl font-bold">₹{stats.stats?.pending || 0}</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Debug Info */}
            <Card className="mt-8 border-dashed">
                <CardHeader>
                    <CardTitle className="text-sm font-mono">Debug Information</CardTitle>
                </CardHeader>
                <CardContent className="text-xs font-mono space-y-2">
                    <div>API_URL: {API_URL}</div>
                    <div>Selected Branch: {selectedBranch ? `${selectedBranch.name} (${selectedBranch._id})` : 'None'}</div>
                    <div>Loading: {loading ? 'True' : 'False'}</div>
                    <div>Branches Count: {branches.length}</div>
                    {error && <div className="text-red-500">Last Error: {error}</div>}
                    <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => {
                            console.log('Manual refresh triggered');
                            fetchBranches();
                        }}>
                            Force Refresh Branches
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default BranchTestingDashboard;
