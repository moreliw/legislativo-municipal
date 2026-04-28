'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

interface BpmnViewerProps {
  xml: string | null
  loading?: boolean
  error?: string | null
  highlightedElementIds?: string[]
}

export function BpmnViewer({
  xml,
  loading = false,
  error = null,
  highlightedElementIds = [],
}: BpmnViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<any>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const highlightedKey = useMemo(
    () => [...highlightedElementIds].sort().join('|'),
    [highlightedElementIds],
  )
  const currentMarkersRef = useRef<string[]>([])

  useEffect(() => {
    let active = true

    async function initViewer() {
      try {
        const module = await import('bpmn-js/lib/NavigatedViewer')
        if (!active || !containerRef.current) return

        const ViewerCtor = (module as any).default
        viewerRef.current = new ViewerCtor({
          container: containerRef.current,
          keyboard: { bindTo: document },
        })
        setViewerReady(true)
      } catch (err: any) {
        setViewerError(err?.message ?? 'Falha ao inicializar visualizador BPMN')
      }
    }

    initViewer()

    return () => {
      active = false
      currentMarkersRef.current = []
      if (viewerRef.current) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  function clearMarkers() {
    if (!viewerRef.current) return
    const canvas = viewerRef.current.get('canvas')
    for (const marker of currentMarkersRef.current) {
      try {
        canvas.removeMarker(marker, 'is-active-task')
      } catch {
        // ignore marker removal errors
      }
    }
    currentMarkersRef.current = []
  }

  function applyMarkers(elementIds: string[]) {
    if (!viewerRef.current) return
    const canvas = viewerRef.current.get('canvas')
    clearMarkers()
    for (const elementId of elementIds) {
      try {
        canvas.addMarker(elementId, 'is-active-task')
        currentMarkersRef.current.push(elementId)
      } catch {
        // ignore ids that do not exist in diagram
      }
    }
  }

  useEffect(() => {
    if (!viewerReady || !viewerRef.current || !xml) return
    let cancelled = false

    async function importXml() {
      try {
        setViewerError(null)
        await viewerRef.current.importXML(xml)
        if (cancelled) return

        const canvas = viewerRef.current.get('canvas')
        canvas.zoom('fit-viewport')
        applyMarkers(highlightedElementIds)
      } catch (err: any) {
        if (cancelled) return
        setViewerError(err?.message ?? 'Falha ao renderizar BPMN')
      }
    }

    importXml()

    return () => {
      cancelled = true
      clearMarkers()
    }
  }, [xml, viewerReady])

  useEffect(() => {
    if (!viewerReady || !viewerRef.current) return
    applyMarkers(highlightedElementIds)
  }, [highlightedKey, viewerReady])

  const zoom = (mode: 'in' | 'out' | 'fit') => {
    if (!viewerRef.current) return
    const canvas = viewerRef.current.get('canvas')
    if (mode === 'fit') {
      canvas.zoom('fit-viewport')
      return
    }
    canvas.zoom(mode === 'in' ? 1.2 : 0.8)
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm flex items-start gap-2">
        <AlertCircle size={16} className="mt-0.5" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => zoom('out')}
          className="border border-line rounded-md px-2 py-1 text-fg-2 hover:text-fg-1"
          aria-label="Zoom out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => zoom('in')}
          className="border border-line rounded-md px-2 py-1 text-fg-2 hover:text-fg-1"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoom('fit')}
          className="border border-line rounded-md px-2 py-1 text-fg-2 hover:text-fg-1"
          aria-label="Fit viewport"
        >
          fit
        </button>
      </div>

      <div className="relative bpmn-canvas">
        {(loading || !viewerReady) && (
          <div className="absolute inset-0 z-10 bg-surface-0/80 flex items-center justify-center text-fg-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Carregando BPMN...
            </span>
          </div>
        )}

        {(viewerError && !loading) && (
          <div className="absolute inset-0 z-10 bg-red-50/90 flex items-center justify-center px-4 text-red-700 text-sm">
            <span className="inline-flex items-center gap-2">
              <AlertCircle size={16} />
              {viewerError}
            </span>
          </div>
        )}

        <div ref={containerRef} className="w-full h-[420px]" />
      </div>
    </div>
  )
}
