"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronLeft,
    Layers,
    Plus,
    X,
    Trash2,
    Loader2,
    LayoutDashboard,
    AlertCircle,
    Sparkles,
} from "lucide-react";
import { supabase, getCurrentUserProfile } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";

interface FestDomain {
    id: string;
    name: string;
    description: string;
    created_at: string;
}

export default function DomainsAndVerticalsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;
    const { user } = useUser();

    const [loading, setLoading] = useState(true);
    const [eventName, setEventName] = useState("");
    const [isUmbrella, setIsUmbrella] = useState(false);
    const [domains, setDomains] = useState<FestDomain[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingDomain, setEditingDomain] = useState<FestDomain | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });

    const fetchData = useCallback(async () => {
        if (!user?.institution_id) return;
        const institutionId = user.institution_id;

        setLoading(true);
        try {
            const [eventRes, domainsRes] = await Promise.all([
                supabase
                    .from("events")
                    .select("title, event_type, event_subtype")
                    .eq("id", eventId)
                    .eq("institution_id", institutionId)
                    .single(),
                supabase
                    .from("fest_domains")
                    .select("*")
                    .eq("umbrella_event_id", eventId)
                    .order("created_at")
            ]);

            if (eventRes.data) {
                setEventName(eventRes.data.title);
                setIsUmbrella(eventRes.data.event_type === "umbrella");
            } else if (eventRes.error) {
                // If event not found or doesn't belong to institution
                setIsUmbrella(false);
            }

            if (domainsRes.data) setDomains(domainsRes.data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, [eventId, user?.institution_id]);

    useEffect(() => {
        if (editingDomain) {
            setFormData({ name: editingDomain.name, description: editingDomain.description || "" });
        } else {
            setFormData({ name: "", description: "" });
        }
    }, [editingDomain, isModalOpen]);

    useEffect(() => {
        if (eventId && user?.institution_id) {
            void fetchData();
        }
    }, [eventId, user?.institution_id, fetchData]);

    const handleAction = async () => {
        if (!formData.name.trim() || !user?.institution_id) return;
        setSaving(true);
        try {
            if (editingDomain) {
                // Update
                const { error } = await supabase
                    .from("fest_domains")
                    .update({
                        name: formData.name.trim(),
                        description: formData.description.trim()
                    })
                    .eq("id", editingDomain.id)
                    .eq("umbrella_event_id", eventId);
                if (error) throw error;
            } else {
                // Create
                const { error } = await supabase
                    .from("fest_domains")
                    .insert({
                        umbrella_event_id: eventId,
                        name: formData.name.trim(),
                        description: formData.description.trim()
                    });
                if (error) throw error;
            }

            void fetchData();
            setIsModalOpen(false);
            setEditingDomain(null);
            setFormData({ name: "", description: "" });
        } catch (err: any) {
            alert("Failed to save domain: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDomain = async (id: string) => {
        if (!confirm("Are you sure? This will remove the domain association. Note: If events are already linked to this domain, deletion will be blocked for data integrity.")) return;

        try {
            const { institutionId } = await getCurrentUserProfile();
            if (!institutionId) throw new Error("Security Error: Institution context missing.");

            const { error } = await supabase
                .from("fest_domains")
                .delete()
                .eq("id", id)
                .eq("umbrella_event_id", eventId);

            if (error) {
                if (error.code === '23503') {
                    throw new Error("Cannot delete domain because activities are already registered under it. Reassign or delete those activities first.");
                }
                throw error;
            }
            setDomains(prev => prev.filter(d => d.id !== id));
        } catch (err: any) {
            alert("Security Error: " + err.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (!isUmbrella) {
        return (
            <div className="min-h-screen bg-[#09090b] text-white p-12 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <AlertCircle size={48} className="text-rose-500 mx-auto" />
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Access Restricted</h2>
                    <p className="text-zinc-500 text-sm">Domains are only available for Umbrella Events (Mega Fests or Hubs) in your institution.</p>
                    <button onClick={() => router.back()} className="text-indigo-400 font-bold hover:underline">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-8 md:p-12">
            <div className="max-w-7xl mx-auto space-y-12">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
                        >
                            <ChevronLeft size={14} />
                            Back to Manage
                        </button>
                        <div className="space-y-1">
                            <h1 className="text-4xl font-black tracking-tighter">{eventName}</h1>
                            <div className="flex items-center gap-2 text-indigo-400">
                                <Layers size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Domains & Verticals Manager</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="h-12 px-8 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={16} /> Add New Domain
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {domains.map((domain, i) => (
                        <motion.div
                            key={domain.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-zinc-900/40 border border-white/5 p-8 rounded-[2.5rem] relative group hover:border-indigo-500/30 transition-all"
                        >
                            <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={() => { setEditingDomain(domain); setIsModalOpen(true); }}
                                    className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-white transition-all shadow-md"
                                    title="Edit Domain"
                                >
                                    <Sparkles size={14} />
                                </button>
                                <button
                                    onClick={() => handleDeleteDomain(domain.id)}
                                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                    title="Delete Domain"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                                <Layers size={20} />
                            </div>
                            <h3 className="text-xl font-black tracking-tight mb-2 uppercase">{domain.name}</h3>
                            <p className="text-xs text-zinc-500 leading-relaxed font-medium">{domain.description || "No description provided."}</p>
                        </motion.div>
                    ))}

                    {domains.length === 0 && (
                        <div className="md:col-span-2 lg:col-span-3 py-24 text-center border-2 border-dashed border-white/5 rounded-[3rem] space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-700">
                                <Layers size={24} />
                            </div>
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No Domains defined yet</p>
                            <p className="text-xs text-zinc-700 max-w-xs mx-auto">Create categories like Technical, Cultural, and Sports to organize your Fest events.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Creation Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden"
                        >
                            <div className="p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-white tracking-tighter">
                                            {editingDomain ? "Update Domain" : "Add Domain"}
                                        </h2>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {editingDomain ? "Modifying operational category" : "Categorize your Infrastructure"}
                                        </p>
                                    </div>
                                    <button onClick={() => { setIsModalOpen(false); setEditingDomain(null); }} className="p-2 rounded-xl hover:bg-white/5 text-zinc-500">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Domain Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Technical Events"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Description</label>
                                        <textarea
                                            placeholder="Details about this category..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full h-32 bg-zinc-900/50 border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => { setIsModalOpen(false); setEditingDomain(null); }}
                                        className="flex-1 h-12 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all shadow-md"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAction}
                                        disabled={saving || !formData.name.trim()}
                                        className="flex-[2] h-12 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
                                        {editingDomain ? "Update Entry" : "Create Domain"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
