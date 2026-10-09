/**
 * Candy Simply-Fi Custom Lovelace Card
 * Card interattiva e animata per Lavasciuga, Lavatrice e Lavastoviglie Candy / Hoover.
 * 
 * Supporta:
 * - Animazione fotorealistica del cestello (rotazione, centrifuga ad alta velocita, onde d'acqua/schiuma, calore asciugatura)
 * - Animazione lavastoviglie (bracci irroratori rotanti, getti d'acqua, vapore/asciugatura)
 * - Display digitale con countdown tempo residuo e indicatore circolare di avanzamento
 * - Badge parametri istantanei (Temperatura, Giri centrifuga, Livello asciugatura, Partenza differita)
 * - Selettore interattivo dei programmi con icone Candy
 * - Pulsanti di comando diretti (Avvia, Pausa, Annulla/Stop, Bip sonoro)
 * - Interruttori opzioni rapide (Prelavaggio, Igiene+, Risciacquo+, Stiro facile, Vapore / Mezzo carico, 3-in-1, Extra Dry)
 * - Allarmi e diagnostica guasti con descrizione codici errore E01-E22 e indicatori sale/brillantante
 */

class CandyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._selectedProgram = null;
    this._selectedTemp = null;
    this._selectedSpin = null;
    this._selectedDry = null;
  }

  static getStubConfig() {
    return {
      type: 'custom:candy-card',
      device_type: 'washer_dryer',
      name: 'Candy Lavasciuga'
    };
  }

  static getConfigElement() {
    return document.createElement('candy-card-editor');
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Configurazione non valida');
    }
    this._config = {
      name: config.name || 'Candy Simply-Fi',
      device_type: config.device_type || 'washer_dryer', // 'washer_dryer', 'washer', 'dishwasher'
      entity_prefix: config.entity_prefix || '',
      ...config
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateStates();
  }

  _findEntity(patterns, domain = null) {
    if (!this._hass || !this._hass.states) return null;
    const states = this._hass.states;

    // Check direct config override first
    if (typeof patterns === 'string' && this._config[patterns]) {
      const explicit = this._config[patterns];
      if (states[explicit]) return { id: explicit, state: states[explicit] };
    }

    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    const prefix = (this._config.entity_prefix || '').toLowerCase();

    // Priority 1: Match prefix + pattern
    for (const key of Object.keys(states)) {
      if (domain && !key.startsWith(domain + '.')) continue;
      const lower = key.toLowerCase();
      if (prefix && lower.includes(prefix)) {
        for (const p of patternList) {
          if (lower.includes(p.toLowerCase())) {
            return { id: key, state: states[key] };
          }
        }
      }
    }

    // Priority 2: General match with candy keywords
    for (const key of Object.keys(states)) {
      if (domain && !key.startsWith(domain + '.')) continue;
      const lower = key.toLowerCase();
      if (lower.includes('candy') || lower.includes('simplyfi') || lower.includes('simply_fi') || lower.includes('lavatrice') || lower.includes('lavasciuga') || lower.includes('lavastoviglie')) {
        for (const p of patternList) {
          if (lower.includes(p.toLowerCase())) {
            return { id: key, state: states[key] };
          }
        }
      }
    }

    return null;
  }

  _getEntitiesMap() {
    const isDishwasher = this._config.device_type === 'dishwasher';

    return {
      status: this._findEntity(['stato', 'status', 'machmd', 'statodwash'], 'sensor'),
      program: this._findEntity(['programma', 'program', 'pr_nome'], 'sensor'),
      remainingTime: this._findEntity(['tempo_rimanente', 'remaining_time', 'time_remaining', 'minuten_verbleibend'], 'sensor'),
      errorCode: this._findEntity(['errore', 'error_code', 'error'], 'sensor'),
      phase: !isDishwasher ? this._findEntity(['fase', 'program_phase', 'phase'], 'sensor') : null,
      temp: !isDishwasher ? this._findEntity(['temperatura', 'temperature', 'temp'], 'sensor') : null,
      spin: !isDishwasher ? this._findEntity(['centrifuga', 'spin_speed', 'spin'], 'sensor') : null,
      dry: !isDishwasher ? this._findEntity(['asciugatura', 'drying_level', 'dry_level'], 'sensor') : null,
      
      // Binary sensors
      running: this._findEntity(['in_funzione', 'running', 'is_running'], 'binary_sensor'),
      doorLocked: !isDishwasher ? this._findEntity(['oblo_bloccato', 'door_locked', 'door_lock'], 'binary_sensor') : null,
      doorOpen: isDishwasher ? this._findEntity(['sportello_aperto', 'door_open', 'door'], 'binary_sensor') : null,
      missSalt: isDishwasher ? this._findEntity(['mancanza_sale', 'missing_salt', 'salt'], 'binary_sensor') : null,
      missRinse: isDishwasher ? this._findEntity(['mancanza_brillantante', 'missing_rinse', 'rinse_aid'], 'binary_sensor') : null,
      dryingActive: !isDishwasher ? this._findEntity(['fase_asciugatura_attiva', 'drying_active'], 'binary_sensor') : null,
      remoteControl: !isDishwasher ? this._findEntity(['controllo_remoto', 'remote_control'], 'binary_sensor') : null,

      // Selects
      programSelect: this._findEntity(isDishwasher ? ['programma_lavastoviglie', 'program'] : ['programma_lavaggio', 'program'], 'select'),
      tempSelect: !isDishwasher ? this._findEntity(['selezione_temperatura', 'temperature'], 'select') : null,
      spinSelect: !isDishwasher ? this._findEntity(['selezione_centrifuga', 'spin'], 'select') : null,
      drySelect: !isDishwasher ? this._findEntity(['selezione_asciugatura', 'drying'], 'select') : null,

      // Buttons
      startButton: this._findEntity(['avvia_programma', 'start_program', 'start'], 'button'),
      pauseButton: this._findEntity(['metti_in_pausa', 'pause'], 'button'),
      stopButton: this._findEntity(['annulla_stop', 'stop_reset', 'stop'], 'button'),
      buzzerButton: this._findEntity(['segnale_acustico', 'buzzer', 'beep'], 'button'),

      // Switches (Options)
      prewashSwitch: !isDishwasher ? this._findEntity(['prelavaggio', 'opt1_prewash'], 'switch') : null,
      hygieneSwitch: !isDishwasher ? this._findEntity(['igiene', 'opt2_hygiene'], 'switch') : null,
      extraRinseSwitch: !isDishwasher ? this._findEntity(['risciacquo_extra', 'opt3_extra_rinse'], 'switch') : null,
      easyIronSwitch: !isDishwasher ? this._findEntity(['stiro_facile', 'opt4_easy_iron'], 'switch') : null,
      steamSwitch: !isDishwasher ? this._findEntity(['trattamento_vapore', 'opt7_steam'], 'switch') : null,
      
      halfLoadSwitch: isDishwasher ? this._findEntity(['mezzo_carico', 'half_load'], 'switch') : null,
      tabsSwitch: isDishwasher ? this._findEntity(['pastiglie', 'tabs_3in1', 'tabs'], 'switch') : null,
      extraDrySwitch: isDishwasher ? this._findEntity(['asciugatura_extra', 'extra_dry'], 'switch') : null,
      openDoorSwitch: isDishwasher ? this._findEntity(['apertura_automatica', 'open_door_opt'], 'switch') : null,
    };
  }

  _callService(domain, service, data) {
    if (!this._hass) return;
    this._hass.callService(domain, service, data);
  }

  _pressButton(entityObj) {
    if (!entityObj || !entityObj.id) return;
    this._callService('button', 'press', { entity_id: entityObj.id });
  }

  _selectOption(entityObj, option) {
    if (!entityObj || !entityObj.id) return;
    this._callService('select', 'select_option', { entity_id: entityObj.id, option: option });
  }

  _toggleSwitch(entityObj) {
    if (!entityObj || !entityObj.id) return;
    this._callService('switch', 'toggle', { entity_id: entityObj.id });
  }

  _updateStates() {
    if (!this.shadowRoot) return;
    const entities = this._getEntitiesMap();
    const isDishwasher = this._config.device_type === 'dishwasher';

    const statusVal = entities.status?.state?.state || 'Standby';
    const programVal = entities.program?.state?.state || 'Nessun programma';
    const timeVal = entities.remainingTime?.state?.state || '00:00';
    const phaseVal = entities.phase?.state?.state || '';
    const tempVal = entities.temp?.state?.state || '--';
    const spinVal = entities.spin?.state?.state || '--';
    const dryVal = entities.dry?.state?.state || '0';
    const isRunning = entities.running?.state?.state === 'on' || 
                      ['In funzione', 'running', '2'].includes(statusVal);
    const isPaused = statusVal.toLowerCase().includes('pausa') || statusVal === '3';
    const isFinished = statusVal.toLowerCase().includes('terminato') || statusVal === '7' || statusVal === '5';
    const isError = entities.errorCode?.state?.state && 
                    !['e0', '0', 'none', 'unknown', 'unavailable'].includes(entities.errorCode.state.state.toLowerCase());

    const isSpinningFast = phaseVal.toLowerCase().includes('centrifuga') || phaseVal === '4';
    const isDrying = (entities.dryingActive?.state?.state === 'on') || 
                     phaseVal.toLowerCase().includes('asciugatura') || 
                     phaseVal === '5';

    // 1. Update Title and Header Status
    const titleEl = this.shadowRoot.querySelector('.card-title');
    if (titleEl) titleEl.textContent = this._config.name || (isDishwasher ? 'Candy Lavastoviglie' : 'Candy Lavasciuga');

    const statusBadge = this.shadowRoot.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.textContent = statusVal;
      statusBadge.className = 'status-badge ' + (
        isRunning ? 'status-running' : 
        isPaused ? 'status-paused' : 
        isFinished ? 'status-finished' : 
        isError ? 'status-error' : 'status-standby'
      );
    }

    // 2. Update Display Timer & Phase
    const timerEl = this.shadowRoot.querySelector('.digital-timer');
    if (timerEl) timerEl.textContent = isRunning || isPaused ? timeVal : (isFinished ? 'FINE' : '00:00');

    const progEl = this.shadowRoot.querySelector('.current-program-name');
    if (progEl) progEl.textContent = programVal;

    const phaseEl = this.shadowRoot.querySelector('.current-phase-name');
    if (phaseEl) {
      phaseEl.textContent = phaseVal ? `• ${phaseVal}` : '';
    }

    // 3. Update Visual Animations (Drum / Spray arms)
    const applianceVisual = this.shadowRoot.querySelector('.appliance-visual');
    if (applianceVisual) {
      applianceVisual.classList.toggle('is-running', isRunning);
      applianceVisual.classList.toggle('is-fast-spin', isSpinningFast);
      applianceVisual.classList.toggle('is-drying', isDrying);
      applianceVisual.classList.toggle('is-paused', isPaused);
      applianceVisual.classList.toggle('is-door-open', entities.doorOpen?.state?.state === 'on');
    }

    // 4. Update Parameter Chips (Washer)
    if (!isDishwasher) {
      const chipTemp = this.shadowRoot.querySelector('.chip-temp .val');
      if (chipTemp) chipTemp.textContent = tempVal !== '--' && tempVal !== '0' ? `${tempVal}°C` : 'Freddo';

      const chipSpin = this.shadowRoot.querySelector('.chip-spin .val');
      if (chipSpin) chipSpin.textContent = spinVal !== '--' && spinVal !== '0' ? `${spinVal} rpm` : 'No centrifuga';

      const chipDry = this.shadowRoot.querySelector('.chip-dry .val');
      if (chipDry) {
        let dryTxt = 'No Asc.';
        if (dryVal === '1') dryTxt = 'Stiro';
        else if (dryVal === '2') dryTxt = 'Armadio';
        else if (dryVal === '3') dryTxt = 'Extra';
        else if (parseInt(dryVal) > 10) dryTxt = `${dryVal}'`;
        chipDry.textContent = dryTxt;
      }
    }

    // 5. Dishwasher Warning Indicators
    if (isDishwasher) {
      const saltWarning = this.shadowRoot.querySelector('.warn-salt');
      if (saltWarning) {
        saltWarning.classList.toggle('active', entities.missSalt?.state?.state === 'on');
      }
      const rinseWarning = this.shadowRoot.querySelector('.warn-rinse');
      if (rinseWarning) {
        rinseWarning.classList.toggle('active', entities.missRinse?.state?.state === 'on');
      }
      const doorOpenBanner = this.shadowRoot.querySelector('.door-open-banner');
      if (doorOpenBanner) {
        doorOpenBanner.style.display = entities.doorOpen?.state?.state === 'on' ? 'flex' : 'none';
      }
    }

    // 6. Error Banner
    const errorBanner = this.shadowRoot.querySelector('.error-banner');
    if (errorBanner) {
      if (isError) {
        const errCode = entities.errorCode?.state?.state || 'E?';
        const errDesc = entities.errorCode?.state?.attributes?.descrizione_errore || 
                        entities.errorCode?.state?.attributes?.description || 'Verificare l\'elettrodomestico';
        errorBanner.style.display = 'flex';
        errorBanner.querySelector('.error-text').textContent = `Allarme ${errCode}: ${errDesc}`;
      } else {
        errorBanner.style.display = 'none';
      }
    }

    // 7. Update Option Switches active states
    this.shadowRoot.querySelectorAll('.option-chip').forEach(chip => {
      const optKey = chip.getAttribute('data-opt');
      const switchObj = entities[optKey + 'Switch'];
      if (switchObj && switchObj.state) {
        chip.classList.toggle('active', switchObj.state.state === 'on');
      }
    });

    // 8. Sync Program Select Dropdown
    const selectElem = this.shadowRoot.querySelector('.program-dropdown');
    if (selectElem && entities.programSelect && entities.programSelect.state) {
      const opts = entities.programSelect.state.attributes?.options || [];
      const currentOpt = entities.programSelect.state.state;
      if (selectElem.options.length !== opts.length) {
        selectElem.innerHTML = '';
        opts.forEach(opt => {
          const optEl = document.createElement('option');
          optEl.value = opt;
          optEl.textContent = opt;
          selectElem.appendChild(optEl);
        });
      }
      if (currentOpt && selectElem.value !== currentOpt) {
        selectElem.value = currentOpt;
      }
    }
  }

  _render() {
    const isDishwasher = this._config.device_type === 'dishwasher';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --candy-blue: #0088cc;
          --candy-blue-glow: rgba(0, 136, 204, 0.45);
          --candy-cyan: #00d2ff;
          --candy-dark: #121820;
          --candy-metallic: linear-gradient(135deg, #2b333e 0%, #171d25 100%);
          --candy-bezel: linear-gradient(145deg, #3a4554, #1c222c);
          --candy-amber: #ff9800;
          --candy-red: #f44336;
          --candy-green: #4caf50;
          font-family: var(--ha-card-font-family, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
        }

        ha-card {
          position: relative;
          background: var(--ha-card-background, var(--candy-dark));
          border-radius: var(--ha-card-border-radius, 18px);
          box-shadow: var(--ha-card-box-shadow, 0 10px 30px rgba(0, 0, 0, 0.35));
          color: var(--primary-text-color, #ffffff);
          overflow: hidden;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-logo {
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 2px;
          color: #ffffff;
          background: linear-gradient(90deg, #ffffff, #00d2ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
        }

        .card-title {
          font-size: 14px;
          color: var(--secondary-text-color, #90a4ae);
          font-weight: 500;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-badge::before {
          content: "";
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }

        .status-standby {
          background: rgba(144, 164, 174, 0.15);
          color: #b0bec5;
        }
        .status-standby::before { background: #90a4ae; }

        .status-running {
          background: rgba(0, 210, 255, 0.18);
          color: #00d2ff;
          box-shadow: 0 0 12px var(--candy-blue-glow);
        }
        .status-running::before { 
          background: #00d2ff; 
          animation: pulse-dot 1.2s infinite alternate;
        }

        .status-paused {
          background: rgba(255, 152, 0, 0.2);
          color: #ffb74d;
        }
        .status-paused::before { background: #ff9800; }

        .status-finished {
          background: rgba(76, 175, 80, 0.2);
          color: #81c784;
        }
        .status-finished::before { background: #4caf50; }

        .status-error {
          background: rgba(244, 67, 54, 0.25);
          color: #e57373;
        }
        .status-error::before { background: #f44336; animation: blink-fast 0.6s infinite; }

        @keyframes pulse-dot {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 1; }
        }

        @keyframes blink-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }

        /* Error Notification Banner */
        .error-banner {
          display: none;
          background: linear-gradient(90deg, rgba(244, 67, 54, 0.25), rgba(211, 47, 47, 0.15));
          border-left: 4px solid var(--candy-red);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 14px;
          align-items: center;
          gap: 10px;
          color: #ffcdd2;
          font-size: 13px;
        }

        .door-open-banner {
          display: none;
          background: rgba(255, 152, 0, 0.2);
          border-left: 4px solid var(--candy-amber);
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 14px;
          align-items: center;
          gap: 8px;
          color: #ffe0b2;
          font-size: 12px;
        }

        /* Center Section: Appliance Graphic + Digital Display */
        .appliance-container {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 18px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 16px;
        }

        @media (max-width: 480px) {
          .appliance-container {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }
        }

        /* Graphic Representation */
        .appliance-visual {
          position: relative;
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Washer Porthole Outer Bezel */
        .washer-porthole {
          position: relative;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: var(--candy-bezel);
          box-shadow: inset 0 3px 8px rgba(255, 255, 255, 0.2), 
                      0 8px 24px rgba(0, 0, 0, 0.6);
          border: 4px solid #232b38;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .porthole-glass {
          position: relative;
          width: 108px;
          height: 108px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 26, 38, 0.9) 0%, rgba(5, 10, 16, 0.95) 100%);
          box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Rotating Stainless Steel Drum */
        .drum-inner {
          position: absolute;
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 2px dashed rgba(255, 255, 255, 0.25);
          background: 
            radial-gradient(circle, transparent 40%, rgba(255, 255, 255, 0.05) 70%),
            conic-gradient(from 0deg, rgba(255, 255, 255, 0.1) 0deg, transparent 60deg, rgba(255, 255, 255, 0.15) 120deg, transparent 180deg, rgba(255, 255, 255, 0.1) 240deg, transparent 300deg, rgba(255, 255, 255, 0.15) 360deg);
          box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.8);
          transition: transform 0.4s ease;
        }

        /* Drum lifters */
        .drum-lifter {
          position: absolute;
          width: 6px;
          height: 22px;
          background: linear-gradient(to right, #78909c, #cfd8dc);
          border-radius: 3px;
          top: 6px;
          left: calc(50% - 3px);
          transform-origin: 3px 39px;
        }
        .drum-lifter:nth-child(2) { transform: rotate(120deg); }
        .drum-lifter:nth-child(3) { transform: rotate(240deg); }

        /* Water wave inside drum */
        .water-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 45%;
          background: linear-gradient(180deg, rgba(0, 210, 255, 0.4) 0%, rgba(0, 114, 255, 0.6) 100%);
          border-radius: 0 0 54px 54px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.5s ease;
          overflow: hidden;
        }

        /* Foam bubbles */
        .bubbles {
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle, #ffffff 1px, transparent 2px);
          background-size: 8px 8px;
          opacity: 0.3;
        }

        /* Heat Shimmer Glow (Drying Phase) */
        .heat-glow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 110, 0, 0.4) 10%, rgba(255, 60, 0, 0.15) 60%, transparent 80%);
          opacity: 0;
          transition: opacity 0.6s ease;
          pointer-events: none;
        }

        /* Door handle & Lock LED */
        .door-lock-led {
          position: absolute;
          right: 5px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4caf50;
          box-shadow: 0 0 6px #4caf50;
        }

        /* Running Animations */
        .is-running .drum-inner {
          animation: spin-drum 4.5s linear infinite;
        }

        .is-running.is-fast-spin .drum-inner {
          animation: spin-drum 0.45s linear infinite;
        }

        .is-running .water-wave {
          opacity: 1;
          transform: translateY(0);
          animation: slosh-water 2.5s ease-in-out infinite alternate;
        }

        .is-drying .water-wave {
          opacity: 0 !important;
        }

        .is-drying .heat-glow {
          opacity: 1;
          animation: pulse-heat 2s ease-in-out infinite alternate;
        }

        .is-paused .drum-inner {
          animation-play-state: paused !important;
        }
        .is-paused .water-wave {
          animation-play-state: paused !important;
        }

        @keyframes spin-drum {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes slosh-water {
          0% { transform: translateY(2px) rotate(-4deg); }
          100% { transform: translateY(0) rotate(4deg); }
        }

        @keyframes pulse-heat {
          0% { opacity: 0.5; filter: blur(0px); }
          100% { opacity: 0.85; filter: blur(2px); }
        }

        /* Dishwasher Visual */
        .dishwasher-cabinet {
          position: relative;
          width: 135px;
          height: 140px;
          background: var(--candy-metallic);
          border-radius: 8px;
          border: 2px solid #37474f;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .dishwasher-door-handle {
          height: 18px;
          background: #263238;
          border-bottom: 2px solid #455a64;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
        }

        .dw-led-strip {
          display: flex;
          gap: 6px;
        }
        .dw-led {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #546e7a;
        }
        .dw-led.active {
          background: #00d2ff;
          box-shadow: 0 0 6px #00d2ff;
        }

        .dishwasher-interior {
          position: relative;
          flex: 1;
          background: #0f151c;
          padding: 8px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }

        .dw-rack {
          height: 4px;
          background: #37474f;
          border-radius: 2px;
          position: relative;
        }

        .dw-spray-arm {
          position: absolute;
          left: 50%;
          width: 75px;
          height: 6px;
          background: linear-gradient(90deg, #90a4ae, #b0bec5);
          border-radius: 3px;
          transform: translateX(-50%);
          transform-origin: center center;
          transition: all 0.3s ease;
        }
        .spray-top { top: 28px; }
        .spray-bottom { bottom: 25px; }

        .is-running .dw-spray-arm {
          animation: spin-spray 1.2s linear infinite;
        }

        .dw-water-jets {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(ellipse at 50% 30%, rgba(0, 210, 255, 0.25) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 70%, rgba(0, 210, 255, 0.25) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .is-running .dw-water-jets {
          opacity: 1;
          animation: jet-pulsate 0.6s infinite alternate;
        }

        @keyframes spin-spray {
          0% { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(360deg); }
        }

        @keyframes jet-pulsate {
          0% { opacity: 0.4; }
          100% { opacity: 0.9; }
        }

        /* Digital Display Panel */
        .digital-panel {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .timer-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .digital-timer {
          font-family: "Courier New", Courier, monospace, monospace;
          font-size: 38px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #ffffff;
          text-shadow: 0 0 14px var(--candy-blue-glow);
          line-height: 1;
        }

        .timer-label {
          font-size: 11px;
          color: #90a4ae;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .current-program-name {
          font-size: 15px;
          font-weight: 600;
          color: #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .current-phase-name {
          font-size: 13px;
          color: #00d2ff;
          font-weight: 500;
        }

        /* Indicators and Parameters Chips */
        .parameters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
          gap: 8px;
          margin-bottom: 14px;
        }

        .param-chip {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 8px 6px;
          text-align: center;
          transition: background 0.2s ease;
        }

        .param-chip:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .param-chip .lbl {
          font-size: 10px;
          color: #90a4ae;
          text-transform: uppercase;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .param-chip .val {
          font-size: 13px;
          font-weight: 700;
          color: #ffffff;
        }

        /* Warning Indicators for Dishwasher (Salt & Rinse) */
        .dw-warnings {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .dw-warn-pill {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 12px;
          color: #90a4ae;
        }

        .dw-warn-pill.active {
          background: rgba(255, 152, 0, 0.2);
          border-color: var(--candy-amber);
          color: #ffb74d;
        }

        .dw-warn-pill .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #546e7a;
        }
        .dw-warn-pill.active .dot {
          background: var(--candy-amber);
          box-shadow: 0 0 8px var(--candy-amber);
          animation: blink-fast 1s infinite;
        }

        /* Program Selection & Options */
        .controls-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dropdown-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .dropdown-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #90a4ae;
          font-weight: 600;
        }

        .program-dropdown {
          width: 100%;
          background: #1c2430;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 9px 12px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }

        .program-dropdown:focus {
          border-color: #00d2ff;
          box-shadow: 0 0 8px var(--candy-blue-glow);
        }

        /* Option Switches / Chips */
        .options-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .option-chip {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 600;
          color: #b0bec5;
          cursor: pointer;
          user-select: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .option-chip:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .option-chip.active {
          background: rgba(0, 210, 255, 0.2);
          border-color: #00d2ff;
          color: #00d2ff;
          box-shadow: 0 0 8px rgba(0, 210, 255, 0.3);
        }

        /* Action Buttons Toolbar */
        .action-toolbar {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.8fr;
          gap: 8px;
          margin-top: 6px;
        }

        .btn-action {
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          user-select: none;
        }

        .btn-start {
          background: linear-gradient(135deg, #0099ff 0%, #0066cc 100%);
          color: #ffffff;
          box-shadow: 0 4px 14px var(--candy-blue-glow);
        }
        .btn-start:hover {
          background: linear-gradient(135deg, #00b0ff 0%, #0077ee 100%);
          transform: translateY(-1px);
        }

        .btn-pause {
          background: rgba(255, 152, 0, 0.18);
          border: 1px solid rgba(255, 152, 0, 0.4);
          color: #ffb74d;
        }
        .btn-pause:hover {
          background: rgba(255, 152, 0, 0.3);
        }

        .btn-stop {
          background: rgba(244, 67, 54, 0.18);
          border: 1px solid rgba(244, 67, 54, 0.4);
          color: #e57373;
        }
        .btn-stop:hover {
          background: rgba(244, 67, 54, 0.3);
        }

        .btn-buzzer {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cfd8dc;
        }
        .btn-buzzer:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .btn-action:active {
          transform: scale(0.97);
        }
      </style>

      <ha-card>
        <!-- Header -->
        <div class="header">
          <div class="header-left">
            <span class="brand-logo">CANDY</span>
            <span class="card-title">${this._config.name || (isDishwasher ? 'Lavastoviglie' : 'Lavasciuga')}</span>
          </div>
          <div class="status-badge status-standby">In attesa</div>
        </div>

        <!-- Error Banner -->
        <div class="error-banner">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span class="error-text">Allarme</span>
        </div>

        <!-- Door Open Banner (Dishwasher) -->
        ${isDishwasher ? `
        <div class="door-open-banner">
          <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-4-6h-2v-2h2v2z"/></svg>
          <span>Sportello lavastoviglie aperto</span>
        </div>
        ` : ''}

        <!-- Appliance Visual + Digital Panel -->
        <div class="appliance-container">
          <!-- Graphic representation -->
          <div class="appliance-visual">
            ${isDishwasher ? `
              <!-- Dishwasher Visual -->
              <div class="dishwasher-cabinet">
                <div class="dishwasher-door-handle">
                  <div class="dw-led-strip">
                    <div class="dw-led active"></div>
                    <div class="dw-led"></div>
                  </div>
                </div>
                <div class="dishwasher-interior">
                  <div class="dw-water-jets"></div>
                  <div class="dw-rack"></div>
                  <div class="dw-spray-arm spray-top"></div>
                  <div class="dw-rack"></div>
                  <div class="dw-spray-arm spray-bottom"></div>
                </div>
              </div>
            ` : `
              <!-- Washer / Washer-Dryer Visual -->
              <div class="washer-porthole">
                <div class="porthole-glass">
                  <div class="drum-inner">
                    <div class="drum-lifter"></div>
                    <div class="drum-lifter"></div>
                    <div class="drum-lifter"></div>
                  </div>
                  <div class="water-wave">
                    <div class="bubbles"></div>
                  </div>
                  <div class="heat-glow"></div>
                </div>
                <div class="door-lock-led"></div>
              </div>
            `}
          </div>

          <!-- Digital Display Info -->
          <div class="digital-panel">
            <div class="timer-row">
              <span class="digital-timer">00:00</span>
              <span class="timer-label">Tempo Res.</span>
            </div>
            <div class="current-program-name">Seleziona programma</div>
            <div class="current-phase-name"></div>
          </div>
        </div>

        <!-- Parameter Badges (Washer) -->
        ${!isDishwasher ? `
        <div class="parameters-grid">
          <div class="param-chip chip-temp">
            <div class="lbl">
              <svg style="width:12px;height:12px;fill:currentColor" viewBox="0 0 24 24"><path d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4zm-4-8c0-.55.45-1 1-1s1 .45 1 1h-2z"/></svg>
              Temp
            </div>
            <div class="val">--</div>
          </div>
          <div class="param-chip chip-spin">
            <div class="lbl">
              <svg style="width:12px;height:12px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8A8 8 0 0 1 12 20Zm0-13a5 5 0 1 0 5 5A5 5 0 0 0 12 7Z"/></svg>
              Centrifuga
            </div>
            <div class="val">--</div>
          </div>
          <div class="param-chip chip-dry">
            <div class="lbl">
              <svg style="width:12px;height:12px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zM14 8l-2 2-2-2V4h4v4z"/></svg>
              Asciugatura
            </div>
            <div class="val">No Asc.</div>
          </div>
        </div>
        ` : `
        <!-- Dishwasher Salt & Rinse Warning Indicators -->
        <div class="dw-warnings">
          <div class="dw-warn-pill warn-salt">
            <span class="dot"></span>
            <span>Sale Rigenerante</span>
          </div>
          <div class="dw-warn-pill warn-rinse">
            <span class="dot"></span>
            <span>Brillantante</span>
          </div>
        </div>
        `}

        <!-- Controls Section -->
        <div class="controls-section">
          <!-- Program Dropdown -->
          <div class="dropdown-container">
            <label class="dropdown-label">Programma di lavaggio</label>
            <select class="program-dropdown">
              <option value="">Caricamento programmi...</option>
            </select>
          </div>

          <!-- Options Chips -->
          <div class="options-row">
            ${!isDishwasher ? `
              <div class="option-chip" data-opt="prewash">Prelavaggio</div>
              <div class="option-chip" data-opt="hygiene">Igiene+</div>
              <div class="option-chip" data-opt="extraRinse">Risciacquo+</div>
              <div class="option-chip" data-opt="easyIron">Stiro Facile</div>
              <div class="option-chip" data-opt="steam">Vapore</div>
            ` : `
              <div class="option-chip" data-opt="halfLoad">Mezzo Carico</div>
              <div class="option-chip" data-opt="tabs">Pastiglie 3-in-1</div>
              <div class="option-chip" data-opt="extraDry">Asciugatura Extra</div>
              <div class="option-chip" data-opt="openDoor">Apertura Smart</div>
            `}
          </div>

          <!-- Toolbar Action Buttons -->
          <div class="action-toolbar">
            <button class="btn-action btn-start">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Avvia
            </button>
            <button class="btn-action btn-pause">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              Pausa
            </button>
            <button class="btn-action btn-stop">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              Stop
            </button>
            <button class="btn-action btn-buzzer" title="Emetti Bip">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
            </button>
          </div>
        </div>
      </ha-card>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const root = this.shadowRoot;

    // Dropdown change
    const selectElem = root.querySelector('.program-dropdown');
    if (selectElem) {
      selectElem.addEventListener('change', (e) => {
        const val = e.target.value;
        const entities = this._getEntitiesMap();
        if (entities.programSelect) {
          this._selectOption(entities.programSelect, val);
        }
      });
    }

    // Option Chips clicks
    root.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const optKey = chip.getAttribute('data-opt');
        const entities = this._getEntitiesMap();
        const switchObj = entities[optKey + 'Switch'];
        if (switchObj) {
          this._toggleSwitch(switchObj);
        }
      });
    });

    // Action buttons
    const btnStart = root.querySelector('.btn-start');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        const entities = this._getEntitiesMap();
        this._pressButton(entities.startButton);
      });
    }

    const btnPause = root.querySelector('.btn-pause');
    if (btnPause) {
      btnPause.addEventListener('click', () => {
        const entities = this._getEntitiesMap();
        this._pressButton(entities.pauseButton);
      });
    }

    const btnStop = root.querySelector('.btn-stop');
    if (btnStop) {
      btnStop.addEventListener('click', () => {
        const entities = this._getEntitiesMap();
        this._pressButton(entities.stopButton);
      });
    }

    const btnBuzzer = root.querySelector('.btn-buzzer');
    if (btnBuzzer) {
      btnBuzzer.addEventListener('click', () => {
        const entities = this._getEntitiesMap();
        this._pressButton(entities.buzzerButton);
      });
    }
  }
}

// Visual Card Editor in Lovelace GUI
class CandyCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  render() {
    this.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;padding:8px 0;">
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px;">Nome Elettrodomestico</label>
          <input type="text" id="name" value="${this._config.name || ''}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;box-sizing:border-box;" />
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px;">Tipo Elettrodomestico</label>
          <select id="device_type" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;box-sizing:border-box;">
            <option value="washer_dryer" ${this._config.device_type === 'washer_dryer' ? 'selected' : ''}>Lavasciuga / Washer-Dryer</option>
            <option value="washer" ${this._config.device_type === 'washer' ? 'selected' : ''}>Lavatrice / Washing Machine</option>
            <option value="dishwasher" ${this._config.device_type === 'dishwasher' ? 'selected' : ''}>Lavastoviglie / Dishwasher</option>
          </select>
        </div>
        <div>
          <label style="font-weight:600;display:block;margin-bottom:4px;">Prefisso Entità (Opzionale)</label>
          <input type="text" id="entity_prefix" placeholder="es. candy_lavasciuga" value="${this._config.entity_prefix || ''}" style="width:100%;padding:8px;border-radius:6px;border:1px solid #ccc;box-sizing:border-box;" />
          <small style="color:#666;">Se lasciato vuoto, la scheda troverà automaticamente tutte le entità Candy Simply-Fi collegate.</small>
        </div>
      </div>
    `;

    this.querySelector('#name').addEventListener('input', (e) => this._updateConfig('name', e.target.value));
    this.querySelector('#device_type').addEventListener('change', (e) => this._updateConfig('device_type', e.target.value));
    this.querySelector('#entity_prefix').addEventListener('input', (e) => this._updateConfig('entity_prefix', e.target.value));
  }

  _updateConfig(key, value) {
    if (!this._config) return;
    this._config = {
      ...this._config,
      [key]: value
    };
    const event = new CustomEvent('config-changed', {
      detail: { config: this._config },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

// Register Custom Web Components
if (!customElements.get('candy-card')) {
  customElements.define('candy-card', CandyCard);
}
if (!customElements.get('candy-card-editor')) {
  customElements.define('candy-card-editor', CandyCardEditor);
}

// Register with Home Assistant Custom Card Picker
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'candy-card')) {
  window.customCards.push({
    type: 'candy-card',
    name: 'Candy Simply-Fi Card',
    description: 'Scheda grafica con simulatore animato per Lavasciuga, Lavatrici e Lavastoviglie Candy Simply-Fi.',
    preview: true,
    documentationURL: 'https://github.com/benedettosiddi/candysimply'
  });
}

console.info('%c CANDY-SIMPLYFI-CARD %c v1.0.0 Registrata con successo ', 'background: #0088cc; color: #fff; font-weight: bold; border-radius: 3px 0 0 3px;', 'background: #263238; color: #00d2ff; font-weight: bold; border-radius: 0 3px 3px 0;');
