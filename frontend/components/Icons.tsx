import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ArrowRight = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUpRight = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const ArrowLeft = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

export const Download = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </svg>
);

export const Send = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <path d="M5 12h13M12 5l7 7-7 7" />
  </svg>
);

export const Sparkle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M12 2.5c.4 4.6 2.9 7.1 7.5 7.5-4.6.4-7.1 2.9-7.5 7.5-.4-4.6-2.9-7.1-7.5-7.5 4.6-.4 7.1-2.9 7.5-7.5Zm6.5 12c.2 2 1.3 3.1 3.3 3.3-2 .2-3.1 1.3-3.3 3.3-.2-2-1.3-3.1-3.3-3.3 2-.2 3.1-1.3 3.3-3.3Z" />
  </svg>
);

export const Mail = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...stroke} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </svg>
);

export const GitHub = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

export const LinkedIn = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
);

export const Kaggle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M18.83 23.73c-.02.18-.12.27-.31.27h-3.13c-.19 0-.35-.08-.48-.25l-5.17-6.57-1.44 1.37v5.08c0 .25-.12.37-.37.37H5.49c-.25 0-.37-.12-.37-.37V.37c0-.25.12-.37.37-.37h2.44c.25 0 .37.12.37.37v14.47l6.24-6.31c.14-.14.29-.21.46-.21h3.25c.15 0 .25.06.3.19.06.15.04.26-.05.33l-6.6 6.39 6.88 8.17c.09.1.11.21.05.33Z" />
  </svg>
);

export const XLogo = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
  </svg>
);

export const Npm = (p: IconProps) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" {...p}>
    <path d="M1.76 0h20.48C23.21 0 24 .79 24 1.76v20.48c0 .97-.79 1.76-1.76 1.76H1.76C.79 24 0 23.21 0 22.24V1.76C0 .79.79 0 1.76 0Zm3.04 19.2h7.2V8h3.6v11.2h3.6V4.8H4.8v14.4Z" />
  </svg>
);

export function SocialIcon({ platform, ...p }: { platform: string } & IconProps) {
  const key = platform.toLowerCase();
  if (key.includes("github")) return <GitHub {...p} />;
  if (key.includes("linkedin")) return <LinkedIn {...p} />;
  if (key.includes("kaggle")) return <Kaggle {...p} />;
  if (key.includes("twitter") || key.startsWith("x")) return <XLogo {...p} />;
  if (key.includes("mail")) return <Mail {...p} />;
  return <ArrowUpRight {...p} />;
}
