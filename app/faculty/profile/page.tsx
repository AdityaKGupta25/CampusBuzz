"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    User,
    Mail,
    Building2,
    ShieldCheck,
    Globe,
    Github,
    Twitter,
    Linkedin,
    Edit3,
    Camera,
    Save,
    Loader2,
    CheckCircle2,
    Briefcase,
    Verified,
    ExternalLink,
    AlertCircle,
    Zap,
    Trash2,
    Settings,
    ShieldAlert,
    Bell,
    Lock,
    LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Switch } from "@/components/ui/Switch";

export default function FacultyProfilePage() {
    const { user, refresh } = useUser();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [toastMessage, setToastMessage] = useState("Profile Synchronized Successfully");
    
    // Editable state
    const [bio, setBio] = useState("");
    const [socialLinks, setSocialLinks] = useState({
        github: "",
        twitter: "",
        linkedin: "",
        website: ""
    });

    // Settings state
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [securityLoading, setSecurityLoading] = useState(false);
    
    const [notifs, setNotifs] = useState({
        emailMissions: true,
        appApprovals: true,
        weeklySummary: false
    });

    const [privacy, setPrivacy] = useState({
        hideSocials: false
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setBio(user.bio || "");
            const links = user.social_links || {};
            setSocialLinks({
                github: links.github || "",
                twitter: links.twitter || "",
                linkedin: links.linkedin || "",
                website: links.website || ""
            });
        }
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
            setToastMessage("Profile Synchronized Successfully");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSecurityUpdate = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            alert("Passwords must match and cannot be empty.");
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

    const handleGlobalSignOut = async () => {
        if (!confirm("This will end all active sessions. Continue?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = "/login";
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
            <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 pointer-events-none" />
            <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px] translate-y-1/2 pointer-events-none" />

            <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
                <div className="w-full">
                    <ProfileLayoutSync user={user} bio={bio} setBio={setBio} socialLinks={socialLinks} setSocialLinks={setSocialLinks} 
                        handleSave={handleSave} saving={saving} success={success} toastMessage={toastMessage} 
                        handleAvatarClick={handleAvatarClick} uploading={uploading} handleDeleteAvatar={handleDeleteAvatar} 
                        fileInputRef={fileInputRef} handleFileChange={handleFileChange}
                        newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                        securityLoading={securityLoading} handleSecurityUpdate={handleSecurityUpdate}
                        notifs={notifs} setNotifs={setNotifs} privacy={privacy} setPrivacy={setPrivacy}
                        handleGlobalSignOut={handleGlobalSignOut} loading={loading}
                    />
                </div>
            </div>

            <AnimatePresence>
                {success && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-emerald-500 text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-emerald-500/30 z-[200]"
                    >
                        <CheckCircle2 size={18} />
                        {toastMessage}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProfileLayoutSync({ 
    user, bio, setBio, socialLinks, setSocialLinks, handleSave, saving, success, toastMessage,
    handleAvatarClick, uploading, handleDeleteAvatar, fileInputRef, handleFileChange,
    newPassword, setNewPassword, confirmPassword, setConfirmPassword, securityLoading, handleSecurityUpdate,
    notifs, setNotifs, privacy, setPrivacy, handleGlobalSignOut, loading
}: any) {
    return (
        <div className="max-w-6xl mx-auto px-4">
            <Tabs defaultValue="profile" className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => window.history.back()}
                            className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 text-zinc-500 hover:text-white transition-all shadow-sm"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Faculty Hub</h1>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Institutional Profile & Authority</p>
                        </div>
                    </div>

                    <TabsList>
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
                        {/* Left Column */}
                        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                             <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 relative overflow-hidden shadow-2xl"
                            >
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="relative flex flex-col items-center text-center">
                                    <div className="relative mb-6 group cursor-pointer" onClick={handleAvatarClick}>
                                        <div className="w-32 h-32 rounded-3xl bg-zinc-800 border-2 border-white/5 overflow-hidden relative shadow-xl">
                                            {user.avatar_url ? (
                                                <img src={user.avatar_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 text-white text-4xl font-black italic">
                                                    {user.full_name[0]}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                                                <Camera size={18} className="text-white" />
                                                <span className="text-[8px] font-black text-white uppercase tracking-widest">{uploading ? "..." : "Edit Photo"}</span>
                                            </div>
                                            {uploading && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Loader2 size={24} className="text-indigo-400 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        {user.avatar_url && !uploading && (
                                            <button onClick={handleDeleteAvatar} className="absolute -top-2 -right-2 p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 transition-all opacity-0 group-hover:opacity-100 shadow-xl backdrop-blur-md z-10"><Trash2 size={14} /></button>
                                        )}
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <h2 className="text-xl font-black text-white tracking-tight uppercase italic mb-1">{user.full_name}</h2>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-6">
                                        <ShieldCheck size={12} />
                                        <span>Faculty Authority</span>
                                    </div>
                                    <div className="w-full grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 text-left">
                                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">XP Power</p>
                                            <div className="flex items-center gap-2">
                                                <Zap size={10} className="text-amber-400" />
                                                <p className="text-lg font-black text-white italic">{user.karma_points || 0}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-zinc-950/40 border border-white/5 text-left">
                                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Missions</p>
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={10} className="text-indigo-400" />
                                                <p className="text-lg font-black text-white italic">12</p>
                                            </div>
                                        </div>
                                    </div>
                                    {user.institution_name && (
                                        <div className="w-full mt-4 p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                                {user.institution_logo_url ? <img src={user.institution_logo_url} className="w-full h-full object-cover" /> : <Building2 size={14} className="text-zinc-500" />}
                                            </div>
                                            <div className="text-left"><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Officially affiliated with</p><p className="text-xs font-bold text-white">{user.institution_name}</p></div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* Right Column */}
                        <div className="lg:col-span-8 space-y-8">
                             <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
                                <div className="flex items-center gap-2 mb-6 opacity-60"><Building2 size={14} className="text-zinc-400" /><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Institutional Credentials</h3></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <CredentialCard icon={<Mail size={16} />} label="Official Email" value={user.email} />
                                    <CredentialCard icon={<Building2 size={16} />} label="Department" value={user.department_name} verified />
                                    <CredentialCard icon={<User size={16} />} label="Employee Registry ID" value={user.employee_id || 'FAC-' + user.dbId.slice(0,6).toUpperCase()} />
                                    <CredentialCard icon={<Briefcase size={16} />} label="Administrative Role" value={user.role} role />
                                    <CredentialCard icon={<Globe size={16} />} label="University / College" value={user.institution_name} fullWidth />
                                </div>
                             </motion.section>
                             <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-6 shadow-xl">
                                <div className="flex items-center gap-2 mb-8 opacity-60"><Edit3 size={14} className="text-zinc-400" /><h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Profile Identity (Public)</h3></div>
                                <div className="space-y-6">
                                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Describe your role..." className="w-full h-40 bg-zinc-950/50 border border-white/5 rounded-2xl p-5 text-sm font-bold text-white focus:border-indigo-500/50 outline-none resize-none leading-relaxed" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <SocialInput icon={<Github size={14} />} label="GitHub" value={socialLinks.github} onChange={(v:any) => setSocialLinks({...socialLinks, github: v})} />
                                        <SocialInput icon={<Linkedin size={14} />} label="LinkedIn" value={socialLinks.linkedin} onChange={(v:any) => setSocialLinks({...socialLinks, linkedin: v})} color="text-sky-500" />
                                        <SocialInput icon={<Twitter size={14} />} label="Twitter" value={socialLinks.twitter} onChange={(v:any) => setSocialLinks({...socialLinks, twitter: v})} color="text-zinc-400" />
                                        <SocialInput icon={<Globe size={14} />} label="Website" value={socialLinks.website} onChange={(v:any) => setSocialLinks({...socialLinks, website: v})} color="text-emerald-500" />
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-zinc-200 uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shadow-xl shadow-white/5">
                                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                            <span className="ml-2">Save Profile Changes</span>
                                        </Button>
                                    </div>
                                </div>
                             </motion.section>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="settings">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Settings Left Column - Visual Anchor */}
                        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl border border-white/5 p-8 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700"><Settings size={180} /></div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-4">Account<br/>Guard</h2>
                                <p className="text-xs font-bold text-zinc-500 leading-relaxed mb-6">Manage your security passkeys, notification triggers, and privacy layers for your institutional authority account.</p>
                                <div className="space-y-4">
                                    <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/5 flex items-center gap-3">
                                        <ShieldAlert size={14} className="text-amber-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">High Security Area</span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Settings Right Column */}
                        <div className="lg:col-span-8 space-y-8 pb-12">
                            {/* Security Section */}
                            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20"><Lock size={18} /></div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Security Credentials</h3>
                                        <p className="text-[10px] font-bold text-zinc-500">Rotate your access passkey regularly</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">New Password</label>
                                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Confirm New Password</label>
                                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-sm font-bold text-white focus:border-indigo-500/50 outline-none transition-all" />
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <Button onClick={handleSecurityUpdate} disabled={securityLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white border-none uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/20">
                                        {securityLoading ? <Loader2 size={16} className="animate-spin" /> : "Update Security Passkey"}
                                    </Button>
                                </div>
                            </motion.section>

                            {/* Notifications Section */}
                            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20"><Bell size={18} /></div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Notification Channels</h3>
                                        <p className="text-[10px] font-bold text-zinc-500">Configure how we alert you about campus activity</p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <ToggleTile checked={notifs.emailMissions} onChange={(v:any) => setNotifs({...notifs, emailMissions: v})} label="Email Alerts for New Missions" sub="Get notified instantly when new faculty missions are assigned." />
                                    <ToggleTile checked={notifs.appApprovals} onChange={(v:any) => setNotifs({...notifs, appApprovals: v})} label="In-app Notifications for Approvals" sub="Alerts for pending event approvals and venue requests." />
                                    <ToggleTile checked={notifs.weeklySummary} onChange={(v:any) => setNotifs({...notifs, weeklySummary: v})} label="Weekly Campus Summary" sub="A condensed report of all activity every Monday morning." />
                                </div>
                            </motion.section>

                            {/* Privacy & Session Section */}
                            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-white/5 p-8 shadow-xl">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20"><ShieldCheck size={18} /></div>
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Privacy & Session</h3>
                                        <p className="text-[10px] font-bold text-zinc-500">Control your visibility and active connections</p>
                                    </div>
                                </div>
                                <div className="space-y-8">
                                    <ToggleTile checked={privacy.hideSocials} onChange={(v:any) => setPrivacy({...privacy, hideSocials: v})} label="Hide LinkedIn/GitHub from Students" sub="Your professional links will only be visible to other Faculty and HODs." />
                                    
                                    <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-rose-500 uppercase tracking-widest">Global Sign Out</p>
                                            <p className="text-[10px] font-bold text-zinc-500 max-w-sm">Securely log out of all active sessions across all devices for this account.</p>
                                        </div>
                                        <Button onClick={handleGlobalSignOut} disabled={loading} className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 uppercase text-[10px] font-black tracking-widest h-12 px-8 rounded-xl shrink-0 transition-all">
                                            {loading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                            <span className="ml-2">Sign out from all devices</span>
                                        </Button>
                                    </div>
                                </div>
                            </motion.section>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function CredentialCard({ icon, label, value, verified, role, fullWidth }: any) {
    return (
        <div className={cn("p-4 rounded-2xl bg-zinc-950/20 border border-white/5 flex items-center gap-4 group hover:bg-zinc-950/40 transition-all shadow-sm", fullWidth && "md:col-span-2")}>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500 border border-white/5 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">{label}</p>
                <div className="flex items-center gap-2">
                    <p className={cn("text-[13px] font-bold truncate", role ? "text-indigo-400 uppercase italic" : "text-zinc-300")}>{value || "Not Set"}</p>
                    {verified && <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[7px] font-black uppercase">Verified</div>}
                </div>
            </div>
            <Lock size={12} className="text-zinc-800" />
        </div>
    )
}

function SocialInput({ icon, label, value, onChange, color }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 ml-1">
                <span className={color || "text-white"}>{icon}</span>
                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{label}</label>
            </div>
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-12 bg-zinc-950/50 border border-white/5 rounded-xl px-4 text-xs font-bold text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-zinc-800" />
        </div>
    )
}

function ToggleTile({ checked, onChange, label, sub }: any) {
    return (
        <div className="flex items-center justify-between gap-6 p-4 rounded-2xl bg-zinc-950/20 border border-white/5 hover:bg-zinc-950/40 transition-all group">
            <div className="space-y-1">
                <p className="text-[11px] font-bold text-zinc-200 group-hover:text-white transition-colors">{label}</p>
                <p className="text-[10px] font-medium text-zinc-500">{sub}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    )
}
