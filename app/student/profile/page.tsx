"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    UserCircle2,
    Award,
    Ticket,
    LogOut,
    Mail,
    Building2,
    GraduationCap,
    RefreshCw,
    ChevronRight,
    Shield,
    Sparkles,
    Clock,
    Lock,
    Settings,
    Bell,
    ShieldAlert,
    User,
    CheckCircle2,
    Loader2,
    Camera,
    Trash2,
    Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser, getInitials } from "@/context/UserContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentProfilePage() {
    const router = useRouter();
    const { user: profile, loading: userLoading, error: userError, refresh } = useUser();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [certCount, setCertCount] = useState(0);
    const [ticketCount, setTicketCount] = useState(0);
    const [managementRecords, setManagementRecords] = useState<any[]>([]);

    // Settings state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [securityLoading, setSecurityLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [notifs, setNotifs] = useState({
        emailAlerts: true,
        appNotifs: true,
        weeklySummary: true
    });

    const [privacy, setPrivacy] = useState({
        hideSocials: false
    });

    const loadStats = useCallback(async () => {
        if (!profile) return;
        setLoading(true);
        setError(null);
        try {
            const { count: cc } = await supabase
                .from("verified_ledger")
                .select("id", { count: "exact", head: true })
                .eq("student_id", profile.dbId);
            setCertCount(cc ?? 0);

            const { count: tc } = await supabase
                .from("registrations")
                .select("id", { count: "exact", head: true })
                .eq("user_id", profile.dbId)
                .eq("status", "confirmed");
            const { data: records } = await supabase
                .from("event_staff")
                .select("*, events(title, start_time)")
                .eq("student_id", profile.dbId)
                .order("assigned_at", { ascending: false });
            setManagementRecords(records || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load stats.");
        } finally {
            setLoading(false);
        }
    }, [profile]);

    useEffect(() => {
        if (profile) void loadStats();
    }, [profile, loadStats]);

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push("/login");
    }

    const handleSecurityUpdate = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert("Passwords must match.");
            return;
        }

        setSecurityLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            
            setNewPassword("");
            setConfirmPassword("");
            setToastMessage("Security credentials updated!");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSecurityLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const croppedFile = await cropToSquare(file);
            const fileExt = file.name.split('.').pop();
            const fileName = `${profile?.dbId}_${Date.now()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', profile?.dbId);

            if (updateError) throw updateError;

            await refresh();
            setToastMessage("Identity Visual Synchronized");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Protocol Failure: Failed to sync identity visual.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Terminate identity visual? This will revert to default initials.")) return;

        setUploading(true);
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: null })
                .eq('id', profile?.dbId);

            if (updateError) throw updateError;

            await refresh();
            setToastMessage("Identity Visual Terminated");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Protocol Failure: Failed to terminate visual.");
        } finally {
            setUploading(false);
        }
    };

    const cropToSquare = (file: File): Promise<File> => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const size = Math.min(img.width, img.height);
                    canvas.width = 400; 
                    canvas.height = 400;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        const offsetX = (img.width - size) / 2;
                        const offsetY = (img.height - size) / 2;
                        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 400, 400);
                    }
                    canvas.toBlob((blob) => {
                        if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', 0.9);
                };
            };
        });
    };

    const handleGlobalSignOut = async () => {
        if (!confirm("This will end all active sessions. Continue?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            router.push("/login");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const isActuallyLoading = userLoading || (loading && !profile);
    const displayError = userError || error;

    if (isActuallyLoading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-indigo-500/30 overflow-hidden relative">
            <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 relative z-10">
                <Tabs defaultValue="profile" className="w-full">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Authenticated Citizen</p>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Institutional Identity</h1>
                        </div>

                        <TabsList className="bg-zinc-900/50 border-indigo-500/10">
                            <TabsTrigger value="profile">
                                <div className="flex items-center gap-2">
                                    <User size={14} />
                                    <span>Profile Core</span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="settings">
                                <div className="flex items-center gap-2">
                                    <Settings size={14} />
                                    <span>Control Center</span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="profile">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Identity Hub */}
                            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 relative overflow-hidden shadow-2xl"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="relative flex flex-col items-center text-center">
                                        <div 
                                            className="w-36 h-36 rounded-3xl bg-zinc-800 border-4 border-zinc-900 overflow-hidden relative shadow-2xl ring-2 ring-white/5 mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 cursor-pointer group"
                                            onClick={handleAvatarClick}
                                        >
                                            {profile.avatar_url ? (
                                                <img src={profile.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-800 text-white text-5xl font-black italic">
                                                    {getInitials(profile.full_name)}
                                                </div>
                                            )}
                                            
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-sm">
                                                <Camera size={20} className="text-white" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest">{uploading ? "..." : "Edit Photo"}</span>
                                            </div>

                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                                    <Loader2 size={24} className="text-indigo-400 animate-spin" />
                                                </div>
                                            )}

                                            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg border-2 border-zinc-900 z-10">
                                                <Shield size={18} className="text-white" />
                                            </div>

                                            {profile.avatar_url && !uploading && (
                                                <button 
                                                    onClick={handleDeleteAvatar} 
                                                    className="absolute top-2 right-2 p-2 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-rose-500 hover:bg-zinc-900 transition-all opacity-0 group-hover:opacity-100 shadow-xl backdrop-blur-md z-30"
                                                    title="Remove Photo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>

                                        <div className="mb-8">
                                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-1.5">{profile.full_name}</h2>
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
                                                <GraduationCap size={14} className="text-indigo-400" />
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{profile.role}</span>
                                            </div>
                                        </div>

                                        <div className="w-full grid grid-cols-3 gap-3">
                                            <StudentStatBlock icon={Ticket} value={ticketCount} label="Passes" color="text-blue-400" />
                                            <StudentStatBlock icon={Award} value={certCount} label="Secured" color="text-amber-400" />
                                            <StudentStatBlock icon={Sparkles} value={certCount * 50} label="Karma" color="text-emerald-400" />
                                        </div>

                                        {profile.institution_name && (
                                            <div className="w-full mt-8 p-4 rounded-2xl bg-zinc-950 border border-white/5 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                    {profile.institution_logo_url ? <img src={profile.institution_logo_url} className="w-full h-full object-cover" /> : <Building2 size={16} className="text-zinc-500" />}
                                                </div>
                                                <div className="text-left text-wrap">
                                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">Officially affiliated with</p>
                                                    <p className="text-xs font-bold text-white leading-tight pr-2">{profile.institution_name}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Column */}
                            <div className="lg:col-span-8 space-y-8">
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-3 mb-8 opacity-80"><Building2 size={16} className="text-indigo-500" /><h3 className="text-xs font-black text-indigo-500 uppercase tracking-[0.2em]">Institutional Credentials</h3></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InfoRow icon={Mail} label="University Email" value={profile.email} />
                                        <InfoRow icon={Building2} label="Primary Department" value={profile.department_name || "General"} verified />
                                        <InfoRow icon={Clock} label="Enrolment Date" value={new Date(profile.created_at).toLocaleDateString()} />
                                        <InfoRow icon={Shield} label="Account Integrity" value="Fully Verified" accent="text-emerald-500" />
                                    </div>
                                </motion.section>

                                {/* Leadership & Management Record */}
                                <motion.section 
                                    initial={{ opacity: 0, y: 20 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ delay: 0.05 }}
                                    className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl"
                                >
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3 opacity-80">
                                            <Briefcase size={16} className="text-cyan-500" />
                                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Leadership & Management Record</h3>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-500 uppercase tracking-widest animate-pulse">
                                            Live Ledger
                                        </div>
                                    </div>

                                    {managementRecords.length > 0 ? (
                                        <div className="flex flex-wrap gap-3">
                                            {managementRecords.map((record) => {
                                                const eventYear = record.events?.start_time ? new Date(record.events.start_time).getFullYear() : "";
                                                return (
                                                    <div 
                                                        key={record.id}
                                                        className="px-4 py-2.5 rounded-2xl bg-zinc-950 border border-white/5 flex items-center gap-3 border hover:border-cyan-500/30 transition-all group shadow-inner"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                                                            <Briefcase size={14} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] font-black text-white uppercase tracking-tight">
                                                                {record.role_name || record.role || "Organizer"}
                                                                <span className="text-zinc-500 mx-1.5">—</span>
                                                                <span className="text-zinc-400 italic">{record.events?.title} {eventYear}</span>
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <CheckCircle2 size={10} className="text-emerald-500" />
                                                                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Maestro Verified</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-10 text-center rounded-3xl border border-dashed border-white/5 bg-white/[0.01]">
                                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest italic leading-relaxed">No management credentials indexed yet.</p>
                                            <p className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest mt-1">Host your first event to build your management resume.</p>
                                        </div>
                                    )}
                                </motion.section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl flex flex-col items-center text-center justify-center group overflow-hidden relative">
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Ticket className="w-12 h-12 text-indigo-500 mb-4 group-hover:rotate-12 transition-transform duration-500" />
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2">My Event Passes</h4>
                                        <p className="text-xs font-bold text-zinc-500 mb-6">Manage your digital tickets and entry codes</p>
                                        <Button onClick={() => router.push("/student/my-tickets")} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white uppercase text-[10px] font-black tracking-widest h-10 px-6 rounded-xl">View Inventory</Button>
                                    </motion.section>

                                    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl flex flex-col items-center text-center justify-center group overflow-hidden relative">
                                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Award className="w-12 h-12 text-amber-500 mb-4 group-hover:-rotate-12 transition-transform duration-500" />
                                        <h4 className="text-lg font-black text-white italic uppercase tracking-tighter mb-2">Verified Ledger</h4>
                                        <p className="text-xs font-bold text-zinc-500 mb-6">Certificates secured on the ledger</p>
                                        <Button onClick={() => router.push("/student/achievements")} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white uppercase text-[10px] font-black tracking-widest h-10 px-6 rounded-xl">Check Ledger</Button>
                                    </motion.section>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column Decor */}
                            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 text-indigo-500"><Settings size={180} /></div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4 uppercase">Identity<br/>Control</h2>
                                    <p className="text-xs font-bold text-zinc-500 leading-relaxed mb-6">Modify your security credentials, alert triggers, and privacy state to match your workflow.</p>
                                    <div className="px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-3">
                                        <ShieldAlert size={14} className="text-indigo-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Self-Sovereign Identity</span>
                                    </div>
                                </motion.div>
                                <div className="p-2 rounded-[2rem] bg-rose-500/5 border border-rose-500/10">
                                    <button 
                                        onClick={() => void handleLogout()} 
                                        className="w-full px-4 py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center gap-3 transition-all duration-300 group"
                                    >
                                        <LogOut size={14} className="text-rose-500 group-hover:-translate-x-0.5 transition-transform" />
                                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest italic whitespace-nowrap">Logout from Portal</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Settings Columns */}
                            <div className="lg:col-span-8 space-y-8 pb-12">
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner"><Lock size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Security Credentials</h3><p className="text-[10px] font-bold text-zinc-500">Rotate your institutional access passkey</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SettingsInput label="New Password" value={newPassword} onChange={setNewPassword} password />
                                        <SettingsInput label="Confirm Passkey" value={confirmPassword} onChange={setConfirmPassword} password />
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <Button onClick={handleSecurityUpdate} disabled={securityLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/20">
                                            {securityLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Security Passkey"}
                                        </Button>
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-inner"><Bell size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Signal Logic</h3><p className="text-[10px] font-bold text-zinc-500">How the campus ecosystem alerts you</p></div>
                                    </div>
                                    <div className="space-y-4">
                                        <SettingToggle checked={notifs.emailAlerts} onChange={(v:any) => setNotifs({...notifs, emailAlerts: v})} label="Email Alerts for New Missions" sub="Get immediate pings for upcoming events and opportunities." />
                                        <SettingToggle checked={notifs.appNotifs} onChange={(v:any) => setNotifs({...notifs, appNotifs: v})} label="In-app Event Updates" sub="Stay updated on ticket availability and status changes." />
                                        <SettingToggle checked={notifs.weeklySummary} onChange={(v:any) => setNotifs({...notifs, weeklySummary: v})} label="Weekly Campus Digest" sub="A Sunday summary of your ranking and activity." />
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-inner"><Shield size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Privacy & Identity State</h3><p className="text-[10px] font-bold text-zinc-500">Manage your institutional visibility layers</p></div>
                                    </div>
                                    <div className="space-y-8">
                                        <SettingToggle checked={privacy.hideSocials} onChange={(v:any) => setPrivacy({...privacy, hideSocials: v})} label="Hide Professional Links from Peers" sub="Restrict visibility of your social profiles to only Faculty/Admin." />
                                        
                                        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-black text-rose-500 uppercase tracking-widest italic">Global Sign Out</p>
                                                <p className="text-[10px] font-bold text-zinc-500 max-w-sm leading-relaxed">Instantly end all active sessions across all your devices.</p>
                                            </div>
                                            <Button onClick={handleGlobalSignOut} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shrink-0 transition-all font-sans">
                                                Sign out from all devices
                                            </Button>
                                        </div>
                                    </div>
                                </motion.section>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_10px_40px_rgba(99,102,241,0.5)] z-[200]">
                        <CheckCircle2 size={18} />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StudentStatBlock({ icon: Icon, value, label, color }: any) {
    return (
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col items-center text-center group hover:border-white/10 transition-all shadow-inner">
            <Icon size={14} className={cn("mb-2 group-hover:scale-110 transition-transform", color)} />
            <p className="text-lg font-black text-white italic leading-none mb-1">{value}</p>
            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
        </div>
    )
}

function InfoRow({ icon: Icon, label, value, verified, accent }: any) {
    return (
        <div className="flex items-center gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/5 flex items-center justify-center text-zinc-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 transition-all"><Icon size={16} /></div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <p className={cn("text-sm font-bold truncate", accent || "text-zinc-200")}>{value}</p>
                    {verified && <div className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[7px] font-black uppercase">Verified</div>}
                </div>
            </div>
        </div>
    )
}

function SettingsInput({ label, value, onChange, password }: any) {
    return (
        <div className="space-y-2 relative focus-within:scale-[1.02] transition-transform">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">{label}</label>
            <input type={password ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-xs font-bold text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner" />
            <div className="absolute right-4 top-9 opacity-20"><Lock size={12} /></div>
        </div>
    )
}

function SettingToggle({ checked, onChange, label, sub }: any) {
    return (
        <div className="flex items-center justify-between gap-6 p-5 rounded-2xl bg-zinc-950/20 border border-white/5 hover:bg-zinc-950/40 transition-all group shadow-sm transition-all duration-300">
            <div className="space-y-1">
                <p className="text-xs font-black text-zinc-200 group-hover:text-white transition-colors">{label}</p>
                <p className="text-[10px] font-bold text-zinc-600 leading-tight pr-4">{sub}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-indigo-500" />
        </div>
    )
}
