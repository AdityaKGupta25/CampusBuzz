"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Building2,
    Plus,
    Search,
    Filter,
    MapPin,
    Users,
    CheckCircle2,
    Wrench,
    X,
    UploadCloud,
    Loader2,
    Edit3,
    ImageIcon,
    Wifi,
    Tv,
    Mic2,
    Zap,
    Wind,
    AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Venue {
    id: string;
    name: string;
    capacity: number;
    venue_type: string;
    location_type: string;
    is_active: boolean;
    amenities: string[];
    photo_url: string | null;
    institution_id: string;
}

const AMENITIES_OPTIONS = [
    { id: "wifi", label: "High-speed Wi-Fi", icon: Wifi },
    { id: "projector", label: "Projector / Screen", icon: Tv },
    { id: "audio", label: "Audio System / Mic", icon: Mic2 },
    { id: "ac", label: "Air Conditioning", icon: Wind },
    { id: "power", label: "Power Backup", icon: Zap },
    { id: "stage", label: "Stage Area", icon: MapPin },
] as const;

const VENUE_TYPES = ["Auditorium", "Conference Hall", "Classroom", "Lab", "Sports Ground", "Open Area", "Cafeteria", "Other"] as const;
const LOCATION_TYPES = ["Indoor", "Outdoor", "Virtual"] as const;

