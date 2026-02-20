
import { useState, useMemo, useCallback, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { ChevronDown, Download, Loader2, FlaskConical, Gauge } from 'lucide-react'
import {
    getCBREnsayoDetail,
    saveAndDownloadCBRExcel,
    saveCBREnsayo,
} from '@/services/api'
import type {
    CBRPayload,
    CBREnsayoDetail,
    CBRLecturaPenetracionRow,
    CBRHinchamientoRow,
} from '@/types'

const getCurrentYearShort = () => new Date().getFullYear().toString().slice(-2)

const normalizeMuestraCode = (raw: string): string => {
    const value = raw.trim().toUpperCase()
    if (!value) return ''

    const compact = value.replace(/\s+/g, '')
    const year = getCurrentYearShort()
    const match = compact.match(/^(\d+)(?:-SU)?(?:-(\d{2}))?$/)
    if (match) {
        return `${match[1]}-SU-${match[2] || year}`
    }
    return value
}

const normalizeNumeroOtCode = (raw: string): string => {
    const value = raw.trim().toUpperCase()
    if (!value) return ''

    const compact = value.replace(/\s+/g, '')
    const year = getCurrentYearShort()
    const patterns = [
        /^(?:N?OT-)?(\d+)(?:-(\d{2}))?$/,
        /^(\d+)(?:-(?:N?OT))?(?:-(\d{2}))?$/,
    ]

    for (const pattern of patterns) {
        const match = compact.match(pattern)
        if (match) {
            return `${match[1]}-${match[2] || year}`
        }
    }

    return value
}

const normalizeFlexibleDate = (raw: string): string => {
    const value = raw.trim()
    if (!value) return ''

    const digits = value.replace(/\D/g, '')
    const year = getCurrentYearShort()
    const pad2 = (part: string) => part.padStart(2, '0').slice(-2)
    const build = (d: string, m: string, y: string = year) => `${pad2(d)}/${pad2(m)}/${pad2(y)}`

    if (value.includes('/')) {
        const [d = '', m = '', yRaw = ''] = value.split('/').map(part => part.trim())
        if (!d || !m) return value
        let yy = yRaw.replace(/\D/g, '')
        if (yy.length === 4) yy = yy.slice(-2)
        if (yy.length === 1) yy = `0${yy}`
        if (!yy) yy = year
        return build(d, m, yy)
    }

    if (digits.length === 2) return build(digits[0], digits[1])
    if (digits.length === 3) return build(digits[0], digits.slice(1, 3))
    if (digits.length === 4) return build(digits.slice(0, 2), digits.slice(2, 4))
    if (digits.length === 5) return build(digits[0], digits.slice(1, 3), digits.slice(3, 5))
    if (digits.length === 6) return build(digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6))
    if (digits.length >= 8) return build(digits.slice(0, 2), digits.slice(2, 4), digits.slice(6, 8))

    return value
}

const PENETRACION_BASE = [
    { tiempo: '0:00', pulg: 0.0, mm: 0.0 },
    { tiempo: '0:30', pulg: 0.025, mm: 0.64 },
    { tiempo: '1:00', pulg: 0.05, mm: 1.3 },
    { tiempo: '1:30', pulg: 0.075, mm: 1.9 },
    { tiempo: '2:00', pulg: 0.1, mm: 2.5 },
    { tiempo: '2:30', pulg: 0.125, mm: 3.18 },
    { tiempo: '3:00', pulg: 0.15, mm: 3.8 },
    { tiempo: '3:30', pulg: 0.175, mm: 4.45 },
    { tiempo: '4:00', pulg: 0.2, mm: 5.1 },
    { tiempo: '6:00', pulg: 0.3, mm: 7.6 },
    { tiempo: '8:00', pulg: 0.4, mm: 10.0 },
    { tiempo: '10:00', pulg: 0.5, mm: 13.0 },
]

const SIX_COLUMN_LABELS = ['Esp.01 SS', 'Esp.01 SAT', 'Esp.02 SS', 'Esp.02 SAT', 'Esp.03 SS', 'Esp.03 SAT']
const THREE_SPECIMEN_LABELS = ['Especimen 01', 'Especimen 02', 'Especimen 03']
const HUMEDAD_INDEX_GROUPS = {
    sin_saturar: [0, 2, 4],
    saturado: [1, 3, 5],
} as const
const MOLD_CODE_REFERENCE: ReadonlyArray<{ codigo: string; equipo: string }> = [
    { codigo: 'INS-173', equipo: 'MOLDE 11' },
    { codigo: 'INS-174', equipo: 'MOLDE 12' },
    { codigo: 'INS-175', equipo: 'MOLDE 13' },
    { codigo: 'INS-030', equipo: 'MOLDE 1' },
    { codigo: 'INS-031', equipo: 'MOLDE 2' },
    { codigo: 'INS-032', equipo: 'MOLDE 3' },
    { codigo: 'INS-027', equipo: 'MOLDE 4' },
    { codigo: 'INS-028', equipo: 'MOLDE 5' },
    { codigo: 'INS-029', equipo: 'MOLDE 6' },
    { codigo: 'INS-033', equipo: 'MOLDE 7' },
    { codigo: 'INS-034', equipo: 'MOLDE 8' },
    { codigo: 'INS-035', equipo: 'MOLDE 9' },
    { codigo: 'INS-200', equipo: 'MOLDE A' },
    { codigo: 'INS-201', equipo: 'MOLDE B' },
    { codigo: 'INS-202', equipo: 'MOLDE C' },
    { codigo: 'INS-203', equipo: 'MOLDE E' },
    { codigo: 'INS-204', equipo: 'MOLDE H' },
    { codigo: 'INS-205', equipo: 'MOLDE L' },
]
type DropdownOption = { value: string; label: string }

