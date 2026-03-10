// ============================================================
// FELT BOARD WRAPPER — dark textured container
// ============================================================
// Reusable visual wrapper with felt texture, grooves, and noise.
// Used by BeanLibrary and BeanPicker for the letterboard aesthetic.
// fullPage: removes margins, rounded corners, border — fills viewport.
//
// FELT TEXTURE
// Two-layer groove system: prominent ridges every 18px with fine fiber
// texture between them. Letters sit on top, casting shadows downward.
// Text spacing is independent of groove pitch.

import { useId } from 'react'

export default function FeltBoard({ children, fullPage }) {
  const filterId = useId()
  return (
    <div className={fullPage ? '' : '-mx-4 md:-mx-0'}>
      <div
        className={`bg-felt-800 relative overflow-hidden
                    shadow-[0_2px_20px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.03)]
                    ${fullPage ? 'min-h-screen' : 'rounded-none md:rounded-xl border-0 md:border-8 md:border-felt-700'}`}
      >
        {/* Felt ridges — horizontal rails every 18px */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg,
              transparent 0px, transparent 14px,
              rgba(0,0,0,0.25) 14px, rgba(0,0,0,0.4) 15px,
              rgba(255,255,255,0.04) 16px, transparent 17px, transparent 18px)`,
          }}
        />
        {/* Fine felt fiber texture between ridges */}
        <div
          className="absolute inset-0 z-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg,
              rgba(0,0,0,0.12) 0px, transparent 0.5px, transparent 3px)`,
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
