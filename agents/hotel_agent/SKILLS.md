# 🏨 SKILLS & INSTRUCCIONES: AGENTE DE HOTELES (Hotel Agent)

Este archivo define las habilidades, reglas de cálculo y lógica operativa del **Agente de Hoteles**. Puedes editar este documento para agregar o modificar las reglas del agente.

---

## 🎯 Objetivo del Agente
Cotizar los alojamientos hoteleros para tripulantes (onsigners y offsigners) utilizando exclusivamente las tarifas del archivo `data/tarifas_hoteles.csv`.

---

## 🧠 Habilidades y Reglas de Selección de Hotel

### 1. Lectura Exclusiva de CSV (Sin Fallbacks Hardcoded)
- **Regla**: El agente debe consultar **únicamente** los registros contenidos en `./data/tarifas_hoteles.csv`.
- **Sin Fallback**: Si el archivo CSV no está disponible o el código seleccionado no existe en la tabla, el agente no inventa tarifas por defecto ni usa precios por defecto hardcoded.

### 2. Hotel y Tarifa por Defecto
- **Código por Defecto**: **`HTL-TGN-SB-IND`** (Hotel SB Express Tarragona 3* - Individual SGL, 75.00 EUR/noche).

### 3. Selección Dinámica mediante Desplegable UI
- El usuario puede seleccionar el hotel y régimen deseado desde el menú desplegable en el punto 2 de Parámetros Operativos (`Delegación de Servicios por Agente: Agente Hoteles`).

### 4. Fórmula de Cálculo
$$\text{Total Noches-Habitación} = \text{Número de Habitaciones} \times \text{Número de Noches}$$
$$\text{Coste Alojamiento} = \text{Total Noches-Habitación} \times \text{PRECIO\_NOCHE\_EUR } (\text{obtenido de tarifas\_hoteles.csv por ID})$$

---

## 📊 Estructura de Datos Requerida (`data/tarifas_hoteles.csv`)
Columnas requeridas:
`ID, HOTEL_NOMBRE, TIPO_HABITACION, REGIMEN, PRECIO_NOCHE_EUR, SUPLEMENTO_COMIDA_EUR, OBSERVACIONES`
