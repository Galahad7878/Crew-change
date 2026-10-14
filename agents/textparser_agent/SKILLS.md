# 🧠 SKILLS & INSTRUCCIONES: AGENTE TEXTPARSER (Qwen2.5 3B Instruct Local)

Este archivo define las habilidades, capacidades de inferencia y configuración del **Agente TEXTPARSER**, potenciado por el modelo **Qwen2.5 3B Instruct** en modo **100% local**.

---

## 🎯 Objetivo del Agente
Interpretar, razonar y extraer automáticamente información operativa estructurada a partir de correos electrónicos y texto libre complejo en español e inglés sin enviar datos al exterior ni consumir tokens de pago.

---

## 🤖 Arquitectura del Modelo Local
- **Modelo**: `Qwen2.5-3B-Instruct`
- **Formato**: GGUF cuantizado `q4_k_m` (2.10 GB en disco).
- **Origen**: Descargado directamente de Hugging Face (`Qwen/Qwen2.5-3B-Instruct-GGUF`).
- **Motor de Inferencia**: `llama-cpp-python` sobre CPU multi-hilo (hilos: 6, contexto: 2048 tokens).
- **API Local**: Servicio FastAPI interno en `http://127.0.0.1:3001` con proxy en el servidor Node.js en `/api/parse-text`.
- **Estrategia Fallback**: Si el servicio de IA local no está encendido, el agente conmuta de forma automática e instantánea al motor de expresiones regulares para garantizar disponibilidad 24/7.

---

## 🧠 Capacidades del Modelo
1. **Entendimiento Lingüístico Avanzado**:
   - Entiende expresiones marítimas coloquiales, tablas de texto, correos desordenados y mezclas de inglés y español (Spanglish).
2. **Campos Extraídos**:
   - `vesselName`: Nombre normalizado del buque (`M/V`, `M/T`).
   - `portName`: Puerto de escala (por defecto `Tarragona`).
   - `operationDate`: Fecha de llegada (ETA).
   - `onsigners`: Número de tripulantes de embarque.
   - `offsigners`: Número de tripulantes de desembarque.
   - `locationType`: `Berth` (Muelle) o `Anchorage` (Fondeadero).
   - `needLaunchBoat`: Detección de requerimiento de lancha al fondeadero.
   - `needTransfers`: Detección de traslados aeropuerto-puerto.
   - `vehicleType`: Tipo de vehículo recomendado (`Sedan`, `Van`, `Minibus`).
   - `needLocalTransfers`: Detección de traslados urbanos Hotel - Puerto.
   - `needHotel`: Noches y habitaciones requeridas.
   - `needVisas`: Visado Completo (`fullVisaPax`) y Sellado Schengen (`schengenVisaPax`).
   - `needLoi`: Cartas de Invitación (`loiCount`).
