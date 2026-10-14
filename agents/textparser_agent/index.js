/**
 * Agente TEXTPARSER (TextParser Agent) con LLM Local Qwen2.5 3B Instruct
 * Utiliza el modelo Qwen2.5-3B-Instruct en modo local (GGUF cuantizado q4_k_m)
 * a través de la API local (/api/parse-text), con fallback automático a reglas regex
 * en caso de que el backend de IA no esté iniciado o no responda.
 */
class TextParserAgent {
  constructor(skillsPath = 'agents/textparser_agent/SKILLS.md') {
    this.name = 'Agente TextParser (Qwen2.5 3B Local)';
    this.skillsPath = skillsPath;
    this.modelName = 'Qwen2.5-3B-Instruct (GGUF Local)';
  }

  /**
   * Intenta parsear usando Qwen2.5 3B Instruct local; si falla, timeout o no está disponible, usa fallback regex.
   */
  async parseAsync(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return this.getDefaults();
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/parse-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const d = json.data;
          const defaults = this.getDefaults();
          return {
            vesselName: d.vesselName || defaults.vesselName,
            portName: d.portName || defaults.portName,
            operationDate: d.operationDate || defaults.operationDate,
            onsigners: typeof d.onsigners === 'number' ? d.onsigners : defaults.onsigners,
            offsigners: typeof d.offsigners === 'number' ? d.offsigners : defaults.offsigners,
            locationType: (d.locationType === 'Anchorage' || d.needLaunchBoat) ? 'Anchorage' : 'Berth',
            needLaunchBoat: d.needLaunchBoat !== undefined ? Boolean(d.needLaunchBoat) : (d.locationType === 'Anchorage'),
            launchTrips: d.launchTrips || 1,
            needTransfers: d.needTransfers !== undefined ? Boolean(d.needTransfers) : defaults.needTransfers,
            vehicleType: d.vehicleType || defaults.vehicleType,
            needLocalTransfers: Boolean(d.needLocalTransfers),
            localVehicleType: d.localVehicleType || defaults.localVehicleType,
            localTransferTrips: d.localTransferTrips || 1,
            needHotel: d.needHotel !== undefined ? Boolean(d.needHotel) : defaults.needHotel,
            hotelNights: d.hotelNights || 1,
            hotelRooms: d.hotelRooms || 1,
            needImmigration: d.needImmigration !== undefined ? Boolean(d.needImmigration) : defaults.needImmigration,
            needVisas: Boolean(d.needVisas),
            fullVisaPax: d.fullVisaPax || 0,
            schengenVisaPax: d.schengenVisaPax || 0,
            needLoi: Boolean(d.needLoi),
            loiCount: d.loiCount || 1,
            currency: 'EUR',
            _engine: 'Qwen2.5-3B-Instruct (Local LLM)'
          };
        }
      } else {
        console.warn('TextParserAgent: Respuesta HTTP no-OK (' + response.status + '), activando fallback regex.');
      }
    } catch (e) {
      console.warn('TextParserAgent: Fallback a reglas regex activado:', e.message || e);
    }

    // Fallback garantizado a motor síncrono por reglas
    const fallback = this.parse(text);
    fallback._engine = 'Heurísticas Regex (Modo Fallback)';
    return fallback;
  }

  /**
   * Parseo síncrono clásico de reglas / regex (usado para live typing y fallback)
   */
  parse(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return this.getDefaults();
    }

    const result = this.getDefaults();
    const cleanText = text.trim();

    // 1. Vessel Name (Buque)
    const vesselName = this.extractVesselName(cleanText);
    if (vesselName) {
      result.vesselName = vesselName;
    }

    // 2. Port Name (Puerto - Default: Tarragona)
    const portName = this.extractPortName(cleanText);
    if (portName) {
      result.portName = portName;
    }

    // 3. Date / ETA (Fecha - Default: Fecha Actual)
    const etaDate = this.extractDate(cleanText);
    if (etaDate) {
      result.operationDate = etaDate;
    }

    // 4. Crew Onsigners & Offsigners (Embarques y Desembarques)
    const crewCounts = this.extractCrewCounts(cleanText);
    result.onsigners = crewCounts.onsigners;
    result.offsigners = crewCounts.offsigners;

    // 5. Vessel Location (Anchorage vs Berth)
    if (/(?:anchorage|fondeadero|la rada|rada|at anchor|en fondeo|fondeo|anchoring)/i.test(cleanText)) {
      result.locationType = 'Anchorage';
      result.needLaunchBoat = true;
    } else if (/(?:berth|dock|pier|muelle|pantalan|pantalán|at berth|en muelle|at dock)/i.test(cleanText)) {
      result.locationType = 'Berth';
      result.needLaunchBoat = false;
    }

    // 6. Launch Boat explicit check
    if (/(?:launch|lancha|lanzadera|boat service|servicio de lancha)/i.test(cleanText)) {
      result.needLaunchBoat = true;
    }

    // 7. Hotel Accommodation (Default: 1 room / 1 night)
    if (/(?:hotel|accommodation|alojamiento|alojar|noche|noches|night|nights|habitacion|habitación|single room|double room)/i.test(cleanText)) {
      result.needHotel = true;
    }

    const nightMatch = cleanText.match(/(\d+)\s*(?:night|nights|noches|noche)/i);
    if (nightMatch) {
      result.hotelNights = parseInt(nightMatch[1], 10);
      result.needHotel = true;
    } else {
      result.hotelNights = 1;
    }

    const roomMatch = cleanText.match(/(\d+)\s*(?:room|rooms|habitacion|habitaciones|habs|hab|sgl|dbl)/i);
    if (roomMatch) {
      result.hotelRooms = parseInt(roomMatch[1], 10);
    } else {
      result.hotelRooms = 1;
    }

    // 8. Ground Transfers & Vehicle Type (Default: Sedan)
    if (/(?:minibus|bus|autobus|autobús|16 pax)/i.test(cleanText)) {
      result.vehicleType = 'Minibus';
      result.localVehicleType = 'TR-TGN-LOCAL-BUS';
    } else if (/(?:minivan|van|furgoneta|7 pax|8 pax)/i.test(cleanText)) {
      result.vehicleType = 'Van';
      result.localVehicleType = 'TR-TGN-LOCAL-VAN';
    } else if (/(?:sedan|sedán|taxi|car|coche|3 pax)/i.test(cleanText)) {
      result.vehicleType = 'Sedan';
      result.localVehicleType = 'TR-TGN-LOCAL-SED';
    } else {
      result.vehicleType = 'Sedan';
      result.localVehicleType = 'TR-TGN-LOCAL-SED';
    }

    if (/(?:transfer|transfers|transport|transporte|taxi|car|van|minivan|aeropuerto|airport|traslado|traslados)/i.test(cleanText)) {
      result.needTransfers = true;
    }

    // 9. Local Transfers (Hotel <-> Port)
    const localMatch = cleanText.match(/(?:transfer\s+local|transfers\s+locales|traslado\s+local|traslados\s+locales|local\s+transfer|local\s+transfers|hotel\s+to\s+port|port\s+to\s+hotel|hotel\s+al\s+puerto|puerto\s+al\s+hotel)/i);
    if (localMatch) {
      result.needLocalTransfers = true;
      const tripsMatch = cleanText.match(/(\d+)\s*(?:local\s+trips|trayectos\s+locales|local\s+transfers|traslados\s+locales)/i);
      if (tripsMatch) {
        result.localTransferTrips = parseInt(tripsMatch[1], 10);
      } else {
        result.localTransferTrips = 1;
      }
    }

    // 10. Immigration & Formalities (Fees)
    if (/(?:visa|visado|ok to board|shore pass|pase de desembarco|immigration|migracion|migración|formalidades|formalites|passports|pasaportes)/i.test(cleanText)) {
      result.needImmigration = true;
    }

    // 11. Visa Transfers (Full Visa vs Schengen Stamping)
    const fullVisaMatch = cleanText.match(/(\d+)\s*(?:pax|crew|tripulantes)?\s*(?:with\s+|con\s+)?(?:full\s*visa|visado\s*completo|visado\s*ordinario)/i);
    const schengenMatch = cleanText.match(/(\d+)\s*(?:pax|crew|tripulantes)?\s*(?:with\s+|con\s+)?(?:schengen|visado\s*schengen|schengen\s*visa|sellado\s*schengen|schengen\s*stamping)/i);

    if (fullVisaMatch || schengenMatch) {
      result.needVisas = true;
      if (fullVisaMatch) result.fullVisaPax = parseInt(fullVisaMatch[1], 10);
      if (schengenMatch) result.schengenVisaPax = parseInt(schengenMatch[1], 10);
    }

    // 12. Letter of Invitations (LOI)
    const loiMatch = cleanText.match(/(\d+)?\s*(?:loi|lois|letter of invitation|letters of invitation|carta de invitacion|cartas de invitacion|carta de invitación|cartas de invitación)/i);
    if (loiMatch) {
      result.needLoi = true;
      if (loiMatch[1]) {
        result.loiCount = parseInt(loiMatch[1], 10);
      } else {
        result.loiCount = 1;
      }
    }

    return result;
  }

  extractVesselName(text) {
    const patterns = [
      /(?:m\/v|mv|m\/t|mt|s\/t|st|b\/m|b\/t|m\/v\.|m\/t\.)\s+([a-z0-9\s\.\-\']+?)(?:\,|\.|\n|at|in|eta|for|arriving|\(|\)|$)/i,
      /(?:vessel|buque|barco|motonav|vessel name|nombre del buque)\s*(?:\:|\-|\=|\s)\s*([a-z0-9\s\.\-\']+?)(?:\,|\.|\n|at|in|eta|for|arriving|\(|\)|$)/i,
      /(?:for the vessel|to the vessel|al buque|para el buque|del buque|del barco)\s+([a-z0-9\s\.\-\']+?)(?:\,|\.|\n|at|in|eta|for|arriving|\(|\)|$)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let vName = match[1].trim();
        vName = vName.replace(/^(the|el|la|un|una)\s+/i, '');
        if (vName.length > 2 && !['arriving', 'calling', 'sailing', 'llegando', 'puerto'].includes(vName.toLowerCase())) {
          let prefix = 'M/V ';
          if (/^m\/t|^mt|^b\/t/i.test(match[0]) || /tanker|petrolero|quimiquero/i.test(text)) {
            prefix = 'M/T ';
          }
          vName = vName.replace(/^(m\/v|mv|m\/t|mt|s\/t|st|b\/m|b\/t)\s+/i, '');
          return prefix + vName.toUpperCase();
        }
      }
    }
    return null;
  }

  extractPortName(text) {
    const patterns = [
      /(?:port of|puerto de|puerto del|port|puerto)\s+([a-z\s]+?)(?:\,|\.|\n|eta|on|for|at|\(|\)|$)/i,
      /(?:at|in|en)\s+([a-z\s]+?)\s+(?:port|puerto|anchorage|fondeadero|berth|muelle)/i,
      /(?:at|in|en)\s+([a-z\s]+?)(?:\,|\.|\n|eta|on|for|\(|\)|$)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const lower = candidate.toLowerCase();
        const invalidWords = ['the', 'anchorage', 'berth', 'port', 'puerto', 'fondeadero', 'muelle', 'our', 'my', 'this', 'spain', 'españa'];
        if (candidate.length > 2 && !invalidWords.includes(lower)) {
          return candidate.charAt(0).toUpperCase() + candidate.slice(1);
        }
      }
    }
    return 'Tarragona';
  }

  extractDate(text) {
    const datePatterns = [
      /(?:eta|date|fecha|on|el|arriving|llegada|for)\s*(?:\:|\-|\s)*([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:de\s+)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?[0-9]{4})?)/i,
      /(?:eta|date|fecha|on|el|arriving|llegada)\s*(?:\:|\-|\s)*([0-9]{1,2}[\/\-\.][0-9]{1,2}(?:[\/\-\.][0-9]{2,4})?)/i,
      /([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+[0-9]{4})?)/i
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return this.getCurrentFormattedDate();
  }

  getCurrentFormattedDate() {
    const now = new Date();
    const day = now.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    let suffix = 'th';
    if (day % 10 === 1 && day !== 11) suffix = 'st';
    else if (day % 10 === 2 && day !== 12) suffix = 'nd';
    else if (day % 10 === 3 && day !== 13) suffix = 'rd';

    return `${day}${suffix} ${month} ${year}`;
  }

  extractCrewCounts(text) {
    let onsigners = 0;
    let offsigners = 0;

    const onPatterns = [
      /(\d+)\s*(?:onsigner|onsigners|on-signer|on signers|on-signers|joining|joiners|embarking|incoming crew|to embark|onboard)/i,
      /(\d+)\s*(?:embarque|embarques|embarcan|suben|incorporaciones|entrantes|para embarcar|que embarcan)/i,
      /(?:embarque|embarques|joining|onsigners|on-signers|on)\s*(?:\:|\-|\=)\s*(\d+)/i
    ];

    for (const pattern of onPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        onsigners = parseInt(match[1], 10);
        break;
      }
    }

    const offPatterns = [
      /(\d+)\s*(?:offsigner|offsigners|off-signer|off signers|off-signers|disembarking|leaving|repatriating|repats|outgoing crew|to disembark)/i,
      /(\d+)\s*(?:desembarque|desembarques|desembarcan|bajan|salientes|repatriados|para desembarcar|que desembarcan)/i,
      /(?:desembarque|desembarques|disembarking|offsigners|off-signers|off)\s*(?:\:|\-|\=)\s*(\d+)/i
    ];

    for (const pattern of offPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        offsigners = parseInt(match[1], 10);
        break;
      }
    }

    if (onsigners === 0 && offsigners === 0) {
      const combinedMatch = text.match(/(\d+)\s*(?:on|joining|embarque|embarques)\s*(?:\/|\&|\,|\sand\s|\sy\s)\s*(\d+)\s*(?:off|leaving|desembarque|desembarques)/i);
      if (combinedMatch) {
        onsigners = parseInt(combinedMatch[1], 10);
        offsigners = parseInt(combinedMatch[2], 10);
      }
    }

    if (onsigners === 0 && offsigners === 0) {
      const invCombinedMatch = text.match(/(\d+)\s*(?:off|leaving|desembarque|desembarques)\s*(?:\/|\&|\,|\sand\s|\sy\s)\s*(\d+)\s*(?:on|joining|embarque|embarques)/i);
      if (invCombinedMatch) {
        offsigners = parseInt(invCombinedMatch[1], 10);
        onsigners = parseInt(invCombinedMatch[2], 10);
      }
    }

    if (onsigners === 0 && offsigners === 0) {
      const genericMatch = text.match(/(\d+)\s*(?:crew|tripulantes|crewmembers|pax|persons|personas)/i);
      if (genericMatch) {
        offsigners = parseInt(genericMatch[1], 10);
      }
    }

    if (onsigners === 0 && offsigners === 0) {
      onsigners = 2;
      offsigners = 3;
    }

    return { onsigners, offsigners };
  }

  getDefaults() {
    return {
      vesselName: 'M/V OCEAN GLORY',
      portName: 'Tarragona',
      operationDate: this.getCurrentFormattedDate(),
      onsigners: 2,
      offsigners: 3,
      locationType: 'Berth',
      needLaunchBoat: false,
      launchTrips: 1,
      needTransfers: true,
      transferTrips: 2,
      vehicleType: 'Sedan',
      needLocalTransfers: false,
      localTransferTrips: 1,
      localVehicleType: 'TR-TGN-LOCAL-SED',
      needHotel: true,
      hotelNights: 1,
      hotelRooms: 1,
      needImmigration: true,
      needVisas: false,
      fullVisaPax: 0,
      schengenVisaPax: 0,
      needLoi: false,
      loiCount: 1,
      currency: 'EUR'
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextParserAgent;
} else {
  window.TextParserAgent = TextParserAgent;
}
