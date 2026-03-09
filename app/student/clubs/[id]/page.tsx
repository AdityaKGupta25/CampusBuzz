"use client";

import React, { use } from "react";
import { ClubProfile } from "@/components/clubs/ClubProfile";

export default function StudentClubProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <main className="flex-1 overflow-y-auto">
            <ClubProfile id={id} rolePrefix="/student" />
        </main>
    );
}
