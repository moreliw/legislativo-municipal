import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { BpmnViewer } from '../components/processos/BpmnViewer'

const importXmlMock = vi.fn()
const zoomMock = vi.fn()
const addMarkerMock = vi.fn()
const removeMarkerMock = vi.fn()
const destroyMock = vi.fn()

vi.mock('bpmn-js/lib/NavigatedViewer', () => ({
  default: class MockViewer {
    importXML = importXmlMock
    get(service: string) {
      if (service === 'canvas') {
        return {
          zoom: zoomMock,
          addMarker: addMarkerMock,
          removeMarker: removeMarkerMock,
        }
      }
      return null
    }
    destroy = destroyMock
  },
}))

describe('BpmnViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    importXmlMock.mockResolvedValue({})
  })

  it('deve importar XML e ajustar zoom no viewport', async () => {
    render(<BpmnViewer xml={'<definitions><process id="p1" /></definitions>'} />)

    await waitFor(() => {
      expect(importXmlMock).toHaveBeenCalledWith('<definitions><process id="p1" /></definitions>')
    })

    expect(zoomMock).toHaveBeenCalledWith('fit-viewport')
  })

  it('deve destacar tarefas ativas no diagrama', async () => {
    const { rerender } = render(
      <BpmnViewer
        xml={'<definitions><process id="p1" /></definitions>'}
        highlightedElementIds={['task_analise_inicial']}
      />,
    )

    await waitFor(() => {
      expect(addMarkerMock).toHaveBeenCalledWith('task_analise_inicial', 'is-active-task')
    })

    rerender(
      <BpmnViewer
        xml={'<definitions><process id="p1" /></definitions>'}
        highlightedElementIds={['task_comissao']}
      />,
    )

    await waitFor(() => {
      expect(removeMarkerMock).toHaveBeenCalledWith('task_analise_inicial', 'is-active-task')
      expect(addMarkerMock).toHaveBeenCalledWith('task_comissao', 'is-active-task')
    })
  })
})
