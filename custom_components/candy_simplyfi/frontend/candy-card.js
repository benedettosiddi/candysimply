/**
 * Candy Simply-Fi Custom Lovelace Card
 * Card interattiva fotorealistica con animazioni fisiche e grafiche allineate
 * specificamente a ciascun programma, fase di ciclo e tipo di elettrodomestico Candy/Hoover.
 * 
 * CARATTERISTICHE DINAMICHE:
 * - LAVASCIUGA / LAVATRICE:
 *   • Programmi Lana & Delicati: Movimento "Culla" oscillante pendolare lento (cradle rocking), acqua calma, protezione fibre.
 *   • Programmi Cotone / Misti / Eco: Rotazione continua di lavaggio con onde d'acqua dinamiche e strato di schiuma con bolle.
 *   • Programmi Rapidi (14', 30', 44', 59'): Lavaggio energico accelerato ad alta reattività.
 *   • Fase Risciacquo: Livello dell'acqua alto trasparente azzurro cristallino con spruzzi profondi.
 *   • Fase Centrifuga: Rotazione centrifuga ultra-rapida con effetto blur e velocità calcolata istantaneamente sui giri RPM (400-1600).
 *   • Fase Asciugatura (Lana, Armadio, Stiro, Extra, Lava&Asciuga): Acqua scaricata, rotazione lenta reversibile antipiega,
 *     resistenza termica radiante pulsante interna (bagliore ambra/rosso) e vapori caldi di condensazione.
 *   • Programmi Vapore / Trattamento Vapore: Pennacchi di vapore bianco-azzurro caldo che risalgono dal cestello.
 *   • Fine Ciclo: Rotazione saltuaria antipiega, messaggio sul display e sblocco sportello.
 * 
 * - LAVASTOVIGLIE:
 *   • Intensivo 75°C / Igienizzante: Bracci rotanti contrapposti veloci, getti d'acqua incrociati ad alta pressione e vapore.
 *   • Eco 45°C: Rotazione armoniosa a risparmio energetico con bagliore verde smeraldo.
 *   • Delicato / Cristalli: Rotazione soffice con micro-gocce nebulizzate a bassa pressione per calici e porcellane.
 *   • Rapido 24' Zoom: Getti pulsanti ad alta frequenza.
 *   • Prelavaggio / Ammollo a freddo: Spruzzi d'acqua fresca senza riscaldamento.
 *   • Fase Asciugatura / Extra Dry: Bracci fermi, barra riscaldante inferiore incandescente e colonne di vapore che risalgono tra i cestelli.
 *   • Apertura Smart Sportello: Sportello semiaperto con fuoriuscita del vapore residuo a fine ciclo.
 *   • Indicatori e Allarmi Sale Rigenerante e Brillantante con LED di segnalazione pulsante.
 */

class CandyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
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
      throw new Error('Configurazione non valida per CandyCard');
    }
    this._config = {
      name: config.name || 'Candy Simply-Fi',
      device_type: config.device_type || 'washer_dryer',
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

    if (typeof patterns === 'string' && this._config[patterns]) {
      const explicit = this._config[patterns];
      if (states[explicit]) return { id: explicit, state: states[explicit] };
    }

    const patternList = Array.isArray(patterns) ? patterns : [patterns];
    const prefix = (this._config.entity_prefix || '').toLowerCase();
    const isDishwasher = this._config.device_type === 'dishwasher';

    const isMatchForAppliance = (key) => {
      const lower = key.toLowerCase();
      if (isDishwasher) {
        if (lower.includes('lavasciuga') || lower.includes('lavatrice') || lower.includes('_washer') || lower.includes('_wd')) {
          return false;
        }
      } else {
        if (lower.includes('lavastoviglie') || lower.includes('dishwasher') || lower.includes('_dw') || lower.includes('statodwash')) {
          return false;
        }
      }
      return true;
    };

    // 1. Explicit prefix matching
    if (prefix) {
      for (const key of Object.keys(states)) {
        if (domain && !key.startsWith(domain + '.')) continue;
        const lower = key.toLowerCase();
        if (lower.includes(prefix)) {
          for (const p of patternList) {
            if ((p === 'temp' || p === '_temp') && lower.includes('tempo')) continue;
            if (lower.includes(p.toLowerCase())) {
              return { id: key, state: states[key] };
            }
          }
        }
      }
    }

    // 2. Appliance-aware Candy entity matching
    for (const key of Object.keys(states)) {
      if (domain && !key.startsWith(domain + '.')) continue;
      if (!isMatchForAppliance(key)) continue;

      const lower = key.toLowerCase();
      if (lower.includes('candy') || lower.includes('simplyfi') || lower.includes('simply_fi') ||
          lower.includes('lavatrice') || lower.includes('lavasciuga') || lower.includes('lavastoviglie')) {
        for (const p of patternList) {
          if ((p === 'temp' || p === '_temp') && lower.includes('tempo')) continue;
          if (lower.includes(p.toLowerCase())) {
            return { id: key, state: states[key] };
          }
        }
      }
    }

    // 3. Fallback matching
    for (const key of Object.keys(states)) {
      if (domain && !key.startsWith(domain + '.')) continue;
      if (!isMatchForAppliance(key)) continue;
      const lower = key.toLowerCase();
      for (const p of patternList) {
        if ((p === 'temp' || p === '_temp') && lower.includes('tempo')) continue;
        if (lower.includes(p.toLowerCase())) {
          return { id: key, state: states[key] };
        }
      }
    }

    return null;
  }

  _getEntitiesMap() {
    const isDishwasher = this._config.device_type === 'dishwasher';

    return {
      status: this._findEntity(isDishwasher ? ['stato_dwash', 'statodwash', 'stato_elettrodomestico', 'stato', 'status'] : ['stato_elettrodomestico', 'stato', 'status', 'machmd'], 'sensor'),
      program: this._findEntity(['programma_attivo', 'programma', 'program', 'pr_nome'], 'sensor'),
      remainingTime: this._findEntity(['tempo_rimanente', 'remaining_time', 'time_remaining', 'rem_time'], 'sensor'),
      errorCode: this._findEntity(['codice_errore', 'errore', 'error_code', 'error'], 'sensor'),
      phase: !isDishwasher ? this._findEntity(['fase_del_ciclo', 'fase', 'program_phase', 'phase'], 'sensor') : null,
      temp: !isDishwasher ? this._findEntity(['temperatura_selezionata', 'temperatura', 'temperature', 'temp_lavaggio', '_temp'], 'sensor') : null,
      spin: !isDishwasher ? this._findEntity(['velocita_centrifuga', 'centrifuga', 'spin_speed', 'spin'], 'sensor') : null,
      dry: !isDishwasher ? this._findEntity(['modalita_asciugatura', 'livello_asciugatura', 'asciugatura', 'drying_level', 'dry_level', 'dry_time'], 'sensor') : null,

      running: this._findEntity(['in_funzione', 'is_running', 'running'], 'binary_sensor'),
      doorLocked: !isDishwasher ? this._findEntity(['oblo_bloccato_sicurezza', 'oblo_bloccato', 'door_locked'], 'binary_sensor') : null,
      doorOpen: isDishwasher ? this._findEntity(['sportello_aperto', 'door_open', 'apertura_sportello'], 'binary_sensor') : null,
      missSalt: isDishwasher ? this._findEntity(['mancanza_sale_rigenerante', 'mancanza_sale', 'missing_salt', 'miss_salt'], 'binary_sensor') : null,
      missRinse: isDishwasher ? this._findEntity(['mancanza_brillantante', 'missing_rinse_aid', 'missing_rinse', 'miss_rinse'], 'binary_sensor') : null,
      dryingActive: !isDishwasher ? this._findEntity(['fase_asciugatura_attiva', 'drying_active'], 'binary_sensor') : null,
      remoteControl: !isDishwasher ? this._findEntity(['controllo_remoto', 'remote_control'], 'binary_sensor') : null,

      programSelect: this._findEntity(isDishwasher ? ['programma_lavastoviglie', 'select_dishwasher_program', 'program'] : ['programma_lavaggio', 'program'], 'select'),
      tempSelect: !isDishwasher ? this._findEntity(['selezione_temperatura', 'temperature'], 'select') : null,
      spinSelect: !isDishwasher ? this._findEntity(['selezione_centrifuga', 'spin'], 'select') : null,
      drySelect: !isDishwasher ? this._findEntity(['selezione_asciugatura', 'drying'], 'select') : null,

      startButton: this._findEntity(['avvia_programma_selezionato', 'avvia_programma', 'start_program', 'start'], 'button'),
      pauseButton: this._findEntity(['metti_in_pausa', 'pause'], 'button'),
      stopButton: this._findEntity(['annulla_stop_reset', 'annulla_stop', 'stop_reset', 'stop'], 'button'),
      buzzerButton: this._findEntity(['segnale_acustico_beep', 'segnale_acustico', 'buzzer', 'beep'], 'button'),

      prewashSwitch: !isDishwasher ? this._findEntity(['prelavaggio', 'opt1_prewash'], 'switch') : null,
      hygieneSwitch: !isDishwasher ? this._findEntity(['igiene', 'opt2_hygiene'], 'switch') : null,
      extraRinseSwitch: !isDishwasher ? this._findEntity(['risciacquo_extra', 'opt3_extra_rinse'], 'switch') : null,
      easyIronSwitch: !isDishwasher ? this._findEntity(['stiro_facile', 'opt4_easy_iron'], 'switch') : null,
      steamSwitch: !isDishwasher ? this._findEntity(['trattamento_vapore', 'opt7_steam'], 'switch') : null,

      halfLoadSwitch: isDishwasher ? this._findEntity(['opzione_mezzo_carico', 'mezzo_carico', 'half_load'], 'switch') : null,
      tabsSwitch: isDishwasher ? this._findEntity(['opzione_pastiglie_3_in_1', 'pastiglie', 'tabs_3in1', 'tabs'], 'switch') : null,
      extraDrySwitch: isDishwasher ? this._findEntity(['opzione_asciugatura_extra', 'asciugatura_extra', 'extra_dry'], 'switch') : null,
      openDoorSwitch: isDishwasher ? this._findEntity(['apertura_automatica_sportello', 'apertura_automatica', 'open_door_opt', 'open_door'], 'switch') : null,
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
    this._callService('select', 'select_option', { entity_id: entityObj.id, option });
  }

  _toggleSwitch(entityObj) {
    if (!entityObj || !entityObj.id) return;
    this._callService('switch', 'toggle', { entity_id: entityObj.id });
  }

  /**
   * Analizza dettagliatamente il programma, la fase e i parametri correnti
   * per determinare il profilo fisico di animazione esatto.
   */
  _computeAnimationProfile(entities, isDishwasher) {
    const statusVal = (entities.status?.state?.state || 'Standby').toLowerCase();
    const progVal = (entities.program?.state?.state || '').toLowerCase();
    const phaseVal = (entities.phase?.state?.state || '').toLowerCase();

    const rawTempState = String(entities.temp?.state?.state || '');
    const cleanTempStr = rawTempState.replace(',', '.');
    const parsedTemp = (!rawTempState.toLowerCase().includes('min') && !rawTempState.toLowerCase().includes('tempo') && !rawTempState.toLowerCase().includes('h')) ? parseFloat(cleanTempStr) : NaN;
    const tempVal = !isNaN(parsedTemp) ? Math.round(parsedTemp) : 40;

    const rawSpinState = String(entities.spin?.state?.state || '');
    const parsedSpin = parseInt(rawSpinState, 10);
    const spinVal = !isNaN(parsedSpin) ? parsedSpin : 0;

    const isRunning = isDishwasher
      ? (entities.running ? entities.running.state?.state === 'on' : (statusVal.includes('funzione') && !statusVal.includes('standby') && !statusVal.includes('attesa')))
      : (entities.running?.state?.state === 'on' ||
         statusVal.includes('funzione') || statusVal === '2' ||
         (phaseVal && !phaseVal.includes('non avviato') && !phaseVal.includes('terminato') && phaseVal !== '0' && phaseVal !== '6'));
    const isPaused = isDishwasher
      ? (statusVal.includes('pausa') || (entities.running?.state?.attributes?.is_paused === true))
      : (statusVal.includes('pausa') || statusVal === '3');
    const isFinished = statusVal.includes('terminato') || statusVal === '7' || statusVal === '5';
    const doorState = entities.doorLocked?.state?.state;
    const isDoorLocked = entities.doorLocked
      ? (entities.doorLocked.state?.attributes?.is_locked !== undefined
          ? Boolean(entities.doorLocked.state.attributes.is_locked)
          : (doorState === 'off' || doorState === 'locked' || (entities.doorLocked.state?.attributes?.device_class !== 'lock' && doorState === 'on')))
      : isRunning;
    const isDryingActive = (entities.dryingActive?.state?.state === 'on') ||
                           phaseVal.includes('asciugatura') || phaseVal === '5' ||
                           progVal.includes('asciugatura');
    const isSteamActive = (entities.steamSwitch?.state?.state === 'on') ||
                          progVal.includes('vapore') || progVal.includes('steam');

    if (isDishwasher) {
      // PROFILO LAVASTOVIGLIE
      let dwMode = 'standby';
      let description = 'Elettrodomestico pronto';

      if (!isRunning) {
        if (isFinished) {
          dwMode = 'finished';
          description = 'Ciclo di lavaggio terminato';
        } else if (isPaused) {
          dwMode = 'paused';
          description = 'Ciclo in pausa';
        }
      } else {
        // Determinazione modalità attiva in base al programma impostato
        if (phaseVal.includes('asciugatura') || statusVal.includes('asciugatura')) {
          dwMode = 'dw-drying';
          description = 'Fase asciugatura termica e condensazione attiva';
        } else if (progVal.includes('intensiv') || progVal.includes('igiene') || progVal.includes('75')) {
          dwMode = 'dw-intensive';
          description = 'Lavaggio intensivo 75°C: getti incrociati ad alta pressione';
        } else if (progVal.includes('delicat') || progVal.includes('cristall') || progVal.includes('vetro')) {
          dwMode = 'dw-delicate';
          description = 'Lavaggio delicato calici: nebulizzazione soffice 45°C';
        } else if (progVal.includes('rapid') || progVal.includes('zoom') || progVal.includes('24')) {
          dwMode = 'dw-rapid';
          description = 'Ciclo Rapido Zoom: lavaggio accelerato pulsante';
        } else if (progVal.includes('prelavaggio') || progVal.includes('ammollo')) {
          dwMode = 'dw-prewash';
          description = 'Ammollo a freddo con irrorazione dolce';
        } else if (progVal.includes('eco')) {
          dwMode = 'dw-eco';
          description = 'Ciclo Eco 45°C ad alta efficienza idrica';
        } else {
          dwMode = 'dw-normal';
          description = 'Lavaggio normale con doppi bracci irroratori';
        }
      }

      return {
        isDishwasher: true,
        isRunning,
        isPaused,
        isFinished,
        mode: dwMode,
        description,
        isDoorOpen: entities.doorOpen?.state?.state === 'on',
        isSmartDoor: entities.openDoorSwitch?.state?.state === 'on',
        isHalfLoad: entities.halfLoadSwitch?.state?.state === 'on',
        missSalt: entities.missSalt?.state?.state === 'on',
        missRinse: entities.missRinse?.state?.state === 'on',
      };
    }

    // PROFILO LAVASCIUGA / LAVATRICE
    let washerMode = 'standby';
    let description = 'Elettrodomestico pronto';
    let spinDuration = '3.5s';
    let waterLevel = 0; // % altezza acqua
    let hasBubbles = false;
    let hasSteam = false;
    let heatGlow = false;

    // Colore temperatura acqua (cyan -> azzurro -> ambra -> rosso)
    let tempColor = 'rgba(0, 210, 255, 0.5)';
    if (tempVal >= 90) tempColor = 'rgba(255, 61, 0, 0.7)';
    else if (tempVal >= 60) tempColor = 'rgba(255, 109, 0, 0.6)';
    else if (tempVal >= 40) tempColor = 'rgba(255, 171, 0, 0.5)';
    else if (tempVal === 0 || tempVal <= 20) tempColor = 'rgba(0, 229, 255, 0.55)';

    if (!isRunning) {
      if (isFinished) {
        washerMode = 'finished';
        description = 'Ciclo terminato: bucato pronto';
      } else if (isPaused) {
        washerMode = 'paused';
        description = 'Ciclo in pausa';
      }
    } else {
      // 1. Centrifuga
      if (phaseVal.includes('centrifuga') || phaseVal === '4' || progVal.includes('centrifuga')) {
        if (spinVal > 0) {
          washerMode = 'spin';
          // Durata rotazione proporzionale ai giri RPM
          if (spinVal >= 1400) spinDuration = '0.22s';
          else if (spinVal >= 1200) spinDuration = '0.28s';
          else if (spinVal >= 1000) spinDuration = '0.36s';
          else if (spinVal >= 800) spinDuration = '0.48s';
          else if (spinVal >= 400) spinDuration = '0.75s';
          else spinDuration = '1.2s';
          waterLevel = 5;
          hasBubbles = false;
          description = `Centrifuga rapida attiva a ${spinVal} RPM`;
        } else {
          washerMode = 'wash';
          spinDuration = '3.8s';
          waterLevel = 0;
          hasBubbles = false;
          description = 'Scarico acqua e distensione bucato';
        }
      }
      // 2. Asciugatura
      else if (isDryingActive) {
        washerMode = 'drying';
        spinDuration = '5.5s';
        waterLevel = 0;
        heatGlow = true;
        hasSteam = true;
        description = 'Asciugatura attiva con riscaldamento termico e ventilazione';
      }
      // 3. Risciacquo
      else if (phaseVal.includes('risciacquo') || phaseVal === '3' || progVal.includes('risciacquo')) {
        washerMode = 'rinse';
        spinDuration = '3.0s';
        waterLevel = 60; // Livello acqua alto
        hasBubbles = false;
        description = 'Fase risciacquo con alto livello d\'acqua limpida';
      }
      // 4. Lana, Seta e Delicati (Movimento Culla / Cradle)
      else if (progVal.includes('lana') || progVal.includes('seta') || progVal.includes('delicat') || progVal.includes('piumoni')) {
        washerMode = 'cradle';
        spinDuration = '6.0s';
        waterLevel = 35;
        hasBubbles = true;
        description = 'Movimento culla oscillante delicato per protezione fibre';
      }
      // 5. Vapore
      else if (isSteamActive || progVal.includes('vapore') || progVal.includes('steam')) {
        washerMode = 'steam';
        spinDuration = '4.5s';
        waterLevel = 10;
        hasSteam = true;
        heatGlow = true;
        description = 'Trattamento a vapore igienizzante e antipiega';
      }
      // 6. Programmi Rapidi (14', 30', 44', 59')
      else if (progVal.includes('rapid') || progVal.includes('zoom') || progVal.includes('59') || progVal.includes('14') || progVal.includes('30')) {
        washerMode = 'rapid';
        spinDuration = '2.2s';
        waterLevel = 45;
        hasBubbles = true;
        description = 'Lavaggio Rapido dinamico con rotazione energica';
      }
      // 7. Prelavaggio
      else if (phaseVal.includes('prelavaggio') || phaseVal === '1') {
        washerMode = 'prewash';
        spinDuration = '3.8s';
        waterLevel = 30;
        hasBubbles = true;
        description = 'Prelavaggio macchie con immersione graduale';
      }
      // 8. Lavaggio Standard (Cotone, Sintetici, Eco 40-60)
      else {
        washerMode = 'wash';
        spinDuration = '3.2s';
        waterLevel = 40;
        hasBubbles = true;
        if (tempVal >= 60) hasSteam = true;
        description = `Lavaggio in corso a ${tempVal}°C`;
      }
    }

    return {
      isDishwasher: false,
      isRunning,
      isPaused,
      isFinished,
      mode: washerMode,
      description,
      spinDuration,
      waterLevel,
      hasBubbles,
      hasSteam,
      heatGlow,
      tempColor,
      isDoorLocked,
      tempVal,
      spinVal,
    };
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

    const profile = this._computeAnimationProfile(entities, isDishwasher);

    // 1. Titolo e Badge Stato
    const titleEl = this.shadowRoot.querySelector('.card-title');
    if (titleEl) titleEl.textContent = this._config.name || (isDishwasher ? 'Candy Lavastoviglie' : 'Candy Lavasciuga');

    const statusBadge = this.shadowRoot.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.textContent = statusVal;
      statusBadge.className = 'status-badge ' + (
        profile.isRunning ? 'status-running' :
        profile.isPaused ? 'status-paused' :
        profile.isFinished ? 'status-finished' : 'status-standby'
      );
    }

    // 2. Display Digitale e Descrizione Ciclo
    const timerEl = this.shadowRoot.querySelector('.digital-timer');
    if (timerEl) {
      timerEl.textContent = profile.isRunning || profile.isPaused
        ? timeVal
        : (profile.isFinished ? 'FINE' : (timeVal && timeVal !== 'Completato / Pronto' && timeVal !== 'N/D' ? timeVal : '00:00'));
    }

    const progEl = this.shadowRoot.querySelector('.current-program-name');
    if (progEl) progEl.textContent = programVal;

    const phaseEl = this.shadowRoot.querySelector('.current-phase-name');
    if (phaseEl) phaseEl.textContent = phaseVal ? `• ${phaseVal}` : '';

    const descEl = this.shadowRoot.querySelector('.cycle-live-description');
    if (descEl) descEl.textContent = profile.description;

    // 3. Applicazione Animazioni Dinamiche al Cestello o alla Vasca
    const visualRoot = this.shadowRoot.querySelector('.appliance-visual');
    if (visualRoot) {
      visualRoot.className = `appliance-visual mode-${profile.mode}`;
      if (profile.isRunning) visualRoot.classList.add('is-running');
      if (profile.isPaused) visualRoot.classList.add('is-paused');

      if (!isDishwasher) {
        // Applicazione variabili CSS dinamiche per la lavasciuga
        visualRoot.style.setProperty('--spin-time', profile.spinDuration);
        visualRoot.style.setProperty('--water-height', `${profile.waterLevel}%`);
        visualRoot.style.setProperty('--water-glow-color', profile.tempColor);

        const waterEl = visualRoot.querySelector('.water-wave');
        if (waterEl) {
          waterEl.style.height = `${profile.waterLevel}%`;
          waterEl.style.opacity = profile.waterLevel > 0 && profile.isRunning ? '1' : '0';
        }

        const bubblesEl = visualRoot.querySelector('.bubbles');
        if (bubblesEl) {
          bubblesEl.style.display = profile.hasBubbles && profile.isRunning ? 'block' : 'none';
        }

        const steamEl = visualRoot.querySelector('.steam-plume');
        if (steamEl) {
          steamEl.style.display = profile.hasSteam && profile.isRunning ? 'block' : 'none';
        }

        const heatEl = visualRoot.querySelector('.heat-glow');
        if (heatEl) {
          heatEl.style.opacity = profile.heatGlow && profile.isRunning ? '1' : '0';
        }

        const doorLockLed = visualRoot.querySelector('.door-lock-led');
        if (doorLockLed) {
          doorLockLed.classList.toggle('locked', profile.isDoorLocked);
          doorLockLed.title = profile.isDoorLocked ? 'Oblò bloccato per sicurezza' : 'Oblò sbloccato';
        }
      } else {
        // Applicazione stati lavastoviglie
        visualRoot.classList.toggle('door-open', profile.isDoorOpen);
        visualRoot.classList.toggle('half-load', profile.isHalfLoad);

        const dwHeatingEl = visualRoot.querySelector('.dw-heating-element');
        if (dwHeatingEl) {
          dwHeatingEl.classList.toggle('heating', profile.mode === 'dw-drying');
        }

        const saltWarning = this.shadowRoot.querySelector('.warn-salt');
        if (saltWarning) saltWarning.classList.toggle('active', profile.missSalt);

        const rinseWarning = this.shadowRoot.querySelector('.warn-rinse');
        if (rinseWarning) rinseWarning.classList.toggle('active', profile.missRinse);

        const doorOpenBanner = this.shadowRoot.querySelector('.door-open-banner');
        if (doorOpenBanner) {
          doorOpenBanner.style.display = profile.isDoorOpen ? 'flex' : 'none';
        }
      }
    }

    // 4. Aggiornamento Parametri Washer (Chip)
    if (!isDishwasher) {
      const chipTemp = this.shadowRoot.querySelector('.chip-temp .val');
      if (chipTemp) {
        const rawTemp = String(entities.temp?.state?.state || '');
        const cleanT = rawTemp.replace(',', '.');
        const numTemp = parseFloat(cleanT);
        if (!isNaN(numTemp) && !rawTemp.toLowerCase().includes('min') && !rawTemp.toLowerCase().includes('tempo') && !rawTemp.toLowerCase().includes('h') && numTemp > 0) {
          chipTemp.textContent = `${Math.round(numTemp)}°C`;
        } else if (numTemp === 0 || rawTemp.startsWith('0') || rawTemp.toLowerCase().includes('freddo')) {
          chipTemp.textContent = 'Freddo';
        } else {
          chipTemp.textContent = '--';
        }
      }

      const chipSpin = this.shadowRoot.querySelector('.chip-spin .val');
      if (chipSpin) {
        const rawSpin = String(entities.spin?.state?.state || '');
        const numSpin = parseInt(rawSpin, 10);
        if (!isNaN(numSpin) && numSpin > 0) {
          chipSpin.textContent = `${numSpin} rpm`;
        } else if (numSpin === 0 || rawSpin.startsWith('0') || rawSpin.toLowerCase().includes('no centrifuga')) {
          chipSpin.textContent = 'No centrifuga';
        } else {
          chipSpin.textContent = '--';
        }
      }

      const chipDry = this.shadowRoot.querySelector('.chip-dry .val');
      if (chipDry) {
        let dryTxt = 'No Asc.';
        if (dryVal === '1') dryTxt = 'Stiro';
        else if (dryVal === '2') dryTxt = 'Armadio';
        else if (dryVal === '3') dryTxt = 'Extra';
        else if (parseInt(dryVal, 10) > 10) dryTxt = `${dryVal}'`;
        chipDry.textContent = dryTxt;
      }
    }

    // 5. Banner di Errore Diagnostico
    const errorBanner = this.shadowRoot.querySelector('.error-banner');
    if (errorBanner) {
      const errVal = entities.errorCode?.state?.state;
      const isErr = errVal && !['e0', '0', 'none', 'unknown', 'unavailable'].includes(errVal.toLowerCase());
      if (isErr) {
        const errDesc = entities.errorCode?.state?.attributes?.descrizione_errore ||
                        entities.errorCode?.state?.attributes?.description || 'Verificare l\'elettrodomestico';
        errorBanner.style.display = 'flex';
        errorBanner.querySelector('.error-text').textContent = `Allarme ${errVal}: ${errDesc}`;
      } else {
        errorBanner.style.display = 'none';
      }
    }

    // 6. Sincronizzazione Switch Opzioni
    this.shadowRoot.querySelectorAll('.option-chip').forEach(chip => {
      const optKey = chip.getAttribute('data-opt');
      const switchObj = entities[optKey + 'Switch'];
      if (switchObj && switchObj.state) {
        chip.classList.toggle('active', switchObj.state.state === 'on');
      }
    });

    // 7. Sincronizzazione Menu Programmi
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
          margin-bottom: 14px;
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

        .status-standby { background: rgba(144, 164, 174, 0.15); color: #b0bec5; }
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

        .status-paused { background: rgba(255, 152, 0, 0.2); color: #ffb74d; }
        .status-paused::before { background: #ff9800; }

        .status-finished { background: rgba(76, 175, 80, 0.2); color: #81c784; }
        .status-finished::before { background: #4caf50; }

        @keyframes pulse-dot {
          0% { transform: scale(0.85); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 1; }
        }

        /* Banner Allarmi */
        .error-banner {
          display: none;
          background: linear-gradient(90deg, rgba(244, 67, 54, 0.25), rgba(211, 47, 47, 0.15));
          border-left: 4px solid var(--candy-red);
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 12px;
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
          margin-bottom: 12px;
          align-items: center;
          gap: 8px;
          color: #ffe0b2;
          font-size: 12px;
        }

        /* Visual Box Appliance */
        .appliance-container {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 18px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 14px;
        }

        @media (max-width: 480px) {
          .appliance-container {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
          }
        }

        /* Visual Graphic Container */
        .appliance-visual {
          position: relative;
          width: 155px;
          height: 155px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ====================================================================
           LAVASCIUGA: ANIMAZIONI ESTRATTE E CALCOLATE SUI PROGRAMMI
           ==================================================================== */
        .washer-porthole {
          position: relative;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: var(--candy-bezel);
          box-shadow: inset 0 3px 10px rgba(255, 255, 255, 0.25),
                      0 10px 28px rgba(0, 0, 0, 0.65);
          border: 5px solid #232b38;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .porthole-glass {
          position: relative;
          width: 114px;
          height: 114px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16, 26, 38, 0.95) 0%, rgba(5, 10, 16, 0.98) 100%);
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Cestello Inox */
        .drum-inner {
          position: absolute;
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 2px dashed rgba(255, 255, 255, 0.3);
          background:
            radial-gradient(circle, transparent 40%, rgba(255, 255, 255, 0.06) 70%),
            conic-gradient(from 0deg, rgba(255, 255, 255, 0.12) 0deg, transparent 60deg, rgba(255, 255, 255, 0.18) 120deg, transparent 180deg, rgba(255, 255, 255, 0.12) 240deg, transparent 300deg, rgba(255, 255, 255, 0.18) 360deg);
          box-shadow: inset 0 0 16px rgba(0, 0, 0, 0.85);
          transform-origin: center center;
          transition: filter 0.4s ease;
        }

        .drum-lifter {
          position: absolute;
          width: 7px;
          height: 24px;
          background: linear-gradient(to right, #78909c, #eceff1);
          border-radius: 3px;
          top: 6px;
          left: calc(50% - 3.5px);
          transform-origin: 3.5px 42px;
        }
        .drum-lifter:nth-child(2) { transform: rotate(120deg); }
        .drum-lifter:nth-child(3) { transform: rotate(240deg); }

        /* Onde d'Acqua Dinamiche */
        .water-wave {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 0%;
          background: linear-gradient(180deg, rgba(0, 210, 255, 0.45) 0%, rgba(0, 114, 255, 0.65) 100%);
          border-radius: 0 0 57px 57px;
          opacity: 0;
          transition: height 0.8s ease, opacity 0.5s ease;
          overflow: hidden;
        }

        /* Schiuma e Bolle */
        .bubbles {
          display: none;
          position: absolute;
          width: 100%;
          height: 100%;
          background-image:
            radial-gradient(circle, #ffffff 1.5px, transparent 2px),
            radial-gradient(circle, #e0f7fa 1px, transparent 1.5px);
          background-size: 10px 10px, 6px 6px;
          opacity: 0.55;
          animation: float-bubbles 2s linear infinite;
        }

        @keyframes float-bubbles {
          0% { transform: translateY(0); }
          100% { transform: translateY(-8px); }
        }

        /* Pennacchi Vapore / Steam */
        .steam-plume {
          display: none;
          position: absolute;
          bottom: 10px;
          left: 20%;
          right: 20%;
          height: 60px;
          background: radial-gradient(ellipse at 50% 80%, rgba(255, 255, 255, 0.4) 0%, rgba(0, 210, 255, 0.2) 40%, transparent 80%);
          filter: blur(4px);
          border-radius: 50%;
          animation: puff-steam 2.2s infinite ease-out;
          pointer-events: none;
        }

        @keyframes puff-steam {
          0% { transform: scale(0.7) translateY(5px); opacity: 0.1; }
          50% { transform: scale(1.1) translateY(-10px); opacity: 0.6; }
          100% { transform: scale(1.3) translateY(-25px); opacity: 0; }
        }

        /* Calore Asciugatura (Heat Shimmer Glow) */
        .heat-glow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 87, 34, 0.45) 15%, rgba(255, 152, 0, 0.2) 60%, transparent 80%);
          opacity: 0;
          transition: opacity 0.8s ease;
          pointer-events: none;
        }

        /* Spia LED Blocco Oblò */
        .door-lock-led {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4caf50;
          box-shadow: 0 0 6px #4caf50;
          transition: all 0.3s ease;
        }
        .door-lock-led.locked {
          background: #f44336;
          box-shadow: 0 0 8px #f44336;
        }

        /* ANIMAZIONI DI ROTAZIONE SPECIFICHE PER PROGRAMMA */
        /* Baseline running animation: garantisce sempre rotazione cestello e onde acqua durante qualunque fase attiva */
        .appliance-visual.is-running .drum-inner {
          animation: spin-smooth var(--spin-time, 3.2s) linear infinite;
        }
        .appliance-visual.is-running .water-wave {
          animation: slosh-normal 2.2s ease-in-out infinite alternate;
        }

        /* 1. Lavaggio Normale / Risciacquo / Eco / Sintetici */
        .mode-wash.is-running .drum-inner,
        .mode-rinse.is-running .drum-inner,
        .mode-prewash.is-running .drum-inner {
          animation: spin-smooth var(--spin-time, 3.0s) linear infinite;
        }
        .mode-wash.is-running .water-wave,
        .mode-rinse.is-running .water-wave,
        .mode-prewash.is-running .water-wave {
          animation: slosh-normal 2.0s ease-in-out infinite alternate;
        }

        /* 2. Programmi Rapidi (14', 30', 44', 59') */
        .mode-rapid.is-running .drum-inner {
          animation: spin-smooth var(--spin-time, 2.2s) linear infinite;
        }
        .mode-rapid.is-running .water-wave {
          animation: slosh-vigorous 1.4s ease-in-out infinite alternate;
        }

        /* 3. Lana & Delicati: Movimento CULLA (Cradle Rocking) */
        .mode-cradle.is-running .drum-inner {
          animation: cradle-rocking 4.8s ease-in-out infinite;
        }
        .mode-cradle.is-running .water-wave {
          animation: slosh-gentle 4.8s ease-in-out infinite;
        }

        /* 4. Centrifuga ad Alta Velocità (Spin) */
        .mode-spin.is-running .drum-inner {
          animation: spin-smooth var(--spin-time, 0.28s) linear infinite;
          filter: blur(0.7px);
        }

        /* 5. Asciugatura (Drying) */
        .mode-drying.is-running .drum-inner {
          animation: tumble-drying 6s ease-in-out infinite;
        }
        .mode-drying.is-running .heat-glow {
          opacity: 1;
          animation: pulse-heat 2s ease-in-out infinite alternate;
        }

        /* 6. Vapore */
        .mode-steam.is-running .drum-inner {
          animation: tumble-drying 5s ease-in-out infinite;
        }

        .is-paused .drum-inner,
        .is-paused .water-wave {
          animation-play-state: paused !important;
        }

        @keyframes spin-smooth {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes cradle-rocking {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(42deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-42deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes tumble-drying {
          0% { transform: rotate(0deg); }
          40% { transform: rotate(180deg); }
          50% { transform: rotate(180deg); }
          90% { transform: rotate(-40deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes slosh-normal {
          0% { transform: translateY(2px) rotate(-3deg); }
          100% { transform: translateY(0) rotate(3deg); }
        }

        @keyframes slosh-vigorous {
          0% { transform: translateY(3px) rotate(-6deg); }
          100% { transform: translateY(-2px) rotate(6deg); }
        }

        @keyframes slosh-gentle {
          0% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
          100% { transform: rotate(-2deg); }
        }

        @keyframes pulse-heat {
          0% { opacity: 0.45; filter: blur(0px); }
          100% { opacity: 0.95; filter: blur(2px); }
        }

        /* ====================================================================
           LAVASTOVIGLIE: ANIMAZIONI SPECIFICHE PER PROGRAMMA E DISPOSITIVO
           ==================================================================== */
        .dishwasher-cabinet {
          position: relative;
          width: 142px;
          height: 148px;
          background: var(--candy-metallic);
          border-radius: 10px;
          border: 2px solid #37474f;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s ease;
        }

        .dishwasher-door-handle {
          height: 20px;
          background: #263238;
          border-bottom: 2px solid #455a64;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
        }

        .dw-led-strip {
          display: flex;
          gap: 5px;
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
          padding: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .dw-rack {
          height: 4px;
          background: #37474f;
          border-radius: 2px;
          position: relative;
          margin: 6px 0;
        }

        .dw-spray-arm {
          position: absolute;
          left: 50%;
          width: 80px;
          height: 6px;
          background: linear-gradient(90deg, #90a4ae, #cfd8dc);
          border-radius: 3px;
          transform: translateX(-50%);
          transform-origin: center center;
        }
        .spray-top { top: 32px; }
        .spray-bottom { bottom: 28px; }

        /* Resistenza inferiore per asciugatura */
        .dw-heating-element {
          position: absolute;
          bottom: 4px;
          left: 15px;
          right: 15px;
          height: 3px;
          background: #37474f;
          border-radius: 2px;
          transition: all 0.5s ease;
        }
        .dw-heating-element.heating {
          background: #ff5722;
          box-shadow: 0 0 10px #ff5722;
          animation: pulse-element 1.5s infinite alternate;
        }

        @keyframes pulse-element {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }

        /* Getti d'Acqua e Irrorazione */
        .dw-water-jets {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        /* 1. Modalità Intensivo 75°C: Rotazione veloce contrapposta e getti potenti */
        .mode-dw-intensive.is-running .spray-top {
          animation: spin-spray-cw 0.8s linear infinite;
        }
        .mode-dw-intensive.is-running .spray-bottom {
          animation: spin-spray-ccw 0.8s linear infinite;
        }
        .mode-dw-intensive.is-running .dw-water-jets {
          opacity: 1;
          background-image:
            radial-gradient(circle at 45% 35%, rgba(0, 210, 255, 0.4) 0%, transparent 60%),
            radial-gradient(circle at 55% 65%, rgba(0, 210, 255, 0.4) 0%, transparent 60%);
          animation: jet-pulsate 0.4s infinite alternate;
        }

        /* 2. Modalità Delicato 45°C: Rotazione lenta soffice */
        .mode-dw-delicate.is-running .spray-top {
          animation: spin-spray-cw 2.5s linear infinite;
        }
        .mode-dw-delicate.is-running .spray-bottom {
          animation: spin-spray-ccw 2.5s linear infinite;
        }
        .mode-dw-delicate.is-running .dw-water-jets {
          opacity: 0.6;
          background-image: radial-gradient(circle at 50% 50%, rgba(0, 210, 255, 0.25) 0%, transparent 70%);
          animation: jet-pulsate 1.2s infinite alternate;
        }

        /* 3. Modalità Normale / Eco / Rapido */
        .mode-dw-normal.is-running .spray-top,
        .mode-dw-eco.is-running .spray-top,
        .mode-dw-rapid.is-running .spray-top {
          animation: spin-spray-cw 1.2s linear infinite;
        }
        .mode-dw-normal.is-running .spray-bottom,
        .mode-dw-eco.is-running .spray-bottom,
        .mode-dw-rapid.is-running .spray-bottom {
          animation: spin-spray-ccw 1.2s linear infinite;
        }
        .mode-dw-normal.is-running .dw-water-jets,
        .mode-dw-eco.is-running .dw-water-jets,
        .mode-dw-rapid.is-running .dw-water-jets {
          opacity: 0.85;
          background-image:
            radial-gradient(circle at 50% 30%, rgba(0, 210, 255, 0.3) 0%, transparent 60%),
            radial-gradient(circle at 50% 70%, rgba(0, 210, 255, 0.3) 0%, transparent 60%);
          animation: jet-pulsate 0.6s infinite alternate;
        }

        /* 4. Modalità Asciugatura Lavastoviglie: Bracci fermi e vapori */
        .mode-dw-drying.is-running .dw-water-jets {
          opacity: 1;
          background: radial-gradient(ellipse at 50% 80%, rgba(255, 87, 34, 0.25) 0%, transparent 75%);
        }

        @keyframes spin-spray-cw {
          0% { transform: translateX(-50%) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes spin-spray-ccw {
          0% { transform: translateX(-50%) rotate(360deg); }
          100% { transform: translateX(-50%) rotate(0deg); }
        }

        @keyframes jet-pulsate {
          0% { opacity: 0.35; }
          100% { opacity: 0.95; }
        }

        /* Display Digitale */
        .digital-panel {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .timer-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
        }

        .digital-timer {
          font-family: "Courier New", Courier, monospace;
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

        .cycle-live-description {
          font-size: 11px;
          color: #b0bec5;
          font-style: italic;
          line-height: 1.3;
          margin-top: 2px;
        }

        /* Griglia Parametri (Washer) */
        .parameters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
          gap: 8px;
          margin-bottom: 12px;
        }

        .param-chip {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 7px 6px;
          text-align: center;
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

        /* Indicatori Sale e Brillantante Lavastoviglie */
        .dw-warnings {
          display: flex;
          gap: 10px;
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

        @keyframes blink-fast {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }

        /* Sezione Controlli */
        .controls-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
        }

        .program-dropdown:focus {
          border-color: #00d2ff;
          box-shadow: 0 0 8px var(--candy-blue-glow);
        }

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

        /* Pulsanti Toolbar */
        .action-toolbar {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 0.8fr;
          gap: 8px;
          margin-top: 4px;
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
        .btn-pause:hover { background: rgba(255, 152, 0, 0.3); }

        .btn-stop {
          background: rgba(244, 67, 54, 0.18);
          border: 1px solid rgba(244, 67, 54, 0.4);
          color: #e57373;
        }
        .btn-stop:hover { background: rgba(244, 67, 54, 0.3); }

        .btn-buzzer {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #cfd8dc;
        }
        .btn-buzzer:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .btn-action:active { transform: scale(0.97); }
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

        <!-- Banner Errore -->
        <div class="error-banner">
          <svg style="width:20px;height:20px;fill:currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
          <span class="error-text">Allarme</span>
        </div>

        <!-- Banner Sportello Lavastoviglie Aperto -->
        ${isDishwasher ? `
        <div class="door-open-banner">
          <svg style="width:18px;height:18px;fill:currentColor" viewBox="0 0 24 24"><path d="M19 19V5c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v14H3v2h18v-2h-2zm-4-6h-2v-2h2v2z"/></svg>
          <span>Sportello lavastoviglie aperto</span>
        </div>
        ` : ''}

        <!-- Contenitore Grafico e Display -->
        <div class="appliance-container">
          <div class="appliance-visual">
            ${isDishwasher ? `
              <!-- Vasca Lavastoviglie Animata -->
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
                  <div class="dw-heating-element"></div>
                </div>
              </div>
            ` : `
              <!-- Oblò e Cestello Lavasciuga / Lavatrice Animato -->
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
                  <div class="steam-plume"></div>
                  <div class="heat-glow"></div>
                </div>
                <div class="door-lock-led" title="Oblò"></div>
              </div>
            `}
          </div>

          <!-- Display Digitale -->
          <div class="digital-panel">
            <div class="timer-row">
              <span class="digital-timer">00:00</span>
              <span class="timer-label">Tempo Res.</span>
            </div>
            <div class="current-program-name">Seleziona programma</div>
            <div class="current-phase-name"></div>
            <div class="cycle-live-description">In attesa di avvio</div>
          </div>
        </div>

        <!-- Parametri Rapidi Washer -->
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
        <!-- Avvisi Sale e Brillantante Lavastoviglie -->
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

        <!-- Controlli Interattivi -->
        <div class="controls-section">
          <!-- Tendina Programmi -->
          <div class="dropdown-container">
            <label class="dropdown-label">Programma Selezionato</label>
            <select class="program-dropdown">
              <option value="">Caricamento programmi...</option>
            </select>
          </div>

          <!-- Chip Opzioni Rapide -->
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

          <!-- Pulsantiera di Comando -->
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
            <button class="btn-action btn-buzzer" title="Emetti Bip Segnale Acustico">
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

// Editor Visivo Lovelace Card
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

// Registrazione Custom Elements
if (!customElements.get('candy-card')) {
  customElements.define('candy-card', CandyCard);
}
if (!customElements.get('candy-card-editor')) {
  customElements.define('candy-card-editor', CandyCardEditor);
}

// Registrazione nel selettore schede di Home Assistant
window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === 'candy-card')) {
  window.customCards.push({
    type: 'candy-card',
    name: 'Candy Simply-Fi Card',
    description: 'Scheda grafica con simulatore fisico animato allineato a ciascun programma e dispositivo Candy.',
    preview: true,
    documentationURL: 'https://github.com/benedettosiddi/candysimply'
  });
}

console.info('%c CANDY-SIMPLYFI-CARD %c v1.2.3 Allineamento Programmi Vapore & Countdown DelVal ', 'background: #0088cc; color: #fff; font-weight: bold; border-radius: 3px 0 0 3px;', 'background: #263238; color: #00d2ff; font-weight: bold; border-radius: 0 3px 3px 0;');
