# 💼 SKILLS & INSTRUCCIONES: AGENTE DE FEES (Fee Agent)

Este archivo define las habilidades, reglas de cotización y honorarios del **Agente de Fees**. Puedes editar este documento para gestionar sus reglas.

---

## 🎯 Objetivo del Agente
Calcular los honorarios de agenciamiento, gastos de gestión, trámites de cartas de invitación (LOI) y tasas de inmigración/visados para los cambios de tripulación.

---

## 🧠 Habilidades y Reglas de Cotización

### 1. Honorarios Base (1 a 3 Tripulantes)
- **Condición**: Para operaciones con un total de 1, 2 ó 3 tripulantes (`onsigners + offsigners <= 3`).
- **Tarifa**: Aplica la tarifa plana base con ID **`FEE-CREW-BASE`** (Tarifa plana fija, ej. 150.00 EUR).
- **Cantidad**: 1 (Tarifa plana, no se multiplica por el número de pax).

### 2. Honorarios Adicionales (> 3 Tripulantes)
- **Condición**: Para operaciones con más de 3 tripulantes (`onsigners + offsigners > 3`).
- **Tarifa**: Aplica la tarifa unitaria con ID **`FEE-CREW-ADDI`** (ej. 50.00 EUR por pax).
- **Fórmula**: $\text{Subtotal} = \text{FEE-CREW-ADDI} \times \text{Total Tripulantes}$

### 3. Gastos de Gestión de Reserva de Hotel (`FEE-HTL-BOOK`)
- **Condición**: Cada vez que se requiera servicio de hotel (`needHotel = true` con noches y habitaciones $> 0$).
- **Tarifa**: Carga la tarifa correspondiente al ID **`FEE-HTL-BOOK`** (ej. 24.20 EUR por gestión de reserva).
- **Cantidad**: 1 por reserva de hotel.

### 4. Tasas y Trámites de Inmigración para Visados (`Visados`)
Cuando está activa la opción de **Visados** y hay tripulantes con **Visado Completo** (`fullVisaPax > 0`):
- **`FEE-IMM-VISADO`** (Tasa Oficial de Inmigración):
  - **Aplicación**: Por cada tripulante con visado completo (ej. 90.00 EUR / pax).
  - **Cantidad**: Número de tripulantes con visado completo (`fullVisaPax`).
- **`FEE-IMM-SEAPOOLE`** (Cita de Inmigración):
  - **Aplicación**: Tarifa fija por grupo de tripulantes con visado completo (ej. 72.60 EUR).
  - **Cantidad**: 1 por grupo.
- **`FEE-IMM-IBERICA`** (Gestión de Visados):
  - **Aplicación**: Tarifa fija por grupo de tripulantes con visado completo (ej. 62.50 EUR).
  - **Cantidad**: 1 por grupo.

### 5. Cartas de Invitación / Letter of Invitation (`FEE-LOI-IBERICA`)
- **Condición**: Cuando se activa la opción de **Letter of Invitations (LOI)** (`needLoi = true` y `loiCount > 0`).
- **Tarifa**: ID **`FEE-LOI-IBERICA`** en `tarifas_fees.csv` (ej. 120.00 EUR / carta).
- **Aplicación**: El coste es por cada LOI emitida.
- **Fórmula**: $\text{Subtotal} = \text{FEE-LOI-IBERICA} \times \text{loiCount}$

---

## 📊 Estructura de Datos Requerida (`data/tarifas_fees.csv`)
`ID, CONCEPTO_FEE, TIPO_APLICACION, PRECIO_COSTO_EUR, OBSERVACIONES`
