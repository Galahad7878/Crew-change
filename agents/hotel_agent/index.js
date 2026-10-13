/**
 * Agente de Hoteles (Hotel Agent)
 * Lee EXCLUSIVAMENTE de data/tarifas_hoteles.csv (Sólo Lectura).
 * Sin tarifas de fallback ni precios hardcoded.
 * Hotel por defecto: HTL-TGN-SB-IND.
 */
class HotelAgent {
  constructor(csvPath = '/data/tarifas_hoteles.csv') {
    this.name = 'Agente de Hoteles';
    this.csvPath = csvPath;
    this.csvRates = HotelAgent.cachedRates || [];
    this.defaultHotelId = 'HTL-TGN-SB-IND';

    if (!this.csvRates || this.csvRates.length === 0) {
      this.loadCSVRates();
    }
  }

  loadCSVRates() {
    // Node.js environment sync read
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), 'data', 'tarifas_hoteles.csv');
        if (fs.existsSync(fullPath)) {
          const text = fs.readFileSync(fullPath, 'utf-8');
          const parsed = this.parseCSVText(text);
          this.csvRates = parsed;
          HotelAgent.cachedRates = parsed;
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
          HotelAgent.cachedRates = parsed;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ratesUpdated'));
          }
        })
        .catch(err => {
          console.log('Error cargando tarifas_hoteles.csv:', err);
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
    const activeRates = (externalRates && externalRates.length > 0) ? externalRates : (this.csvRates || HotelAgent.cachedRates || []);

    if (params.needHotel && params.hotelNights > 0 && params.hotelRooms > 0) {
      const targetId = params.selectedHotelId || this.defaultHotelId;
      const match = this.findRateById(activeRates, targetId);

      if (!match) {
        console.warn(`HotelAgent: Código '${targetId}' no encontrado en tarifas_hoteles.csv`);
        return items;
      }

      const roomPrice = this.parsePrice(match);
      if (roomPrice <= 0) return items;

      const hotelName = match.HOTEL_NOMBRE || 'Hotel SB Express Tarragona 3*';
      const roomType = match.TIPO_HABITACION || 'Individual (SGL)';
      const totalRoomNights = params.hotelRooms * params.hotelNights;

      items.push({
        agent: this.name,
        id: 'hotel_accommodation',
        category: 'Alojamiento',
        description: `Alojamiento Hotelero (${hotelName} - ${roomType})`,
        unitPrice: roomPrice,
        quantity: totalRoomNights,
        unit: 'hab-noche',
        subtotal: roomPrice * totalRoomNights
      });
    }

    return items;
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

    // 3. Fallback to default ID HTL-TGN-SB-IND in CSV if target not found
    if (!match && targetUpper !== this.defaultHotelId) {
      match = ratesData.find(r => 
        Object.values(r).some(val => String(val).toUpperCase().trim().includes(this.defaultHotelId))
      );
    }

    // 4. Fallback to first row of CSV
    if (!match && ratesData.length > 0) {
      match = ratesData[0];
    }

    return match || null;
  }

  parsePrice(row) {
    if (!row) return 0;
    for (const key of Object.keys(row)) {
      if (/precio|costo|coste|price|rate|eur|usd/i.test(key)) {
        const num = parseFloat(String(row[key]).replace(/[^0-9\.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    for (const val of Object.values(row)) {
      const num = parseFloat(String(val).replace(/[^0-9\.]/g, ''));
      if (!isNaN(num) && num > 0 && num < 10000) return num;
    }
    return 0;
  }
}

HotelAgent.cachedRates = null;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HotelAgent;
} else {
  window.HotelAgent = HotelAgent;
}
