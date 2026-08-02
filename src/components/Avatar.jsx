import { useEffect, useRef } from 'react'
import { drawAvatar } from '../lib/avatar.js'

export default function Avatar({ seed, size = 16 }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) drawAvatar(ref.current, seed)
  }, [seed])

  return (
    <canvas
      ref={ref}
      width={16}
      height={16}
      style={{ width: size, height: size, flex: '0 0 ' + size + 'px' }}
    />
  )
}
