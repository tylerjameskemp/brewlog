// ============================================================
// FELT BOARD WRAPPER — dark textured container
// ============================================================
// Reusable visual wrapper with felt texture, grooves, and noise.
// Used by BeanLibrary and BeanPicker for the letterboard aesthetic.
// fullPage: removes margins, rounded corners, border — fills viewport.

import { useId } from 'react'

export default function FeltBoard({ children, fullPage }) {
  const filterId = useId()
  return (
    <div className={fullPage ? '' : '-mx-4 md:-mx-0'}>
      <div className={`bg-felt-800 relative overflow-hidden
                      shadow-[0_2px_20px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.03)]
                      ${fullPage ? 'min-h-screen' : 'rounded-none md:rounded-xl border-0 md:border-8 md:border-felt-700'}`}>
        {/* Felt grooves (primary + fine secondary) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg,
              rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.12) 1px,
              rgba(255,255,255,0.02) 1.5px, transparent 2px, transparent 4.5px),
              repeating-linear-gradient(180deg,
              rgba(0,0,0,0.08) 0px, transparent 0.5px, transparent 2.2px)`,
          }}
        />
        {/* Felt noise */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-[0.12]">
          <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="5" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter={`url(#${filterId})`} />
        </svg>
        <div className="relative z-[1]">
          {children}
        </div>
      </div>
    </div>
  )
}
