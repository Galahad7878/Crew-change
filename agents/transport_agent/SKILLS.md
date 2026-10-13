# 🚚 SKILLS & INSTRUCCIONES: AGENTE DE TRANSPORTE (Transport Agent)

Este archivo define las habilidades, reglas de cálculo y lógica operativa del **Agente de Transporte**. Puedes editar este documento para gestionar sus habilidades.

---

## 🎯 Objetivo del Agente
Cotizar los traslados terrestres (aeropuerto y locales), servicios de lancha y traslados de visados/inmigración para tripulantes utilizando **exclusivamente** las tarifas del archivo `data/tarifas_transporte.csv`.

---

## 🧠 Habilidades y Reglas de Cotización

### 1. Lectura Exclusiva de CSV (`data/tarifas_transporte.csv`)
- **Regla**: El agente consulta únicamente los registros contenidos en `./data/tarifas_transporte.csv`. No inventa tarifas de fallback ni sobreescribe el archivo.

### 2. Transfers Terrestres (Aeropuerto $\leftrightarrow$ Puerto)
- La ruta predeterminada para las cotizaciones terrestres de enlace es **Aeropuerto $\rightarrow$ Puerto** (`ORIGEN = Aeropuerto`, `DESTINO = Puerto`).
- **Cotización por Defecto**: 1 transporte para Onsigners + 1 transporte para Offsigners.
- **Selección por ID de Vehículo**:
  - **1 a 3 Pax (Sedan)**: ID **`TR-TGN-BCN-SED`** (269.00 €).
  - **4 a 7 Pax (Van)**: ID **`TR-TGN-BCN-VAN`** (356.00 €).
  - **Más de 7 Pax (Minibus)**: ID **`TR-TGN-BCN-BUS`** (420.00 €).

### 3. Transfers Locales (Hotel $\leftrightarrow$ Puerto)
Cuando se activa la opción de **Transfers Locales**:
- **Tarifas disponibles según vehículo**:
  - **Sedan / Taxi (1-3 Pax)**: ID **`TR-TGN-LOCAL-SED`** (38.40 € / trayecto).
  - **Van / Minivan (4-7 Pax)**: ID **`TR-TGN-LOCAL-VAN`** (65.00 € / trayecto).
  - **Minibus (8-16 Pax)**: ID **`TR-TGN-LOCAL-BUS`** (120.12 € / trayecto).
- **Fórmula**: $\text{Subtotal} = \text{Tarifa Unit.} \times \text{Nº de Trayectos Locales}$

### 4. Servicio de Lancha al Fondeadero (`TR-TGN-LANCHA`)
- **ID de Tarifa**: **`TR-TGN-LANCHA`** (Lancha Pasaje Estándar al fondeadero).
- **Activación**: Opción desmarcada por defecto (`needLaunchBoat = false`). Se incluye cuando el buque está en fondeadero o se solicita lancha.
- **Precio**: Extraído estrictamente del campo `PRECIO_COSTO_EUR` asignado a `TR-TGN-LANCHA` en `tarifas_transporte.csv` (787.90 €).

### 5. Traslados de Trámite de Visados e Inmigración (`Visados`)
Cuando se activa la opción de **Visados** en la operativa:
- **Visado Completo** (según número de tripulantes con visado completo):
  - **1 a 3 Pax**: ID **`TR-TGN-VISA-SED`** (Hotel $\rightarrow$ Visado, Sedan, 115.50 €)
  - **4 a 7 Pax**: ID **`TR-TGN-VISA-VAN`** (Hotel $\rightarrow$ Visado, Van, 142.00 €)
  - **Más de 7 Pax**: ID **`TR-TGN-VISA-BUS`** (Hotel $\rightarrow$ Visado, Minibus, 220.80 €)
- **Sellado Visado Schengen** (según número de tripulantes con visado Schengen):
  - **1 a 3 Pax**: ID **`TR-TGN-IMM-SED`** (Hotel $\rightarrow$ Inmigración, Sedan, 46.20 €)
  - **4 a 7 Pax**: ID **`TR-TGN-IMM-VAN`** (Hotel $\rightarrow$ Inmigración, Van, 78.20 €)
  - **Más de 7 Pax**: ID **`TR-TGN-IMM-BUS`** (Hotel $\rightarrow$ Inmigración, Minibus, 120.12 €)

---

## 📊 Estructura de Datos Requerida (`data/tarifas_transporte.csv`)
`ID, ORIGEN, DESTINO, TIPO_VEHICULO, CAPACIDAD_PAX, PRECIO_COSTO_EUR, RECARGO_NOCTURNO_PCT, OBSERVACIONES`
