import Image from 'next/image';

type LoaderProps = {
  label?: string;
  detail?: string;
  fullScreen?: boolean;
};

const Loader = ({
  label = 'Getting everything ready',
  detail = 'Connecting you securely to Vaartalav',
  fullScreen = true,
}: LoaderProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`flex w-full items-center justify-center px-5 ${
        fullScreen ? 'min-h-[100dvh]' : 'min-h-[280px]'
      }`}
    >
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/[0.09] bg-[#121a2a]/90 p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 size-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
          <span className="absolute inset-0 rounded-[26px] border border-blue-300/20 animate-ping motion-reduce:animate-none" />
          <span className="absolute inset-1 rounded-[22px] border border-t-blue-300/90 border-r-blue-300/20 border-b-cyan-300/60 border-l-blue-300/20 animate-spin motion-reduce:animate-none" />
          <span className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/25 to-cyan-400/10 ring-1 ring-white/10">
            <Image src="/icons/logo.svg" alt="" width={34} height={34} priority />
          </span>
        </div>

        <p className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200/70">
          Vaartalav
        </p>
        <h2 className="relative mt-2 text-lg font-semibold tracking-tight text-white sm:text-xl">
          {label}
        </h2>
        <p className="relative mt-2 text-sm leading-6 text-slate-400">{detail}</p>

        <div className="relative mx-auto mt-7 h-1 w-44 overflow-hidden rounded-full bg-white/[0.08]">
          <span className="absolute inset-y-0 left-0 w-1/2 rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 animate-[loading-bar_1.5s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};

export default Loader;
