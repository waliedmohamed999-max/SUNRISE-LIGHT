import { cx } from "@/components/ui";

/** Small isometric pictogram for each packaging structure (engine). */
export function TemplateGlyph({ engineKey, className }: { engineKey: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cx("size-11 shrink-0 rounded-lg bg-paper-200 p-1.5", className)} aria-hidden>
      {engineKey === "cup" ? (
        <>
          <path d="M15 12h18l-3 32H18z" fill="#F4EADB" />
          <path d="M16.3 22h15.4l-.9 10H17.2z" fill="#EA5B32" />
          <ellipse cx="24" cy="12" rx="9" ry="2.6" fill="#E9DCC9" stroke="#C9B79C" strokeWidth="1" />
        </>
      ) : engineKey === "round" ? (
        <>
          <circle cx="24" cy="25" r="15" fill="#EA5B32" />
          <circle cx="24" cy="25" r="10.5" fill="none" stroke="#FFEDD7" strokeWidth="1.5" />
          <path d="M33 15l6-4" stroke="#C9B79C" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : engineKey === "sheet" ? (
        <>
          <path d="M12 9h20l6 6v25H12z" fill="#FBF7F0" stroke="#C9B79C" strokeWidth="1" />
          <circle cx="19" cy="18" r="4" fill="#EA5B32" />
          <circle cx="30" cy="18" r="4" fill="#2F357C" />
          <circle cx="19" cy="30" r="4" fill="#C9A06B" />
          <circle cx="30" cy="30" r="4" fill="#EA5B32" />
        </>
      ) : engineKey === "ste" ? (
        <>
          <path d="M18 10 26 6 32 9 24 13z" fill="#F5A623" />
          <path d="M18 10 24 13 24 44 18 41z" fill="#e8dcc8" />
          <path d="M24 13 32 9 32 40 24 44z" fill="#c9b79c" />
          <path d="M18 41 24 44 32 40 30 46 22 47z" fill="#F5A623" opacity=".6" />
        </>
      ) : engineKey === "telescope" ? (
        <>
          <path d="M6 22 24 30 42 22 42 36 24 44 6 36z" fill="#3a2a1c" />
          <path d="M5 18 24 26 43 18 43 24 24 32 5 24z" fill="#C2470C" />
          <path d="M5 18 24 10 43 18 24 26z" fill="#E2560A" />
        </>
      ) : engineKey === "drawer" ? (
        <>
          <path d="M8 22 26 30 26 40 8 32z" fill="#e8dcc8" />
          <path d="M14 20 32 12 42 17 24 25z" fill="#3a2a1c" />
          <path d="M24 25 42 17 42 27 24 35z" fill="#2a1d14" />
          <path d="M8 22 24 15 26 30z" fill="#c9b79c" />
        </>
      ) : engineKey === "clamshell" ? (
        <>
          <path d="M6 30 24 38 42 30 42 36 24 44 6 36z" fill="#B78B59" />
          <path d="M6 30 24 22 42 30 24 38z" fill="#8a6440" />
          <path d="M6 24 24 16 42 24 24 32z" fill="#D9BC94" />
          <path d="M6 24 24 32 24 36 6 28z" fill="#C79A6B" />
        </>
      ) : engineKey === "pizza" ? (
        <>
          <path d="M6 28 24 36 42 28 42 32 24 40 6 32z" fill="#B78B59" />
          <path d="M6 28 24 20 42 28 24 36z" fill="#D9BC94" />
          <circle cx="24" cy="28" r="5" fill="none" stroke="#C2470C" strokeWidth="1.5" />
        </>
      ) : engineKey === "bag" ? (
        <>
          <path d="M14 18 24 22 24 44 14 40z" fill="#9C7547" />
          <path d="M24 22 36 17 36 39 24 44z" fill="#C79A6B" />
          <path d="M27 21c0-8 7-8 7-1" fill="none" stroke="#6E4625" strokeWidth="1.6" />
        </>
      ) : engineKey === "tray" ? (
        <>
          <path d="M6 24 24 32 42 24 42 32 24 40 6 32z" fill="#B78B59" />
          <path d="M6 24 24 16 42 24 24 32z" fill="#4a3220" />
          <path d="M10 24 24 18 38 24 24 30z" fill="#8a6440" />
        </>
      ) : engineKey === "mailer" ? (
        <>
          <path d="M8 26 24 34 40 26 40 38 24 46 8 38z" fill="#B78B59" />
          <path d="M8 26 24 18 40 26 24 34z" fill="#D9BC94" />
          <path d="M8 26 24 18 26 6 10 14z" fill="#C9A06B" />
        </>
      ) : engineKey === "rte" ? (
        <>
          <path d="M16 12 26 8 34 12 24 16z" fill="#F5A623" />
          <path d="M16 12 24 16 24 44 16 40z" fill="#14283F" />
          <path d="M24 16 34 12 34 40 24 44z" fill="#23405F" />
        </>
      ) : (
        <>
          <path d="M6 18 24 10 42 18 24 26z" fill="#D9BC94" />
          <path d="M6 18 24 26 24 44 6 36z" fill="#B78B59" />
          <path d="M24 26 42 18 42 36 24 44z" fill="#9C7547" />
          <path d="M15 14 33 22" stroke="#8a6a44" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}
