"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    User,
    Mail,
    Building2,
    ShieldCheck,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    Briefcase,
    Bell,
    Globe2,
    Activity,
    Shield,
    ArrowLeft,
    Settings,
    ShieldAlert,
    Lock,
    Users,
    Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function AdministrativeIdentityPage() {
    const router = useRouter();
    const { user, refresh } = useUser();
    const [institution, setInstitution] = useState<any>(null);
    const [stats, setStats] = useState({ faculty: 0, students: 0 });
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState("Institutional Branding Synchronized");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Settings state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [securityLoading, setSecurityLoading] = useState(false);
    
    const [notifs, setNotifs] = useState({
        emailAlerts: true,
        criticalPings: true,
        weeklySummary: true
    });

    const [privacy, setPrivacy] = useState({
        stealthMode: false
    });

    const [marketplaceAccess, setMarketplaceAccess] = useState(true);
    const [securityLevel, setSecurityLevel] = useState("standard");
    const [instUpdating, setInstUpdating] = useState(false);

    useEffect(() => {
        if (user?.institution_id) {
            fetchInstitutionData();
        }
    }, [user?.institution_id]);

    async function fetchInstitutionData() {
        if (!user?.institution_id) return;
        setLoading(true);
        try {
            const { data: inst, error: instError } = await supabase
                .from('institutions')
                .select('*')
                .eq('id', user.institution_id)
                .maybeSingle();

            if (instError) throw instError;
            setInstitution(inst);
            setMarketplaceAccess(inst.marketplace_access ?? true);
            setSecurityLevel(inst.security_level || "standard");

            const [facultyRes, studentRes] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', user.institution_id).eq('role', 'faculty'),
                supabase.from('users').select('*', { count: 'exact', head: true }).eq('institution_id', user.institution_id).eq('role', 'student')
            ]);

            setStats({
                faculty: facultyRes.count || 0,
                students: studentRes.count || 0
            });
        } catch (err: any) {
            console.error("Error in fetchInstitutionData:", err);
            if (!institution) setInstitution({ name: user.institution_name || "Hub Institution" });
        } finally {
            setLoading(false);
        }
    }

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const croppedFile = await cropToSquare(file);
            const fileExt = file.name.split('.').pop();
            const fileName = `logo_${user?.institution_id}_${Date.now()}.${fileExt}`;
            const filePath = `institutions/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('institutions')
                .update({ logo_url: publicUrl })
                .eq('id', user?.institution_id);

            if (updateError) throw updateError;

            await fetchInstitutionData();
            setToastMessage("Institutional Branding Synchronized");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Failed to upload logo: " + err.message);
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

    const handleInstitutionUpdate = async (updates: any) => {
        if (!user?.institution_id) return;
        setInstUpdating(true);
        try {
            const { error } = await supabase
                .from('institutions')
                .update(updates)
                .eq('id', user.institution_id);

            if (error) throw error;
            
            setToastMessage("Institutional Governance Synchronized");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            await fetchInstitutionData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setInstUpdating(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
            {/* Background Glows */}
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 relative z-10">
                <Tabs defaultValue="profile" className="w-full">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => window.history.back()}
                                className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-500 hover:text-white transition-all shadow-sm"
                            >
                                <ArrowLeft size={18} strokeWidth={2.5} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Administrative Identity</h1>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Platform Ownership & Governance</p>
                            </div>
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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                            {/* Left Column: Identity Hub */}
                            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                                    <div className="relative flex flex-col items-center text-center">
                                        <div className="w-24 h-24 rounded-2xl bg-zinc-800 border border-white/10 overflow-hidden mb-6 shadow-xl">
                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-3xl font-black italic">{user.full_name[0]}</div>}
                                        </div>
                                        <div className="mb-8">
                                            <h2 className="text-xl font-black text-white tracking-tight uppercase italic mb-1">{user.full_name}</h2>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-sans">
                                                <ShieldCheck size={12} className="text-indigo-400" />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Platform Admin</span>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-3">
                                            <div className="flex items-center gap-2 mb-2 opacity-60"><Zap size={10} className="text-zinc-400" /><h3 className="text-[8px] font-black text-zinc-400 uppercase tracking-[0.2em]">Platform Management</h3></div>
                                            <AdminStatTile label="Onboarded Faculty" value={stats.faculty} icon={<Briefcase size={12} />} color="text-indigo-400" />
                                            <AdminStatTile label="Active Students" value={stats.students} icon={<Users size={12} />} color="text-emerald-400" />
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Column */}
                            <div className="lg:col-span-8 space-y-8">
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400"><Building2 size={20} /></div>
                                            <div>
                                                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-0.5">Primary Campus</h3>
                                                <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">{institution?.name || "Hub Institution"}</h2>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                            <ShieldCheck size={14} className="text-emerald-500" />
                                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verified Institution</span>
                                        </div>
                                    </div>
                                    <div className="p-8 rounded-3xl bg-zinc-950/30 border border-white/5 flex flex-col items-center justify-center gap-6 relative group overflow-hidden">
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative">
                                            <div onClick={handleLogoClick} className="w-40 h-40 rounded-3xl bg-white border-2 border-white/10 shadow-2xl flex items-center justify-center p-4 cursor-pointer overflow-hidden relative group/logo">
                                                {institution?.logo_url ? <img src={institution.logo_url} className="w-full h-full object-contain" /> : <Building2 size={64} className="text-zinc-900" />}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                    <Camera size={24} className="text-white" />
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Update Logo</span>
                                                </div>
                                                {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 size={32} className="text-indigo-400 animate-spin" /></div>}
                                            </div>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                        <div className="text-center relative"><p className="text-lg font-black text-white uppercase italic tracking-tight mb-1">Official College Logo</p><p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Visible on all public events & marketplace cards</p></div>
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-2 mb-8 opacity-60"><User size={14} className="text-zinc-400" /><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Administrative Registry</h3></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <AdminInfoCard icon={Mail} label="Access Email" value={user.email} />
                                        <AdminInfoCard icon={Briefcase} label="Employee ID" value={user.employee_id || "ADM-66291"} />
                                    </div>
                                </motion.section>
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
                                    <p className="text-xs font-bold text-zinc-500 leading-relaxed mb-6">Modify your security credentials, institutional alert triggers, and visibility state.</p>
                                    <div className="px-4 py-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-3">
                                        <ShieldAlert size={14} className="text-indigo-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Authorized Administrator</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Settings Columns */}
                            <div className="lg:col-span-8 space-y-8 pb-12">
                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner"><Lock size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Security Credentials</h3><p className="text-[10px] font-bold text-zinc-500">Rotate your institutional access passkey</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <AdminSettingsInput label="New Password" value={newPassword} onChange={setNewPassword} password />
                                        <AdminSettingsInput label="Confirm Passkey" value={confirmPassword} onChange={setConfirmPassword} password />
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
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Governance Signals</h3><p className="text-[10px] font-bold text-zinc-500">Configure institutional alert logic</p></div>
                                    </div>
                                    <div className="space-y-4">
                                        <AdminSettingToggle checked={notifs.emailAlerts} onChange={(v:any) => setNotifs({...notifs, emailAlerts: v})} label="Institutional Email Alerts" sub="Get pings for significant event submissions and reports." />
                                        <AdminSettingToggle checked={notifs.criticalPings} onChange={(v:any) => setNotifs({...notifs, criticalPings: v})} label="Critical System Notifications" sub="Status updates regarding platform maintenance and RLS logs." />
                                        <AdminSettingToggle checked={notifs.weeklySummary} onChange={(v:any) => setNotifs({...notifs, weeklySummary: v})} label="Weekly Platform Analysis" sub="A Sunday summary of student engagement and department activity." />
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner"><Globe2 size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Institutional Logistics</h3><p className="text-[10px] font-bold text-zinc-500">Global reach and marketplace configurations</p></div>
                                    </div>
                                    <div className="space-y-4">
                                        <AdminSettingToggle 
                                            checked={marketplaceAccess} 
                                            onChange={(v: boolean) => {
                                                setMarketplaceAccess(v);
                                                handleInstitutionUpdate({ marketplace_access: v });
                                            }} 
                                            label="Global Marketplace Access" 
                                            sub="Allow faculty to publish events to the national student network." 
                                        />
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl relative overflow-hidden">
                                    {securityLevel === 'emergency_freeze' && (
                                        <div className="absolute top-0 right-0 px-4 py-1 bg-rose-500 text-black text-[8px] font-black uppercase tracking-widest animate-pulse">Emergency State Active</div>
                                    )}
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner"><Shield size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Governance Logic</h3><p className="text-[10px] font-bold text-zinc-500">Define the security protocols for institutional operations</p></div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {['standard', 'strict', 'emergency_freeze'].map((level) => (
                                            <button
                                                key={level}
                                                onClick={() => {
                                                    setSecurityLevel(level);
                                                    handleInstitutionUpdate({ security_level: level });
                                                }}
                                                className={cn(
                                                    "p-4 rounded-2xl border transition-all text-center group",
                                                    securityLevel === level 
                                                        ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-lg shadow-amber-500/5" 
                                                        : "bg-zinc-950/20 border-white/5 text-zinc-500 hover:border-white/10"
                                                )}
                                            >
                                                <p className="text-[10px] font-black uppercase tracking-widest">{level.replace('_', ' ')}</p>
                                            </button>
                                        ))}
                                    </div>

                                    {securityLevel === 'emergency_freeze' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-4">
                                            <ShieldAlert className="text-rose-500 shrink-0 mt-1" size={16} />
                                            <div>
                                                <p className="text-xs font-black text-rose-500 uppercase tracking-widest mb-1">Critical Governance Alert</p>
                                                <p className="text-[10px] font-bold text-rose-200/70 leading-relaxed">This will pause all upcoming events instantly. Faculty will be unable to modify or launch new initiatives until this freeze is manually lifted.</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-inner"><Activity size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Registry Summary</h3><p className="text-[10px] font-bold text-zinc-500">Platform telemetry and subscription telemetry</p></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/5 flex flex-col gap-1">
                                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Platform Version</p>
                                            <p className="text-sm font-black text-zinc-300 italic tracking-tighter">v2.4 <span className="text-[10px] not-italic text-indigo-500 ml-2 font-bold">— Stable Channel</span></p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/5 flex flex-col gap-1">
                                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Subscription Tier</p>
                                            <p className="text-sm font-black text-zinc-300 italic tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis">Institutional Enterprise</p>
                                        </div>
                                    </div>
                                </motion.section>

                                <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-inner"><ShieldCheck size={20} /></div>
                                        <div><h3 className="text-sm font-black text-white uppercase tracking-widest italic">Identity State</h3><p className="text-[10px] font-bold text-zinc-500">Manage your administrative visibility</p></div>
                                    </div>
                                    <div className="space-y-8">
                                        <AdminSettingToggle checked={privacy.stealthMode} onChange={(v:any) => setPrivacy({...privacy, stealthMode: v})} label="Administrative Stealth Mode" sub="Hide your specific name from public institutional signatures." />
                                    </div>
                                </motion.section>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-emerald-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-emerald-500/30 z-[200]">
                        <CheckCircle2 size={18} />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function AdminStatTile({ label, value, icon, color }: any) {
    return (
        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 text-left group hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
                <span className={color}>{icon}</span>
            </div>
            <p className="text-2xl font-black text-white italic">{value}</p>
        </div>
    )
}

function AdminInfoCard({ icon: Icon, label, value }: any) {
    return (
        <div className="p-6 rounded-2xl bg-zinc-950/20 border border-white/5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1 text-nowrap">{label}</p>
                <p className="text-sm font-bold text-zinc-300">{value}</p>
            </div>
            <div className="ml-auto p-1.5 rounded-lg bg-zinc-900 border border-white/5 text-zinc-700">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
        </div>
    )
}

function AdminSettingsInput({ label, value, onChange, password }: any) {
    return (
        <div className="space-y-2 relative focus-within:scale-[1.02] transition-transform">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">{label}</label>
            <input type={password ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-xs font-bold text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner" />
            <div className="absolute right-4 top-9 opacity-20"><Lock size={12} /></div>
        </div>
    )
}

function AdminSettingToggle({ checked, onChange, label, sub }: any) {
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
