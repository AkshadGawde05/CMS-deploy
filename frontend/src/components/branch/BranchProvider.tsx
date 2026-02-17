'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api'; // We'll export 'api' instance from lib/api.ts
import { useAuth } from '@/components/auth/AuthProvider';

type Branch = {
    _id: string;
    name: string;
    code: string;
    status: string;
};

type BranchContextType = {
    branches: Branch[];
    selectedBranch: Branch | null;
    loading: boolean;
    setSelectedBranch: (branch: Branch | null) => void;
    refreshBranches: () => Promise<void>;
};

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null);
    const [loading, setLoading] = useState(false);

    // Helper to set branch and persist to localStorage
    const setSelectedBranch = (branch: Branch | null) => {
        setSelectedBranchState(branch);
        if (branch) {
            localStorage.setItem('selectedBranchId', branch._id);
            // Trigger a custom event so api.ts or other listeners can know immediately if needed
            // But localStorage change is usually enough for the next request
        } else {
            localStorage.removeItem('selectedBranchId');
        }
    };

    const refreshBranches = async () => {
        if (!user) return;
        try {
            setLoading(true);
            // We need to fetch branches. 
            // We can't import the specific function if it causes circular deps, 
            // so we use the raw axios instance or fetch.
            // Assuming we export 'api' from lib/api.ts or create a dedicated function there.
            // Let's assume we can fetch directly or use a helper.
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/branches/my`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const data = await response.json();

            if (data.success) {
                setBranches(data.branches);

                // Restore selection from localStorage
                const savedId = localStorage.getItem('selectedBranchId');
                if (savedId) {
                    const found = data.branches.find((b: Branch) => b._id === savedId);
                    if (found) {
                        setSelectedBranchState(found);
                    } else if (data.branches.length > 0) {
                        // If saved branch not found (maybe revoked), select first
                        setSelectedBranch(data.branches[0]);
                    }
                } else if (data.branches.length > 0) {
                    // Default to first branch
                    setSelectedBranch(data.branches[0]);
                }
            }
        } catch (error) {
            console.error('Failed to fetch branches:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            refreshBranches();
        } else {
            setBranches([]);
            setSelectedBranch(null);
        }
    }, [user]);

    return (
        <BranchContext.Provider value={{ branches, selectedBranch, loading, setSelectedBranch, refreshBranches }}>
            <React.Fragment key={selectedBranch?._id}>
                {children}
            </React.Fragment>
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
}
