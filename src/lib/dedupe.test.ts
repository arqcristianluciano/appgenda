import { describe, it, expect } from 'vitest'
import { dedupeById, countDuplicateIds, findDuplicateTasks } from './dedupe'

const task = (id: string, over: Partial<{ txt: string; proj: string | null; prio: string; fecha: string; done: boolean; nota: string }> = {}) => ({
  id, txt: 'Tarea', proj: null, prio: 'media', fecha: '', done: false, nota: '', ...over,
})

describe('dedupeById', () => {
  it('quita ids repetidos conservando la última versión', () => {
    const out = dedupeById([
      { id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'a', v: 3 },
    ])
    expect(out).toHaveLength(2)
    expect(out.find(x => x.id === 'a')?.v).toBe(3)
  })
  it('preserva el orden de primera aparición', () => {
    const out = dedupeById([{ id: 'x' }, { id: 'y' }, { id: 'x' }])
    expect(out.map(o => o.id)).toEqual(['x', 'y'])
  })
  it('es idempotente', () => {
    const once = dedupeById([{ id: 'a' }, { id: 'a' }, { id: 'b' }])
    expect(dedupeById(once)).toEqual(once)
  })
  it('deja arrays sin duplicados intactos', () => {
    const arr = [{ id: '1' }, { id: '2' }, { id: '3' }]
    expect(dedupeById(arr)).toEqual(arr)
  })
})

describe('countDuplicateIds', () => {
  it('cuenta las apariciones extra de cada id', () => {
    expect(countDuplicateIds([{ id: 'a' }, { id: 'a' }, { id: 'a' }, { id: 'b' }])).toBe(2)
    expect(countDuplicateIds([{ id: '1' }, { id: '2' }])).toBe(0)
  })
})

describe('findDuplicateTasks', () => {
  it('agrupa tareas estrictamente idénticas conservando la primera', () => {
    const groups = findDuplicateTasks([
      task('1', { txt: 'Llamar al banco' }),
      task('2', { txt: 'Llamar al banco' }),
      task('3', { txt: 'Otra cosa' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].keep.id).toBe('1')
    expect(groups[0].remove.map(t => t.id)).toEqual(['2'])
  })

  it('normaliza espacios y mayúsculas en el texto', () => {
    const groups = findDuplicateTasks([
      task('1', { txt: 'Comprar pan' }),
      task('2', { txt: '  comprar PAN ' }),
    ])
    expect(groups).toHaveLength(1)
  })

  it('NO agrupa tareas que difieren en proyecto', () => {
    const groups = findDuplicateTasks([
      task('1', { txt: 'Revisar', proj: 'arthouse' }),
      task('2', { txt: 'Revisar', proj: 'grid7' }),
    ])
    expect(groups).toHaveLength(0)
  })

  it('NO agrupa tareas que difieren en estado done', () => {
    const groups = findDuplicateTasks([
      task('1', { txt: 'Pagar', done: true }),
      task('2', { txt: 'Pagar', done: false }),
    ])
    expect(groups).toHaveLength(0)
  })

  it('NO agrupa tareas que difieren en prioridad o fecha', () => {
    expect(findDuplicateTasks([
      task('1', { txt: 'X', prio: 'alta' }),
      task('2', { txt: 'X', prio: 'baja' }),
    ])).toHaveLength(0)
    expect(findDuplicateTasks([
      task('1', { txt: 'Y', fecha: '2026-05-01' }),
      task('2', { txt: 'Y', fecha: '2026-05-02' }),
    ])).toHaveLength(0)
  })

  it('maneja tres o más copias en un grupo', () => {
    const groups = findDuplicateTasks([
      task('1', { txt: 'dup' }), task('2', { txt: 'dup' }), task('3', { txt: 'dup' }),
    ])
    expect(groups[0].keep.id).toBe('1')
    expect(groups[0].remove.map(t => t.id)).toEqual(['2', '3'])
  })

  it('devuelve vacío sin duplicados', () => {
    expect(findDuplicateTasks([task('1', { txt: 'a' }), task('2', { txt: 'b' })])).toEqual([])
  })
})
