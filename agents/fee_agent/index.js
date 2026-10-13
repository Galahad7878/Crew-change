/**
 * Agente de Fees y Honorarios (Fee Agent)
 * Lee EXCLUSIVAMENTE de data/tarifas_fees.csv (Sólo Lectura).
 * Reglas:
 * 1. 1 a 3 Pax (inclusive): Toma tarifa ID 'FEE-CREW-BASE' (Tarifa plana fija, ej. 150.00 EUR).
 * 2. > 3 Pax: Toma tarifa ID 'FEE-CREW-ADDI' y multiplica por el número TOTAL de pax (ej. 50.00 EUR x Pax).
 * 3. Si hay Hotel (needHotel = true): Carga la tarifa ID 'FEE-HTL-BOOK' (ej. 24.20 EUR).
 * 4. Si hay Visados (needVisas = true) y fullVisaPax > 0:
 *    - FEE-IMM-VISADO: por cada tripulante con visado completo (ej. 90.00 EUR x fullVisaPax).
 *    - FEE-IMM-SEAPOOLE: una vez por grupo con visado completo (ej. 72.60 EUR).
 *    - FEE-IMM-IBERICA: una vez por grupo con visado completo (ej. 62.50 EUR).
 * 5. Si hay Letters of Invitation (needLoi = true y loiCount > 0):
 *    - FEE-LOI-IBERICA: por cada LOI (ej. 120.00 EUR x loiCount).
 */
class FeeAgent {
  constructor(csvPath = '/data/tarifas_fees.csv') {
    this.name = 'Agente de Fees';
    this.csvPath = csvPath;
    this.csvRates = FeeAgent.cachedRates || [];
    this.loadCSVRates();
  }