export function VenueRegistry() {
    const { user } = useUser();
    const role = user?.role?.toLowerCase();
    const isAuthorized = role === "admin" || role === "hod";

    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<string>("all");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        capacity: "",
        venue_type: "Auditorium",
        location_type: "Indoor",
        amenities: [] as string[],
        is_active: true,
        photo_url: "" as string | null
    });

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const loadVenues = useCallback(async () => {
        if (!user?.institution_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("venues")
                .select("*")
                .eq("institution_id", user.institution_id)
                .order("name");
            if (error) throw error;
            setVenues(data || []);
        } catch (err) {
            console.error("Failed to load venues:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.institution_id]);

    useEffect(() => {
        if (user?.institution_id) void loadVenues();
    }, [user?.institution_id, loadVenues]);

    const handleSave = async () => {
        setFormError(null);
        if (!formData.name || !formData.capacity || !user?.institution_id) {
            setFormError("Required fields are missing or identity session expired.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                capacity: parseInt(formData.capacity),
                institution_id: user.institution_id
            };

            if (editingVenue) {
                const { error } = await supabase
                    .from("venues")
                    .update(payload)
                    .eq("id", editingVenue.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("venues")
                    .insert([payload]);
                if (error) throw error;
            }

            setIsModalOpen(false);
            setEditingVenue(null);
            setFormData({
                name: "",
                capacity: "",
                venue_type: "Auditorium",
                location_type: "Indoor",
                amenities: [],
                is_active: true,
                photo_url: null
            });
            void loadVenues();
        } catch (err: any) {
            console.error("Failed to save venue:", err);
            if (err.code === "23505") {
                setFormError("A venue with this name already exists in your institution.");
            } else {
                setFormError(err.message || "Failed to process venue request.");
            }
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.institution_id) return;

        setUploadingPhoto(true);
        try {
            const ext = file.name.split('.').pop();
            const path = `${user.institution_id}/venue_${Date.now()}.${ext}`;
            const { error: uploadError } = await supabase.storage
                .from("venue-photos")
                .upload(path, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from("venue-photos").getPublicUrl(path);
            setFormData(prev => ({ ...prev, photo_url: data.publicUrl }));
        } catch (err: any) {
            alert("Upload failed: " + err.message);
        } finally {
            setUploadingPhoto(false);
        }
    };

    const toggleAmenity = (id: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(id)
                ? prev.amenities.filter(a => a !== id)
                : [...prev.amenities, id]
        }));
    };

    const filteredVenues = venues.filter(v =>
        (v.name.toLowerCase().includes(search.toLowerCase())) &&
        (filterType === "all" || v.venue_type === filterType)
    );

    return (
        <div className="space-y-12">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                        <Building2 className="text-cyan-500" size={32} />
                        Venue Registry
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500 mt-1">
                        Infrastructure & Resource Management
                    </p>
                </div>
                {isAuthorized && (
                    <button
                        onClick={() => {
                            setEditingVenue(null);
                            setFormData({
                                name: "",
                                capacity: "",
                                venue_type: "Auditorium",
                                location_type: "Indoor",
                                amenities: [],
                                is_active: true,
                                photo_url: null
                            });
                            setFormError(null);
                            setIsModalOpen(true);
                        }}
                        className="h-12 px-8 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        <Plus size={16} /> Add New Venue
                    </button>
                )}
            </header>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Venues", value: venues.length, icon: Building2, color: "text-blue-400" },
                    { label: "Active", value: venues.filter(v => v.is_active).length, icon: CheckCircle2, color: "text-emerald-400" },
                    { label: "Under Maintenance", value: venues.filter(v => !v.is_active).length, icon: Wrench, color: "text-amber-400" },
                    { label: "Total Capacity", value: venues.reduce((acc, v) => acc + v.capacity, 0), icon: Users, color: "text-purple-400" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900/40 border border-white/5 p-6 rounded-3xl"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <stat.icon className={stat.color} size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{stat.label}</span>
                        </div>
                        <p className="text-3xl font-black tracking-tighter">{stat.value.toLocaleString()}</p>
                    </motion.div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-zinc-900/60 p-2 rounded-2xl border border-white/5">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search venues by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-zinc-800/40 border-none rounded-xl h-12 pl-12 pr-4 text-sm text-white focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-zinc-800/40 rounded-xl border border-white/10 hover:border-white/20 hover:bg-zinc-800/60 transition-all group/filter">
                    <Filter className="ml-2 text-zinc-500 group-hover/filter:text-cyan-400 transition-colors" size={16} />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer text-white/70 hover:text-white transition-colors min-w-[110px]"
                    >
                        <option value="all" className="bg-[#0c0c14] text-white">All Types</option>
                        {VENUE_TYPES.map(t => (
                            <option key={t} value={t} className="bg-[#0c0c14] text-white">
                                {t}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <section className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Venue</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Type</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Capacity</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Location</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {loading ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-8 py-10">
                                            <div className="h-6 bg-zinc-800 rounded-lg w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredVenues.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-24 text-center">
                                        <Building2 className="mx-auto text-zinc-700 mb-4" size={48} />
                                        <p className="text-zinc-500 text-sm font-medium">No venues found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredVenues.map(venue => (
                                    <tr key={venue.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                                    {venue.photo_url ? (
                                                        <img src={venue.photo_url} alt={venue.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="text-zinc-600" size={20} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{venue.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        {venue.amenities.slice(0, 3).map(a => {
                                                            const opt = AMENITIES_OPTIONS.find(o => o.id === a);
                                                            return opt ? <opt.icon key={a} size={10} className="text-zinc-500" /> : null;
                                                        })}
                                                        {venue.amenities.length > 3 && <span className="text-[8px] font-bold text-zinc-600">+{venue.amenities.length - 3}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-xs font-bold text-zinc-300 uppercase">{venue.venue_type}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <Users size={14} className="text-zinc-500" />
                                                <span className="text-sm font-black">{venue.capacity}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                venue.location_type === "Indoor" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-orange-500/10 text-orange-400 border-orange-500/20"
                                            )}>
                                                {venue.location_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", venue.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500")} />
                                                <span className={cn("text-[10px] font-black uppercase tracking-tighter", venue.is_active ? "text-emerald-500" : "text-amber-500")}>
                                                    {venue.is_active ? "Ready" : "Maintenance"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {isAuthorized && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingVenue(venue);
                                                            setFormData({
                                                                name: venue.name,
                                                                capacity: venue.capacity.toString(),
                                                                venue_type: venue.venue_type,
                                                                location_type: venue.location_type,
                                                                amenities: venue.amenities,
                                                                is_active: venue.is_active,
                                                                photo_url: venue.photo_url
                                                            });
                                                            setFormError(null);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-[3rem] shadow-3xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tighter italic uppercase flex items-center gap-3">
                                        {editingVenue ? <Edit3 className="text-cyan-500" /> : <Plus className="text-cyan-500" />}
                                        {editingVenue ? "Modify Resource" : "Register Infrastructure"}
                                    </h2>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                                        Venue Audit & Onboarding
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-8 space-y-8 overflow-y-auto font-sans">
                                {formError && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-500 text-xs font-bold"
                                    >
                                        <AlertCircle size={16} />
                                        {formError}
                                    </motion.div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column: Core Data */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Venue Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Main Auditorium"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700 text-white selection:bg-cyan-500/30"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Capacity</label>
                                                <input
                                                    type="number"
                                                    placeholder="500"
                                                    value={formData.capacity}
                                                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                                                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700 text-white selection:bg-cyan-500/30"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Status</label>
                                                <button
                                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                                    className={cn(
                                                        "w-full h-14 rounded-2xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2",
                                                        formData.is_active
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                                    )}
                                                >
                                                    {formData.is_active ? <CheckCircle2 size={16} /> : <Wrench size={16} />}
                                                    {formData.is_active ? "Operational" : "Maintenance"}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Venue Type</label>
                                            <div className="flex flex-wrap gap-2">
                                                {VENUE_TYPES.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setFormData({ ...formData, venue_type: type })}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                                            formData.venue_type === type
                                                                ? "bg-cyan-600 border-cyan-500 text-white"
                                                                : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-zinc-700"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Location Type</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {LOCATION_TYPES.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setFormData({ ...formData, location_type: type })}
                                                        className={cn(
                                                            "px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                                            formData.location_type === type
                                                                ? "bg-zinc-100 border-white text-zinc-950"
                                                                : "bg-zinc-900 border-white/5 text-zinc-500 hover:border-zinc-700"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Amenities & Photo */}
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Amenities</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {AMENITIES_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => toggleAmenity(opt.id)}
                                                        className={cn(
                                                            "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all",
                                                            formData.amenities.includes(opt.id)
                                                                ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                                                                : "bg-zinc-900 border-white/5 text-zinc-600 hover:text-zinc-400"
                                                        )}
                                                    >
                                                        <opt.icon size={16} />
                                                        <span className="text-[10px] font-bold uppercase tracking-tight">{opt.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Venue Photograph</label>
                                            <div className="relative group">
                                                <div className={cn(
                                                    "w-full h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden",
                                                    formData.photo_url ? "border-emerald-500/50" : "border-white/5 group-hover:border-zinc-700"
                                                )}>
                                                    {formData.photo_url ? (
                                                        <div className="relative w-full h-full">
                                                            <img src={formData.photo_url} alt="Venue" className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={() => setFormData({ ...formData, photo_url: null })}
                                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-all"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ) : uploadingPhoto ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 className="animate-spin text-cyan-500" size={24} />
                                                            <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Uploading Photo...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <UploadCloud className="text-zinc-700 group-hover:text-cyan-500 transition-colors mb-2" size={32} />
                                                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Drag or Click to Upload</p>
                                                            <p className="text-[7px] text-zinc-700 uppercase tracking-wider mt-1">PNG, JPG or WEBP • MAX 2MB</p>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={handlePhotoUpload}
                                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 bg-zinc-900/50 border-t border-white/5 flex gap-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 h-14 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-[0.98]"
                                >
                                    Cancel Changes
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !formData.name || !formData.capacity}
                                    className="flex-[2] h-14 rounded-2xl bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-500/40 disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <div className="flex items-center gap-2">{editingVenue ? <Building2 size={16} /> : <CheckCircle2 size={16} />} {editingVenue ? "Update Registry" : "Complete Registration"}</div>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
