"use client";

export function AudioVisualizer({ className = "" }: { className?: string }) {
    const bars = [
        { height: 12, animationClass: 'visualizer-bar-1' },
        { height: 20, animationClass: 'visualizer-bar-2' },
        { height: 16, animationClass: 'visualizer-bar-3' },
        { height: 24, animationClass: 'visualizer-bar-4' },
        { height: 14, animationClass: 'visualizer-bar-5' }
    ];
    
    return (
        <div className={`inline-flex items-end gap-[1px] ${className}`}>
            {bars.map((bar, i) => (
                <div
                    key={i}
                    className={`w-[2px] bg-primary/80 rounded-full ${bar.animationClass}`}
                    style={{
                        height: `${bar.height}px`,
                        transformOrigin: 'bottom'
                    }}
                />
            ))}
        </div>
    );
}
