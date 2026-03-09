"use client";

import React from "react";
import { ClubsDirectory } from "@/components/clubs/ClubsDirectory";

export default function StudentClubsPage() {
    return (
        <main className="flex-1 overflow-y-auto">
            <ClubsDirectory rolePrefix="/student" />
        </main>
    );
}
