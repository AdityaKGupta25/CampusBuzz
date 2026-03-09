"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  BarChart3,
  Users,
  ArrowRight,
  LayoutDashboard,
  CheckCircle2,
  Building2,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-500/30 overflow-x-hidden">

      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150 brightness-50 mix-blend-overlay" />
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-50 flex items-center justify-between px-6 md:px-12 py-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-full.png"
            alt="CampusBuzz Logo"
            width={180}
            height={60}
            className="object-contain h-10 w-auto"
            priority
          />
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/login"
            className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-32">
        <div className="flex flex-col items-center text-center space-y-12">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/50 border border-zinc-800 backdrop-blur-md"
          >
            <Shield size={14} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
              Institutional Governance Engine v2.0
            </span>
          </motion.div>

          {/* Headline */}
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl md:text-8xl font-black tracking-tighter italic leading-[0.9]"
            >
              Orchestrating <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-white">
                Campus Intelligence.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed"
            >
              The unified operating system for high-performance institutional ecosystems.
              From event lifecycles to sovereign governance, CampusBuzz automates excellence.
            </motion.p>
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              href="/login"
              className="h-16 px-10 rounded-[2rem] bg-white text-zinc-950 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] group"
            >
              Initialize Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="h-16 px-10 rounded-[2rem] bg-zinc-900/50 border border-zinc-800 flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest hover:bg-zinc-900 transition-all"
            >
              Explore Capabilities
            </Link>
          </motion.div>

          {/* Visual Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-full max-w-5xl mt-12 bg-zinc-900/30 border border-zinc-800 rounded-[3rem] p-4 shadow-2xl relative"
          >
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent blur-sm" />
            <div className="bg-zinc-950 rounded-[2.5rem] aspect-[16/9] overflow-hidden border border-zinc-800/50 flex flex-col">
              {/* Mock UI Header */}
              <div className="h-12 border-b border-zinc-900 flex items-center px-6 justify-between bg-zinc-950/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-800" />
                </div>
                <div className="text-[9px] font-black tracking-widest text-zinc-700 uppercase">SECURE ADMIN INTERFACE</div>
                <div className="w-8" />
              </div>
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                <Building2 size={120} className="text-zinc-900/50 absolute top-[10%] right-[10%] rotate-12" />
                <LayoutDashboard size={100} className="text-zinc-900/50 absolute bottom-[10%] left-[10%] -rotate-12" />
                <div className="text-center space-y-4">
                  <div className="w-24 h-24 rounded-3xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-6">
                    <Zap size={32} className="text-amber-400" />
                  </div>
                  <h4 className="text-2xl font-black italic tracking-tighter">Campus Command Center</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">Pending Authorization Required</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 py-32 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<BarChart3 className="text-indigo-400" />}
            title="Autonomous Governance"
            desc="Multi-tier approval workflows involving Students, Faculty, HODs, and Admin with verifiable audit trails."
          />
          <FeatureCard
            icon={<Zap className="text-amber-400" />}
            title="Hyper-Portal Performance"
            desc="Blazing fast dashboard metrics and real-time event discovery tailored for modern campus requirements."
          />
          <FeatureCard
            icon={<Users className="text-emerald-400" />}
            title="Sovereign Management"
            desc="Complete control over institutional clusters, venues, and registered clubs within a private ecosystem."
          />
        </div>
      </section>

      {/* ── Social Proof / Numbers ── */}
      <section className="relative z-10 py-32 border-t border-zinc-900 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-3xl font-black italic tracking-tight">Standardizing Campus Life.</h2>
              <p className="text-zinc-500 text-sm max-w-md font-medium">Trusted by leading educational institutions to manage thousands of events and student interactions securely.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatBox label="Active Users" value="25k+" />
              <StatBox label="Events Hosted" value="1.2k+" />
              <StatBox label="Institutions" value="12" />
              <StatBox label="Certificates" value="50k+" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 py-40 flex items-center justify-center">
        <div className="text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter max-w-3xl mx-auto px-6">
            Ready to revolutionize <br /> your campus experience?
          </h2>
          <Link
            href="/login"
            className="inline-flex h-16 px-12 rounded-[2rem] bg-indigo-500 text-white items-center justify-center gap-3 font-black text-sm uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-[0_30px_60px_rgba(99,102,241,0.3)]"
          >
            Initialize Identity <CheckCircle2 size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-zinc-900 py-12 px-6 md:px-12 bg-zinc-950">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Image
              src="/logo-full.png"
              alt="CampusBuzz Logo"
              width={140}
              height={50}
              className="object-contain h-8 w-auto opacity-40grayscale transition-all hover:grayscale-0 hover:opacity-100"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">© 2026 CampusBuzz Infrastructure</p>
          </div>
          <div className="flex gap-8">
            <FooterLink label="Governance" />
            <FooterLink label="Security" />
            <FooterLink label="Terms" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-10 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 hover:border-white/10 transition-all group">
      <div className="w-14 h-14 rounded-2xl bg-zinc-950 border border-white/5 flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-black italic tracking-tight mb-4">{title}</h3>
      <p className="text-zinc-500 text-sm font-medium leading-relaxed">{desc}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center space-y-1">
      <p className="text-3xl font-black italic tracking-tighter text-white">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{label}</p>
    </div>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <a href="#" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4">
      {label}
    </a>
  );
}
