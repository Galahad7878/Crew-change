/**
 * EmailGenerator: Genera el correo electrónico profesional en inglés formateado para agencias marítimas.
 * Traduce automáticamente los conceptos de la proforma al inglés.
 */
class EmailGenerator {
  static generate(quoteData) {
    const vessel = quoteData.vesselName || 'M/V OCEAN GLORY';
    const port = quoteData.portName || 'Tarragona';
    const dateStr = quoteData.operationDate || 'As requested';
    const location = quoteData.locationType || 'Berth';
    const currency = quoteData.currency || 'EUR';
    const on = quoteData.onsigners || 0;
    const off = quoteData.offsigners || 0;

    let emailText = `SUBJECT: QUOTATION - CREW CHANGE SERVICES - ${vessel} - PORT OF ${port.toUpperCase()}

Dear Sirs,

Thank you for your inquiry. Please find below our official proforma quotation for the crew change operation of ${vessel} at Port of ${port} (${location}) on ${dateStr}.

====================================================================
OPERATIONAL DETAILS:
====================================================================
• Vessel Name    : ${vessel}
• Port / Location: ${port} (${location})
• ETA / Date     : ${dateStr}
• Crew Onsigners : ${on} Pax
• Crew Offsigners: ${off} Pax
• Total Crew     : ${on + off} Pax

====================================================================
ITEMIZED PROFORMA DISBURSEMENT QUOTATION (ESTIMATED):
====================================================================\n`;

    quoteData.items.forEach((item, index) => {
      const idx = String(index + 1).padStart(2, ' ');
      const englishDesc = this.translateToEnglish(item.description);
      const desc = englishDesc.padEnd(52, '.');
      const amt = `${currency} ${item.subtotal.toFixed(2).padStart(9, ' ')}`;
      emailText += `${idx}. ${desc} ${amt}\n`;
    });

    const totalFormatted = `${currency} ${quoteData.totalCost.toFixed(2)}`;

    emailText += `--------------------------------------------------------------------
TOTAL ESTIMATED PROFORMA COST: ${totalFormatted}
====================================================================

TERMS & REMARKS:
1. Surcharges for overtime, night service (20:00 - 08:00), or public holidays may apply if operational schedule changes.
2. Launch boat services are subject to weather conditions and anchorage distance.
3. Hotel accommodations are subject to room availability at time of final confirmation.
4. Final disbursement account (FDA) will be issued based on actual vouchers and expenses incurred.

Please confirm if you wish us to proceed with arrangements or if you require any further assistance.

Best regards,

Crewing & Port Agency Department
24/7 Operations Duty Officer
Email: agency@maritime-services.com
`;

    return emailText;
  }

  static translateToEnglish(desc) {
    if (!desc) return '';
    let english = desc;

    // Fee Agent Concepts
    if (/Honorarios Base Agenciamiento/i.test(english)) {
      english = english.replace(/Honorarios Base Agenciamiento/i, 'Base Agency Handling Fee')
                       .replace(/Tarifa Plana/i, 'Flat Rate');
    }
    if (/Honorarios Agenciamiento Adicional/i.test(english)) {
      english = english.replace(/Honorarios Agenciamiento Adicional/i, 'Additional Agency Handling Fee');
    }
    if (/Gastos de Gestión Reserva de Hotel/i.test(english)) {
      english = 'Hotel Booking Arrangement Fee';
    }
    if (/Tasa Oficial de Inmigración/i.test(english)) {
      english = english.replace(/Tasa Oficial de Inmigración - Visado/i, 'Official Immigration Visa Tax')
                       .replace(/Tasa Oficial de Inmigración/i, 'Official Immigration Visa Tax');
    }
    if (/Gestión Cita Inmigración/i.test(english)) {
      english = 'Immigration Appointment Fee (Seapoole)';
    }
    if (/Gestión y Trámites de Visado/i.test(english)) {
      english = 'Visa Formalities & Arrangements (Iberica)';
    }
    if (/Emisión Carta de Invitación|Carta de Invitación|LOI/i.test(english)) {
      english = english.replace(/Emisión Carta de Invitación \/ LOI/i, 'Letter of Invitation (LOI) Formalities')
                       .replace(/Cartas/i, 'Letters')
                       .replace(/Carta/i, 'Letter');
    }

    // Transport Agent Visa & Immigration Transfers
    if (/Traslado Trámite Visado Completo/i.test(english)) {
      english = english.replace(/Traslado Trámite Visado Completo/i, 'Transfer for Full Visa Formalities');
    }
    if (/Traslado Sellado Visado Schengen/i.test(english)) {
      english = english.replace(/Traslado Sellado Visado Schengen/i, 'Transfer for Schengen Visa Stamping');
    }

    // Transport Agent Local Transfers (Hotel / Port)
    if (/Transfer Local Hotel \/ Puerto/i.test(english)) {
      english = english.replace(/Transfer Local Hotel \/ Puerto/i, 'Local Transfer Hotel / Port')
                       .replace(/Trayectos/i, 'Trips')
                       .replace(/Trayecto/i, 'Trip');
    }

    // Transport Agent Standard Airport Transfers
    if (/Transfer Aeropuerto \/ Puerto - Onsigners/i.test(english)) {
      english = english.replace(/Transfer Aeropuerto \/ Puerto - Onsigners/i, 'Airport to Port Transfer - Onsigners');
    }
    if (/Transfer Puerto \/ Aeropuerto - Offsigners/i.test(english)) {
      english = english.replace(/Transfer Puerto \/ Aeropuerto - Offsigners/i, 'Port to Airport Transfer - Offsigners');
    }
    if (/Servicio de Lancha de Pasaje/i.test(english)) {
      english = english.replace(/Servicio de Lancha de Pasaje a/i, 'Passenger Launch Boat Service to')
                       .replace(/Servicio de Lancha de Pasaje/i, 'Passenger Launch Boat Service')
                       .replace(/Trayectos/i, 'Trips')
                       .replace(/Trayecto/i, 'Trip')
                       .replace(/Fondeadero/i, 'Anchorage')
                       .replace(/Muelle/i, 'Berth');
    }
    if (/Transfers Aeropuerto/i.test(english) || /Transfers/i.test(english)) {
      english = english.replace(/Transfers Aeropuerto \/ Puerto/i, 'Airport / Port Transfers')
                       .replace(/Transfers/i, 'Ground Transfers')
                       .replace(/Trayectos/i, 'Trips')
                       .replace(/Trayecto/i, 'Trip');
    }

    // Hotel Agent Concepts
    if (/Alojamiento Hotelero/i.test(english)) {
      english = english.replace(/Alojamiento Hotelero/i, 'Hotel Accommodation')
                       .replace(/Individual/i, 'Single Room')
                       .replace(/Doble/i, 'Double Room')
                       .replace(/Habitación/i, 'Room')
                       .replace(/Solo Alojamiento/i, 'Room Only')
                       .replace(/Alojamiento y Desayuno/i, 'Bed & Breakfast');
    }

    // Surcharges
    if (/Recargo Nocturno \/ Festivo/i.test(english)) {
      english = 'Overtime / Night & Holiday Surcharge (+25% on Transport Services)';
    }

    return english;
  }
}

window.EmailGenerator = EmailGenerator;
