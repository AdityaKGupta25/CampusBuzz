"use client";

import React from "react";
import { CheckCircle2, RefreshCw, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function ConfirmModal({
    event,
    action,
    comment,
    onCommentChange,
    onConfirm,
    onCancel,
    isLoading = false,
    error = null,
}: {
    event: any;
    action: "approve" | "reject" | "request_changes" | "update_remark" | "request_archive";
    comment: string;
    onCommentChange: (v: string) => void;
    onConfirm: () => void | Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | null;
}) {
    const isApprove = action === "approve";
    const isRequest = action === "request_changes";
    const isReject = action === "reject";
    const isUpdateNote = action === "update_remark";
    const isArchiveReq = action === "request_archive";

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative bg-[#161625] border border-white/10 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div
                    className={cn(
                        "px-6 py-5 border-b",
                        isApprove ? "bg-emerald-500/10 border-emerald-500/20" :
                            (isRequest || isUpdateNote) ? "bg-amber-500/10 border-amber-500/20" :
                                isArchiveReq ? "bg-orange-500/10 border-orange-500/20" :
                                    "bg-red-500/10 border-red-500/20"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {isApprove ? (
                            <CheckCircle2 size={22} className="text-emerald-400" />
                        ) : (isRequest || isUpdateNote) ? (
                            <RefreshCw size={22} className="text-amber-400" />
                        ) : isArchiveReq ? (
                            <AlertCircle size={22} className="text-orange-400" />
                        ) : (
                            <XCircle size={22} className="text-red-400" />
                        )}
                        <div>
                            <h3
                                className={cn(
                                    "font-bold text-base",
                                    isApprove ? "text-emerald-400" : (isRequest || isUpdateNote) ? "text-amber-400" : isArchiveReq ? "text-orange-400" : "text-red-400"
                                )}
                            >
                                {isApprove ? "Approve Event" :
                                    isRequest ? "Request Changes" :
                                        isUpdateNote ? "Update Remark" :
                                            isArchiveReq ? "Request Final Lock" :
                                                "Reject Event"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">{event.title}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-slate-400">
                        {isApprove
                            ? "Approving will advance this event to the next governance stage. The faculty will be notified immediately."
                            : isRequest
                                ? "The faculty will be notified to make adjustments. The event will return to their dashboard as a draft."
                                : isUpdateNote
                                    ? "This will update the internal remark visible to the faculty member without changing the event's status."
                                    : isArchiveReq
                                        ? "This will notify the faculty that the event is completed and should be archived for institutional records."
                                        : "Rejecting will return this event to draft status. The faculty will be notified with your reasoning."}
                    </p>

                    <div>
                        <label className="text-sm font-medium text-slate-300 block mb-1.5">
                            {isApprove ? "Approval Note" : (isRequest || isUpdateNote) ? "Feedback / Note" : isArchiveReq ? "Archive Request Message" : "Rejection Reason"}
                            {!isApprove && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                            id={`modal-comment-${action}`}
                            rows={3}
                            value={comment}
                            onChange={(e) => onCommentChange(e.target.value)}
                            placeholder={
                                isApprove
                                    ? "Optional — add any conditions or notes..."
                                    : "Required — be clear and concise..."
                            }
                            className={cn(
                                "w-full rounded-xl border px-3.5 py-2.5 text-sm text-white border-white/10",
                                "resize-none focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-600 focus:ring-indigo-500 transition-all shadow-inner bg-white/5"
                            )}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 space-y-3">
                    {/* Inline action error */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-xs text-red-400">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3 justify-end">
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={onCancel}
                            id="modal-cancel"
                            disabled={isLoading}
                            className="bg-white/5 border-white/10 text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            id={`modal-confirm-${action}`}
                            size="md"
                            loading={isLoading}
                            className={
                                isApprove
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-black font-bold"
                                    : (isRequest || isUpdateNote) ? "bg-amber-500 hover:bg-amber-400 text-black font-bold" :
                                        isArchiveReq ? "bg-orange-500 hover:bg-orange-400 text-black font-bold" :
                                            "bg-red-600 hover:bg-red-500 text-white font-bold"
                            }
                            onClick={() => void onConfirm()}
                        >
                            {isApprove ? "Confirm Approval" :
                                isRequest ? "Send Change Request" :
                                    isUpdateNote ? "Update Remark" :
                                        isArchiveReq ? "Send Archive Request" :
                                            "Confirm Rejection"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
