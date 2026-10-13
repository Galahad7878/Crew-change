/**
 * App.js: Controlador principal. Conecta la interfaz de usuario con el Agente TEXTPARSER,
 * Agente de Transporte (incluyendo Transfers Locales), Agente de Hoteles y Agente de Fees.
 */
document.addEventListener('DOMContentLoaded', () => {
  let currentQuoteData = null;
  let currentEditingPath = null;

  // Initialize TextParser Agent
  const textParser = typeof TextParserAgent !== 'undefined' ? new TextParserAgent() : null;

  // DOM Elements
  const statusBadge = document.getElementById('statusBadge');
  const emailInput = document.getElementById('emailInput');
  const btnParseEmail = document.getElementById('btnParseEmail');
  const preset1Btn = document.getElementById('preset1Btn');
  const preset2Btn = document.getElementById('preset2Btn');
  const projectTreeContainer = document.getElementById('projectTreeContainer');

  // Input Fields (Section 2)
  const vesselNameInput = document.getElementById('vesselName');
  const portNameInput = document.getElementById('portName');
  const operationDateInput = document.getElementById('operationDate');
  const onsignersInput = document.getElementById('onsigners');
  const offsignersInput = document.getElementById('offsigners');
  const locationTypeSelect = document.getElementById('locationType');
  const currencySelect = document.getElementById('currencySelect');

  // Toggles & Spinners & Selectors
  const chkLaunch = document.getElementById('chkLaunch');
  const launchTripsInput = document.getElementById('launchTrips');
  const chkTransfers = document.getElementById('chkTransfers');
  const vehicleTypeSelect = document.getElementById('vehicleType');
  const chkLocalTransfers = document.getElementById('chkLocalTransfers');
  const localVehicleTypeSelect = document.getElementById('localVehicleType');
  const localTransferTripsInput = document.getElementById('localTransferTrips');

  const chkHotel = document.getElementById('chkHotel');
  const selectedHotelSelect = document.getElementById('selectedHotelSelect');
  const hotelNightsInput = document.getElementById('hotelNights');
  const hotelRoomsInput = document.getElementById('hotelRooms');
  const chkImmigration = document.getElementById('chkImmigration');
  const chkVisas = document.getElementById('chkVisas');
  const fullVisaPaxInput = document.getElementById('fullVisaPax');
  const schengenVisaPaxInput = document.getElementById('schengenVisaPax');
  const chkLoi = document.getElementById('chkLoi');
  const loiCountInput = document.getElementById('loiCount');

  // Output Elements
  const quoteTableBody = document.getElementById('quoteTableBody');
  const totalDisplay = document.getElementById('totalDisplay');
  const emailBodyBox = document.getElementById('emailBodyBox');
  const btnCopyEmail = document.getElementById('btnCopyEmail');

  // File Editor Modal Elements
  const editorModal = document.getElementById('editorModal');
  const editorModalTitle = document.getElementById('editorModalTitle');
  const editorTextarea = document.getElementById('editorTextarea');
  const editorCloseBtn = document.getElementById('editorCloseBtn');
  const btnCancelEditor = document.getElementById('btnCancelEditor');
  const btnSaveEditor = document.getElementById('btnSaveEditor');

  // Set default initial ETA to current date
  if (!operationDateInput.value && textParser) {
    operationDateInput.value = textParser.getCurrentFormattedDate();
  }

  // --- 1. Startup & Listeners ---
  loadProjectTree();
  populateHotelOptionsFromCSV();
  setTimeout(recalculateQuote, 300);

  // Auto-recalculate when agent CSV rates finish loading
  window.addEventListener('ratesUpdated', () => {
    recalculateQuote();
  });

  function populateHotelOptionsFromCSV() {
    fetch('/data/tarifas_hoteles.csv')
      .then(res => res.text())
      .then(text => {
        const cleanText = text.replace(/^\uFEFF/, '').trim();
        const lines = cleanText.split(/\r?\n/);
        if (lines.length < 2) return;

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

        const headers = parseLine(lines[0]);
        const idIdx = headers.indexOf('ID');
        const nameIdx = headers.indexOf('HOTEL_NOMBRE');
        const roomIdx = headers.indexOf('TIPO_HABITACION');
        const priceIdx = headers.indexOf('PRECIO_NOCHE_EUR');

        if (idIdx === -1) return;

        const options = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseLine(lines[i]);
          const id = vals[idIdx];
          const name = vals[nameIdx] || 'Hotel';
          const room = vals[roomIdx] || '';
          const price = vals[priceIdx] || '';
          if (id) {
            options.push({ id, label: `${id} (${name} ${room} ${price}€)`.trim() });
          }
        }

        if (options.length > 0) {
          const currentSel = selectedHotelSelect.value;
          selectedHotelSelect.innerHTML = '';
          options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.id;
            optionEl.textContent = opt.label;
            if (opt.id === (currentSel || 'HTL-TGN-SB-IND')) {
              optionEl.selected = true;
            }
            selectedHotelSelect.appendChild(optionEl);
          });
        }
      })
      .catch(err => {
        console.log('Error populating hotel select from CSV:', err);
      });
  }

  // --- 2. Load & Render Project Tree Explorer ---
  function loadProjectTree() {
    fetch('/api/tree')
      .then(res => res.json())
      .then(treeData => {
        renderTree(treeData);
      })
      .catch(err => {
        console.error('Error loading tree:', err);
        projectTreeContainer.innerHTML = '<p style="color: #64748b; font-size: 0.8rem;">Cargando árbol...</p>';
      });
  }

  function renderTree(treeData) {
    projectTreeContainer.innerHTML = '';

    treeData.forEach(folder => {
      const folderDiv = document.createElement('div');
      folderDiv.className = 'tree-folder';

      let folderIcon = folder.name === 'agents' ? '🤖' : '📂';
      let folderLabel = folder.name === 'agents' ? 'Agentes (Estructura Árbol)' : 'Datos CSV (data - Sólo Lectura)';

      folderDiv.innerHTML = `<div class="tree-folder-title"><span>${folderIcon}</span> <span>${folderLabel}</span></div>`;

      const childrenContainer = document.createElement('div');

      folder.children.forEach(item => {
        if (item.type === 'directory') {
          const subDiv = document.createElement('div');
          let agentName = item.name.replace('_agent', '').toUpperCase();
          let agentIcon = agentName.includes('TEXT') ? '🔍' : agentName.includes('TRANSPORT') ? '🚚' : agentName.includes('HOTEL') ? '🏨' : '💼';
          subDiv.innerHTML = `<div class="tree-subfolder-title"><span>${agentIcon}</span> <span>Agente ${agentName}</span></div>`;

          item.children.forEach(file => {
            const fileEl = createFileElement(file);
            subDiv.appendChild(fileEl);
          });

          childrenContainer.appendChild(subDiv);
        } else {
          const fileEl = createFileElement(item);
          childrenContainer.appendChild(fileEl);
        }
      });

      folderDiv.appendChild(childrenContainer);
      projectTreeContainer.appendChild(folderDiv);
    });
  }

  function createFileElement(file) {
    const el = document.createElement('div');
    el.className = 'tree-item-file';

    let pillClass = 'code';
    let pillText = 'JS';
    let icon = '📄';

    if (file.name.endsWith('.md')) {
      pillClass = 'skills';
      pillText = 'SKILLS.md';
      icon = '📝';
    } else if (file.name.endsWith('.csv')) {
      pillClass = 'csv';
      pillText = 'CSV';
      icon = '📊';
    }

    el.innerHTML = `
      <span>${icon} ${file.name}</span>
      <span class="file-pill ${pillClass}">${pillText}</span>
    `;

    el.addEventListener('click', () => {
      document.querySelectorAll('.tree-item-file').forEach(i => i.classList.remove('active'));
      el.classList.add('active');
      openFileHandler(file);
    });

    return el;
  }

  // --- 3. Open File Handler (SKILLS.md & CSVs) ---
  function openFileHandler(file) {
    currentEditingPath = file.path;
    fetch(`/api/file-content?path=${encodeURIComponent(file.path)}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        editorModalTitle.textContent = file.name.endsWith('.md') ? `📝 Gestionar Skills: ${file.name}` : `📊 Consultar/Editar Tarifas CSV: ${file.name}`;
        editorTextarea.value = data.content;
        editorModal.classList.add('active');
      })
      .catch(err => {
        alert('Error al abrir archivo: ' + err.message);
      });
  }

  // --- 4. Save Edited File ---
  btnSaveEditor.addEventListener('click', () => {
    if (!currentEditingPath) return;

    const content = editorTextarea.value;
    fetch('/api/file-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: currentEditingPath, content: content })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const originalText = btnSaveEditor.innerHTML;
          btnSaveEditor.innerHTML = `✅ ¡Guardado con Éxito!`;
          btnSaveEditor.style.backgroundColor = '#059669';
          setTimeout(() => {
            btnSaveEditor.innerHTML = originalText;
            btnSaveEditor.style.backgroundColor = '';
            editorModal.classList.remove('active');
            location.reload();
          }, 1200);
        } else {
          alert('Error al guardar: ' + data.error);
        }
      })
      .catch(err => alert('Error al guardar: ' + err));
  });

  editorCloseBtn.addEventListener('click', () => editorModal.classList.remove('active'));
  btnCancelEditor.addEventListener('click', () => editorModal.classList.remove('active'));

  // --- 5. Presets for Quick Testing ---
  preset1Btn.addEventListener('click', () => {
    emailInput.value = `Good morning Operations Team,

Please quote crew change for 3 offsigners and 2 onsigners at Port of Tarragona (Berth) for M/V OCEAN GLORY arriving on 20th August.

Requirements:
- Offsigners require 1 night hotel in single rooms + airport transfers (BCN/REU).
- Onsigners joining directly from airport to berth.
- Immigration formalities & shore passes required.

Best regards,
Fleet Operations Manager`;
    parseAndCalculate();
  });

  preset2Btn.addEventListener('click', () => {
    emailInput.value = `Urgent Crew Change Request:
Vessel: M/T SEA CHAMPION
Port: Tarragona (Anchorage)
Date: 25th August
1 Offsigner leaving vessel at anchorage. Requires launch boat and direct transfer to airport.

Thanks,
Crewing Dept`;
    parseAndCalculate();
  });

  // --- 6. Parse Email / Free Text using TextParserAgent ---
  btnParseEmail.addEventListener('click', parseAndCalculate);

  // Auto-parse on typing or pasting into Section 1
  emailInput.addEventListener('input', parseAndCalculate);
  emailInput.addEventListener('paste', () => setTimeout(parseAndCalculate, 50));

  function parseAndCalculate() {
    const text = emailInput.value;
    const extracted = textParser ? textParser.parse(text) : (typeof EmailParser !== 'undefined' ? EmailParser.parse(text) : {});

    // Update Section 2 Operational Parameters
    vesselNameInput.value = extracted.vesselName || 'M/V OCEAN GLORY';
    portNameInput.value = extracted.portName || 'Tarragona';
    operationDateInput.value = extracted.operationDate || (textParser ? textParser.getCurrentFormattedDate() : '');
    onsignersInput.value = extracted.onsigners !== undefined ? extracted.onsigners : 2;
    offsignersInput.value = extracted.offsigners !== undefined ? extracted.offsigners : 3;
    locationTypeSelect.value = extracted.locationType || 'Berth';

    chkLaunch.checked = extracted.needLaunchBoat || false;
    launchTripsInput.value = extracted.launchTrips || 1;

    chkTransfers.checked = extracted.needTransfers !== undefined ? extracted.needTransfers : true;
    vehicleTypeSelect.value = extracted.vehicleType || 'Sedan';

    chkLocalTransfers.checked = extracted.needLocalTransfers || false;
    localVehicleTypeSelect.value = extracted.localVehicleType || 'TR-TGN-LOCAL-SED';
    localTransferTripsInput.value = extracted.localTransferTrips || 1;

    chkHotel.checked = extracted.needHotel !== undefined ? extracted.needHotel : true;
    hotelNightsInput.value = extracted.hotelNights || 1;
    hotelRoomsInput.value = extracted.hotelRooms || 1;

    chkImmigration.checked = extracted.needImmigration !== undefined ? extracted.needImmigration : true;

    chkVisas.checked = extracted.needVisas || false;
    fullVisaPaxInput.value = extracted.fullVisaPax || 0;
    schengenVisaPaxInput.value = extracted.schengenVisaPax || 0;

    chkLoi.checked = extracted.needLoi || false;
    loiCountInput.value = extracted.loiCount || 1;

    recalculateQuote();
  }

  // --- 7. Real-time Recalculation Listener ---
  const allInputs = [
    vesselNameInput, portNameInput, operationDateInput, onsignersInput, offsignersInput,
    locationTypeSelect, currencySelect, chkLaunch, launchTripsInput, chkTransfers,
    vehicleTypeSelect, chkLocalTransfers, localVehicleTypeSelect, localTransferTripsInput,
    chkHotel, selectedHotelSelect, hotelNightsInput, hotelRoomsInput,
    chkImmigration, chkVisas, fullVisaPaxInput, schengenVisaPaxInput, chkLoi, loiCountInput
  ];

  allInputs.forEach(input => {
    if (input) {
      input.addEventListener('change', recalculateQuote);
      input.addEventListener('input', recalculateQuote);
    }
  });

  function recalculateQuote() {
    const params = {
      vesselName: vesselNameInput.value || 'M/V OCEAN GLORY',
      portName: portNameInput.value || 'Tarragona',
      operationDate: operationDateInput.value || (textParser ? textParser.getCurrentFormattedDate() : 'As requested'),
      onsigners: parseInt(onsignersInput.value, 10) || 0,
      offsigners: parseInt(offsignersInput.value, 10) || 0,
      locationType: locationTypeSelect.value || 'Berth',
      currency: currencySelect.value || 'EUR',
      needLaunchBoat: chkLaunch.checked,
      launchTrips: parseInt(launchTripsInput.value, 10) || 1,
      needTransfers: chkTransfers.checked,
      vehicleType: vehicleTypeSelect.value || 'Sedan',
      needLocalTransfers: chkLocalTransfers.checked,
      localVehicleType: localVehicleTypeSelect.value || 'TR-TGN-LOCAL-SED',
      localTransferTrips: parseInt(localTransferTripsInput.value, 10) || 1,
      needHotel: chkHotel.checked,
      selectedHotelId: selectedHotelSelect ? selectedHotelSelect.value : 'HTL-TGN-SB-IND',
      hotelNights: parseInt(hotelNightsInput.value, 10) || 1,
      hotelRooms: parseInt(hotelRoomsInput.value, 10) || 1,
      needImmigration: chkImmigration.checked,
      needVisas: chkVisas.checked,
      fullVisaPax: parseInt(fullVisaPaxInput.value, 10) || 0,
      schengenVisaPax: parseInt(schengenVisaPaxInput.value, 10) || 0,
      needLoi: chkLoi.checked,
      loiCount: parseInt(loiCountInput.value, 10) || 1,
      isNightOrHoliday: false
    };

    currentQuoteData = QuoteEngine.calculate(params, null);
    renderQuoteTable(currentQuoteData);
    renderGeneratedEmail(currentQuoteData);
  }

  // --- 8. Render Live Quote Table ---
  function renderQuoteTable(data) {
    quoteTableBody.innerHTML = '';

    data.items.forEach(item => {
      const tr = document.createElement('tr');
      let agentBadgeColor = item.agent.includes('Transporte') ? '#0284c7' : item.agent.includes('Hoteles') ? '#10b981' : '#8b5cf6';

      tr.innerHTML = `
        <td><span style="font-size: 0.75rem; font-weight: 700; color: ${agentBadgeColor}; padding: 0.2rem 0.4rem; background: rgba(2, 132, 199, 0.1); border-radius: 4px;">${item.agent}</span></td>
        <td>${item.description}</td>
        <td style="text-align: center;">${item.quantity} ${item.unit}</td>
        <td class="amount">${data.currency} ${item.unitPrice.toFixed(2)}</td>
        <td class="amount" style="color: #0284c7;">${data.currency} ${item.subtotal.toFixed(2)}</td>
      `;
      quoteTableBody.appendChild(tr);
    });

    totalDisplay.textContent = `${data.currency} ${data.totalCost.toFixed(2)}`;
  }

  // --- 9. Render Generated English Email Draft ---
  function renderGeneratedEmail(data) {
    const text = EmailGenerator.generate(data);
    emailBodyBox.textContent = text;
  }

  // --- 10. Copy to Clipboard ---
  btnCopyEmail.addEventListener('click', () => {
    const text = emailBodyBox.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const originalText = btnCopyEmail.innerHTML;
      btnCopyEmail.innerHTML = `✅ ¡Copiado al Porta-papeles!`;
      btnCopyEmail.style.backgroundColor = '#059669';
      setTimeout(() => {
        btnCopyEmail.innerHTML = originalText;
        btnCopyEmail.style.backgroundColor = '';
      }, 2500);
    }).catch(err => {
      alert('Error al copiar: ' + err);
    });
  });
});
