"use client";

import React from "react";
import { useFormStatus } from "react-dom";
import { Spinner } from "@/components/Spinner";

interface SubmitButtonProps {
  idleText: string;
  pendingText?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SubmitButton({
  idleText,
  pendingText = "Đang lưu dữ liệu...",
  className = "btn-primary",
  style,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} style={style}>
      {pending ? (
        <>
          <Spinner size={15} />
          <span>{pendingText}</span>
        </>
      ) : (
        idleText
      )}
    </button>
  );
}
