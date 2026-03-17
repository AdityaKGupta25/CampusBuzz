"use client";

import React, { useState, useEffect } from "react";
import { Radio, Send, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface Registration {
    id: string;
    student_id: string;
    student?: { full_name: string; email: string };
}

interface BroadcastHistory {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

interface BroadcastTabProps {
    eventId: string;
    eventTitle?: string;
    registrations: Registration[];
    readOnly?: boolean;
}

export function BroadcastTab({ eventId, eventTitle, registrations, readOnly }: BroadcastTabProps) {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [history, setHistory] = useState<BroadcastHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const loadHistory = async () => {
        setLoadingHistory(true);
        const { data, error } = await supabase
            .from("notifications")
            .select("id, title, message, created_at")
            .eq("related_event_id", eventId)
            .eq("type", "broadcast")
            .order("created_at", { ascending: false });
        
        // Group by title and message since we inserted identical broadcasts per user
        if (data) {
            const uniqueHistory: BroadcastHistory[] = [];
            const seen = new Set();
            for (const n of data) {
                const key = n.title + n.message + new Date(n.created_at).getHours();
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueHistory.push(n);
                }
            }
            setHistory(uniqueHistory);
        }
        setLoadingHistory(false);
    };

    useEffect(() => {
        loadHistory();
    }, [eventId]);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim() || registrations.length === 0) return;
        
        setSending(true);
        try {
            // Deduplicate students
            const studentIds = Array.from(new Set(registrations.map(r => r.student_id)));
            
            const notifications = studentIds.map(sid => ({
                user_id: sid,
                title: title.trim(),
                message: message.trim(),
                type: "broadcast",
                related_event_id: eventId,
                is_read: false
            }));

            // Insert in batches if very large, but Supabase standard payload is max 2MB (or 1000s of rows)
            const { error } = await supabase.from("notifications").insert(notifications);
            
            if (error) throw error;
            
            setTitle("");
            setMessage("");
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            loadHistory();
        } catch (error: any) {
            console.error("Broadcast Error:", error);
            alert("Failed to send broadcast: " + error.message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-12 pb-20 max-w-4xl">
            <header>
                <h2 className="text-3xl font-black text-white tracking-tighter">Broadcast Center</h2>
                <p className="text-zinc-500 text-sm font-medium mt-1">Announce updates dynamically to all {registrations.length} registered students.</p>
            </header>

            <form onSubmit={handleBroadcast} className="bg-zinc-900/50 border border-white/5 rounded-[2.5rem] p-10 space-y-8">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Announcement Subject</label>
                    <input
                        type="text"
                        required
                        disabled={readOnly || sending}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g., Round 1 Results Are Out!"
                        className="w-full bg-zinc-950 border border-white/5 rounded-2xl p-6 text-sm font-black text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Transmission Payload</label>
                    <textarea
                        required
                        disabled={readOnly || sending}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Message details..."
                        className="w-full bg-zinc-950 border border-white/5 rounded-[2rem] p-8 text-sm font-medium text-white focus:outline-none focus:border-indigo-500/50 min-h-[160px] resize-none transition-all placeholder:text-zinc-700 leading-relaxed italic"
                    />
                </div>

                <button
                    type="submit"
                    disabled={readOnly || sending || registrations.length === 0}
                    className="w-full h-16 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/10 disabled:opacity-50"
                >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : success ? <CheckCircle2 size={16} /> : <Radio size={16} />}
                    {success ? "Payload Delivered" : "Initialize Transmission"}
                </button>
            </form>

            <div className="space-y-6">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Communication Log</label>
                
                {history.length > 0 ? (
                    <div className="space-y-4">
                        {history.map((h, idx) => (
                            <div key={idx} className="bg-zinc-950 border border-white/5 rounded-3xl p-6 flex gap-6 group hover:border-indigo-500/20 transition-all">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                    <Send size={16} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-white">{h.title}</h4>
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed italic">{h.message}</p>
                                    <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                                        <Clock size={10} />
                                        {new Date(h.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 border border-white/5 rounded-3xl text-center">
                        <p className="text-xs font-bold text-zinc-600 uppercase tracking-widest">No previous broadcasts.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