  loadCSVRates() {
    // Node.js environment sync read
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), 'data', 'tarifas_fees.csv');
        if (fs.existsSync(fullPath)) {
          const text = fs.readFileSync(fullPath, 'utf-8');
          const parsed = this.parseCSVText(text);
          this.csvRates = parsed;
          FeeAgent.cachedRates = parsed;
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
          FeeAgent.cachedRates = parsed;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratesUpdated'));
          }
        })
        .catch(err => {
          console.log('Error cargando tarifas_fees.csv:', err);
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
    const totalCrew = (params.onsigners || 0) + (params.offsigners || 0);
    const activeRates = (externalRates && externalRates.length > 0) ? externalRates : (this.csvRates || FeeAgent.cachedRates || []);

    // 1. Fee Base de Agenciamiento (FEE-CREW-BASE o FEE-CREW-ADDI)
    if (totalCrew > 0) {
      if (totalCrew <= 3) {
        // 1, 2 ó 3 Pax -> Tarifa Plana Fija FEE-CREW-BASE (Default: 150.00 EUR)
        const baseRate = this.findRateById(activeRates, 'FEE-CREW-BASE', 150.00);
        items.push({
          agent: this.name,
          id: 'fee_agency_handling',
          category: 'Honorarios Agencia',
          description: `Honorarios Base Agenciamiento (Tarifa Plana 1-3 Pax)`,
          unitPrice: baseRate,
          quantity: 1,
          unit: 'tarifa plana',
          subtotal: baseRate
        });
      } else {
        // > 3 Pax -> Tarifa Incremental FEE-CREW-ADDI x total paxes (Default: 50.00 EUR)
        const addiRate = this.findRateById(activeRates, 'FEE-CREW-ADDI', 50.00);
        const subtotalVal = addiRate * totalCrew;
        items.push({
          agent: this.name,
          id: 'fee_agency_handling',
          category: 'Honorarios Agencia',
          description: `Honorarios Agenciamiento Adicional (${totalCrew} Pax)`,
          unitPrice: addiRate,
          quantity: totalCrew,
          unit: 'pax',
          subtotal: subtotalVal
        });
      }
    }

    // 2. Fee por Gestión de Reserva de Hotel (FEE-HTL-BOOK)
    if (params.needHotel && params.hotelNights > 0 && params.hotelRooms > 0) {
      const htlBookRate = this.findRateById(activeRates, 'FEE-HTL-BOOK', 24.20);
      items.push({
        agent: this.name,
        id: 'fee_hotel_booking',
        category: 'Honorarios Agencia',
        description: `Gastos de Gestión Reserva de Hotel`,
        unitPrice: htlBookRate,
        quantity: 1,
        unit: 'reserva',
        subtotal: htlBookRate
      });
    }

    // 3. Fees por Trámite de Visados (FEE-IMM-VISADO, FEE-IMM-SEAPOOLE, FEE-IMM-IBERICA)
    if (params.needVisas) {
      const fullVisaPax = parseInt(params.fullVisaPax, 10) || 0;

      if (fullVisaPax > 0) {
        // 3a. FEE-IMM-VISADO: Por cada tripulante con visado completo
        const rateImmVisado = this.findRateById(activeRates, 'FEE-IMM-VISADO', 90.00);
        items.push({
          agent: this.name,
          id: 'fee_imm_visado',
          category: 'Honorarios Agencia',
          description: `Tasa Oficial de Inmigración - Visado (${fullVisaPax} Pax)`,
          unitPrice: rateImmVisado,
          quantity: fullVisaPax,
          unit: 'pax',
          subtotal: rateImmVisado * fullVisaPax
        });

        // 3b. FEE-IMM-SEAPOOLE: Una vez por grupo con visado completo
        const rateImmSeapoole = this.findRateById(activeRates, 'FEE-IMM-SEAPOOLE', 72.60);
        items.push({
          agent: this.name,
          id: 'fee_imm_seapoole',
          category: 'Honorarios Agencia',
          description: `Gestión Cita Inmigración / Seapoole`,
          unitPrice: rateImmSeapoole,
          quantity: 1,
          unit: 'grupo',
          subtotal: rateImmSeapoole
        });

        // 3c. FEE-IMM-IBERICA: Una vez por grupo con visado completo
        const rateImmIberica = this.findRateById(activeRates, 'FEE-IMM-IBERICA', 62.50);
        items.push({
          agent: this.name,
          id: 'fee_imm_iberica',
          category: 'Honorarios Agencia',
          description: `Gestión y Trámites de Visado / Ibérica`,
          unitPrice: rateImmIberica,
          quantity: 1,
          unit: 'grupo',
          subtotal: rateImmIberica
        });
      }
    }

    // 4. Fee por Letter of Invitation (FEE-LOI-IBERICA)
    if (params.needLoi) {
      const loiCount = parseInt(params.loiCount, 10) || 0;
      if (loiCount > 0) {
        const rateLoi = this.findRateById(activeRates, 'FEE-LOI-IBERICA', 120.00);
        items.push({
          agent: this.name,
          id: 'fee_loi_formalites',
          category: 'Honorarios Agencia',
          description: `Emisión Carta de Invitación / LOI (${loiCount} Carta${loiCount > 1 ? 's' : ''})`,
          unitPrice: rateLoi,
          quantity: loiCount,
          unit: 'carta',
          subtotal: rateLoi * loiCount
        });
      }
    }

    return items;
  }

  findRateById(ratesData, targetId, fallback) {
    if (!ratesData || ratesData.length === 0) return fallback;

    const targetUpper = String(targetId || '').toUpperCase().trim();

    const match = ratesData.find(r => {
      for (const k of Object.keys(r)) {
        if (k.toUpperCase().trim() === 'ID') {
          const val = String(r[k]).toUpperCase().trim();
          if (val === targetUpper || val.includes(targetUpper)) return true;
        }
      }
      return Object.values(r).some(val => String(val).toUpperCase().trim().includes(targetUpper));
    });

    if (match) {
      return this.parsePrice(match, fallback);
    }
    return fallback;
  }

  parsePrice(row, fallback) {
    if (!row) return fallback;

    for (const key of Object.keys(row)) {
      const kUpper = key.toUpperCase().trim();
      if ((kUpper.includes('PRECIO') || kUpper.includes('COST') || kUpper.includes('RATE')) && !kUpper.includes('PCT') && !kUpper.includes('RECARGO')) {
        const strVal = String(row[key]).trim().replace(',', '.');
        const num = parseFloat(strVal.replace(/[^0-9\.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }

    for (const val of Object.values(row)) {
      const strVal = String(val).trim().replace(',', '.');
      const num = parseFloat(strVal.replace(/[^0-9\.]/g, ''));
      if (!isNaN(num) && num > 0 && num < 10000) return num;
    }

    return fallback;
  }
}

FeeAgent.cachedRates = null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FeeAgent;
} else {
  window.FeeAgent = FeeAgent;
}