const CODE_DROPDOWN_OPTIONS = [
    '-',
    'INS-000',
    ...Array.from(new Set(MOLD_CODE_REFERENCE.map(({ codigo }) => codigo))),
]
const GOLPES_ALLOWED_VALUES = new Set([56, 25, 10])
const GOLPES_DROPDOWN_OPTIONS: DropdownOption[] = [
    { value: '-', label: '-' },
    { value: '56', label: '56' },
    { value: '25', label: '25' },
    { value: '10', label: '10' },
]
const CODE_LABEL_BY_VALUE: Record<string, string> = {
    '-': '-',
    'INS-000': 'INS-000',
    ...Object.fromEntries(MOLD_CODE_REFERENCE.map(({ codigo, equipo }) => [codigo, `${codigo} / ${equipo}`])),
}
const CODE_DROPDOWN_DISPLAY_OPTIONS: DropdownOption[] = CODE_DROPDOWN_OPTIONS.map((value) => ({
    value,
    label: CODE_LABEL_BY_VALUE[value] ?? value,
}))
const normalizeGolpesArray = (values: Array<number | null> | undefined): Array<number | null> => {
    return Array.from({ length: 3 }, (_, idx) => {
        const raw = values?.[idx]
        const parsed = Number(raw)
        return Number.isFinite(parsed) && GOLPES_ALLOWED_VALUES.has(parsed) ? parsed : null
    })
}
const isValidCodeOption = (value: string | null | undefined): value is string => {
    return typeof value === 'string' && CODE_DROPDOWN_OPTIONS.includes(value)
}
const normalizeCodeArray = (values: Array<string | null> | undefined, length: number): Array<string | null> => {
    return Array.from({ length }, (_, idx) => {
        const raw = values?.[idx]
        return isValidCodeOption(raw) ? raw : '-'
    })
}

const EMPTY_SIX_NUMBERS = () => Array.from({ length: 6 }, () => null as number | null)
const EMPTY_SIX_STRINGS = () => Array.from({ length: 6 }, () => '-' as string | null)
const EMPTY_THREE_NUMBERS = () => [56, 25, 10].map(v => v as number | null)
const EMPTY_THREE_STRINGS = () => ['-', '-', '-'].map(v => v as string | null)
const EMPTY_PENETRACION_ROWS = () => Array.from({ length: 12 }, (): CBRLecturaPenetracionRow => ({
    tension_standard: undefined,
    lectura_dial_esp_01: undefined,
    lectura_dial_esp_02: undefined,
    lectura_dial_esp_03: undefined,
}))
const EMPTY_HINCHAMIENTO_ROWS = () => Array.from({ length: 6 }, (): CBRHinchamientoRow => ({
    fecha: '',
    hora: '',
    esp_01: undefined,
    esp_02: undefined,
    esp_03: undefined,
}))

const buildInitialState = (): CBRPayload => ({
    muestra: '',
    numero_ot: '',
    fecha_ensayo: '',
    realizado_por: '',

    sobretamano_porcentaje: undefined,
    masa_grava_adicionada_g: undefined,
    condicion_muestra_saturado: '-',
    condicion_muestra_sin_saturar: '-',
    maxima_densidad_seca: undefined,
    optimo_contenido_humedad: undefined,
    temperatura_inicial_c: undefined,
    temperatura_final_c: undefined,
    tamano_maximo_visual_in: '',
    descripcion_muestra_astm: '',

    golpes_por_especimen: EMPTY_THREE_NUMBERS(),
    codigo_molde_por_especimen: EMPTY_THREE_STRINGS(),
    temperatura_inicio_c_por_columna: EMPTY_SIX_NUMBERS(),
    temperatura_final_c_por_columna: EMPTY_SIX_NUMBERS(),
    masa_molde_suelo_g_por_columna: EMPTY_SIX_NUMBERS(),
    codigo_tara_por_columna: EMPTY_SIX_STRINGS(),
    masa_tara_g_por_columna: EMPTY_SIX_NUMBERS(),
    masa_suelo_humedo_tara_g_por_columna: EMPTY_SIX_NUMBERS(),
    masa_suelo_seco_tara_g_por_columna: EMPTY_SIX_NUMBERS(),
    masa_suelo_seco_tara_constante_g_por_columna: EMPTY_SIX_NUMBERS(),

    lecturas_penetracion: EMPTY_PENETRACION_ROWS(),
    hinchamiento: EMPTY_HINCHAMIENTO_ROWS(),
    profundidad_hendidura_mm: undefined,

    equipo_cbr: '-',
    equipo_dial_deformacion: '-',
    equipo_dial_expansion: '-',
    equipo_horno_110: '-',
    equipo_pison: '-',
    equipo_balanza_1g: '-',
    equipo_balanza_01g: '-',

    observaciones: '',
    revisado_por: 'FABIAN LA ROSA',
    revisado_fecha: '-',
    aprobado_por: 'IRMA COAQUIRA',
    aprobado_fecha: '-',
})

