/**
 * Agente de Transporte (Transport Agent)
 * Lee EXCLUSIVAMENTE de data/tarifas_transporte.csv (Sólo Lectura).
 * - Lancha al fondeadero: Obtiene el precio estrictamente del ID 'TR-TGN-LANCHA' en tarifas_transporte.csv.
 * - Transfers Aeropuerto / Puerto: Según número de pax (Onsigners / Offsigners) y tipo de vehículo.
 * - Transfers Locales (Hotel / Puerto): ID 'TR-TGN-LOCAL-SED', 'TR-TGN-LOCAL-VAN', 'TR-TGN-LOCAL-BUS'.
 * - Traslados Visados (si aplica):
 *   - Visado Completo: TR-TGN-VISA-SED (<=3 pax), TR-TGN-VISA-VAN (4-7 pax), TR-TGN-VISA-BUS (>7 pax).
 *   - Visado Schengen: TR-TGN-IMM-SED (<=3 pax), TR-TGN-IMM-VAN (4-7 pax), TR-TGN-IMM-BUS (>7 pax).
 * Sin tarifas de fallback ni valores hardcoded.
 */
class TransportAgent {
  constructor(csvPath = '/data/tarifas_transporte.csv') {
    this.name = 'Agente de Transporte';
    this.csvPath = csvPath;
    this.csvRates = TransportAgent.cachedRates || [];
    this.loadCSVRates();
  }

