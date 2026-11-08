import { useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

const SETS = {
  sandstone: ['/textures/sandstone_diff.webp', '/textures/sandstone_nor.webp', '/textures/sandstone_arm.webp'],
  pavement: ['/textures/pavement_diff.webp', '/textures/pavement_nor.webp', '/textures/pavement_arm.webp'],
  marble: ['/textures/marble_diff.webp', '/textures/marble_nor.webp', '/textures/marble_arm.webp'],
  plaster: ['/textures/plaster_diff.webp', '/textures/plaster_nor.webp', '/textures/plaster_arm.webp'],
} as const

export const ALL_TEXTURES = Object.values(SETS).flat()

export interface Materials {
  sandstone: THREE.MeshStandardMaterial
  sandstoneDark: THREE.MeshStandardMaterial
  pavement: THREE.MeshStandardMaterial
  marble: THREE.MeshStandardMaterial
  plaster: THREE.MeshStandardMaterial
  terracotta: THREE.MeshStandardMaterial
  gold: THREE.MeshStandardMaterial
  brass: THREE.MeshStandardMaterial
  wood: THREE.MeshStandardMaterial
  saffron: THREE.MeshStandardMaterial
}

function pbr(
  maps: THREE.Texture[],
  opts: Omit<THREE.MeshStandardMaterialParameters, 'normalScale'> & { normalScale?: number; useRoughnessMap?: boolean },
) {
  const [map, normalMap, arm] = maps
  map.colorSpace = THREE.SRGBColorSpace
  for (const t of maps) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.anisotropy = 4
  }
  // Close-up surfaces use constant roughness: dark texels in a roughness map clamp to near-mirror
  // values, and a point light a few cm away then overflows the half-float bloom buffer.
  const { normalScale = 1, useRoughnessMap = true, ...rest } = opts
  return new THREE.MeshStandardMaterial({
    map,
    normalMap,
    roughnessMap: useRoughnessMap ? arm : null,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    ...rest,
  })
}

/** All scene materials. Uses CC0 Poly Haven PBR sets (see ASSETS.md). Suspends while loading. */
export function useMaterials(): Materials {
  const tex = useTexture(ALL_TEXTURES as unknown as string[])
  return useMemo(() => {
    const [sd, sn, sa, pd, pn, pa, md, mn, ma, ld, ln, la] = tex
    // Cloned textures share the image but must be flagged for upload, otherwise they sample black.
    const dup = (t: THREE.Texture) => {
      const c = t.clone()
      c.needsUpdate = true
      return c
    }
    // Terracotta reuses the clay plaster set with its own texture instances.
    const terr = [dup(ld), dup(ln), dup(la)]
    return {
      sandstone: pbr([sd, sn, sa], { color: '#f0c9a4', roughness: 1, normalScale: 1.2 }),
      sandstoneDark: pbr([dup(sd), dup(sn), dup(sa)], { color: '#a8826a', roughness: 1, normalScale: 1.2 }),
      pavement: pbr([pd, pn, pa], { color: '#d9b49a', roughness: 0.92, useRoughnessMap: false }),
      marble: pbr([md, mn, ma], { color: '#fff4e6', roughness: 0.55, envMapIntensity: 1.4 }),
      plaster: pbr([ld, ln, la], { color: '#e7c9a6', roughness: 1, normalScale: 0.8 }),
      terracotta: pbr(terr, { color: '#b4552c', roughness: 0.78, normalScale: 0.6, useRoughnessMap: false }),
      gold: new THREE.MeshStandardMaterial({ color: '#e0a948', metalness: 1, roughness: 0.28, envMapIntensity: 1.6 }),
      brass: new THREE.MeshStandardMaterial({ color: '#b98a3e', metalness: 1, roughness: 0.42, envMapIntensity: 1.2 }),
      wood: new THREE.MeshStandardMaterial({ color: '#3a2016', roughness: 0.72, metalness: 0 }),
      saffron: new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.8, side: THREE.DoubleSide, emissive: '#ff5a00', emissiveIntensity: 0.25 }),
    }
  }, [tex])
}
