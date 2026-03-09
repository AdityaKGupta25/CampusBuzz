"use client";

import React from "react";
import { ClubsDirectory } from "@/components/clubs/ClubsDirectory";

export default function FacultyClubsPage() {
    return (
        <main className="flex-1 overflow-y-auto">
            <ClubsDirectory rolePrefix="/faculty" />
        </main>
    );
}
