# 🔍 SKILLS & INSTRUCCIONES: AGENTE TEXTPARSER (TextParser Agent)

Este archivo define las habilidades, patrones lingüísticos, reglas de extracción y heurísticas del **Agente TEXTPARSER**.
Puedes editar este documento para agregar nuevas palabras clave, expresiones marítimas, formatos de fecha o reglas de entendimiento en español e inglés.

---

## 🎯 Objetivo del Agente
Interpretar y extraer información operativa estructurada a partir de texto libre, correos electrónicos informales o solicitudes formales de armadores y agencias, tanto en **español** como en **inglés**.

---

## 🧠 Habilidades y Reglas de Extracción

### 1. Detección del Nombre del Buque (Vessel Name)
- **Prefijos y Patrones Reconocidos**:
  - Español: `buque:`, `barco:`, `motonav:`, `al buque`, `del buque`, `para el buque`, `barco`, `b/m`, `b/t`
  - Inglés: `m/v`, `mv`, `m/t`, `mt`, `s/t`, `st`, `vessel:`, `vessel name:`, `vsl:`, `for the vessel`, `to vessel`
- **Normalización**:
  - Extrae el nombre en mayúsculas y añade el prefijo estándar (`M/V ` para motonaves o `M/T ` para petroleros/quimiqueros).
  - Valor por defecto si no se detecta: `M/V OCEAN GLORY`.

### 2. Detección de Tripulantes (Onsigners y Offsigners)
- **Onsigners (Embarques / Entrantes)**:
  - Español: `embarque`, `embarques`, `embarcan`, `suben`, `incorporaciones`, `entrantes`, `para embarcar`, `on-signer`, `onsigners`
  - Inglés: `onsigner`, `onsigners`, `on-signers`, `on signers`, `joining`, `joiners`, `embarking`, `incoming crew`, `to embark`, `onboard`
- **Offsigners (Desembarques / Salientes)**:
  - Español: `desembarque`, `desembarques`, `desembarcan`, `bajan`, `salientes`, `repatriados`, `para desembarcar`, `off-signer`, `offsigners`
  - Inglés: `offsigner`, `offsigners`, `off-signers`, `off signers`, `disembarking`, `leaving`, `repatriating`, `repats`, `outgoing crew`, `to disembark`
- **Formatos Combinados**:
  - Reconoce expresiones como: `3 on / 2 off`, `2 onsigners and 3 offsigners`, `2 embarcan y 3 desembarcan`, `2/3`, `2+3 pax`.

### 3. Puerto y Ubicación (Port & Vessel Location)
- **Puerto por Defecto**: **`Tarragona`** (se mantiene salvo mención expresa de otro puerto).
- **Ubicación por Defecto**: **`Berth` (Muelle / Pantalán)**.
- **Detección de Fondeadero (`Anchorage`)**:
  - Palabras clave: `anchorage`, `at anchor`, `rada`, `la rada`, `fondeadero`, `en fondeo`, `fondeo`.
  - Cuando detecta fondeadero, activa automáticamente la lancha de pasaje (`needLaunchBoat = true`).

### 4. Fecha de Operación / ETA
- **Fecha por Defecto**: **Fecha actual** formateada en formato legible (ej. `20 Aug 2026`).
- **Extracción de Fechas Explicitas**:
  - Formatos: `25th August`, `25/08`, `25-08-2026`, `tomorrow`, `mañana`, `ETA 22nd`, etc.

### 5. Servicios Adicionales Detectados
- **Alojamiento (Hotel)**: Detecta `hotel`, `alojamiento`, `accommodation`, número de noches (`X nights / X noches`) y habitaciones (`X rooms / X habitaciones`). Por defecto: 1 hab / 1 noche.
- **Transfers Terrestres**: Detecta menciones de transfers, taxis, furgonetas, etc. Vehículo por defecto: `Sedan`.
- **Visados e Inmigración**:
  - `Visado Completo`: Detecta `full visa`, `visado completo`, `formalidades visado`.
  - `Sellado Schengen`: Detecta `schengen`, `visado schengen`, `sellado schengen`, `schengen stamping`.
- **Recargos**: Detecta `overtime`, `night`, `nocturno`, `holiday`, `festivo`, `weekend`, `fin de semana`.

---

## 📋 Salida Estructurada Generada por TEXTPARSER
```json
{
  "vesselName": "M/V OCEAN GLORY",
  "portName": "Tarragona",
  "operationDate": "20 Aug 2026",
  "onsigners": 2,
  "offsigners": 3,
  "locationType": "Berth",
  "needLaunchBoat": false,
  "launchTrips": 1,
  "needTransfers": true,
  "vehicleType": "Sedan",
  "needHotel": true,
  "hotelNights": 1,
  "hotelRooms": 1,
  "needImmigration": true,
  "needVisas": false,
  "fullVisaPax": 0,
  "schengenVisaPax": 0,
  "isNightOrHoliday": false,
  "currency": "EUR"
}
```
