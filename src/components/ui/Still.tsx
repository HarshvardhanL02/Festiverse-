/** A pre-rendered still of the Ayodhya scene (rendered from our own 3D engine), with a portrait variant for phones. */
export function Still({ id, className = '', eager = false, alt = '' }: { id: 'act1' | 'act2' | 'act3' | 'act4'; className?: string; eager?: boolean; alt?: string }) {
  return (
    <picture>
      <source media="(orientation: portrait) and (max-width: 900px)" srcSet={`/stills/${id}-portrait.webp`} />
      <img src={`/stills/${id}.webp`} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`object-cover ${className}`} />
    </picture>
  )
}