  loadCSVRates() {
    // Node.js environment sync read
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), 'data', 'tarifas_transporte.csv');
        if (fs.existsSync(fullPath)) {
          const text = fs.readFileSync(fullPath, 'utf-8');
          const parsed = this.parseCSVText(text);
          this.csvRates = parsed;
          TransportAgent.cachedRates = parsed;
          return;
        }
      } catch (e) {}
    }

    // Browser environment async fetch
    if (typeof fetch !== 'undefined') {
      fetch(this.csvPath)
        .then(res => res.text())
        .then(text => {
          const parsed = this.parseCSVText(text);
          this.csvRates = parsed;
          TransportAgent.cachedRates = parsed;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratesUpdated'));
          }
        })
        .catch(err => {
          console.log('Error cargando tarifas_transporte.csv:', err);
        });
    }
  }

  parseCSVText(text) {
    if (!text) return [];
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    const lines = cleanText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const parseLine = (line) => {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim().replace(/^"|"$/g, ''));
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const rowStr = lines[i].trim();
      if (!rowStr) continue;
      const values = parseLine(rowStr);
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      });
      result.push(rowObj);
    }
    return result;
  }

  quote(params, externalRates = null) {
    const items = [];
    const activeRates = (externalRates && externalRates.length > 0) ? externalRates : (this.csvRates || TransportAgent.cachedRates || []);
    const onsigners = params.onsigners || 0;
    const offsigners = params.offsigners || 0;

    // 1. Lancha de Pasaje al Fondeadero (ID: TR-TGN-LANCHA)
    if (params.needLaunchBoat) {
      const matchLaunch = this.findRateById(activeRates, 'TR-TGN-LANCHA');
      if (matchLaunch) {
        const launchPrice = this.parsePrice(matchLaunch);
        if (launchPrice > 0) {
          const trips = params.launchTrips || 1;
          items.push({
            agent: this.name,
            id: 'transport_launch',
            category: 'Transporte (Lancha)',
            description: `Servicio de Lancha de Pasaje a ${params.locationType || 'Fondeadero'} (${trips} Trayecto${trips > 1 ? 's' : ''})`,
            unitPrice: launchPrice,
            quantity: trips,
            unit: 'trayecto',
            subtotal: launchPrice * trips
          });
        }
      } else {
        console.warn("TransportAgent: Tarifa 'TR-TGN-LANCHA' no encontrada en tarifas_transporte.csv");
      }
    }

    // 2. Transfers Terrestres (Aeropuerto a Puerto)
    if (params.needTransfers) {
      // 2a. Transfer para Onsigners (Embarque: Aeropuerto -> Puerto)
      if (onsigners > 0) {
        const targetIdOn = this.getRateIdByPax(onsigners, params.vehicleType);
        const rateObjOn = this.findRateById(activeRates, targetIdOn);
        const priceOn = this.parsePrice(rateObjOn);

        if (priceOn > 0) {
          const vehLabel = this.getVehicleLabel(targetIdOn, params.vehicleType);
          items.push({
            agent: this.name,
            id: 'transport_ground_onsigners',
            category: 'Transporte (Terrestre)',
            description: `Transfer Aeropuerto / Puerto - Onsigners (${vehLabel}, ${onsigners} Pax)`,
            unitPrice: priceOn,
            quantity: 1,
            unit: 'trayecto',
            subtotal: priceOn
          });
        }
      }

      // 2b. Transfer para Offsigners (Desembarque: Puerto -> Aeropuerto)
      if (offsigners > 0) {
        const targetIdOff = this.getRateIdByPax(offsigners, params.vehicleType);
        const rateObjOff = this.findRateById(activeRates, targetIdOff);
        const priceOff = this.parsePrice(rateObjOff);

        if (priceOff > 0) {
          const vehLabel = this.getVehicleLabel(targetIdOff, params.vehicleType);
          items.push({
            agent: this.name,
            id: 'transport_ground_offsigners',
            category: 'Transporte (Terrestre)',
            description: `Transfer Puerto / Aeropuerto - Offsigners (${vehLabel}, ${offsigners} Pax)`,
            unitPrice: priceOff,
            quantity: 1,
            unit: 'trayecto',
            subtotal: priceOff
          });
        }
      }

      // Fallback si no hay desglose de pax (se cotizan 2 trayectos)
      if (onsigners === 0 && offsigners === 0) {
        const targetIdDef = 'TR-TGN-BCN-SED';
        const rateObjDef = this.findRateById(activeRates, targetIdDef);
        const priceDef = this.parsePrice(rateObjDef);

        if (priceDef > 0) {
          items.push({
            agent: this.name,
            id: 'transport_ground_default',
            category: 'Transporte (Terrestre)',
            description: `Transfers Aeropuerto / Puerto (Sedan, 2 Trayectos)`,
            unitPrice: priceDef,
            quantity: 2,
            unit: 'trayecto',
            subtotal: priceDef * 2
          });
        }
      }
    }

    // 3. Transfers Locales (Hotel / Puerto: TR-TGN-LOCAL-SED, TR-TGN-LOCAL-VAN, TR-TGN-LOCAL-BUS)
    if (params.needLocalTransfers) {
      const localTrips = parseInt(params.localTransferTrips, 10) || 1;
      let targetIdLocal = params.localVehicleType || 'TR-TGN-LOCAL-SED';

      // Si viene con el nombre del vehículo en lugar del ID, mapear
      if (!targetIdLocal.startsWith('TR-TGN-LOCAL-')) {
        const v = String(targetIdLocal).toLowerCase();
        if (v.includes('bus') || v.includes('minibus')) targetIdLocal = 'TR-TGN-LOCAL-BUS';
        else if (v.includes('van')) targetIdLocal = 'TR-TGN-LOCAL-VAN';
        else targetIdLocal = 'TR-TGN-LOCAL-SED';
      }

      const rateObjLocal = this.findRateById(activeRates, targetIdLocal);
      const priceLocal = this.parsePrice(rateObjLocal);

      if (priceLocal > 0) {
        const vehLabel = this.getVehicleLabel(targetIdLocal);
        items.push({
          agent: this.name,
          id: 'transport_local',
          category: 'Transporte (Local)',
          description: `Transfer Local Hotel / Puerto (${vehLabel}, ${localTrips} Trayecto${localTrips > 1 ? 's' : ''})`,
          unitPrice: priceLocal,
          quantity: localTrips,
          unit: 'trayecto',
          subtotal: priceLocal * localTrips
        });
      }
    }

    // 4. Traslados de Visados / Inmigración (si está activado el tick de Visados)
    if (params.needVisas) {
      const fullVisaPax = parseInt(params.fullVisaPax, 10) || 0;
      const schengenVisaPax = parseInt(params.schengenVisaPax, 10) || 0;

      // 4a. Visado Completo: TR-TGN-VISA-SED / VAN / BUS
      if (fullVisaPax > 0) {
        const targetIdVisa = this.getVisaRateId(fullVisaPax);
        const rateObjVisa = this.findRateById(activeRates, targetIdVisa);
        const priceVisa = this.parsePrice(rateObjVisa);

        if (priceVisa > 0) {
          const vehLabel = this.getVehicleLabel(targetIdVisa);
          items.push({
            agent: this.name,
            id: 'transport_visa_full',
            category: 'Transporte (Visado)',
            description: `Traslado Trámite Visado Completo (${vehLabel}, ${fullVisaPax} Pax)`,
            unitPrice: priceVisa,
            quantity: 1,
            unit: 'servicio',
            subtotal: priceVisa
          });
        }
      }

      // 4b. Sellado Visado Schengen: TR-TGN-IMM-SED / VAN / BUS
      if (schengenVisaPax > 0) {
        const targetIdImm = this.getImmRateId(schengenVisaPax);
        const rateObjImm = this.findRateById(activeRates, targetIdImm);
        const priceImm = this.parsePrice(rateObjImm);

        if (priceImm > 0) {
          const vehLabel = this.getVehicleLabel(targetIdImm);
          items.push({
            agent: this.name,
            id: 'transport_visa_schengen',
            category: 'Transporte (Inmigración)',
            description: `Traslado Sellado Visado Schengen (${vehLabel}, ${schengenVisaPax} Pax)`,
            unitPrice: priceImm,
            quantity: 1,
            unit: 'servicio',
            subtotal: priceImm
          });
        }
      }
    }

    return items;
  }

  getRateIdByPax(paxCount, userSelectedVehicle = null) {
    // Si el usuario especificó un vehículo concreto (y no 'Auto'), respetar su elección
    if (userSelectedVehicle && String(userSelectedVehicle).toLowerCase() !== 'auto') {
      const v = String(userSelectedVehicle).toLowerCase();
      if (v.includes('bus') || v.includes('minibus')) return 'TR-TGN-BCN-BUS';
      if (v.includes('van')) return 'TR-TGN-BCN-VAN';
      if (v.includes('sedan') || v.includes('taxi')) return 'TR-TGN-BCN-SED';
    }

    // Selección automática según capacidad real de pasajeros:
    // Sedan: 1 a 3 Pax | Van: 4 a 7 Pax | Minibus: 8 a 16 Pax
    if (paxCount <= 3) return 'TR-TGN-BCN-SED';
    if (paxCount <= 7) return 'TR-TGN-BCN-VAN';
    return 'TR-TGN-BCN-BUS';
  }

  getVisaRateId(paxCount) {
    if (paxCount <= 3) return 'TR-TGN-VISA-SED';
    if (paxCount <= 7) return 'TR-TGN-VISA-VAN';
    return 'TR-TGN-VISA-BUS';
  }

  getImmRateId(paxCount) {
    if (paxCount <= 3) return 'TR-TGN-IMM-SED';
    if (paxCount <= 7) return 'TR-TGN-IMM-VAN';
    return 'TR-TGN-IMM-BUS';
  }

  getVehicleLabel(targetId, userSelectedVehicle) {
    if (targetId.includes('BUS')) return 'Minibus';
    if (targetId.includes('VAN')) return 'Van';
    return 'Sedan / Taxi';
  }

  findRateById(ratesData, targetId) {
    if (!ratesData || ratesData.length === 0) return null;

    const targetUpper = String(targetId || '').toUpperCase().trim();

    // 1. Match by ID property
    let match = ratesData.find(r => {
      for (const k of Object.keys(r)) {
        if (k.toUpperCase().trim() === 'ID') {
          const val = String(r[k]).toUpperCase().trim();
          if (val === targetUpper || val.includes(targetUpper)) return true;
        }
      }
      return false;
    });

    // 2. Search anywhere in row values
    if (!match) {
      match = ratesData.find(r => 
        Object.values(r).some(val => String(val).toUpperCase().trim().includes(targetUpper))
      );
    }

    return match || null;
  }

  parsePrice(row) {
    if (!row) return 0;

    // Search header names matching price/cost columns (excluding percentage/surcharge columns)
    for (const key of Object.keys(row)) {
      const kUpper = key.toUpperCase().trim();
      if ((kUpper.includes('PRECIO') || kUpper.includes('COST') || kUpper.includes('RATE')) && !kUpper.includes('PCT') && !kUpper.includes('RECARGO') && !kUpper.includes('PORCENTAJE')) {
        const strVal = String(row[key]).trim().replace(',', '.');
        const num = parseFloat(strVal.replace(/[^0-9\.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    // Fallback search in values for valid positive numbers
    for (const key of Object.keys(row)) {
      if (!key.toUpperCase().includes('PCT') && !key.toUpperCase().includes('RECARGO')) {
        const strVal = String(row[key]).trim().replace(',', '.');
        const num = parseFloat(strVal.replace(/[^0-9\.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  }
}

TransportAgent.cachedRates = null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TransportAgent;
} else {
  window.TransportAgent = TransportAgent;
}
