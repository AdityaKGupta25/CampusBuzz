"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Plus, Building2, Trash2, Search,
    RefreshCw, Loader2, X, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

interface Department {
    id: string;
    name: string;
    created_at: string;
}

export default function DepartmentsPage() {
    const { user } = useUser();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDeptName, setNewDeptName] = useState("");
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchDepts = useCallback(async () => {
        if (!user?.institution_id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("departments")
            .select("id, name, created_at")
            .eq("institution_id", user.institution_id)
            .order("name", { ascending: true });

        if (!error && data) {
            setDepartments(data);
        }
        setLoading(false);
    }, [user?.institution_id]);

    useEffect(() => {
        if (user?.institution_id) fetchDepts();
    }, [user?.institution_id, fetchDepts]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim() || !user?.institution_id) return;

        setSaving(true);
        const { error } = await supabase
            .from("departments")
            .insert([{
                name: newDeptName.trim(),
                institution_id: user.institution_id
            }]);

        if (error) {
            alert(error.message);
        } else {
            setNewDeptName("");
            setShowAddModal(false);
            fetchDepts();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will not delete users, but they will be unassigned from this department.")) return;

        setDeletingId(id);
        const { error } = await supabase
            .from("departments")
            .delete()
            .eq("id", id);

        if (error) {
            alert(error.message);
        } else {
            fetchDepts();
        }
        setDeletingId(null);
    };

    const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 px-6 md:px-10 py-5 flex items-center justify-between"
                style={{ background: "rgba(9,9,15,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Building2 size={20} className="text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Global Governance</p>
                        <h1 className="text-lg font-black text-white leading-none">Clusters & Departments</h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchDepts}
                        className="p-2.5 rounded-xl border border-zinc-800 text-zinc-500 hover:text-white transition-all"
                    >
                        <RefreshCw size={16} className={cn(loading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                    >
                        <Plus size={14} /> Add Cluster
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10">
                {/* Search / Toolbar */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-amber-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search departments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-all font-medium"
                        />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {filtered.length} Clusters Registered
                    </p>
                </div>

                {/* Dept Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        Array(6).fill(0).map((_, i) => (
                            <div key={i} className="h-40 rounded-[2rem] bg-white/5 animate-pulse border border-white/5" />
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full py-32 flex flex-col items-center gap-4 opacity-20">
                            <Building2 size={60} />
                            <p className="text-xl font-bold italic">No departments found.</p>
                        </div>
                    ) : (
                        filtered.map((dept) => (
                            <div key={dept.id} className="group relative bg-zinc-900/30 border border-zinc-800/60 rounded-[2rem] p-8 hover:bg-white/[0.02] hover:border-amber-500/20 transition-all">
                                <div className="absolute top-6 right-6">
                                    <button
                                        onClick={() => handleDelete(dept.id)}
                                        disabled={deletingId === dept.id}
                                        className="p-2 rounded-xl text-zinc-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        {deletingId === dept.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-500/40 group-hover:text-amber-400 group-hover:scale-110 transition-all">
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">{dept.name}</h3>
                                        <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                                            Added {new Date(dept.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
                    <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white">
                            <X size={20} />
                        </button>

                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                                <Building2 size={24} className="text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Register Cluster</h2>
                            <p className="text-sm text-zinc-500">Add a new academic department or administrative group.</p>
                        </div>

                        <form onSubmit={handleAdd} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Department Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="e.g. Computer Science Engineering"
                                    className="w-full bg-black/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-amber-500/50 transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving || !newDeptName.trim()}
                                className="w-full h-14 bg-white text-zinc-950 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : "Initialize Identity Cluster"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
