"use client";

import { VenueRegistry } from "@/components/venues/VenueRegistry";

export default function VenueRegistryPage() {
    return (
        <main className="flex-1 p-6 space-y-12 bg-[#09090b] min-h-screen font-sans text-white">
            <VenueRegistry />
        </main>
    );
}
