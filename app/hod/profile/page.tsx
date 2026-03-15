"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Building2,
    ShieldCheck,
    Globe,
    Linkedin,
    Edit3,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    Briefcase,
    Zap,
    Trash2,
    BookOpen,
    Network,
    Settings,
    ShieldAlert,
    Bell,
    Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";

export default function HODProfilePage() {
    const { user, refresh } = useUser();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState("Profile Synchronized Successfully");
    
    // Stats
    const [decisions, setDecisions] = useState(0);
    const [sanctionedFlow, setSanctionedFlow] = useState(0);

    // Editable state
    const [bio, setBio] = useState("");
    const [socialLinks, setSocialLinks] = useState({
        linkedin: "",
        academicPortal: "",
        researchGate: ""
    });

    // Settings state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [securityLoading, setSecurityLoading] = useState(false);
    
    const [notifs, setNotifs] = useState({
        emailApprovals: true,
        appDecisions: true,
        weeklyReport: true
    });

    const [privacy, setPrivacy] = useState({
        hideAcademic: false
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            const links = user.social_links || {};
            setSocialLinks({
                linkedin: links.linkedin || "",
                academicPortal: links.academicPortal || "",
                researchGate: links.researchGate || ""
            });
        }
    }, [user]);

    useEffect(() => {
        if (!user?.dbId) return;
        const fetchStats = async () => {
            const { count } = await supabase
                .from('approvals')
                .select('*', { count: 'exact', head: true })
                .eq('approver_id', user.dbId)
                .in('status', ['approved', 'rejected']);
            setDecisions(count || 0);

            const { data } = await supabase
                .from('approvals')
                .select('event:events(budget_required)')
                .eq('approver_id', user.dbId)
                .eq('status', 'approved');

            let flow = 0;
            if (data) {
                flow = data.reduce((acc, curr: any) => {
                    const b = Array.isArray(curr.event) ? curr.event[0]?.budget_required : curr.event?.budget_required;
                    return acc + (b || 0);
                }, 0);
            }
            setSanctionedFlow(flow);
        };
        fetchStats();
    }, [user]);

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
            const fileName = `${user?.dbId}_${Date.now()}.${fileExt}`;
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
                .eq('id', user?.dbId);

            if (updateError) throw updateError;

            await refresh();
            setToastMessage("Avatar Updated Successfully");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Failed to upload avatar: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Remove profile picture?")) return;

        setUploading(true);
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: null })
                .eq('id', user?.dbId);

            if (updateError) throw updateError;

            await refresh();
            setToastMessage("Avatar Removed Successfully");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Failed to remove avatar: " + err.message);
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

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    bio,
                    social_links: socialLinks
                })
                .eq('id', user?.dbId);

            if (error) throw error;
            
            await refresh();
            setToastMessage("Persona Updated");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            alert("Failed to save changes: " + err.message);
        } finally {
            setSaving(false);
        }
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

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader2 size={32} className="animate-spin text-cyan-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-cyan-500/30 overflow-hidden relative">
            <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
                <Tabs defaultValue="profile" className="w-full">
                    {/* Header with Switcher */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => window.history.back()}
                                className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-500 hover:text-white transition-all shadow-sm"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Governance Profile</h1>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Institutional Command</p>
                            </div>
                        </div>

                        <TabsList className="bg-zinc-900/50 border-cyan-500/10">
                            <TabsTrigger value="profile">
                                <div className="flex items-center gap-2">
                                    <User size={14} />
                                    <span>Profile Identity</span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="settings">
                                <div className="flex items-center gap-2">
                                    <Settings size={14} />
                                    <span>Account Settings</span>
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
                                    className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-6 relative overflow-hidden shadow-2xl"
                                >
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
                                    
                                    <div className="relative flex flex-col items-center text-center">
                                        <div className="relative mb-6 group cursor-pointer" onClick={handleAvatarClick}>
                                            <div className="w-36 h-36 rounded-full bg-zinc-800 border-4 border-zinc-900 overflow-hidden relative shadow-2xl ring-2 ring-white/5">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-600 to-teal-800 text-white text-5xl font-black italic">
                                                        {user.full_name[0]}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-sm">
                                                    <Camera size={20} className="text-white" />
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">{uploading ? "..." : "Update Image"}</span>
                                                </div>
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                                        <Loader2 size={24} className="text-cyan-400 animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            {user.avatar_url && !uploading && (
                                                <button 
                                                    onClick={handleDeleteAvatar} 
                                                    className="absolute -top-2 -right-2 p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100 shadow-xl backdrop-blur-md z-40"
                                                    title="Remove Photo"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                        </div>
                                        <div className="mb-8">
                                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-1.5">{user.full_name}</h2>
                                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 shadow-inner">
                                                <ShieldCheck size={14} className="text-cyan-400" />
                                                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Head of Department</span>
                                            </div>
                                        </div>
                                        <div className="w-full space-y-3">
                                            <HODStatTile label="Total Decisions Made" value={decisions} icon={<Briefcase size={12} />} color="group-hover:text-cyan-400" />
                                            <HODStatTile 
                                                label="Sanctioned Flow" 
                                                value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sanctionedFlow)} 
                                                icon={<Zap size={12} />} color="group-hover:text-teal-400" 
                                            />
                                        </div>
                                        {user.institution_name && (
                                            <div className="w-full mt-6 p-4 rounded-2xl bg-zinc-950 border border-white/5 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                    {user.institution_logo_url ? <img src={user.institution_logo_url} className="w-full h-full object-cover" /> : <Building2 size={16} className="text-zinc-500" />}
                                                </div>
                                                <div className="text-left"><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Affiliated Institution</p><p className="text-xs font-bold text-white leading-tight">{user.institution_name}</p></div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Column */}
                            <div className="lg:col-span-8 space-y-8">
                                 <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-3 mb-6 opacity-80"><Building2 size={16} className="text-cyan-500" /><h3 className="text-xs font-black text-cyan-500 uppercase tracking-[0.2em]">Departmental Command</h3></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <CredentialCard icon={<Mail size={18} />} label="Official Email" value={user.email} />
                                        <CredentialCard icon={<Building2 size={18} />} label="Command Division" value={user.department_name} verified />
                                        <CredentialCard icon={<User size={18} />} label="Employee Registry ID" value={user.employee_id || 'HOD-' + user.dbId.slice(0, 6).toUpperCase()} />
                                        <CredentialCard icon={<Globe size={18} />} label="Institution" value={user.institution_name} />
                                    </div>
                                 </motion.section>

                                 <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-3 mb-8 opacity-80"><Edit3 size={16} className="text-teal-500" /><h3 className="text-xs font-black text-teal-500 uppercase tracking-[0.2em]">Professional Persona</h3></div>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-2">Mission Statement / Bio</label>
                                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} className="w-full h-32 bg-zinc-950/60 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white focus:border-cyan-500/40 outline-none resize-none leading-relaxed shadow-inner" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <PersonaLink icon={<Linkedin size={16} />} label="LinkedIn" value={socialLinks.linkedin} onChange={(v:any) => setSocialLinks({...socialLinks, linkedin: v})} color="text-blue-500" focus="focus:border-blue-500/40" />
                                            <PersonaLink icon={<BookOpen size={16} />} label="Academic Portal" value={socialLinks.academicPortal} onChange={(v:any) => setSocialLinks({...socialLinks, academicPortal: v})} color="text-amber-500" focus="focus:border-amber-500/40" />
                                            <PersonaLink icon={<Network size={16} />} label="Research Gate" value={socialLinks.researchGate} onChange={(v:any) => setSocialLinks({...socialLinks, researchGate: v})} color="text-emerald-500" focus="focus:border-emerald-500/40" />
                                        </div>
                                        <div className="flex justify-end pt-6 border-t border-white/5">
                                            <Button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                <span className="ml-2">Save Persona Changes</span>
                                            </Button>
                                        </div>
                                    </div>
                                 </motion.section>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Visual Column */}
                            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-[2.5rem] border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 text-cyan-500"><Settings size={180} /></div>
                                    <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4 uppercase">Command<br/>Center</h2>
                                    <p className="text-xs font-bold text-zinc-500 leading-relaxed mb-6">Authorize security updates, notification triggers, and privacy controls for your departmental command account.</p>
                                    <div className="px-4 py-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 flex items-center gap-3">
                                        <ShieldAlert size={14} className="text-cyan-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Authorized Access Only</span>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Right Settings Columns */}
                            <div className="lg:col-span-8 space-y-8 pb-12">
                                 {/* Security */}
                                 <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-inner"><Lock size={20} /></div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Security Credentials</h3>
                                            <p className="text-[10px] font-bold text-zinc-500">Rotate your departmental access passkey</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <SecurityInput label="New Password" value={newPassword} onChange={setNewPassword} />
                                        <SecurityInput label="Confirm Passkey" value={confirmPassword} onChange={setConfirmPassword} />
                                    </div>
                                    <div className="mt-8 flex justify-end">
                                        <Button onClick={handleSecurityUpdate} disabled={securityLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-cyan-500/20">
                                            {securityLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Security Passkey"}
                                        </Button>
                                    </div>
                                 </motion.section>

                                 {/* Notifications */}
                                 <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500 border border-teal-500/20 shadow-inner"><Bell size={20} /></div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Notification Logic</h3>
                                            <p className="text-[10px] font-bold text-zinc-500">Configure how governance triggers alert you</p>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <SettingToggle checked={notifs.emailApprovals} onChange={(v:any) => setNotifs({...notifs, emailApprovals: v})} label="Email Alerts for New Approvals" sub="Immediate notification for high-priority event requests." />
                                        <SettingToggle checked={notifs.appDecisions} onChange={(v:any) => setNotifs({...notifs, appDecisions: v})} label="In-app Decision Summaries" sub="Daily dashboard briefings on pending departmental tasks." />
                                        <SettingToggle checked={notifs.weeklyReport} onChange={(v:any) => setNotifs({...notifs, weeklyReport: v})} label="Weekly Departmental Report" sub="Full analytical breakdown of campus activity every Sunday." />
                                    </div>
                                 </motion.section>

                                 {/* Privacy & Session */}
                                 <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] border border-white/5 p-8 shadow-xl">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 border border-white/5 shadow-inner"><ShieldCheck size={20} /></div>
                                        <div>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Privacy & Identity State</h3>
                                            <p className="text-[10px] font-bold text-zinc-500">Manage your institutional visibility layers</p>
                                        </div>
                                    </div>
                                    <div className="space-y-8">
                                        <SettingToggle checked={privacy.hideAcademic} onChange={(v:any) => setPrivacy({...privacy, hideAcademic: v})} label="Hide Academic Credentials from Students" sub="Restrict visibility of research links to Administrative levels." />
                                    </div>
                                 </motion.section>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-teal-500 text-zinc-950 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-[0_10px_40px_rgba(20,184,166,0.5)] z-[200]">
                        <CheckCircle2 size={18} />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function HODStatTile({ label, value, icon, color }: any) {
    return (
        <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5 text-left flex items-center justify-between group hover:border-current transition-all overflow-hidden relative">
            <div className="relative z-10">
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">{label}</p>
                <div className="flex items-center gap-2">
                    <span className={cn("transition-colors", color)}>{icon}</span>
                    <p className="text-2xl font-black text-white italic">{value}</p>
                </div>
            </div>
            <div className={cn("absolute right-0 top-0 h-full w-1 opacity-10 group-hover:opacity-100 transition-all", color ? color.replace('text-', 'bg-') : 'bg-white')} />
        </div>
    )
}

function CredentialCard({ icon, label, value, verified }: any) {
    return (
        <div className="p-5 rounded-2xl bg-zinc-950/40 border border-white/5 flex items-center gap-4 group hover:bg-zinc-950/60 transition-all shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/30 flex items-center justify-center text-cyan-500 border border-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-zinc-950 transition-all">{icon}</div>
            <div>
                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-zinc-200">{value}</p>
                    {verified && <div className="px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[8px] font-black uppercase">Verified</div>}
                </div>
            </div>
        </div>
    )
}

function PersonaLink({ icon, label, value, onChange, color, focus }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 ml-2">
                <span className={color}>{icon}</span>
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{label}</label>
            </div>
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cn("w-full h-12 bg-zinc-950/60 border border-white/5 rounded-xl px-4 text-xs font-bold text-white outline-none transition-all placeholder:text-zinc-700 shadow-inner", focus)} />
        </div>
    )
}

function SecurityInput({ label, value, onChange }: any) {
    return (
        <div className="space-y-2 relative group focus-within:scale-[1.02] transition-transform">
            <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">{label}</label>
            <input type="password" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-sm font-bold text-white focus:border-cyan-500/50 outline-none transition-all shadow-inner" />
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
            <Switch checked={checked} onCheckedChange={onChange} className="data-[state=checked]:bg-cyan-500" />
        </div>
    )
}