type NumericArrayKey =
    | 'golpes_por_especimen'
    | 'temperatura_inicio_c_por_columna'
    | 'temperatura_final_c_por_columna'
    | 'masa_molde_suelo_g_por_columna'
    | 'masa_tara_g_por_columna'
    | 'masa_suelo_humedo_tara_g_por_columna'
    | 'masa_suelo_seco_tara_g_por_columna'
    | 'masa_suelo_seco_tara_constante_g_por_columna'

type StringArrayKey = 'codigo_molde_por_especimen' | 'codigo_tara_por_columna'
type DateFieldKey = 'fecha_ensayo' | 'revisado_fecha' | 'aprobado_fecha'
type PenetracionKey = keyof CBRLecturaPenetracionRow
type HinchamientoKey = keyof CBRHinchamientoRow
type EquipoKey =
    | 'equipo_cbr'
    | 'equipo_dial_deformacion'
    | 'equipo_dial_expansion'
    | 'equipo_horno_110'
    | 'equipo_pison'
    | 'equipo_balanza_1g'
    | 'equipo_balanza_01g'

interface HumedadResumenRow {
    muestra: string
    valor: number | null
    estado: 'Cumple' | 'No cumple' | '-'
}

const EQUIPO_OPTIONS: Record<EquipoKey, string[]> = {
    equipo_cbr: ['-', 'EQP-0026'],
    equipo_dial_deformacion: ['-', 'EQP-0080'],
    equipo_dial_expansion: ['-', 'EQP-0109'],
    equipo_horno_110: ['-', 'EQP-0049'],
    equipo_pison: ['-', 'INS-0196'],
    equipo_balanza_1g: ['-', 'EQP-0054'],
    equipo_balanza_01g: ['-', 'EQP-0046'],
}

