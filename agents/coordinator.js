/**
 * Coordinador Principal de Agentes (Tree Agent Coordinator)
 * Orquesta la estructura en árbol llamando a TextParserAgent, TransportAgent, HotelAgent y FeeAgent.
 */
class AgentCoordinator {
  constructor() {
    this.textParserAgent = typeof TextParserAgent !== 'undefined' ? new TextParserAgent() : null;
    this.transportAgent = typeof TransportAgent !== 'undefined' ? new TransportAgent() : null;
    this.hotelAgent = typeof HotelAgent !== 'undefined' ? new HotelAgent() : null;
    this.feeAgent = typeof FeeAgent !== 'undefined' ? new FeeAgent() : null;
  }

  parseText(text) {
    if (this.textParserAgent) {
      return this.textParserAgent.parse(text);
    }
    return typeof EmailParser !== 'undefined' ? EmailParser.parse(text) : {};
  }

  quoteAll(params, ratesByAgent = {}) {
    let allItems = [];

    // 1. Delegar al Agente de Transporte
    if (this.transportAgent) {
      const transportRates = (ratesByAgent.transport && ratesByAgent.transport.length > 0) ? ratesByAgent.transport : null;
      const transportItems = this.transportAgent.quote(params, transportRates);
      allItems = allItems.concat(transportItems);
    }

    // 2. Delegar al Agente de Hoteles
    if (this.hotelAgent) {
      const hotelRates = (ratesByAgent.hotel && ratesByAgent.hotel.length > 0) ? ratesByAgent.hotel : null;
      const hotelItems = this.hotelAgent.quote(params, hotelRates);
      allItems = allItems.concat(hotelItems);
    }

    // 3. Delegar al Agente de Fees
    if (this.feeAgent) {
      const feeRates = (ratesByAgent.fee && ratesByAgent.fee.length > 0) ? ratesByAgent.fee : null;
      const feeItems = this.feeAgent.quote(params, feeRates);
      allItems = allItems.concat(feeItems);
    }

    // 4. Recargos Globales (Nocturno / Festivo)
    let totalCost = allItems.reduce((sum, item) => sum + item.subtotal, 0);

    if (params.isNightOrHoliday) {
      const transportTotal = allItems
        .filter(item => item.agent === 'Agente de Transporte')
        .reduce((sum, item) => sum + item.subtotal, 0);

      if (transportTotal > 0) {
        const surchargeVal = transportTotal * 0.25;
        allItems.push({
          agent: 'Coordinador',
          id: 'surcharge_night',
          category: 'Recargo',
          description: `Recargo Nocturno / Festivo (+25% sobre servicios del Agente de Transporte)`,
          unitPrice: surchargeVal,
          quantity: 1,
          unit: 'operación',
          subtotal: surchargeVal
        });
        totalCost += surchargeVal;
      }
    }

    return {
      vesselName: params.vesselName,
      portName: params.portName,
      operationDate: params.operationDate,
      onsigners: params.onsigners,
      offsigners: params.offsigners,
      locationType: params.locationType,
      currency: params.currency || 'EUR',
      items: allItems,
      totalCost: totalCost
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentCoordinator;
} else {
  window.AgentCoordinator = AgentCoordinator;
}
