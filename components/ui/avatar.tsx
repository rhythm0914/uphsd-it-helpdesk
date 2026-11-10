"use client";

import * as React from "react";
import Image from "next/image";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<string, string> = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export function Avatar({
  src,
  name,
  size = "md",
  className = "",
  ...props
}: AvatarProps) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  return (
    <div
      {...props}
      className={`relative shrink-0 ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size === "sm" ? 24 : size === "md" ? 32 : 40}
          height={size === "sm" ? 24 : size === "md" ? 32 : 40}
          className="rounded-full object-cover"
          priority
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-100 text-neutral-600 font-medium">
          {initials}
        </div>
      )}
    </div>
  );
}