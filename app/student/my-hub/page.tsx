"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Target,
    Users,
    Trophy,
    Rocket,
    Clock,
    ArrowRight,
    Copy,
    Calendar,
    Lock,
    PlayCircle,
    CheckCircle,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Users2,
    Settings,
    LogOut,
    Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/context/UserContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HubRound {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    round_number: number;
    type: string;
    requires_submission: boolean;
}

interface HubEvent {
    id: string;
    title: string;
    status: string;
    banner_url: string | null;
    total_rounds: number;
    completed_rounds: number;
    rounds: HubRound[];
    next_milestone: HubRound | null;
}

interface HubTeam {
    id: string;
    name: string;
    join_code: string;
    leader_id: string;
    event_id: string;
    event_title: string;
    reg_end_time: string | null;
    members: {
        id: string;
        full_name: string;
        avatar_url: string | null;
    }[];
}

interface HubStats {
    active: number;
    pendingTasks: number;
    teamInvites: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentHubPage() {
    const { user, loading: userLoading } = useUser();
    const router = useRouter();

    const [activeMissions, setActiveMissions] = useState<HubEvent[]>([]);
    const [teams, setTeams] = useState<HubTeam[]>([]);
    const [completedMissions, setCompletedMissions] = useState<HubEvent[]>([]);
    const [stats, setStats] = useState<HubStats>({ active: 0, pendingTasks: 0, teamInvites: 0 });
    const [loading, setLoading] = useState(true);

    const loadHubData = async () => {
        if (!user?.dbId) return;
        setLoading(true);
        try {
            // 1. Fetch All Registrations
            const { data: regs, error: regError } = await supabase
                .from("registrations")
                .select(`
                    id,
                    status,
                    team_id,
                    event:events (
                        id,
                        title,
                        status,
                        banner_url,
                        reg_end_time,
                        rounds:event_rounds (
                            id,
                            title,
                            start_time,
                            end_time,
                            round_number,
                            type,
                            requires_submission
                        )
                    ),
                    team:teams (
                        id,
                        name,
                        join_code,
                        leader_id
                    )
                `)
                .eq("student_id", user.dbId);

            if (regError) throw regError;

            const now = new Date();
            const active: HubEvent[] = [];
            const completed: HubEvent[] = [];
            const hubTeams: HubTeam[] = [];

            for (const reg of (regs || [])) {
                const event = reg.event as any;
                if (!event) continue;

                const rounds = (event.rounds || []).sort((a: any, b: any) => a.round_number - b.round_number);
                const completedRounds = rounds.filter((r: any) => new Date(r.end_time) < now).length;
                const nextRound = rounds.find((r: any) => new Date(r.end_time) >= now);

                const hubEvent: HubEvent = {
                    id: event.id,
                    title: event.title,
                    status: event.status,
                    banner_url: event.banner_url,
                    total_rounds: rounds.length,
                    completed_rounds: completedRounds,
                    rounds: rounds.map((r: any) => ({
                        id: r.id,
                        title: r.title,
                        start_time: r.start_time,
                        end_time: r.end_time,
                        round_number: r.round_number,
                        type: r.type,
                        requires_submission: r.requires_submission
                    })),
                    next_milestone: nextRound ? {
                        id: nextRound.id,
                        title: nextRound.title,
                        start_time: nextRound.start_time,
                        end_time: nextRound.end_time,
                        round_number: nextRound.round_number,
                        type: nextRound.type,
                        requires_submission: nextRound.requires_submission
                    } : null
                };

                if (event.status === "completed") {
                    completed.push(hubEvent);
                } else {
                    active.push(hubEvent);
                }

                if (reg.team) {
                    const team = reg.team as any;
                    // Fetch members for this team
                    const { data: members } = await supabase
                        .from("registrations")
                        .select("student:users(id, full_name, avatar_url)")
                        .eq("team_id", team.id);

                    hubTeams.push({
                        id: team.id,
                        name: team.name,
                        join_code: team.join_code,
                        leader_id: team.leader_id,
                        event_id: event.id,
                        event_title: event.title,
                        reg_end_time: event.reg_end_time,
                        members: (members || []).map((m: any) => m.student)
                    });
                }
            }

            setActiveMissions(active);
            setCompletedMissions(completed);
            setTeams(hubTeams);

            setStats({
                active: active.length,
                pendingTasks: active.filter(m => m.next_milestone).length,
                teamInvites: 0 // Logic for invites can be added later if needed
            });

        } catch (err) {
            console.error("Error loading hub data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userLoading) loadHubData();
    }, [user?.dbId, userLoading]);

    if (loading || userLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Rocket className="w-8 h-8 text-indigo-500 animate-bounce" />
            </div>
        );
    }

    return (
        <div className="pt-8 pb-12 px-8 md:px-12 max-w-[1600px] mx-auto space-y-8">
            {/* Header: Mission Control */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Target size={16} />
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500/60 italic">
                                Tactical Console
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic uppercase">
                            Mission Control
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <StatCard label="Active" value={stats.active} icon={<Rocket size={12} />} color="text-emerald-400" />
                        <StatCard label="Tasks" value={stats.pendingTasks} icon={<Clock size={12} />} color="text-amber-400" />
                    </div>
                </div>

                <div className="h-px w-full bg-gradient-to-r from-zinc-800 via-zinc-800/20 to-transparent" />
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="active" className="space-y-6">
                <TabsList className="bg-zinc-950/40 p-1.5 rounded-2xl border border-white/5">
                    <TabsTrigger value="active" className="gap-2">
                        <Rocket size={12} /> Active
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="gap-2">
                        <Users2 size={12} /> Teams
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="gap-2">
                        <Trophy size={12} /> Completed
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeMissions.length > 0 ? (
                            activeMissions.map((mission) => (
                                <ActionCard key={mission.id} mission={mission} router={router} />
                            ))
                        ) : (
                            <EmptyState icon={<Rocket size={32} />} title="No Active Missions" description="Register for events to see them here." />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="teams">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.length > 0 ? (
                            teams.map((team) => (
                                <TeamCard key={team.id} team={team} currentUserId={user?.dbId || ""} onUpdate={loadHubData} />
                            ))
                        ) : (
                            <EmptyState 
                                icon={<Users size={32} />} 
                                title="No Teams Found" 
                                description="Join or create a team for competitions." 
                                cta={
                                    <Button onClick={() => router.push("/student/feed")} className="mt-4 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase tracking-widest px-8">
                                        Browse Events
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="completed">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedMissions.length > 0 ? (
                            completedMissions.map((mission) => (
                                <CompletedCard key={mission.id} mission={mission} />
                            ))
                        ) : (
                            <EmptyState icon={<Trophy size={32} />} title="No Completions" description="Complete events to build your ledger." />
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
    return (
        <div className="px-4 py-2.5 rounded-xl bg-zinc-900/50 border border-white/5 flex flex-col gap-0 min-w-[100px]">
            <div className={cn("flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest", color)}>
                {icon} {label}
            </div>
            <div className="text-xl font-black text-white tracking-tighter">{value}</div>
        </div>
    );
}

function ActionCard({ mission, router }: { mission: HubEvent; router: any }) {
    const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
    const progress = mission.total_rounds > 0 ? (mission.completed_rounds / mission.total_rounds) * 100 : 0;
    const now = new Date();
    
    return (
        <div 
            className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300"
        >
            {/* Height-Optimized Banner */}
            <div 
                onClick={() => router.push(`/student/event/${mission.id}`)}
                className="w-full h-44 relative overflow-hidden cursor-pointer"
            >
                {mission.banner_url ? (
                    <img src={mission.banner_url} alt={mission.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-zinc-900" />
                )}
                
                {/* Scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <Badge variant="approved" className="bg-indigo-500 text-white border-none text-[8px] uppercase font-black tracking-widest px-2 py-0.5 scale-90 origin-left">
                        ACTIVE MISSION
                    </Badge>
                </div>

                {/* Bottom Glass Progress Overlay */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-black/40 backdrop-blur-md border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/70">
                        <span>Milestone Coverage</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                        />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-5 space-y-5 flex-1 flex flex-col">
                <div className="space-y-1.5 cursor-pointer" onClick={() => router.push(`/student/event/${mission.id}`)}>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {mission.title}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Round {mission.completed_rounds} / {mission.total_rounds} Verified
                    </p>
                </div>

                <div className="space-y-3">
                    {/* Roadmap Toggle */}
                    <button 
                        onClick={() => setIsRoadmapOpen(!isRoadmapOpen)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-all text-left group/btn"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-zinc-400 group-hover/btn:text-white transition-colors">
                                <Calendar size={12} />
                            </div>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                {isRoadmapOpen ? "Hide Roadmap" : "View Roadmap"}
                            </span>
                        </div>
                        {isRoadmapOpen ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                    </button>


                    <AnimatePresence>
                        {isRoadmapOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-2 pt-2">
                                    {mission.rounds.map((round) => {
                                        const roundStart = new Date(round.start_time);
                                        const roundEnd = new Date(round.end_time);
                                        const isDone = now > roundEnd;
                                        const isLive = now >= roundStart && now <= roundEnd;
                                        const isLocked = now < roundStart;

                                        return (
                                            <div 
                                                key={round.id}
                                                className={cn(
                                                    "p-3 rounded-xl border flex items-center justify-between gap-4 transition-all",
                                                    isLive ? "bg-indigo-500/5 border-indigo-500/20" : "bg-zinc-900/30 border-white/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black",
                                                        isDone ? "bg-emerald-500/10 text-emerald-400" : 
                                                        isLive ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
                                                    )}>
                                                        {round.round_number}
                                                    </div>
                                                    <div className="space-y-0.5">
                                                        <p className={cn(
                                                            "text-[10px] font-black uppercase tracking-tight",
                                                            isLocked ? "text-zinc-600" : "text-zinc-200"
                                                        )}>
                                                            {round.title}
                                                        </p>
                                                        <p className="text-[8px] font-bold text-zinc-500 uppercase">
                                                            {new Date(round.start_time).toLocaleDateString()} • {round.type}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {isDone && <CheckCircle size={12} className="text-emerald-500" />}
                                                    {isLive && (
                                                        <>
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                                                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" /> LIVE
                                                            </div>
                                                            {round.requires_submission && (
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); router.push(`/student/event/${mission.id}`); }}
                                                                    className="px-3 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded hover:bg-zinc-200 transition-all active:scale-95"
                                                                >
                                                                    SUBMIT
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                    {isLocked && <Lock size={12} className="text-zinc-700" />}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest block">Active Phase</span>
                            <span className="text-xs font-black text-zinc-100 uppercase italic tracking-tight line-clamp-1">
                                {mission.next_milestone?.title || "Operational Finish"}
                            </span>
                        </div>
                        {mission.next_milestone && (
                            <div className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">
                                {mission.next_milestone.type}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <Button 
                            onClick={() => router.push(`/student/event/${mission.id}`)}
                            className="flex-1 h-9 bg-white text-black text-[8px] font-black uppercase tracking-[0.1em] hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                        >
                            WORKSPACE
                        </Button>
                        <div className="w-9 h-9 bg-zinc-900 border border-white/5 rounded-lg flex items-center justify-center text-zinc-500 group-hover:text-white transition-all">
                            <ArrowRight size={12} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamCard({ team, currentUserId, onUpdate }: { team: HubTeam; currentUserId: string; onUpdate: () => void }) {
    const isCaptain = team.leader_id === currentUserId;
    const [loading, setLoading] = useState(false);
    
    const deadlinePassed = team.reg_end_time ? new Date() > new Date(team.reg_end_time) : false;

    const handleKick = async (memberId: string) => {
        if (!confirm("Are you sure you want to remove this member from the team?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("registrations")
                .update({ team_id: null })
                .eq("team_id", team.id)
                .eq("student_id", memberId);
            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error("Error kicking member:", err);
            alert("Failed to remove member.");
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = async () => {
        if (deadlinePassed) {
            alert("Registration window has closed. You cannot leave the team now.");
            return;
        }
        if (!confirm("Are you sure you want to leave this team?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from("registrations")
                .update({ team_id: null })
                .eq("team_id", team.id)
                .eq("student_id", currentUserId);
            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error("Error leaving team:", err);
            alert("Failed to leave team.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (deadlinePassed) {
            alert("Registration window has closed. You cannot delete the team now.");
            return;
        }
        if (!confirm("CRITICAL: This will disband the entire team. Proceed?")) return;
        setLoading(true);
        try {
            // First clear team_id for all members
            const { error: clearError } = await supabase
                .from("registrations")
                .update({ team_id: null })
                .eq("team_id", team.id);
            if (clearError) throw clearError;

            // Delete the team record
            const { error: deleteError } = await supabase
                .from("teams")
                .delete()
                .eq("id", team.id);
            if (deleteError) throw deleteError;
            
            onUpdate();
        } catch (err) {
            console.error("Error deleting team:", err);
            alert("Failed to delete team.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 hover:border-cyan-500/30 transition-all duration-300 shadow-2xl relative overflow-hidden group">
            {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <Rocket className="w-6 h-6 text-cyan-500 animate-bounce" />
                </div>
            )}

            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{team.event_title}</p>
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">{team.name}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
                    <Users size={20} />
                </div>
            </div>

            <div className="space-y-4">
                <div className="space-y-3">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Team Operatives</p>
                    <div className="space-y-2">
                        {team.members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between group/member">
                                <div className="flex items-center gap-3">
                                    <Avatar 
                                        name={member.full_name} 
                                        src={member.avatar_url || undefined} 
                                        size="sm"
                                        className="border-2 border-zinc-900 shadow-xl"
                                    />
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-black text-white uppercase tracking-tight">
                                            {member.full_name}
                                            {member.id === team.leader_id && (
                                                <span className="ml-2 text-[8px] text-cyan-500 border border-cyan-500/20 px-1 rounded">CAPTAIN</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                
                                {isCaptain && member.id !== currentUserId && !deadlinePassed && (
                                    <button 
                                        onClick={() => handleKick(member.id)}
                                        className="p-1.5 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover/member:opacity-100"
                                        title="Kick Member"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {isCaptain && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-white/5">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest text-cyan-500/60">Tactical Join Code</p>
                            <p className="text-xs font-mono font-black text-white uppercase tracking-widest">{team.join_code}</p>
                        </div>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(team.join_code);
                                alert("Join code copied to clipboard");
                            }}
                            className="p-2 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-white transition-all"
                        >
                            <Copy size={12} />
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-2">
                {isCaptain ? (
                    <Button 
                        disabled={loading || deadlinePassed}
                        onClick={handleDelete}
                        variant="outline"
                        className="w-full border-zinc-800 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 text-[10px] font-black uppercase tracking-widest h-10 gap-2"
                    >
                        <Trash2 size={14} /> Delete Team
                    </Button>
                ) : (
                    <Button 
                        disabled={loading || deadlinePassed}
                        onClick={handleLeave}
                        variant="outline" 
                        className="w-full border-zinc-800 text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30 text-[10px] font-black uppercase tracking-widest h-10 gap-2"
                    >
                        <LogOut size={14} /> Leave Team
                    </Button>
                )}
            </div>
            
            {deadlinePassed && (
                <div className="pt-2">
                    <p className="text-[8px] font-bold text-rose-500/50 uppercase tracking-widest text-center">
                        Roster Locked: Enrollment Window Closed
                    </p>
                </div>
            )}
        </div>
    );
}

function CompletedCard({ mission }: { mission: HubEvent }) {
    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-8 flex items-center justify-between group hover:border-amber-500/20 transition-all duration-300">
            <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white tracking-tighter uppercase italic">{mission.title}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        <span>All Rounds Secured</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-800" />
                        <span className="text-amber-500/70">Ledger Verified</span>
                    </div>
                </div>
            </div>

            <Button className="h-12 px-8 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-widest transition-all">
                View Certificate
            </Button>
        </div>
    );
}

function EmptyState({ icon, title, description, cta }: { icon: React.ReactNode; title: string; description: string; cta?: React.ReactNode }) {
    return (
        <div className="col-span-full py-12 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-950/20">
            <div className="w-20 h-20 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center text-zinc-700">
                {icon}
            </div>
            <div className="space-y-1">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{title}</h3>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{description}</p>
                {cta}
            </div>
        </div>
    );
}
