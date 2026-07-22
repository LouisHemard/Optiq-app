import type { LucideIcon } from 'lucide-react';

interface ExifBadgeProps {
  icon: LucideIcon;
  label: string;
  tooltip: { title: string; description: string };
}

export function ExifBadge({ icon: Icon, label, tooltip }: ExifBadgeProps) {
  return (
    <div className="relative group/exif inline-flex">
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-700/80 text-gray-300 text-xs cursor-default">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-[120px]">{label}</span>
      </span>

      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-56 px-3 py-2.5 rounded-xl bg-gray-950 border border-gray-700 opacity-0 group-hover/exif:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-xl shadow-black/40 whitespace-normal">
        <p className="text-xs font-semibold text-white mb-0.5">{tooltip.title}</p>
        <p className="text-xs text-gray-400 leading-relaxed">{tooltip.description}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-700" />
      </div>
    </div>
  );
}
