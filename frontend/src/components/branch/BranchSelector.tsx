'use client';

import React from 'react';
import { useBranch } from './BranchProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ChevronDown } from 'lucide-react';

export default function BranchSelector() {
    const { branches, selectedBranch, setSelectedBranch, loading } = useBranch();

    if (loading && branches.length === 0) {
        return <div className="text-sm text-gray-500">Loading branches...</div>;
    }

    if (branches.length === 0) {
        return null;
    }

    return (
        <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600 hidden sm:block" />
            <Select
                value={selectedBranch?._id}
                onValueChange={(id) => {
                    const branch = branches.find(b => b._id === id);
                    setSelectedBranch(branch || null);
                }}
            >
                <SelectTrigger className="w-auto min-w-[160px] h-9 px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-200 rounded-lg hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-50 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 shadow-sm">
                    <div className="flex items-center gap-2">
                        <SelectValue placeholder="Select Branch" className="text-sm font-medium text-gray-900" />
                        <ChevronDown className="h-4 w-4 text-blue-600 opacity-70 ml-auto" />
                    </div>
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg shadow-lg">
                    {branches.map(branch => (
                        <SelectItem 
                            key={branch._id} 
                            value={branch._id}
                            className="text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 data-[state=checked]:bg-blue-100"
                        >
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <span className="font-medium text-gray-900">{branch.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
