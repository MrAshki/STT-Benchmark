import React from 'react';

// Use one stroke weight for all assistant controls.
const paths = {
  close:<path d="m6 6 12 12M18 6 6 18"/>,
  plus:<path d="M12 5v14M5 12h14"/>,
  expand:<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>,
  collapse:<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5"/>,
  sparkles:<><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z"/><path d="M20 2v4m-2-2h4"/></>,
  chat:<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2v-9.5A8.5 8.5 0 0 1 10.5 4H13a8 8 0 0 1 8 7.5ZM7 10h9m-9 4h6"/>,
  history:<><path d="M3 11a9 9 0 1 1 2.7 7M3 4v7h7"/><path d="M12 7v5l3 2"/></>,
  bookmark:<path d="M6 4h12v17l-6-4-6 4V4Z"/>,
  settings:<><path d="m9 3-.5 3-2 1-2.8-1L1.5 10l2.4 2-.1 2-2.3 2L4 20l3-1 2 1 .5 3h5l.5-3 2-1 3 1 2.5-4-2.4-2v-2l2.4-2L20 6l-3 1-2-1-.5-3Z" transform="translate(1 -1) scale(.92)"/><circle cx="12" cy="12" r="3"/></>,
  chart:<path d="M4 4v16h17M8 16v-4m5 4V8m5 8V5"/>,
  speed:<><path d="M4 18a9 9 0 1 1 16 0M12 13l5-5"/><circle cx="12" cy="14" r="1"/></>,
  text:<path d="M5 4h14M12 4v16M8 20h8M5 8V4m14 4V4"/>,
  layers:<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>,
  arrow:<path d="M5 12h14m-5-5 5 5-5 5"/>,
  back:<path d="M19 12H5m5-5-5 5 5 5"/>,
  chevron:<path d="m6 9 6 6 6-6"/>,
  user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  copy:<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
  edit:<path d="m15 4 5 5M3 21l5-1L21 7l-5-5L3 15Z"/>,
  like:<path d="M7 21H3V10h4m0 11V10l5-8c3 0 3 2 2 7h5a2 2 0 0 1 2 2l-2 8a2 2 0 0 1-2 2Z"/>,
  dislike:<path d="M7 3H3v11h4M7 3v11l5 8c3 0 3-2 2-7h5a2 2 0 0 0 2-2l-2-8a2 2 0 0 0-2-2Z"/>,
  speaker:<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>,
  retry:<path d="M20 7a9 9 0 1 0 1 8m0-12v6h-6"/>,
  file:<path d="M14 2H5v20h14V7Zm0 0v6h5M8 13h8m-8 4h6"/>,
  mic:<><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></>,
  key:<><circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-3-3 3-3m-6 0 3-3"/></>,
  attach:<path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2"/>,
  globe:<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>,
  check:<path d="m5 12 4 4L19 6"/>,
  stop:<rect x="6" y="6" width="12" height="12" rx="2"/>,
  send:<path d="m21 3-7 18-4-7-7-4 18-7Zm0 0L10 14"/>,
  shield:<><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
  download:<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>,
  search:<><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></>,
  trash:<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>,
};

export function ChatIcon({name}) {
  return <svg className={`stt-assistant-svg stt-assistant-svg-${name}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.info}</svg>;
}
