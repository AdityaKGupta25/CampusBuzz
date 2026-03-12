"use client";

import React, { useState, useEffect } from "react";
import {
    Users,
    Plus,
    Trash2,
    Search,
    Shield,
    User,
    Loader2,
    X,
    AlertCircle,
    CheckCircle2,
    LayoutGrid,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Club {
    id: string;
    name: string;
    faculty_in_charge_id: string;
    department_id: string;
    created_at: string;
    faculty?: {
        full_name: string;
    };
}

interface Faculty {
    id: string;
    full_name: string;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HodClubsPage() {
    const { user } = useUser();

    // ── State ─────────────────────────────────────────────────────────────────
    const [clubs, setClubs] = useState<Club[]>([]);
    const [facultyList, setFacultyList] = useState<Faculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        faculty_in_charge_id: ""
    });

    // ── Fetch Data ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (user?.department_id) {
            fetchInitialData();
        }
    }, [user?.department_id]);

    async function fetchInitialData() {
        setLoading(true);
        try {
            const [clubsRes, facultyRes] = await Promise.all([
                supabase
                    .from("clubs")
                    .select("*, faculty:users!faculty_in_charge_id(full_name)")
                    .eq("department_id", user?.department_id)
                    .eq("institution_id", user?.institution_id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("users")
                    .select("id, full_name")
                    .eq("department_id", user?.department_id)
                    .eq("institution_id", user?.institution_id)
                    .eq("role", "faculty")
            ]);

            if (clubsRes.data) setClubs(clubsRes.data as unknown as Club[]);
            if (facultyRes.data) setFacultyList(facultyRes.data);
        } catch (err) {
            console.error("Failed to fetch clubs/faculty:", err);
        } finally {
            setLoading(false);
        }
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    async function handleCreateClub(e: React.FormEvent) {
        e.preventDefault();
        if (!user?.department_id) return;

        setIsSubmitting(true);
        try {
            // Note: Schema discovery showed 'description' is MISSING.
            // We use the available columns: name, faculty_in_charge_id, department_id.
            const { data, error } = await supabase
                .from("clubs")
                .insert({
                    name: formData.name.trim(),
                    faculty_in_charge_id: formData.faculty_in_charge_id,
                    department_id: user.department_id,
                    institution_id: user.institution_id
                })
                .select("*, faculty:users!faculty_in_charge_id(full_name)")
                .single();

            if (error) throw error;

            setClubs(prev => [data as unknown as Club, ...prev]);
            setIsModalOpen(false);
            setFormData({ name: "", faculty_in_charge_id: "" });
        } catch (err: any) {
            alert(err.message || "Failed to create club");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteClub(id: string) {
        if (!confirm("Are you sure you want to delete this club? This action cannot be undone.")) return;

        try {
            const { error } = await supabase
                .from("clubs")
                .delete()
                .eq("id", id)
                .eq("institution_id", user?.institution_id);
            if (error) throw error;
            setClubs(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            alert(err.message || "Failed to delete club");
        }
    }

    // ── Filtering ─────────────────────────────────────────────────────────────
    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.faculty?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ── Render ────────────────────────────────────────────────────────────────

    if (!user) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-cyan-500" size={32} />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        <Users className="text-cyan-400" size={32} />
                        Department Clubs
                    </h1>
                    <p className="text-white/40 mt-1.5 font-medium">Manage student organizations and faculty in-charges.</p>
                </div>

                <Button
                    onClick={() => setIsModalOpen(true)}
                    icon={<Plus size={20} />}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold h-12 px-6 rounded-2xl shadow-lg shadow-cyan-900/20 whitespace-nowrap"
                >
                    Create New Club
                </Button>
            </div>

            {/* Search & Stats Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-2xl">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or faculty..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl h-12 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                </div>
                <div className="px-6 h-12 flex items-center bg-white/5 border border-white/5 rounded-xl">
                    <span className="text-white/30 text-xs font-bold uppercase tracking-widest mr-3">Total Clubs</span>
                    <span className="text-cyan-400 font-bold">{clubs.length}</span>
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-cyan-500" size={32} />
                    <p className="text-white/20 font-bold uppercase tracking-widest text-[10px]">Loading Registry...</p>
                </div>
            ) : filteredClubs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
                    <Users className="text-white/10 mb-4" size={48} />
                    <p className="text-white/30 font-bold uppercase tracking-widest text-xs">No clubs found</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 text-cyan-400 text-sm font-bold hover:underline"
                    >
                        Register your first club
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredClubs.map((club) => (
                            <motion.div
                                key={club.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="group"
                            >
                                <Link href={`/hod/clubs/${club.id}`} className="block h-full">
                                    <Card className="p-6 bg-white/5 border-white/10 hover:border-cyan-500/40 transition-all duration-300 rounded-3xl relative overflow-hidden h-full flex flex-col group/card">
                                        {/* Delete Button (Keep outside link or handle propagation) */}
                                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleDeleteClub(club.id);
                                                }}
                                                className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-xl"
                                                title="Delete Club"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-4 transition-transform group-hover/card:scale-110 duration-500">
                                                <LayoutGrid className="text-cyan-400" size={24} />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover/card:text-cyan-400 transition-colors uppercase tracking-tight">{club.name}</h3>
                                            <div className="bg-white/5 h-20 rounded-xl flex items-center justify-center border border-dashed border-white/5 group-hover/card:bg-white/10 transition-colors">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Active Institution Unit</p>
                                                    <div className="mt-2 text-cyan-400 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Explore Registry</span>
                                                        <ChevronRight size={10} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-auto space-y-3 pt-6 border-t border-white/5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                        <User size={14} className="text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-white/30 font-bold uppercase">In-Charge</p>
                                                        <p className="text-xs text-white/70 font-bold">{club.faculty?.full_name || "Unassigned"}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-white/30 font-bold uppercase">Registry ID</p>
                                                    <p className="text-[9px] text-white/20 font-mono italic">{club.id.slice(0, 8).toUpperCase()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* ── Modal ── */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-0">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !isSubmitting && setIsModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8">
                                <header className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                                            <Plus className="text-cyan-400" size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-white">Create Club</h2>
                                            <p className="text-sm text-white/30">Establish a new organization registry.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsModalOpen(false)}
                                        className="text-white/20 hover:text-white transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </header>

                                <form onSubmit={handleCreateClub} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Club Name</label>
                                        <Input
                                            placeholder="e.g. Coding Club, Robotics Society"
                                            value={formData.name}
                                            onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                            required
                                            className="bg-white/5 border-white/5 focus:border-cyan-500 h-12 text-white placeholder:text-white/10 font-bold"
                                        />
                                    </div>

                                    {/* 
                                        NOTE: 'description' column is missing in current DB schema.
                                        Removing the field to ensure submission works. 
                                    */}

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Faculty In-Charge</label>
                                        <Select
                                            value={formData.faculty_in_charge_id}
                                            onChange={e => setFormData(f => ({ ...f, faculty_in_charge_id: e.target.value }))}
                                            options={facultyList.map(f => ({ value: f.id, label: f.full_name }))}
                                            required
                                            placeholder="— Select Faculty Member —"
                                            className="bg-white/5 border-white/5 focus:border-cyan-500 h-12 text-white font-bold"
                                        />
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="flex-1 text-white/40 hover:text-white hover:bg-white/5 font-bold rounded-2xl h-12"
                                            onClick={() => setIsModalOpen(false)}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl h-12 shadow-lg shadow-cyan-900/20"
                                            loading={isSubmitting}
                                        >
                                            Register Club
                                        </Button>
                                    </div>
                                    <p className="text-[9px] text-white/10 text-center uppercase tracking-widest">PostgREST v12-ready Schema Engine</p>
                                </form>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
