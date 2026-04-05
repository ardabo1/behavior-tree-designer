import React, { useEffect, useRef } from 'react'
import { BaseEdge, getSmoothStepPath } from 'reactflow'

export function TickEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
  selected,
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const outerAnimRef = useRef(null)
  const innerAnimRef = useRef(null)

  // React render olduktan hemen sonra animasyonu manuel ve senkron olarak başlatıyoruz.
  useEffect(() => {
    if (data?.activeTick) {
      outerAnimRef.current?.beginElement()
      innerAnimRef.current?.beginElement()
    }
  }, [data?.activeTick, data?.animKey])

  // MS cinsinden gelen süreyi SVG'nin sevdiği Saniye (s) cinsine çevir
  const animDurationSec = data?.tickDurationMs ? (data.tickDurationMs / 1000).toFixed(2) : 0
  
  const edgeStyle = selected 
    ? { ...style, stroke: '#22d3ee', strokeWidth: 3, filter: 'drop-shadow(0px 0px 6px #22d3ee)' } 
    : style
    
  return (
    <>
      {/* BURASI DEĞİŞTİ: style={style} yerine style={edgeStyle} yaptık */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} id={id} />
      
      {data?.activeTick && (
        <g>
          {/* Dış Parlama (Glow) Efekti */}
          <circle r="12" fill="#22d3ee" opacity="0.3">
            <animateMotion
              ref={outerAnimRef}
              dur={`${animDurationSec}s`}
              repeatCount="1"
              path={edgePath}
              fill="freeze"
              calcMode="linear"
              begin="indefinite" /* Tarayıcının kendi kafasına göre başlatmasını engeller */
            />
          </circle>

          {/* İç Çekirdek (Core) */}
          <circle r="6" fill="#22d3ee">
            <animateMotion
              ref={innerAnimRef}
              dur={`${animDurationSec}s`}
              repeatCount="1"
              path={edgePath}
              fill="freeze"
              calcMode="linear"
              begin="indefinite"
            />
          </circle>
        </g>
      )}
    </>
  )
}