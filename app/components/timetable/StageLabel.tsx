"use client";

interface StageLabelProps {
    name: string;
    stageHost: string | null;
}

export function StageLabel({ name, stageHost }: StageLabelProps) {
    return (
        <div
            className="sticky left-0 w-36 md:w-44 shrink-0 bg-background z-10
                       flex flex-col justify-center px-3 border-r border-border"
        >
            <span className="text-xs md:text-sm font-medium truncate" title={name}>
                {name}
            </span>
            {stageHost && (
                <span className="text-[10px] md:text-xs italic text-muted-foreground truncate" title={`Hosted by: ${stageHost}`}>
                    Hosted by: {stageHost}
                </span>
            )}
        </div>
    );
}
