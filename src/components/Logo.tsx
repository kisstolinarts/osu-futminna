interface LogoProps {
  /** Renders the full lockup (mark + wordmark). */
  full?: boolean;
  size?: number;
  dark?: boolean;
}

export default function Logo({ full = false, size = 40, dark = false }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/logo.png"
        alt="OSU FUTMinna logo"
        width={size}
        height={size}
        className="h-auto rounded-lg object-contain"
        style={{ width: size }}
      />
      {full && (
        <span className="flex flex-col leading-tight">
          <span className={`text-base font-extrabold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
            OSU <span className="text-fuchsia-600">FUTMinna</span>
          </span>
          <span className={`text-[11px] font-medium ${dark ? 'text-white/60' : 'text-slate-500'}`}>
            Offa Student Union · FUT Minna Chapter
          </span>
        </span>
      )}
    </span>
  );
}
