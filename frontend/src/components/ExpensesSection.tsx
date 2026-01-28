'use client';

import { useState, useEffect } from 'react';
import { Search, LinkIcon } from 'lucide-react';
import { getAllExpenses, deleteExpense } from '@/lib/api';
import AddExpenseModal from './accounts/AddExpenseModal';
import ViewExpenseModal from './accounts/ViewExpenseModal';

interface Expense {
  _id: string;
  date: string;
  category: string;
  title: string;
  description?: string;
  vendor_name?: string;
  amount: number;
  payment_method: string;
  status: string;
  invoice_number?: string;
  receipt_url?: string;
}

export default function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  const [expFrom, setExpFrom] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });

  const [expTo, setExpTo] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
  });

  const [expSearch, setExpSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('all');

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [viewExpense, setViewExpense] = useState<Expense | null>(null);

  const [expPage, setExpPage] = useState(1);
  const EXPPAGESIZE = 10;

  const expenseCategories = [
    { key: 'salary', label: 'Salary' },
    { key: 'utilities', label: 'Utilities' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'supplies', label: 'Supplies' },
    { key: 'other', label: 'Other' },
  ];

  const expenseStatuses = ['all', 'pending', 'approved', 'rejected'];

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenseCategoryFilter, expenseStatusFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const result = await getAllExpenses({
        category: expenseCategoryFilter !== 'all' ? expenseCategoryFilter : undefined,
        status: expenseStatusFilter !== 'all' ? expenseStatusFilter : undefined,
        from: expFrom,
        to: expTo,
      });

      if (result.success) {
        setExpenses(result.expenses || []);
      } else {
        setExpenses([]);
      }
      setExpPage(1);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchExpenses();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('en-IN');
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN');

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-orange-100 text-orange-800 border-orange-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Filtered expenses with search
  const filteredExpenses = expenses.filter((e) => {
    const from = expFrom ? new Date(expFrom) : null;
    const to = expTo ? new Date(expTo) : null;

    if (from) {
      const d = new Date(e.date);
      if (d < from) return false;
    }

    if (to) {
      const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
      if (new Date(e.date) > end) return false;
    }

    if (expSearch) {
      const hay = (e.title ?? e.description ?? e.vendor_name ?? e.invoice_number ?? '').toLowerCase();
      if (!hay.includes(expSearch.toLowerCase())) return false;
    }

    return true;
  });

  const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const expTotalPages = Math.max(1, Math.ceil(filteredExpenses.length / EXPPAGESIZE));
  const expPageStart = (expPage - 1) * EXPPAGESIZE;
  const expPageEnd = Math.min(filteredExpenses.length, expPageStart + EXPPAGESIZE);
  const pageExpenses = filteredExpenses.slice(expPageStart, expPageEnd);

  // Stats for current range
  const statsThisRange = (() => {
    const byCat = new Map<string, number>();
    let lastAdded: Expense | null = null;

    for (const e of filteredExpenses) {
      byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount);
      if (!lastAdded || new Date(e.date) > new Date(lastAdded.date)) {
        lastAdded = e;
      }
    }

    let topKey: string | null = null;
    let topTotal = 0;

    for (const [k, v] of byCat.entries()) {
      if (v > topTotal) {
        topTotal = v;
        topKey = k;
      }
    }

    return {
      total: totalExpensesAmount,
      topCategoryKey: topKey,
      topCategoryLabel: topKey ? expenseCategories.find((c) => c.key === topKey)?.label : null,
      lastAdded,
    };
  })();

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-black">Expense Management</h2>
            </div>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              + Add Expense
            </button>
          </div>
        </div>

        <div className="lg:w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-600">Total this range</div>
          <div className="text-2xl font-bold text-black mt-1">{formatCurrency(statsThisRange.total)}</div>
          <div className="mt-2 text-xs text-gray-600">
            {statsThisRange.topCategoryLabel ? (
              <div>
                Top category: <span className="text-black font-medium">{statsThisRange.topCategoryLabel}</span>
              </div>
            ) : null}
            {statsThisRange.lastAdded ? (
              <div className="mt-1">
                Last added: <span className="text-black font-medium">{statsThisRange.lastAdded.title}</span> on{' '}
                {formatDate(statsThisRange.lastAdded.date)}
              </div>
            ) : (
              <div>No expenses in range</div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Category</label>
            <select
              value={expenseCategoryFilter}
              onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
            >
              <option value="all">All Categories</option>
              {expenseCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">Status</label>
            <select
              value={expenseStatusFilter}
              onChange={(e) => setExpenseStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
            >
              {expenseStatuses.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">From</label>
            <input
              type="date"
              value={expFrom}
              onChange={(e) => setExpFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">To</label>
            <input
              type="date"
              value={expTo}
              onChange={(e) => setExpTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={expSearch}
                onChange={(e) => setExpSearch(e.target.value)}
                placeholder="Title, vendor..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-black"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={fetchExpenses}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium"
          >
            Filter
          </button>
          <button
            onClick={() => {
              setExpenseCategoryFilter('all');
              setExpenseStatusFilter('all');
              setExpSearch('');
              setExpFrom(
                new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
              );
              setExpTo(
                new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)
              );
              fetchExpenses();
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-black hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Loading expenses...</p>
        </div>
      )}

      {/* Expense Records */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-gray-900">Expense Records</h3>
              <p className="text-sm text-gray-600 mt-1">Total: {filteredExpenses.length} expenses</p>
            </div>
            <div className="text-sm text-gray-700">
              Total Expenses: <span className="font-semibold text-black">{formatCurrency(totalExpensesAmount)}</span>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Category</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Title</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">
                    Vendor
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Amount</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">
                    Payment
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase hidden md:table-cell">
                    Receipt
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-4 sm:px-6 py-3 text-left font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pageExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 sm:px-6 py-12 text-center text-sm text-gray-500">
                      No expense records found
                    </td>
                  </tr>
                ) : (
                  pageExpenses.map((expense, index) => (
                    <tr key={`${expense._id}-${index}`} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-md border border-purple-200">
                          {expenseCategories.find((c) => c.key === expense.category)?.label || expense.category}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                        {expense.description && <div className="text-xs text-gray-500 mt-1">{expense.description}</div>}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden md:table-cell">
                        {expense.vendor_name || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ₹{formatCurrency(expense.amount)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize hidden md:table-cell">
                        {expense.payment_method?.replace(/_/g, ' ') || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm hidden md:table-cell">
                        {expense.receipt_url ? (
                          <a
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <LinkIcon className="h-4 w-4" />
                            Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusBadge(
                            expense.status
                          )}`}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          onClick={() => setViewExpense(expense)}
                        >
                          View
                        </button>
                        <button
                          className="text-black hover:text-gray-800"
                          onClick={() => setEditExpense(expense)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDelete(expense._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {pageExpenses.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">No expense records found</div>
            ) : (
              pageExpenses.map((expense, index) => (
                <div key={`${expense._id}-${index}`} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-xs text-gray-500">{formatDate(expense.date)}</div>
                      <div className="mt-1 text-sm font-medium text-black">{expense.title}</div>
                      {expense.description && <div className="text-xs text-gray-600 mt-1">{expense.description}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-semibold text-black">₹{formatCurrency(expense.amount)}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs mb-3">
                    <div>
                      <span className="text-gray-600">Category: </span>
                      <span className="text-black font-medium">
                        {expenseCategories.find((c) => c.key === expense.category)?.label || expense.category}
                      </span>
                    </div>
                    {expense.vendor_name && (
                      <div>
                        <span className="text-gray-600">Vendor: </span>
                        <span className="text-black">{expense.vendor_name}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Payment: </span>
                      <span className="text-black capitalize">{expense.payment_method?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-md border ${getStatusBadge(expense.status)}`}>
                      {expense.status}
                    </span>
                    {expense.receipt_url && (
                      <a
                        className="inline-flex items-center gap-1 text-blue-600 text-xs"
                        href={expense.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <LinkIcon className="h-4 w-4" />
                        Receipt
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="flex-1 px-2 py-2 text-xs text-white bg-blue-600 rounded hover:bg-blue-700"
                      onClick={() => setViewExpense(expense)}
                    >
                      View
                    </button>
                    <button
                      className="flex-1 px-2 py-2 text-xs text-black bg-gray-200 rounded hover:bg-gray-300"
                      onClick={() => setEditExpense(expense)}
                    >
                      Edit
                    </button>
                    <button
                      className="flex-1 px-2 py-2 text-xs text-white bg-red-600 rounded hover:bg-red-700"
                      onClick={() => handleDelete(expense._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {expTotalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between text-sm text-gray-700 border-t border-gray-200 bg-gray-50">
              <div>
                Showing {filteredExpenses.length === 0 ? 0 : expPageStart + 1} to {expPageEnd} of {filteredExpenses.length}{' '}
                expenses
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={expPage === 1}
                  onClick={() => setExpPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {Array.from({ length: expTotalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`px-3 py-1 rounded-lg border ${
                      expPage === i + 1
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setExpPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  disabled={expPage === expTotalPages}
                  onClick={() => setExpPage((p) => Math.min(expTotalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setShowAddExpense(false);
            fetchExpenses();
          }}
        />
      )}

      {editExpense && (
        <AddExpenseModal
          expense={editExpense}
          onClose={() => setEditExpense(null)}
          onSuccess={() => {
            setEditExpense(null);
            fetchExpenses();
          }}
        />
      )}

      {viewExpense && (
        <ViewExpenseModal
          expense={viewExpense}
          onClose={() => setViewExpense(null)}
        />
      )}
    </div>
  );
}