const getEnsayoIdFromQuery = (): number | null => {
    const raw = new URLSearchParams(window.location.search).get('ensayo_id')
    if (!raw) return null
    const parsed = Number(raw)
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export default function CBRForm() {
    const [form, setForm] = useState<CBRPayload>(() => buildInitialState())
    const [loading, setLoading] = useState(false)
    const [editingEnsayoId, setEditingEnsayoId] = useState<number | null>(() => getEnsayoIdFromQuery())
    const [loadingEnsayo, setLoadingEnsayo] = useState(false)

    const set = useCallback(<K extends keyof CBRPayload>(key: K, value: CBRPayload[K]) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }, [])

    const setNum = useCallback((key: keyof CBRPayload, raw: string) => {
        const val = raw === '' ? undefined : parseFloat(raw)
        setForm(prev => ({ ...prev, [key]: val }))
    }, [])

    const setArrayNum = useCallback((key: NumericArrayKey, index: number, raw: string) => {
        const val = raw === '' ? null : parseFloat(raw)
        setForm(prev => {
            const next = [...prev[key]]
            next[index] = Number.isFinite(val as number) ? (val as number) : null
            return { ...prev, [key]: next }
        })
    }, [])

    const setArrayText = useCallback((key: StringArrayKey, index: number, raw: string) => {
        const val = raw.trim() === '' ? null : raw
        setForm(prev => {
            const next = [...prev[key]]
            next[index] = val
            return { ...prev, [key]: next }
        })
    }, [])

    const setPenetracion = useCallback((index: number, field: PenetracionKey, raw: string) => {
        const numericVal = raw === '' ? undefined : parseFloat(raw)
        setForm(prev => {
            const nextRows = [...prev.lecturas_penetracion]
            const row = { ...nextRows[index] }
            row[field] = Number.isFinite(numericVal as number) ? (numericVal as number) : undefined
            nextRows[index] = row
            return { ...prev, lecturas_penetracion: nextRows }
        })
    }, [])

    const setHinchamiento = useCallback((index: number, field: HinchamientoKey, raw: string) => {
        setForm(prev => {
            const nextRows = [...prev.hinchamiento]
            const row = { ...nextRows[index] }

            if (field === 'fecha' || field === 'hora') {
                row[field] = raw
            } else {
                const numericVal = raw === '' ? undefined : parseFloat(raw)
                row[field] = Number.isFinite(numericVal as number) ? (numericVal as number) : undefined
            }

            nextRows[index] = row
            return { ...prev, hinchamiento: nextRows }
        })
    }, [])

    const applyFormattedField = useCallback((key: DateFieldKey, formatter: (raw: string) => string) => {
        setForm(prev => {
            const current = String(prev[key] ?? '')
            const formatted = formatter(current)
            if (formatted === current) return prev
            return { ...prev, [key]: formatted }
        })
    }, [])

    const masaSueloHumedoPorColumna = useMemo(() => {
        return form.masa_suelo_humedo_tara_g_por_columna.map((humedoTara, idx) => {
            const tara = form.masa_tara_g_por_columna[idx]
            if (humedoTara == null || tara == null) return null
            return Math.round((humedoTara - tara) * 100) / 100
        })
    }, [form.masa_suelo_humedo_tara_g_por_columna, form.masa_tara_g_por_columna])

    const humedadResumen = useMemo(() => {
        const calculateHumedad = (index: number): number | null => {
            const masaHumeda = masaSueloHumedoPorColumna[index]
            const masaSecaTaraConstante = form.masa_suelo_seco_tara_constante_g_por_columna[index]
            const tara = form.masa_tara_g_por_columna[index]

            if (masaHumeda == null || masaSecaTaraConstante == null || tara == null) return null

            // Replica la formula del template Excel (S30:S36): (col32 - (col34 - col30)) / (col34 - col30) * 100
            const masaSeca = masaSecaTaraConstante - tara
            if (!Number.isFinite(masaSeca) || masaSeca === 0) return null

            const humedad = ((masaHumeda - masaSeca) / masaSeca) * 100
            return Math.round(humedad * 100) / 100
        }

        const buildRows = (indexes: readonly number[]): HumedadResumenRow[] => {
            return indexes.map((index, rowIdx) => {
                const valor = calculateHumedad(index)
                const estado: HumedadResumenRow['estado'] =
                    valor == null
                        ? '-'
                        : form.optimo_contenido_humedad == null
                            ? '-'
                            : Math.abs(valor - form.optimo_contenido_humedad) <= 2
                                ? 'Cumple'
                                : 'No cumple'
                return {
                    muestra: `Esp.${String(rowIdx + 1).padStart(2, '0')}`,
                    valor,
                    estado,
                }
            })
        }

        return {
            sin_saturar: buildRows(HUMEDAD_INDEX_GROUPS.sin_saturar),
            saturado: buildRows(HUMEDAD_INDEX_GROUPS.saturado),
        }
    }, [
        masaSueloHumedoPorColumna,
        form.masa_suelo_seco_tara_constante_g_por_columna,
        form.masa_tara_g_por_columna,
        form.optimo_contenido_humedad,
    ])

    useEffect(() => {
        if (!editingEnsayoId) return

        let cancelled = false
        const loadForEdit = async () => {
            setLoadingEnsayo(true)
            try {
                const detail: CBREnsayoDetail = await getCBREnsayoDetail(editingEnsayoId)
                if (!detail.payload) {
                    toast.error('El ensayo seleccionado no tiene payload guardado para edicion.')
                    return
                }
                if (!cancelled) {
                    const merged = { ...buildInitialState(), ...detail.payload }
                    merged.golpes_por_especimen = normalizeGolpesArray(merged.golpes_por_especimen)
                    merged.codigo_molde_por_especimen = normalizeCodeArray(merged.codigo_molde_por_especimen, 3)
                    merged.codigo_tara_por_columna = normalizeCodeArray(merged.codigo_tara_por_columna, 6)
                    setForm(merged)
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Error desconocido'
                toast.error(`No se pudo cargar ensayo para edicion: ${msg}`)
            } finally {
                if (!cancelled) {
                    setLoadingEnsayo(false)
                }
            }
        }

        void loadForEdit()
        return () => {
            cancelled = true
        }
    }, [editingEnsayoId])

    const downloadBlob = useCallback((blob: Blob, numeroOt: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `CBR_${numeroOt}_${new Date().toISOString().slice(0, 10)}.xlsx`
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    const closeParentModalIfEmbedded = useCallback(() => {
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'CLOSE_MODAL' }, '*')
        }
    }, [])

    const handleSave = useCallback(async (withDownload: boolean) => {
        if (!form.muestra || !form.numero_ot || !form.realizado_por) {
            toast.error('Complete los campos obligatorios: Codigo de muestra, N OT y Realizado por')
            return
        }

        setLoading(true)
        try {
            const payload: CBRPayload = { ...form }
            if (withDownload) {
                const { blob } = await saveAndDownloadCBRExcel(payload, editingEnsayoId ?? undefined)
                downloadBlob(blob, payload.numero_ot)
                toast.success(editingEnsayoId ? 'Formato CBR actualizado y descargado.' : 'Formato CBR guardado y descargado.')
            } else {
                await saveCBREnsayo(payload, editingEnsayoId ?? undefined)
                toast.success(editingEnsayoId ? 'Formato CBR actualizado correctamente.' : 'Formato CBR guardado correctamente.')
            }

            setForm(buildInitialState())
            setEditingEnsayoId(null)
            closeParentModalIfEmbedded()
        } catch (err: unknown) {
            let msg = err instanceof Error ? err.message : 'Error desconocido'
            if (axios.isAxiosError(err)) {
                const detail = err.response?.data?.detail
                if (typeof detail === 'string' && detail.trim()) {
                    msg = detail
                }
            }
            toast.error(`Error guardando formato CBR: ${msg}`)
        } finally {
            setLoading(false)
        }
    }, [closeParentModalIfEmbedded, downloadBlob, editingEnsayoId, form])

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10">
                    <Gauge className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-foreground">
                        California Bearing Ratio (CBR) - ASTM D1883-21
                    </h1>
                    <p className="text-sm text-muted-foreground">Generador de informe de laboratorio</p>
                    {editingEnsayoId && (
                        <p className="text-xs text-primary font-medium mt-1">Editando ensayo #{editingEnsayoId}</p>
                    )}
                </div>
            </div>

            {loadingEnsayo && (
                <div className="mb-4 h-10 rounded-lg border border-border bg-muted/40 px-3 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando datos guardados para edicion...
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-5">
                <Section title="Encabezado" icon={<FlaskConical className="h-4 w-4" />}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Input
                            label="Codigo de muestra *"
                            value={form.muestra}
                            onChange={v => set('muestra', v)}
                            onBlur={() => set('muestra', normalizeMuestraCode(form.muestra))}
                            placeholder="XXX-SU-26"
                        />
                        <Input
                            label="N OT *"
                            value={form.numero_ot}
                            onChange={v => set('numero_ot', v)}
                            onBlur={() => set('numero_ot', normalizeNumeroOtCode(form.numero_ot))}
                            placeholder="XXX-26"
                        />
                        <Input
                            label="Fecha de ensayo"
                            value={form.fecha_ensayo}
                            onChange={v => set('fecha_ensayo', v)}
                            onBlur={() => applyFormattedField('fecha_ensayo', normalizeFlexibleDate)}
                            placeholder="DD/MM/AA"
                        />
                        <Input
                            label="Realizado por *"
                            value={form.realizado_por}
                            onChange={v => set('realizado_por', v)}
                        />
                    </div>
                </Section>

                <Section title="Condiciones del Ensayo CBR">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="space-y-3">
                            <NumberInput
                                label="Sobretamano mayor a 3/4 in (%)"
                                value={form.sobretamano_porcentaje}
                                onChange={v => setNum('sobretamano_porcentaje', v)}
                            />
                            <NumberInput
                                label="Masa de grava entre 3/4 in - No.4 adicionada (g)"
                                value={form.masa_grava_adicionada_g}
                                onChange={v => setNum('masa_grava_adicionada_g', v)}
                            />
                            <SelectField
                                label="Condicion de la muestra - saturado"
                                value={form.condicion_muestra_saturado}
                                options={['-', 'SI', 'NO']}
                                onChange={v => set('condicion_muestra_saturado', v as '-' | 'SI' | 'NO')}
                            />
                            <SelectField
                                label="Condicion de la muestra - sin saturar"
                                value={form.condicion_muestra_sin_saturar}
                                options={['-', 'SI', 'NO']}
                                onChange={v => set('condicion_muestra_sin_saturar', v as '-' | 'SI' | 'NO')}
                            />
                        </div>

                        <div className="space-y-3">
                            <NumberInput
                                label="Maxima Densidad Seca (g/cm3)"
                                value={form.maxima_densidad_seca}
                                onChange={v => setNum('maxima_densidad_seca', v)}
                            />
                            <NumberInput
                                label="Optimo Contenido de Humedad (%)"
                                value={form.optimo_contenido_humedad}
                                onChange={v => setNum('optimo_contenido_humedad', v)}
                            />
                            <NumberInput
                                label="Temperatura Inicial (C)"
                                value={form.temperatura_inicial_c}
                                onChange={v => setNum('temperatura_inicial_c', v)}
                            />
                            <NumberInput
                                label="Temperatura Final (C)"
                                value={form.temperatura_final_c}
                                onChange={v => setNum('temperatura_final_c', v)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                        <Input
                            label="Tamano maximo visual (in)"
                            value={form.tamano_maximo_visual_in || ''}
                            onChange={v => set('tamano_maximo_visual_in', v)}
                        />
                        <Input
                            label="Descripcion de muestra ASTM D2488"
                            value={form.descripcion_muestra_astm || ''}
                            onChange={v => set('descripcion_muestra_astm', v)}
                        />
                    </div>
                </Section>

                <Section title="Ensayo y Determinacion de Humedad">
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-md border border-border">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-3 py-2 text-left border-b border-r border-border">Campo</th>
                                        {THREE_SPECIMEN_LABELS.map((label) => (
                                            <th key={label} className="px-2 py-2 text-center border-b border-border">
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="px-3 py-2 border-r border-b border-border">N Golpes (56-25-10)</td>
                                        {form.golpes_por_especimen.map((value, idx) => (
                                            <td key={`golpes-${idx}`} className="px-2 py-2 border-b border-border">
                                                <TableSelectInput
                                                    value={value == null ? '-' : String(value)}
                                                    options={GOLPES_DROPDOWN_OPTIONS}
                                                    onChange={v => setArrayNum('golpes_por_especimen', idx, v)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-3 py-2 border-r border-border">Codigo de Moldes</td>
                                        {form.codigo_molde_por_especimen.map((value, idx) => (
                                            <td key={`molde-${idx}`} className="px-2 py-2 border-border">
                                                <TableSelectInput
                                                    value={value || '-'}
                                                    options={CODE_DROPDOWN_DISPLAY_OPTIONS}
                                                    onChange={v => setArrayText('codigo_molde_por_especimen', idx, v)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="overflow-x-auto rounded-md border border-border">
                            <table className="w-full min-w-[1100px] text-sm">
                                <thead className="bg-muted/40">
                                    <tr>
                                        <th className="px-3 py-2 text-left border-b border-r border-border">Campo</th>
                                        {SIX_COLUMN_LABELS.map((label) => (
                                            <th key={label} className="px-2 py-2 text-center border-b border-border">{label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <ArrayNumberRow
                                        label="Temperatura de inicio (C)"
                                        values={form.temperatura_inicio_c_por_columna}
                                        onChange={(idx, raw) => setArrayNum('temperatura_inicio_c_por_columna', idx, raw)}
                                    />
                                    <ArrayNumberRow
                                        label="Temperatura final (C)"
                                        values={form.temperatura_final_c_por_columna}
                                        onChange={(idx, raw) => setArrayNum('temperatura_final_c_por_columna', idx, raw)}
                                    />
                                    <ArrayNumberRow
                                        label="Masa de molde + suelo moldeado (g)"
                                        values={form.masa_molde_suelo_g_por_columna}
                                        onChange={(idx, raw) => setArrayNum('masa_molde_suelo_g_por_columna', idx, raw)}
                                    />
                                    <ArraySelectRow
                                        label="Codigo tara"
                                        values={form.codigo_tara_por_columna}
                                        options={CODE_DROPDOWN_DISPLAY_OPTIONS}
                                        onChange={(idx, raw) => setArrayText('codigo_tara_por_columna', idx, raw)}
                                    />
                                    <ArrayNumberRow
                                        label="Masa de tara (g)"
                                        values={form.masa_tara_g_por_columna}
                                        onChange={(idx, raw) => setArrayNum('masa_tara_g_por_columna', idx, raw)}
                                    />
                                    <ArrayNumberRow
                                        label="Masa de suelo humedo + tara (g)"
                                        values={form.masa_suelo_humedo_tara_g_por_columna}
                                        onChange={(idx, raw) => setArrayNum('masa_suelo_humedo_tara_g_por_columna', idx, raw)}
                                    />
                                    <tr>
                                        <td className="px-3 py-2 border-r border-b border-border font-medium">Masa de suelo humedo (g) (*) Formula fila 32</td>
                                        {masaSueloHumedoPorColumna.map((value, idx) => (
                                            <td key={`calc-32-${idx}`} className="px-2 py-2 border-b border-border">
                                                <TableComputedValue value={value} />
                                            </td>
                                        ))}
                                    </tr>
                                    <ArrayNumberRow
                                        label="Masa de suelo seco + tara (g)"
                                        values={form.masa_suelo_seco_tara_g_por_columna}
                                        onChange={(idx, raw) => setArrayNum('masa_suelo_seco_tara_g_por_columna', idx, raw)}
                                    />
                                    <ArrayNumberRow
                                        label="Masa de suelo seco + tara (g) constante"
                                        values={form.masa_suelo_seco_tara_constante_g_por_columna}
                                        onChange={(idx, raw) => setArrayNum('masa_suelo_seco_tara_constante_g_por_columna', idx, raw)}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Section>

                <Section title="Lectura de Penetracion">
                    <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full min-w-[1100px] text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Tiempo</th>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Penetracion (in)</th>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Penetracion (mm)</th>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Tension estandar</th>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Dial Esp 01</th>
                                    <th className="px-2 py-2 border-b border-r border-border text-center">Dial Esp 02</th>
                                    <th className="px-2 py-2 border-b border-border text-center">Dial Esp 03</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PENETRACION_BASE.map((base, idx) => (
                                    <tr key={base.tiempo}>
                                        <td className="px-2 py-2 border-b border-r border-border text-center bg-muted/20">{base.tiempo}</td>
                                        <td className="px-2 py-2 border-b border-r border-border text-center bg-muted/20">{base.pulg.toFixed(3)}</td>
                                        <td className="px-2 py-2 border-b border-r border-border text-center bg-muted/20">{base.mm.toFixed(2)}</td>
                                        <td className="px-2 py-2 border-b border-r border-border">
                                            <TableNumInput value={form.lecturas_penetracion[idx]?.tension_standard} onChange={v => setPenetracion(idx, 'tension_standard', v)} />
                                        </td>
                                        <td className="px-2 py-2 border-b border-r border-border">
                                            <TableNumInput value={form.lecturas_penetracion[idx]?.lectura_dial_esp_01} onChange={v => setPenetracion(idx, 'lectura_dial_esp_01', v)} />
                                        </td>
                                        <td className="px-2 py-2 border-b border-r border-border">
                                            <TableNumInput value={form.lecturas_penetracion[idx]?.lectura_dial_esp_02} onChange={v => setPenetracion(idx, 'lectura_dial_esp_02', v)} />
                                        </td>
                                        <td className="px-2 py-2 border-b border-border">
                                            <TableNumInput value={form.lecturas_penetracion[idx]?.lectura_dial_esp_03} onChange={v => setPenetracion(idx, 'lectura_dial_esp_03', v)} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                <Section title="Hinchamiento y Equipos">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        <div>
                            <div className="overflow-x-auto rounded-md border border-border">
                                <table className="w-full min-w-[650px] text-sm">
                                    <thead className="bg-muted/40">
                                        <tr>
                                            <th className="px-2 py-2 border-b border-r border-border text-center">Fecha</th>
                                            <th className="px-2 py-2 border-b border-r border-border text-center">Hora</th>
                                            <th className="px-2 py-2 border-b border-r border-border text-center">Esp 01</th>
                                            <th className="px-2 py-2 border-b border-r border-border text-center">Esp 02</th>
                                            <th className="px-2 py-2 border-b border-border text-center">Esp 03</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: 6 }, (_, idx) => (
                                            <tr key={`hinch-${idx}`}>
                                                <td className="px-2 py-2 border-b border-r border-border">
                                                    <TableTextInput value={form.hinchamiento[idx]?.fecha || ''} onChange={v => setHinchamiento(idx, 'fecha', v)} />
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border">
                                                    <TableTextInput value={form.hinchamiento[idx]?.hora || ''} onChange={v => setHinchamiento(idx, 'hora', v)} />
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border">
                                                    <TableNumInput value={form.hinchamiento[idx]?.esp_01} onChange={v => setHinchamiento(idx, 'esp_01', v)} />
                                                </td>
                                                <td className="px-2 py-2 border-b border-r border-border">
                                                    <TableNumInput value={form.hinchamiento[idx]?.esp_02} onChange={v => setHinchamiento(idx, 'esp_02', v)} />
                                                </td>
                                                <td className="px-2 py-2 border-b border-border">
                                                    <TableNumInput value={form.hinchamiento[idx]?.esp_03} onChange={v => setHinchamiento(idx, 'esp_03', v)} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-3">
                                <NumberInput
                                    label="Profundidad de la hendidura (mm)"
                                    value={form.profundidad_hendidura_mm}
                                    onChange={v => setNum('profundidad_hendidura_mm', v)}
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <EquipmentSelect
                                label="Equipo CBR"
                                value={form.equipo_cbr || '-'}
                                options={EQUIPO_OPTIONS.equipo_cbr}
                                onChange={v => set('equipo_cbr', v)}
                            />
                            <EquipmentSelect
                                label="Dial deformacion"
                                value={form.equipo_dial_deformacion || '-'}
                                options={EQUIPO_OPTIONS.equipo_dial_deformacion}
                                onChange={v => set('equipo_dial_deformacion', v)}
                            />
                            <EquipmentSelect
                                label="Dial expansion"
                                value={form.equipo_dial_expansion || '-'}
                                options={EQUIPO_OPTIONS.equipo_dial_expansion}
                                onChange={v => set('equipo_dial_expansion', v)}
                            />
                            <EquipmentSelect
                                label="Horno 110 C"
                                value={form.equipo_horno_110 || '-'}
                                options={EQUIPO_OPTIONS.equipo_horno_110}
                                onChange={v => set('equipo_horno_110', v)}
                            />
                            <EquipmentSelect
                                label="Pison"
                                value={form.equipo_pison || '-'}
                                options={EQUIPO_OPTIONS.equipo_pison}
                                onChange={v => set('equipo_pison', v)}
                            />
                            <EquipmentSelect
                                label="Balanza 1 g"
                                value={form.equipo_balanza_1g || '-'}
                                options={EQUIPO_OPTIONS.equipo_balanza_1g}
                                onChange={v => set('equipo_balanza_1g', v)}
                            />
                            <EquipmentSelect
                                label="Balanza 0.1 g"
                                value={form.equipo_balanza_01g || '-'}
                                options={EQUIPO_OPTIONS.equipo_balanza_01g}
                                onChange={v => set('equipo_balanza_01g', v)}
                            />
                        </div>
                    </div>
                </Section>

                <Section title="Observaciones">
                    <textarea
                        value={form.observaciones || ''}
                        onChange={e => set('observaciones', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Observaciones del ensayo..."
                    />
                </Section>

                <Section title="Revisado / Aprobado">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Input label="Revisado por" value={form.revisado_por || ''} onChange={v => set('revisado_por', v)} />
                        <Input
                            label="Fecha revision"
                            value={form.revisado_fecha || ''}
                            onChange={v => set('revisado_fecha', v)}
                            onBlur={() => applyFormattedField('revisado_fecha', normalizeFlexibleDate)}
                            placeholder="DD/MM/AA"
                        />
                        <Input label="Aprobado por" value={form.aprobado_por || ''} onChange={v => set('aprobado_por', v)} />
                        <Input
                            label="Fecha aprobacion"
                            value={form.aprobado_fecha || ''}
                            onChange={v => set('aprobado_fecha', v)}
                            onBlur={() => applyFormattedField('aprobado_fecha', normalizeFlexibleDate)}
                            placeholder="DD/MM/AA"
                        />
                    </div>
                </Section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                        onClick={() => void handleSave(false)}
                        disabled={loading}
                        className="h-11 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                            : 'Guardar'
                        }
                    </button>
                    <button
                        onClick={() => void handleSave(true)}
                        disabled={loading}
                        className="h-11 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                            : <><Download className="h-4 w-4" /> Guardar y Descargar</>
                        }
                    </button>
                </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-4 space-y-4">
                        <HumedadResumenTable
                            sinSaturar={humedadResumen.sin_saturar}
                            saturado={humedadResumen.saturado}
                            humedadObjetivo={form.optimo_contenido_humedad}
                        />
                        <MoldCodeReferenceTable />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Section({ title, icon, children }: {
    title: string
    icon?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-border bg-muted/50 rounded-t-lg flex items-center gap-2">
                {icon}
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            <div className="p-4">{children}</div>
        </div>
    )
}

function HumedadResumenTable({
    sinSaturar,
    saturado,
    humedadObjetivo,
}: {
    sinSaturar: HumedadResumenRow[]
    saturado: HumedadResumenRow[]
    humedadObjetivo?: number
}) {
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-border bg-muted/50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-foreground">C.H Referencial</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Objetivo: {humedadObjetivo != null ? `${humedadObjetivo}%` : '-'}
                </p>
            </div>
            <div className="p-4">
                <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                        <thead className="bg-sky-100">
                            <tr>
                                <th className="px-2 py-1.5 text-left border-b border-r border-border">C.H SIN SATURAR</th>
                                <th className="px-2 py-1.5 text-center border-b border-border">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sinSaturar.map((row) => (
                                <tr key={`ss-${row.muestra}`}>
                                    <td className="px-2 py-1.5 border-b border-r border-border">
                                        <span className="font-medium">{row.muestra}</span>
                                        <span className="ml-2 text-muted-foreground">{row.valor == null ? '-' : `${row.valor.toFixed(2)}%`}</span>
                                    </td>
                                    <td className="px-2 py-1.5 border-b border-border text-center">{row.estado}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="overflow-hidden rounded-md border border-border mt-3">
                    <table className="w-full text-xs">
                        <thead className="bg-sky-100">
                            <tr>
                                <th className="px-2 py-1.5 text-left border-b border-r border-border">C.H SATURADO</th>
                                <th className="px-2 py-1.5 text-center border-b border-border">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {saturado.map((row) => (
                                <tr key={`sat-${row.muestra}`}>
                                    <td className="px-2 py-1.5 border-b border-r border-border">
                                        <span className="font-medium">{row.muestra}</span>
                                        <span className="ml-2 text-muted-foreground">{row.valor == null ? '-' : `${row.valor.toFixed(2)}%`}</span>
                                    </td>
                                    <td className="px-2 py-1.5 border-b border-border text-center">{row.estado}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function MoldCodeReferenceTable() {
    return (
        <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="px-4 py-2.5 border-b border-border bg-muted/50 rounded-t-lg">
                <h2 className="text-sm font-semibold text-foreground">Codigos / Equipos Utilizado</h2>
            </div>
            <div className="p-4">
                <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-xs">
                        <thead className="bg-sky-100">
                            <tr>
                                <th className="px-2 py-1.5 border-b border-r border-border text-center">CODIGOS</th>
                                <th className="px-2 py-1.5 border-b border-border text-center">EQUIPOS UTILIZADO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOLD_CODE_REFERENCE.map((entry) => (
                                <tr key={entry.codigo}>
                                    <td className="px-2 py-1.5 border-b border-r border-border text-center">{entry.codigo}</td>
                                    <td className="px-2 py-1.5 border-b border-border text-center">{entry.equipo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function Input({ label, value, onChange, placeholder, onBlur }: {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    onBlur?: () => void
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete="off"
                data-lpignore="true"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
        </div>
    )
}

function NumberInput({ label, value, onChange }: {
    label: string
    value: number | undefined | null
    onChange: (raw: string) => void
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <input
                type="number"
                step="any"
                value={value ?? ''}
                onChange={e => onChange(e.target.value)}
                autoComplete="off"
                data-lpignore="true"
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
        </div>
    )
}

function SelectField({ label, value, onChange, options }: {
    label: string
    value: string
    onChange: (v: string) => void
    options: string[]
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full h-9 pl-3 pr-8 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                >
                    {options.map(option => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
        </div>
    )
}

function EquipmentSelect({ label, value, onChange, options }: {
    label: string
    value: string
    onChange: (v: string) => void
    options: string[]
}) {
    return <SelectField label={label} value={value} onChange={onChange} options={options} />
}

function TableTextInput({ value, onChange }: {
    value: string
    onChange: (raw: string) => void
}) {
    return (
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            autoComplete="off"
            data-lpignore="true"
            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
    )
}

function TableSelectInput({ value, options, onChange }: {
    value: string
    options: DropdownOption[]
    onChange: (raw: string) => void
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full h-8 pl-2 pr-7 rounded-md border border-input bg-background text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
    )
}

function TableNumInput({ value, onChange }: {
    value: number | undefined | null
    onChange: (raw: string) => void
}) {
    return (
        <input
            type="number"
            step="any"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            autoComplete="off"
            data-lpignore="true"
            className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
    )
}

function TableComputedValue({ value }: {
    value: number | null
}) {
    return (
        <div className="h-8 px-2 rounded-md border border-input bg-muted/30 text-sm flex items-center justify-center text-foreground font-medium">
            {value != null ? value : '-'}
        </div>
    )
}

function ArrayNumberRow({
    label,
    values,
    onChange,
}: {
    label: string
    values: Array<number | null>
    onChange: (idx: number, raw: string) => void
}) {
    return (
        <tr>
            <td className="px-3 py-2 border-r border-b border-border">{label}</td>
            {values.map((value, idx) => (
                <td key={`${label}-${idx}`} className="px-2 py-2 border-b border-border">
                    <TableNumInput value={value} onChange={raw => onChange(idx, raw)} />
                </td>
            ))}
        </tr>
    )
}

function ArraySelectRow({
    label,
    values,
    options,
    onChange,
}: {
    label: string
    values: Array<string | null>
    options: DropdownOption[]
    onChange: (idx: number, raw: string) => void
}) {
    return (
        <tr>
            <td className="px-3 py-2 border-r border-b border-border">{label}</td>
            {values.map((value, idx) => (
                <td key={`${label}-${idx}`} className="px-2 py-2 border-b border-border">
                    <TableSelectInput value={value || '-'} options={options} onChange={raw => onChange(idx, raw)} />
                </td>
            ))}
        </tr>
    )
}
