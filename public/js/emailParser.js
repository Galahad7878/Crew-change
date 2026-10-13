/**
 * EmailParser: Extrae entidades operativas a partir del texto del e-mail de solicitud del cliente.
 */
class EmailParser {
  static parse(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return this.getDefaults();
    }

    const result = this.getDefaults();
    const cleanText = text.trim();

    // 1. Vessel Name
    const vesselMatch = cleanText.match(/(?:m\/v|mv|m\/t|mt|s\/t|st|vessel|buque|barco|motonav|m\/v\.|m\/t\.)\s+([a-z0-9\s\.\-\']+?)(?:\,|\.|\n|at|in|eta|for|\(|\)|$)/i);
    if (vesselMatch && vesselMatch[1]) {
      let vName = vesselMatch[1].trim();
      if (vName.length > 2) {
        let prefix = 'M/V ';
        if (/^m\/t|^mt/i.test(vesselMatch[0])) prefix = 'M/T ';
        vName = vName.replace(/^(m\/v|mv|m\/t|mt)\s+/i, '');
        result.vesselName = prefix + vName.toUpperCase();
      }
    }

    // 2. Port Name (Default: Tarragona)
    const portMatch = cleanText.match(/(?:at|in|puerto|port of|puerto de|puerto del)\s+([a-z\s]+?)(?:\,|\.|\n|eta|on|for|\(|\)|$)/i);
    if (portMatch && portMatch[1]) {
      const pName = portMatch[1].trim();
      if (pName.length > 2 && !['the', 'anchorage', 'berth', 'port', 'fondeadero', 'muelle'].includes(pName.toLowerCase())) {
        result.portName = pName.charAt(0).toUpperCase() + pName.slice(1);
      }
    }

    // 3. Date / ETA
    const dateMatch = cleanText.match(/(?:eta|date|fecha|on|el|arriving|llegada)\s+([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|[0-9]{1,2}\/[0-9]{1,2}))/i);
    if (dateMatch && dateMatch[1]) {
      result.operationDate = dateMatch[1].trim();
    }

    // 4. Onsigners (Embarques)
    const onsignMatch = cleanText.match(/(\d+)\s*(?:onsigner|onsigners|joining|embarking|embarque|embarcan|on-signer|on signers|on-signers)/i);
    if (onsignMatch) {
      result.onsigners = parseInt(onsignMatch[1], 10);
    }

    // 5. Offsigners (Desembarques)
    const offsignMatch = cleanText.match(/(\d+)\s*(?:offsigner|offsigners|disembarking|leaving|desembarque|desembarcan|off-signer|off signers|off-signers)/i);
    if (offsignMatch) {
      result.offsigners = parseInt(offsignMatch[1], 10);
    }

    if (result.onsigners === 0 && result.offsigners === 0) {
      const crewMatch = cleanText.match(/(\d+)\s*(?:crew|tripulantes|crewmembers|pax|persons)/i);
      if (crewMatch) {
        result.offsigners = parseInt(crewMatch[1], 10);
      }
    }

    // 6. Location: Anchorage vs Berth (Default: Berth)
    if (/anchorage|fondeadero|la rada|rada|at anchor/i.test(cleanText)) {
      result.locationType = 'Anchorage';
      result.needLaunchBoat = true;
    } else if (/berth|dock|pier|muelle|pantalan|pantalán/i.test(cleanText)) {
      result.locationType = 'Berth';
      result.needLaunchBoat = false;
    }

    // 7. Launch boat explicit check
    if (/launch|lancha|lanzadera|boat service/i.test(cleanText)) {
      result.needLaunchBoat = true;
    }

    // 8. Hotel (Default: 1 Room / 1 Night)
    if (/hotel|accommodation|alojamiento|alojar|noche|noches|night|nights|habitacion|habitación/i.test(cleanText)) {
      result.needHotel = true;
    }

    const nightMatch = cleanText.match(/(\d+)\s*(?:night|nights|noches|noche)/i);
    if (nightMatch) {
      result.hotelNights = parseInt(nightMatch[1], 10);
      result.needHotel = true;
    } else {
      result.hotelNights = 1;
    }

    const roomMatch = cleanText.match(/(\d+)\s*(?:room|rooms|habitacion|habitaciones|habs|hab)/i);
    if (roomMatch) {
      result.hotelRooms = parseInt(roomMatch[1], 10);
    } else {
      result.hotelRooms = 1;
    }

    // 9. Vehicle Type & Transfers (Default: Sedan)
    if (/minibus|bus|autobus|autobús/i.test(cleanText)) {
      result.vehicleType = 'Minibus';
      result.localVehicleType = 'TR-TGN-LOCAL-BUS';
    } else if (/minivan|van/i.test(cleanText)) {
      result.vehicleType = 'Van';
      result.localVehicleType = 'TR-TGN-LOCAL-VAN';
    } else if (/sedan|sedán|taxi|car|coche/i.test(cleanText)) {
      result.vehicleType = 'Sedan';
      result.localVehicleType = 'TR-TGN-LOCAL-SED';
    } else {
      result.vehicleType = 'Sedan';
      result.localVehicleType = 'TR-TGN-LOCAL-SED';
    }

    if (/transfer|transfers|transport|transporte|taxi|car|van|minivan|aeropuerto|airport|traslado|traslados/i.test(cleanText)) {
      result.needTransfers = true;
    }

    // 10. Local Transfers
    if (/transfer\s+local|transfers\s+locales|traslado\s+local|traslados\s+locales|hotel\s+to\s+port|hotel\s+al\s+puerto/i.test(cleanText)) {
      result.needLocalTransfers = true;
      result.localTransferTrips = 1;
    }

    // 11. Immigration Formalities (Fees)
    if (/visa|visado|ok to board|shore pass|pase de desembarco|immigration|migracion|migración|formalidades/i.test(cleanText)) {
      result.needImmigration = true;
    }

    // 12. Visa Transfers (Transport Agent: Full Visa & Schengen Stamping)
    const fullVisaMatch = cleanText.match(/(\d+)\s*(?:pax|crew|tripulantes)?\s*(?:with\s+)?(?:full\s*visa|visado\s*completo)/i);
    const schengenMatch = cleanText.match(/(\d+)\s*(?:pax|crew|tripulantes)?\s*(?:with\s+)?(?:schengen|visado\s*schengen|schengen\s*visa|sellado\s*schengen)/i);

    if (fullVisaMatch || schengenMatch) {
      result.needVisas = true;
      if (fullVisaMatch) result.fullVisaPax = parseInt(fullVisaMatch[1], 10);
      if (schengenMatch) result.schengenVisaPax = parseInt(schengenMatch[1], 10);
    }

    // 13. Letter of Invitations (LOI)
    const loiMatch = cleanText.match(/(\d+)?\s*(?:loi|lois|letter of invitation|letters of invitation|carta de invitacion|cartas de invitacion|carta de invitación|cartas de invitación)/i);
    if (loiMatch) {
      result.needLoi = true;
      result.loiCount = loiMatch[1] ? parseInt(loiMatch[1], 10) : 1;
    }

    return result;
  }

  static getDefaults() {
    return {
      vesselName: 'M/V OCEAN GLORY',
      portName: 'Tarragona',
      operationDate: 'As requested',
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

window.EmailParser = EmailParser;
