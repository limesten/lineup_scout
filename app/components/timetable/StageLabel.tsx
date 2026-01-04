"use client";

interface StageLabelProps {
    name: string;
}

export function StageLabel({ name }: StageLabelProps) {
    return (
        <div
            className="sticky left-0 w-36 md:w-44 shrink-0 bg-background z-10
                       flex items-center px-3 border-r border-border"
        >
            <span className="text-xs md:text-sm font-medium truncate" title={name}>
                {name}
            </span>
        </div>
    );
}
