"""
Servicio LLM Local para TextParserAgent usando Qwen2.5 3B Instruct (GGUF)
Ejecuta localmente sobre CPU con llama-cpp-python.
"""
import os
import sys
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import llama_cpp

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "qwen2.5-3b-instruct-q4_k_m.gguf")

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: No se encontró el modelo en {MODEL_PATH}")
    sys.exit(1)

print(f"Cargando modelo Qwen2.5 3B Instruct desde: {MODEL_PATH}")
# Usamos 6 hilos de CPU y contexto 2048
llm = llama_cpp.Llama(
    model_path=MODEL_PATH,
    n_ctx=2048,
    n_threads=6,
    verbose=False
)
print("Modelo Qwen2.5 3B cargado exitosamente.")

app = FastAPI(title="TextParser Qwen2.5 3B Local Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ParseRequest(BaseModel):
    text: str

SYSTEM_PROMPT = """You are an expert maritime crewing operations assistant.
Extract all relevant crewing details from the user's text/email (which may be in English or Spanish).
Return ONLY a valid JSON object with the following fields and types:
{
  "vesselName": string (e.g. "M/V OCEAN GLORY" or "M/T SEA CHAMPION", normalized with standard prefix),
  "portName": string (default "Tarragona"),
  "operationDate": string (e.g. "20th August", or explicit date extracted),
  "onsigners": integer (number of joining / embarkation crew members),
  "offsigners": integer (number of leaving / disembarking crew members),
  "locationType": string ("Berth" or "Anchorage"),
  "needLaunchBoat": boolean (true if anchorage or launch requested),
  "launchTrips": integer (default 1 if launch boat needed),
  "needTransfers": boolean (true if airport/port transfers requested),
  "vehicleType": string ("Sedan", "Van", or "Minibus"),
  "needLocalTransfers": boolean (true if hotel to port / local transfers requested),
  "localVehicleType": string ("TR-TGN-LOCAL-SED", "TR-TGN-LOCAL-VAN", or "TR-TGN-LOCAL-BUS"),
  "localTransferTrips": integer (default 1 if local transfers needed),
  "needHotel": boolean (true if hotel / accommodation requested),
  "hotelNights": integer (number of nights, default 1),
  "hotelRooms": integer (number of rooms, default 1),
  "needImmigration": boolean (true if shore passes / immigration formalities mentioned),
  "needVisas": boolean (true if visa handling requested),
  "fullVisaPax": integer (number of crew requiring full visa formalities),
  "schengenVisaPax": integer (number of crew requiring Schengen visa stamping),
  "needLoi": boolean (true if letters of invitation LOI requested),
  "loiCount": integer (number of LOIs requested)
}
Strict requirement: Return ONLY the JSON object. Do not wrap in markdown quotes if possible, do not add introductory remarks or conversational text."""

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "Qwen2.5-3B-Instruct-GGUF",
        "file": os.path.basename(MODEL_PATH)
    }

@app.post("/parse")
def parse(req: ParseRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty text")

    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text}
        ]

        response = llm.create_chat_completion(
            messages=messages,
            temperature=0.1,
            max_tokens=600,
            response_format={"type": "json_object"}
        )

        content = response["choices"][0]["message"]["content"]
        data = json.loads(content)
        return {
            "success": True,
            "engine": "qwen2.5-3b-instruct",
            "data": data
        }
    except Exception as e:
        print(f"Error procesando con Qwen2.5: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Escucha en puerto 3001 para que node.js (puerto 3000) pueda comunicarse
    uvicorn.run(app, host="127.0.0.1", port=3001)
