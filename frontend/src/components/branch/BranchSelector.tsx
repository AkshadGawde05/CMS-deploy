'use client';

import React from 'react';
import { useBranch } from './BranchProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export default function BranchSelector() {
    const { branches, selectedBranch, setSelectedBranch, loading } = useBranch();

    if (loading && branches.length === 0) {
        return <div className="text-sm text-gray-500">Loading branches...</div>;
    }

    if (branches.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-500 hidden sm:block" />
            <Select
                value={selectedBranch?._id}
                onValueChange={(id) => {
                    const branch = branches.find(b => b._id === id);
                    setSelectedBranch(branch || null);
                    // Reload page to apply new branch context cleanly if needed, 
                    // or let react query/swr handle it. For now, let's keep it SPA-like.
                    // But if API calls need to re-fire, we might need a way to trigger that.
                    // A simple way is to reload if the architecture relies on initial fetches heavily.
                    // window.location.reload();
                    // Let's try SPA first.
                }}
            >
                <SelectTrigger className="w-[180px] h-9 text-xs sm:text-sm">
                    <SelectValue placeholder="Select Branch" />
                </SelectTrigger>
                <SelectContent>
                    {branches.map(branch => (
                        <SelectItem key={branch._id} value={branch._id}>
                            {branch.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
