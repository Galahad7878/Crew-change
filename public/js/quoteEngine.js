/**
 * QuoteEngine: Conecta con el Coordinador de Agentes en Árbol reutilizando la instancia cargada.
 */
class QuoteEngine {
  static getCoordinator() {
    if (!this._coordinator) {
      this._coordinator = new AgentCoordinator();
    }
    return this._coordinator;
  }

  static calculate(params, excelRates) {
    const coordinator = this.getCoordinator();

    // Map sheets or fallback categories to agents
    const ratesByAgent = {
      transport: (excelRates && (excelRates.transport || excelRates.Transporte)) || [],
      hotel: (excelRates && (excelRates.hotel || excelRates.Hoteles)) || [],
      fee: (excelRates && (excelRates.fee || excelRates.agency || excelRates.Fees)) || []
    };

    return coordinator.quoteAll(params, ratesByAgent);
  }
}

window.QuoteEngine = QuoteEngine;
