"use client";

import React from "react";
import { ExploreFeed } from "@/components/explore/ExploreFeed";

export default function HodExplorePage() {
    return (
        <main className="flex-1 flex flex-col min-h-screen">
            <ExploreFeed />
        </main>
    );
}
