/** Tabla de Tamaños Máximos y Masa Mínima — ASTM D2216 */
export interface TamanoMasaEntry {
    tm: string       // "3", "2 1/2", "1/2", "N°4", etc.
    masa_g: number   // masa mínima en gramos
}

/** Payload completo para generar el Excel de Humedad */
export interface HumedadPayload {
    // Encabezado
    muestra: string
    numero_ot: string
    fecha_ensayo: string
    realizado_por: string

    // Condiciones
    condicion_masa_menor: "-" | "SI" | "NO"
    condicion_capas: "-" | "SI" | "NO"
    condicion_temperatura: "-" | "SI" | "NO"
    condicion_excluido: "-" | "SI" | "NO"
    descripcion_material_excluido?: string

    // Descripción muestra
    tipo_muestra?: string
    condicion_muestra?: string
    tamano_maximo_particula?: string

    // Método
    metodo_a: boolean
    metodo_b: boolean

    // Datos ensayo
    numero_ensayo?: number
    recipiente_numero?: string
    masa_recipiente_muestra_humeda?: number
    masa_recipiente_muestra_seca?: number
    masa_recipiente_muestra_seca_constante?: number
    masa_recipiente?: number

    // Fórmulas (override)
    masa_agua?: number
    masa_muestra_seca?: number
    contenido_humedad?: number

    // Método A tamaños
    metodo_a_tamano_1?: string
    metodo_a_tamano_2?: string
    metodo_a_tamano_3?: string
    metodo_a_masa_1?: string
    metodo_a_masa_2?: string
    metodo_a_masa_3?: string
    metodo_a_legibilidad_1?: string
    metodo_a_legibilidad_2?: string
    metodo_a_legibilidad_3?: string

    // Método B tamaños
    metodo_b_tamano_1?: string
    metodo_b_tamano_2?: string
    metodo_b_tamano_3?: string
    metodo_b_masa_1?: string
    metodo_b_masa_2?: string
    metodo_b_masa_3?: string
    metodo_b_legibilidad_1?: string
    metodo_b_legibilidad_2?: string
    metodo_b_legibilidad_3?: string

    // Equipo
    equipo_balanza_01?: string
    equipo_balanza_001?: string
    equipo_horno?: string

    // Observaciones
    observaciones?: string

    // Footer
    revisado_por?: string
    revisado_fecha?: string
    aprobado_por?: string
    aprobado_fecha?: string
}

export interface HumedadEnsayoSummary {
    id: number
    numero_ensayo: string
    numero_ot: string
    cliente?: string | null
    muestra?: string | null
    fecha_documento?: string | null
    estado: string
    contenido_humedad?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}

export interface HumedadEnsayoDetail extends HumedadEnsayoSummary {
    payload?: HumedadPayload | null
}

export interface HumedadSaveResponse {
    id: number
    numero_ensayo: string
    numero_ot: string
    estado: string
    contenido_humedad?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}

export interface CBRLecturaPenetracionRow {
    tension_standard?: number
    lectura_dial_esp_01?: number
    lectura_dial_esp_02?: number
    lectura_dial_esp_03?: number
}

export interface CBRHinchamientoRow {
    fecha?: string
    hora?: string
    esp_01?: number
    esp_02?: number
    esp_03?: number
}

export interface CBRPayload {
    muestra: string
    numero_ot: string
    fecha_ensayo: string
    realizado_por: string

    sobretamano_porcentaje?: number
    masa_grava_adicionada_g?: number
    condicion_muestra_saturado: "-" | "SI" | "NO"
    condicion_muestra_sin_saturar: "-" | "SI" | "NO"
    maxima_densidad_seca?: number
    optimo_contenido_humedad?: number
    temperatura_inicial_c?: number
    temperatura_final_c?: number
    tamano_maximo_visual_in?: string
    descripcion_muestra_astm?: string

    golpes_por_especimen: Array<number | null>
    codigo_molde_por_especimen: Array<string | null>
    temperatura_inicio_c_por_columna: Array<number | null>
    temperatura_final_c_por_columna: Array<number | null>
    masa_molde_suelo_g_por_columna: Array<number | null>
    codigo_tara_por_columna: Array<string | null>
    masa_tara_g_por_columna: Array<number | null>
    masa_suelo_humedo_tara_g_por_columna: Array<number | null>
    masa_suelo_seco_tara_g_por_columna: Array<number | null>
    masa_suelo_seco_tara_constante_g_por_columna: Array<number | null>

    lecturas_penetracion: CBRLecturaPenetracionRow[]
    hinchamiento: CBRHinchamientoRow[]
    profundidad_hendidura_mm?: number

    equipo_cbr?: string
    equipo_dial_deformacion?: string
    equipo_dial_expansion?: string
    equipo_horno_110?: string
    equipo_pison?: string
    equipo_balanza_1g?: string
    equipo_balanza_01g?: string

    observaciones?: string
    revisado_por?: string
    revisado_fecha?: string
    aprobado_por?: string
    aprobado_fecha?: string
}

export interface CBREnsayoSummary {
    id: number
    numero_ensayo: string
    numero_ot: string
    cliente?: string | null
    muestra?: string | null
    fecha_documento?: string | null
    estado: string
    indice_cbr?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}

export interface CBREnsayoDetail extends CBREnsayoSummary {
    payload?: CBRPayload | null
}

export interface CBRSaveResponse {
    id: number
    numero_ensayo: string
    numero_ot: string
    estado: string
    indice_cbr?: number | null
    bucket?: string | null
    object_key?: string | null
    fecha_creacion?: string | null
    fecha_actualizacion?: string | null
}
