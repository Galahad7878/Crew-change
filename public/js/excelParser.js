/**
 * ExcelParser: Analiza y estructura las hojas del archivo Excel de tarifas.
 */
class ExcelParser {
  constructor() {
    this.workbook = null;
    this.sheetsData = {};
    this.parsedRates = {
      agency: [],
      fee: [],
      transport: [],
      hotel: [],
      launch: [],
      immigration: [],
      surcharges: []
    };
  }

  loadWorkbook(arrayBuffer) {
    try {
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      this.extractSheetsData();
      this.classifyTariffs();
      return { success: true, sheets: Object.keys(this.sheetsData), parsedRates: this.parsedRates };
    } catch (err) {
      console.error('Error al leer Excel:', err);
      return { success: false, error: err.message };
    }
  }

  extractSheetsData() {
    this.sheetsData = {};
    if (!this.workbook) return;

    this.workbook.SheetNames.forEach(sheetName => {
      const worksheet = this.workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (json && json.length > 0) {
        this.sheetsData[sheetName] = json;
      }
    });
  }

  classifyTariffs() {
    this.parsedRates = {
      agency: [],
      fee: [],
      transport: [],
      hotel: [],
      launch: [],
      immigration: [],
      surcharges: []
    };

    Object.keys(this.sheetsData).forEach(sheetName => {
      const lowerSheet = sheetName.toLowerCase();
      const rows = this.sheetsData[sheetName];

      if (rows.length < 2) return;

      const headers = rows[0].map(h => String(h).trim());

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(cell => cell === '')) continue;

        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h || `Col_${idx}`] = row[idx];
        });

        // Classification based on sheet name or content
        if (lowerSheet.includes('fee') || lowerSheet.includes('honorarios') || lowerSheet.includes('agency') || lowerSheet.includes('handling')) {
          this.parsedRates.fee.push(rowObj);
          this.parsedRates.agency.push(rowObj);
        } else if (lowerSheet.includes('transporte') || lowerSheet.includes('transfer') || lowerSheet.includes('taxi')) {
          this.parsedRates.transport.push(rowObj);
        } else if (lowerSheet.includes('hotel') || lowerSheet.includes('alojamiento')) {
          this.parsedRates.hotel.push(rowObj);
        } else if (lowerSheet.includes('lancha') || lowerSheet.includes('launch') || lowerSheet.includes('fondeadero')) {
          this.parsedRates.launch.push(rowObj);
        } else if (lowerSheet.includes('tramite') || lowerSheet.includes('migrac') || lowerSheet.includes('visado') || lowerSheet.includes('immigrat')) {
          this.parsedRates.immigration.push(rowObj);
        } else if (lowerSheet.includes('recargo') || lowerSheet.includes('surcharge') || lowerSheet.includes('festivo')) {
          this.parsedRates.surcharges.push(rowObj);
        } else {
          this.parsedRates.fee.push(rowObj);
          this.parsedRates.agency.push(rowObj);
        }
      }
    });
  }

  getRateFor(category, keyword) {
    const list = this.parsedRates[category] || [];
    if (list.length === 0) return null;

    if (!keyword) return list[0];

    const kwLower = keyword.toLowerCase();
    const match = list.find(item => {
      return Object.values(item).some(val => String(val).toLowerCase().includes(kwLower));
    });

    return match || list[0];
  }
}

window.ExcelParser = ExcelParser;
