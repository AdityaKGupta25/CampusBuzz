"use client";

import React, { use } from "react";
import { ClubProfile } from "@/components/clubs/ClubProfile";

export default function GlobalClubProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <ClubProfile id={id} />;
}
