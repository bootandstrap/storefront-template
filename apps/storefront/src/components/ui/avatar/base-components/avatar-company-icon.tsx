"use client";

import { cx } from "@/lib/utils/cn";
import Image from "next/image";

const sizes = {
    xs: "size-2",
    sm: "size-3",
    md: "size-3.5",
    lg: "size-4",
    xl: "size-4.5",
    "2xl": "size-5 ring-[1.67px]",
};

interface AvatarCompanyIconProps {
    size: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
    src: string;
    alt?: string;
}

export const AvatarCompanyIcon = ({ size, src, alt = "" }: AvatarCompanyIconProps) => (
    <Image
        src={src}
        alt={alt}
        width={20}
        height={20}
        unoptimized
        className={cx("bg-brand-25 absolute -right-0.5 -bottom-0.5 rounded-full object-cover ring-[1.5px] ring-bg-brand", sizes[size])}
    />
);
