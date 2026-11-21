import type { CSSProperties } from 'react'

export type IconName = 'sparkles' | 'heart' | 'camera' | 'gallery' | 'undo' | 'reset' | 'sound' | 'muted' | 'close' | 'download' | 'trash' | 'arrow' | 'check' | 'brush' | 'comb' | 'snip' | 'grow' | 'curl' | 'soap' | 'wash' | 'blower' | 'color' | 'bow' | 'flower' | 'crown' | 'cherries' | 'star' | 'none' | 'help'

const paths: Record<IconName, React.ReactNode> = {
  sparkles: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /><path d="m20 2 .7 2.3L23 5l-2.3.7L20 8l-.7-2.3L17 5l2.3-.7Z" /></>,
  heart: <path d="M20.5 5.8c-2.6-2.6-6.4-1-8.5 1.5-2.1-2.5-5.9-4.1-8.5-1.5C-1 10.3 5 16 12 21c7-5 13-10.7 8.5-15.2Z" />,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><circle cx="12" cy="13" r="4" /><path d="M18 10h.1" /></>,
  gallery: <><rect x="4" y="3" width="17" height="17" rx="3" /><path d="m4 16 5-5 4 4 3-3 5 5M1 8v14h15" /><circle cx="16" cy="8" r="1" /></>,
  undo: <><path d="m9 4-6 6 6 5M3 10h10a7 7 0 0 1 0 14" transform="translate(0 -2)" /></>,
  reset: <><path d="M20 10a8 8 0 1 0-1.5 7M20 3v7h-7" /></>,
  sound: <><path d="M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" /></>,
  muted: <><path d="M3 9h4l5-5v16l-5-5H3ZM17 9l5 6m0-6-5 6" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L20 5" />,
  brush: <><path fill="#9ac5ad" d="M7 3h9a3 3 0 0 1 3 3v5a4 4 0 0 1-4 4h-1v6h-4v-6H9a4 4 0 0 1-4-4V6a3 3 0 0 1 2-3Z" /><path d="M9 6v5m3-5v5m3-5v5" /></>,
  comb: <><rect fill="#c3d8a9" x="2.5" y="3" width="19" height="6" rx="2.5" /><path d="M5 9v10m3.5-10v11m3.5-11v11m3.5-11v11M19 9v10" /></>,
  snip: <><circle fill="#f1aaa1" cx="6" cy="17" r="4" /><circle fill="#f1aaa1" cx="18" cy="17" r="4" /><path d="m8 14 9-12M16 14 7 2" /><circle cx="12" cy="9" r="1" fill="currentColor" /></>,
  grow: <><path fill="#e5afc8" d="M9 3h6v6l5 8c1 2 0 4-3 4H7c-3 0-4-2-3-4l5-8Z" /><path d="M8 3h8M7 14h10m-5 1v4m-2-2h4" /></>,
  curl: <><path fill="#edce87" d="m8 4 5-2 6 15-5 2Z" /><path d="m14 19 1 3M5 6c-7 5 7 5 0 11M12 5l4-2" /></>,
  soap: <><rect x="2" y="10" width="19" height="11" rx="5" fill="#efb7c3" /><path d="M7 14h9m-8 3h6" stroke="#b57c94" /><circle cx="7" cy="6" r="3" fill="#f4fffc" /><circle cx="16" cy="4" r="2" fill="#d8eff0" /><circle cx="20" cy="8" r="2.5" fill="#f4fffc" /></>,
  blower: <><path d="m8 12 1 9h5l-2-10" fill="#b5a0d8" /><path d="M14 5 21 3v11l-7-2" fill="#bad9de" /><rect x="2" y="3" width="14" height="11" rx="5" fill="#9ccbd2" /><circle cx="7" cy="8.5" r="2" fill="#effcfc" /><path d="M11 21v2m12-17h1m-1 5h1" /></>,
  wash: <><path fill="#b2d3df" d="M4 8a6 6 0 0 1 12 0v2H4Z" /><path d="M16 8h4v14M5 14v2m5-2v3m5-3v2M5 20v1m5 0v1" /></>,
  color: <><path fill="#b9a4d4" d="m15 2 7 7-10 10-7-7Z" /><path d="m5 12-3 3v7h7l3-3M13 4l7 7M3 18l3 3" /></>,
  bow: <><path fill="#e6a1af" d="M10 10C-2-2 0 26 10 14m4-4c12-12 10 16 0 4" /><rect fill="#f3bbc3" x="9" y="9" width="6" height="7" rx="2" /></>,
  flower: <><path fill="#f1c5ad" d="M12 9C2-5-5 12 9 12-5 22 12 29 12 15c10 14 17-3 3-3C29 2 12-5 12 9Z" /><circle fill="#e6ba60" cx="12" cy="12" r="3" /></>,
  crown: <><path fill="#eccd79" d="m3 7 5 4 4-8 4 8 5-4-2 13H5Z" /><path d="M5 16h14" /></>,
  cherries: <><circle fill="#d87c80" cx="6" cy="17" r="4" /><circle fill="#d87c80" cx="18" cy="17" r="4" /><path d="M6 13 12 3l6 10M12 3c9-4 9 6 0 0Z" /></>,
  star: <path fill="#ebca7b" d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z" />,
  none: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.01" /></>,
}

export function Icon({ name, size = 22, style }: { name: IconName; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>
}
