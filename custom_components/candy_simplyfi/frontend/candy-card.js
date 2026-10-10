/**
 * Candy Simply-Fi Custom Lovelace Card
 * Card interattiva fotorealistica con animazioni fisiche e grafiche di alta precisione
 * allineate specificamente a ciascun programma, fase di ciclo e tipo di elettrodomestico Candy/Hoover.
 * 
 * CARATTERISTICHE DINAMICHE "A REGOLA D'ARTE":
 * - LAVASTOVIGLIE (Candy Brava / Simply-Fi):
 *   • Vasca Inox Fotorealistica con Cestello Superiore e Cestello Inferiore dettagliati:
 *     - Cestello superiore: Calici di cristallo semitrasparenti con riflessi, tazze rovesciate, ciotole, ruote laterali su guide.
 *     - Cestello inferiore: Piatti piani e fondi alloggiati nelle rastrelliere, cestello posate forato con forchette, cucchiai e coltelli, pentola inox rovesciata.
 *   • Mulinelli a Doppio Braccio Aerodinamico:
 *     - Mulinello superiore e mulinello inferiore controrotanti o sincronizzati con ugelli e getti di pressione dinamici.
 *   • Resistenza Termica Calrod Inferiore:
 *     - Circuito tubolare a pavimento che diventa incandescente (rosso/arancio con bagliore pulsante) durante l'asciugatura.
 *   • Getti e Dinamiche Idrauliche Differenziate per Programma:
 *     - Prelavaggio / Ammollo a freddo (P12): Cascata d'acqua azzurra fresca (#00e5ff), rotazione morbida senza riscaldamento.
 *     - Intensivo 75°C (P2): Rotazione ultra-rapida contrapposta (0.65s), getti incrociati ad alta pressione, vapore caldo.
 *     - Delicati & Cristalli 45°C (P6): Rotazione lenta (2.5s), micro-nebulizzazione soffice per calici e porcellane.
 *     - Rapido Zoom (P4/P5): Getti a frequenza pulsante energica con rotazione accelerata (0.85s).
 *     - Eco 45°C (P1/P8): Irrorazione a cortina bilanciata ad alta efficienza idrica con sfumatura smeraldo/ciano.
 *     - Asciugatura / Extra Dry: Mulinelli fermi in parcheggio, resistenza incandescente e colonne di vapore caldo di condensazione.
 *     - Fine Ciclo (Finished): Luce di cortesia accesa e stelle scintillanti (twinkle sparkles) che brillano su calici e piatti puliti!
 *   • Candy Brava Add-Dish:
 *     - Spia LED e badge interattivo "+🍽️ ADD DISH" pulsante sulla maniglia e banner informativo quando è consentito aggiungere stoviglie.
 *   • Indicatori Sale Rigenerante e Brillantante con LED di segnalazione allarme.
 * 
 * - LAVASCIUGA / LAVATRICE:
 *   • Oblò 3D Bombato con ghiera in titanio spazzolato, guarnizione in gomma e lente convessa antiriflesso.
 *   • Cestello Inox con forature radiali realistiche e 3 pale trascinatrici (lifters) a 120°.
 *   • Bucato Dinamico Multi-Capo (t-shirt gialla, camicia denim blu, telo corallo, capo bianco):
 *     - Lavaggio/Rapido/Eco: Rotazione con caduta per gravità dei panni sollevati dalle pale (tumbling physics).
 *     - Centrifuga (Spin): Forza centrifuga che incolla i capi alle pareti del cestello in rotazione veloce con motion blur e micro-vibrazione oblò.
 *     - Culla (Cradle Lana/Seta): Movimento pendolare sinusoidale dolce con galleggiamento morbido.
 *     - Asciugatura: Rotazione alternata antipiega con irraggiamento termico a infrarossi dal fondo e vapore.
 *     - Vapore (Steam Refresh): Cestello che ruota dolcemente avvolto da pennacchi di vapore bianco-azzurro.
 *   • MPS - Candy Spray Tech Nozzle a ore 12: Getto a pioggia a cono direttamente sui panni durante lavaggio e risciacquo.
 *   • Onde d'acqua multilivello con creste dinamiche, strato di schiuma e micro-bolle.
 *   • Spia LED Blocco Oblò (verde sbloccato, rosso rubino bloccato).
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
    let defaultType = config.device_type;
    if (!defaultType) {
      const hint = `${config.name || ''} ${config.entity_prefix || ''} ${config.entity || ''}`.toLowerCase();
      if (hint.includes('lavastoviglie') || hint.includes('dishwasher') || hint.includes('_dw') || hint.includes('statodwash')) {
        defaultType = 'dishwasher';
      } else {
        defaultType = 'washer_dryer';
      }
    }
    this._config = {
      name: config.name || (defaultType === 'dishwasher' ? 'Candy Lavastoviglie' : 'Candy Simply-Fi'),
      device_type: defaultType,
      entity_prefix: config.entity_prefix || '',
      ...config
    };
    this._render();
  }

  _isDishwasher() {
    if (this._config.device_type === 'dishwasher') return true;
    if (this._config.device_type === 'washer') return false;
    const hint = `${this._config.name || ''} ${this._config.entity_prefix || ''} ${this._config.entity || ''}`.toLowerCase();
    if (hint.includes('lavastoviglie') || hint.includes('dishwasher') || hint.includes('_dw') || hint.includes('statodwash')) {
      return true;
    }
    if (this._hass && this._hass.states && this._config.entity_prefix) {
      const p = this._config.entity_prefix.toLowerCase();
      for (const k of Object.keys(this._hass.states)) {
        if (k.toLowerCase().includes(p) && (k.toLowerCase().includes('statodwash') || k.toLowerCase().includes('lavastoviglie') || k.toLowerCase().includes('mancanza_sale'))) {
          return true;
        }
      }
    }
    return false;
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
    const isDishwasher = this._isDishwasher();

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
    const isDishwasher = this._isDishwasher();

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
      addDish: isDishwasher ? this._findEntity(['aggiunta_stoviglie', 'add_dish'], 'binary_sensor') : null,
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

    const isFinished = statusVal.includes('terminato') || statusVal === '7' || statusVal === '5';
    const isPaused = isDishwasher
      ? (statusVal.includes('pausa') || (entities.running?.state?.attributes?.is_paused === true))
      : (statusVal.includes('pausa') || statusVal === '3');

    const isRunning = isDishwasher
      ? (!isFinished && (
          entities.running?.state?.state === 'on' ||
          (statusVal.includes('funzione') && !statusVal.includes('standby') && !statusVal.includes('attesa')) ||
          statusVal.includes('lavaggio') || statusVal === '3' || statusVal === '4'
        ))
      : (!isFinished && (
          entities.running?.state?.state === 'on' ||
          statusVal.includes('funzione') || statusVal === '2' ||
          (phaseVal && !phaseVal.includes('non avviato') && !phaseVal.includes('terminato') && phaseVal !== '0' && phaseVal !== '6')
        ));

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
          description = 'Ciclo di lavaggio terminato: stoviglie pulite e igienizzate';
        } else if (isPaused) {
          dwMode = 'paused';
          description = 'Ciclo in pausa';
        }
      } else {
        // Determinazione modalità attiva in base al programma impostato
        if (phaseVal.includes('asciugatura') || statusVal.includes('asciugatura') || statusVal === '4') {
          dwMode = 'dw-drying';
          description = 'Fase asciugatura termica: resistenza incandescente e condensazione naturale';
        } else if (progVal.includes('prelavaggio') || progVal.includes('ammollo') || progVal.includes('p12')) {
          dwMode = 'dw-prewash';
          description = 'Ammollo a freddo con irrorazione continua e cascata dolce';
        } else if (progVal.includes('intensiv') || progVal.includes('igiene') || progVal.includes('75') || progVal.includes('p2')) {
          dwMode = 'dw-intensive';
          description = 'Lavaggio intensivo 75°C: getti incrociati ad alta pressione e disinfezione termica';
        } else if (progVal.includes('delicat') || progVal.includes('cristall') || progVal.includes('vetro') || progVal.includes('p6') || progVal.includes('p5')) {
          dwMode = 'dw-delicate';
          description = 'Lavaggio delicato calici: nebulizzazione soffice 45°C per cristalli e porcellane';
        } else if (progVal.includes('rapid') || progVal.includes('zoom') || progVal.includes('24') || progVal.includes('29') || progVal.includes('p4')) {
          dwMode = 'dw-rapid';
          description = 'Ciclo Rapido Zoom: lavaggio accelerato pulsante ad alta efficienza';
        } else if (progVal.includes('eco') || progVal.includes('p1') || progVal.includes('p8')) {
          dwMode = 'dw-eco';
          description = 'Ciclo Eco 45°C ad alta efficienza idrica ed energetica';
        } else {
          dwMode = 'dw-normal';
          description = 'Lavaggio normale con doppi mulinelli rotanti a getto diffuso';
        }

        if (entities.addDish?.state?.state === 'on') {
          description += ' • Add-Dish attivo: sportello apribile per aggiungere stoviglie';
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
        isAddDishAllowed: entities.addDish?.state?.state === 'on',
        missSalt: entities.missSalt?.state?.state === 'on',
        missRinse: entities.missRinse?.state?.state === 'on',
      };
    }

    // PROFILO LAVASCIUGA / LAVATRICE
    let washerMode = 'standby';
    let description = 'Elettrodomestico pronto';
    let spinDuration = '3.2s';
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
        description = 'Ciclo terminato: bucato pronto e sportello sbloccato';
      } else if (isPaused) {
        washerMode = 'paused';
        description = 'Ciclo in pausa';
      }
    } else {
      // 1. Asciugatura
      if (isDryingActive || progVal.includes('asciugatura')) {
        washerMode = 'drying';
        spinDuration = '5.5s';
        waterLevel = 0;
        heatGlow = true;
        hasSteam = true;
        description = 'Asciugatura attiva con rotazione antipiega e riscaldamento termico';
      }
      // 2. Vapore / Steam Refresh
      else if (isSteamActive || progVal.includes('vapore') || progVal.includes('steam')) {
        washerMode = 'steam';
        spinDuration = '4.5s';
        waterLevel = 0;
        hasSteam = true;
        heatGlow = true;
        description = 'Trattamento a vapore igienizzante e distensione fibre';
      }
      // 3. Centrifuga o Scarico
      else if (phaseVal.includes('centrifuga') || phaseVal.includes('scarico') || phaseVal === '4' || progVal.includes('centrifuga') || progVal.includes('scarico')) {
        if (spinVal > 0) {
          washerMode = 'spin';
          if (spinVal >= 1400) spinDuration = '0.22s';
          else if (spinVal >= 1200) spinDuration = '0.28s';
          else if (spinVal >= 1000) spinDuration = '0.36s';
          else if (spinVal >= 800) spinDuration = '0.48s';
          else if (spinVal >= 400) spinDuration = '0.75s';
          else spinDuration = '1.2s';
          waterLevel = 5;
          hasBubbles = false;
          description = `Centrifuga rapida attiva a ${spinVal} RPM con estrazione centrifuga`;
        } else {
          washerMode = 'wash';
          spinDuration = '4.5s';
          waterLevel = 0;
          hasBubbles = false;
          description = 'Scarico rapido dell\'acqua dal cestello';
        }
      }
      // 4. Risciacquo
      else if (phaseVal.includes('risciacquo') || phaseVal === '3' || progVal.includes('risciacquo')) {
        washerMode = 'rinse';
        spinDuration = '3.0s';
        waterLevel = 60;
        hasBubbles = false;
        description = 'Fase risciacquo con getto Spray-Tech a doccia e alto livello d\'acqua limpida';
      }
      // 5. Lana, Seta e Delicati (Movimento Culla)
      else if (progVal.includes('lana') || progVal.includes('seta') || progVal.includes('delicat') || progVal.includes('piumoni')) {
        washerMode = 'cradle';
        spinDuration = '5.0s';
        waterLevel = 35;
        hasBubbles = true;
        description = 'Movimento culla oscillante per massima protezione delle fibre di lana e seta';
      }
      // 6. Programmi Rapidi
      else if (progVal.includes('rapid') || progVal.includes('zoom') || progVal.includes('59') || progVal.includes('14') || progVal.includes('30')) {
        washerMode = 'rapid';
        spinDuration = '2.2s';
        waterLevel = 45;
        hasBubbles = true;
        description = 'Lavaggio Rapido dinamico con rotazione energica e getti attivi';
      }
      // 7. Prelavaggio
      else if (phaseVal.includes('prelavaggio') || phaseVal === '1') {
        washerMode = 'prewash';
        spinDuration = '3.8s';
        waterLevel = 30;
        hasBubbles = true;
        description = 'Prelavaggio macchie con immersione graduale';
      }
      // 8. Lavaggio Standard
      else {
        washerMode = 'wash';
        spinDuration = '3.2s';
        waterLevel = 42;
        hasBubbles = true;
        if (tempVal >= 60) hasSteam = true;
        description = `Lavaggio in corso a ${tempVal}°C con getti doccia Spray-Tech`;
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
    const isDishwasher = this._isDishwasher();
    const entities = this._getEntitiesMap();

    const statusVal = entities.status?.state?.state || 'Standby';
    const programVal = entities.program?.state?.state || 'Nessun programma';
    const timeVal = entities.remainingTime?.state?.state || '00:00';
    const phaseVal = entities.phase?.state?.state || '';
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
      if (profile.isFinished) visualRoot.classList.add('is-finished');

      if (!isDishwasher) {
        // Parametri washer
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

        const portholeEl = visualRoot.querySelector('.washer-porthole');
        if (portholeEl) {
          portholeEl.classList.toggle('porthole-spin-vibrate', profile.mode === 'spin' && profile.isRunning);
        }

        const sprayStream = visualRoot.querySelector('.spray-tech-stream');
        if (sprayStream) {
          sprayStream.style.opacity = (profile.isRunning && (profile.mode === 'rinse' || profile.mode === 'wash')) ? '0.85' : '0';
        }

        const doorLockLed = visualRoot.querySelector('.door-lock-led');
        if (doorLockLed) {
          doorLockLed.classList.toggle('locked', profile.isDoorLocked);
          doorLockLed.title = profile.isDoorLocked ? 'Oblò bloccato per sicurezza' : 'Oblò sbloccato';
        }
      } else {
        // Parametri lavastoviglie
        visualRoot.classList.toggle('door-open', profile.isDoorOpen);
        visualRoot.classList.toggle('half-load', profile.isHalfLoad);

        const addDishBadge = visualRoot.querySelector('.dw-add-dish-badge');
        if (addDishBadge) {
          addDishBadge.classList.toggle('active', profile.isAddDishAllowed);
        }

        const statusLed = visualRoot.querySelector('.dw-status-led');
        if (statusLed) {
          statusLed.classList.toggle('active', profile.isRunning);
        }

        const addDishBanner = this.shadowRoot.querySelector('.add-dish-banner');
        if (addDishBanner) {
          addDishBanner.style.display = (profile.isAddDishAllowed && profile.isRunning) ? 'flex' : 'none';
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

    // 8. Gestione Contestuale Dinamica Pulsanti Toolbar (Avvia, Pausa, Stop)
    const btnStart = this.shadowRoot.querySelector('.btn-start');
    const btnPause = this.shadowRoot.querySelector('.btn-pause');
    const btnStop = this.shadowRoot.querySelector('.btn-stop');

    if (btnStart && btnPause && btnStop) {
      if (profile.isRunning && !profile.isPaused) {
        btnStart.classList.add('disabled');
        btnStart.disabled = true;
        const startLbl = btnStart.querySelector('.btn-start-label');
        if (startLbl) startLbl.textContent = 'In corso';

        btnPause.classList.remove('disabled');
        btnPause.disabled = false;
        const pauseLbl = btnPause.querySelector('.btn-pause-label');
        if (pauseLbl) pauseLbl.textContent = 'Pausa';

        btnStop.classList.remove('disabled');
        btnStop.disabled = false;
      } else if (profile.isPaused) {
        btnStart.classList.remove('disabled');
        btnStart.disabled = false;
        const startLbl = btnStart.querySelector('.btn-start-label');
        if (startLbl) startLbl.textContent = 'Riprendi';

        btnPause.classList.add('disabled');
        btnPause.disabled = true;

        btnStop.classList.remove('disabled');
        btnStop.disabled = false;
      } else {
        btnStart.classList.remove('disabled');
        btnStart.disabled = false;
        const startLbl = btnStart.querySelector('.btn-start-label');
        if (startLbl) startLbl.textContent = 'Avvia';

        btnPause.classList.add('disabled');
        btnPause.disabled = true;

        btnStop.classList.add('disabled');
        btnStop.disabled = true;
      }
    }
  }

  _render() {
    const isDishwasher = this._isDishwasher();

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

        .add-dish-banner {
          display: none;
          background: linear-gradient(90deg, rgba(0, 210, 255, 0.2), rgba(0, 150, 200, 0.1));
          border-left: 4px solid #00d2ff;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 12px;
          align-items: center;
          gap: 8px;
          color: #e0f7fa;
          font-size: 12px;
          animation: pulse-adddish-banner 2s infinite alternate;
        }

        @keyframes pulse-adddish-banner {
          0% { border-left-color: #00d2ff; }
          100% { border-left-color: #64ffda; }
        }

        /* Visual Box Appliance */
        .appliance-container {
          display: grid;
          grid-template-columns: 140px minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 16px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 14px;
          min-width: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        @media (max-width: 440px) {
          .appliance-container {
            grid-template-columns: 1fr;
            justify-items: center;
            text-align: center;
            gap: 12px;
          }
          .timer-row {
            justify-content: center;
          }
        }

        /* Visual Graphic Container */
        .appliance-visual {
          position: relative;
          width: 140px;
          height: 144px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ====================================================================
           LAVASCIUGA: 3D PORTHOLE, CESTELLO E BUCATO DINAMICO
           ==================================================================== */
        .washer-porthole {
          position: relative;
          width: 138px;
          height: 138px;
          border-radius: 50%;
          background: linear-gradient(145deg, #3d4a5d 0%, #1a222c 100%);
          box-shadow: inset 0 3px 8px rgba(255, 255, 255, 0.28),
                      inset 0 -3px 8px rgba(0, 0, 0, 0.8),
                      0 10px 28px rgba(0, 0, 0, 0.65);
          border: 5px solid #232b38;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: transform 0.1s ease;
        }

        .porthole-spin-vibrate {
          animation: spin-vibrate 0.07s infinite alternate ease-in-out;
        }

        @keyframes spin-vibrate {
          0% { transform: translate(-0.8px, -0.6px) rotate(-0.3deg); }
          100% { transform: translate(0.8px, 0.6px) rotate(0.3deg); }
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

        .washer-svg-drum {
          width: 100%;
          height: 100%;
          display: block;
        }

        .drum-rotating-assembly {
          transform-origin: 57px 57px;
          will-change: transform;
        }

        .laundry-clothes-group {
          transform-origin: 57px 57px;
          transition: filter 0.3s ease, transform 0.4s ease;
        }

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

        .wave-crest-1 {
          position: absolute;
          top: -4px;
          left: -50%;
          width: 200%;
          height: 8px;
          background: radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.4) 0%, transparent 70%);
          animation: wave-slosh 2s ease-in-out infinite alternate;
        }

        @keyframes wave-slosh {
          0% { transform: translateX(0); }
          100% { transform: translateX(25px); }
        }

        .foam-blanket {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 10px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%);
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
          opacity: 0.65;
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
          left: 15%;
          right: 15%;
          height: 65px;
          background: radial-gradient(ellipse at 50% 80%, rgba(255, 255, 255, 0.45) 0%, rgba(0, 210, 255, 0.25) 40%, transparent 80%);
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
          background: radial-gradient(circle, rgba(255, 87, 34, 0.5) 15%, rgba(255, 152, 0, 0.22) 60%, transparent 80%);
          opacity: 0;
          transition: opacity 0.8s ease;
          pointer-events: none;
        }

        /* Lente convessa antiriflesso 3D */
        .glass-reflection-lens {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          pointer-events: none;
          background: radial-gradient(ellipse at 30% 25%, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 35%, transparent 60%);
          box-shadow: inset 0 0 14px rgba(255, 255, 255, 0.12);
        }

        /* MPS - Spray Tech Nozzle a ore 12 */
        .spray-tech-nozzle {
          position: absolute;
          top: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 4px;
          background: linear-gradient(180deg, #cfd8dc, #78909c);
          border-radius: 0 0 4px 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .spray-tech-stream {
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        @keyframes spray-shower-burst {
          0% { opacity: 0.4; }
          100% { opacity: 0.95; }
        }

        /* Spia LED Blocco Oblò */
        .door-lock-led {
          position: absolute;
          right: 5px;
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

        /* ANIMAZIONI DI ROTAZIONE E FISICA BUCATO */
        .appliance-visual.is-running .drum-rotating-assembly {
          animation: spin-smooth var(--spin-time, 3.2s) linear infinite;
        }
        .appliance-visual.is-running .water-wave {
          animation: slosh-normal 2.2s ease-in-out infinite alternate;
        }

        /* Tumbling bucato con gravità */
        @keyframes tumble-clothes {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(3px, -8px) rotate(15deg); }
          50% { transform: translate(6px, -14px) rotate(35deg); }
          55% { transform: translate(2px, 2px) rotate(45deg); }
          75% { transform: translate(-4px, 4px) rotate(10deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }

        .appliance-visual.is-running:not(.mode-spin):not(.mode-cradle):not(.mode-drying) .laundry-clothes-group {
          animation: tumble-clothes var(--spin-time, 3.2s) ease-in-out infinite;
        }

        /* 1. Lavaggio Normale / Risciacquo / Eco / Sintetici */
        .mode-wash.is-running .drum-rotating-assembly,
        .mode-rinse.is-running .drum-rotating-assembly,
        .mode-prewash.is-running .drum-rotating-assembly {
          animation: spin-smooth var(--spin-time, 3.0s) linear infinite;
        }
        .mode-wash.is-running .spray-tech-stream,
        .mode-rinse.is-running .spray-tech-stream {
          animation: spray-shower-burst 0.6s infinite alternate;
        }

        /* 2. Programmi Rapidi (14', 30', 44', 59') */
        .mode-rapid.is-running .drum-rotating-assembly {
          animation: spin-smooth var(--spin-time, 2.2s) linear infinite;
        }
        .mode-rapid.is-running .water-wave {
          animation: slosh-vigorous 1.4s ease-in-out infinite alternate;
        }

        /* 3. Lana & Delicati: Movimento CULLA (Cradle Rocking) */
        .mode-cradle.is-running .drum-rotating-assembly {
          animation: cradle-rocking 5s ease-in-out infinite;
        }
        .mode-cradle.is-running .water-wave {
          animation: slosh-gentle 5s ease-in-out infinite;
        }
        .mode-cradle.is-running .laundry-clothes-group {
          animation: cradle-clothes 5s ease-in-out infinite;
        }

        /* 4. Centrifuga ad Alta Velocità (Spin) */
        .mode-spin.is-running .drum-rotating-assembly {
          animation: spin-smooth var(--spin-time, 0.28s) linear infinite;
        }
        .mode-spin.is-running .laundry-clothes-group {
          transform: scale(1.12);
          filter: blur(0.75px);
        }

        /* 5. Asciugatura (Drying) */
        .mode-drying.is-running .drum-rotating-assembly {
          animation: tumble-drying 6s ease-in-out infinite;
        }
        .mode-drying.is-running .heat-glow {
          opacity: 1;
          animation: pulse-heat 2s ease-in-out infinite alternate;
        }

        /* 6. Vapore */
        .mode-steam.is-running .drum-rotating-assembly {
          animation: tumble-drying 5s ease-in-out infinite;
        }

        .is-paused .drum-rotating-assembly,
        .is-paused .water-wave,
        .is-paused .laundry-clothes-group {
          animation-play-state: paused !important;
        }

        @keyframes spin-smooth {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes cradle-rocking {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(40deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-40deg); }
          100% { transform: rotate(0deg); }
        }

        @keyframes cradle-clothes {
          0% { transform: rotate(0deg) translate(0, 0); }
          25% { transform: rotate(-30deg) translate(-3px, 2px); }
          50% { transform: rotate(0deg) translate(0, 0); }
          75% { transform: rotate(30deg) translate(3px, 2px); }
          100% { transform: rotate(0deg) translate(0, 0); }
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
           LAVASTOVIGLIE: VASCA INOX FOTOREALISTICA, MULINELLI E STOVIGLIE
           ==================================================================== */
        .dishwasher-cabinet {
          position: relative;
          width: 138px;
          height: 144px;
          background: var(--candy-metallic);
          border-radius: 12px;
          border: 2px solid #37474f;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.15);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.4s ease, box-shadow 0.4s ease;
        }

        .door-open .dishwasher-cabinet {
          transform: perspective(500px) rotateX(-14deg);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
        }

        .dishwasher-door-handle {
          height: 24px;
          background: linear-gradient(180deg, #263238 0%, #1c242b 100%);
          border-bottom: 2px solid #37474f;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          font-size: 10px;
          font-weight: 700;
        }

        .dw-handle-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dw-brand-text {
          font-size: 9px;
          letter-spacing: 1.2px;
          color: #78909c;
          font-weight: 800;
        }

        .dw-status-led {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #455a64;
          transition: all 0.3s ease;
        }
        .dw-status-led.active {
          background: #00d2ff;
          box-shadow: 0 0 6px #00d2ff;
        }

        .dw-handle-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Candy Brava Add-Dish Badge sulla maniglia */
        .dw-add-dish-badge {
          display: none;
          align-items: center;
          gap: 3px;
          background: rgba(0, 229, 255, 0.15);
          border: 1px solid rgba(0, 229, 255, 0.45);
          border-radius: 10px;
          padding: 1px 6px;
          font-size: 8.5px;
          color: #00e5ff;
          font-weight: 700;
          letter-spacing: 0.5px;
          user-select: none;
        }
        .dw-add-dish-badge.active {
          display: flex;
          animation: add-dish-pulse 1.4s infinite alternate;
        }

        @keyframes add-dish-pulse {
          0% { box-shadow: 0 0 3px rgba(0, 229, 255, 0.3); transform: scale(0.96); }
          100% { box-shadow: 0 0 10px rgba(0, 229, 255, 0.7); transform: scale(1.04); }
        }

        .dw-handle-latch {
          width: 14px;
          height: 3px;
          background: #546e7a;
          border-radius: 1px;
        }

        .dishwasher-interior {
          position: relative;
          flex: 1;
          margin: 3px;
          border-radius: 6px;
          overflow: hidden;
          background: radial-gradient(circle at 50% 30%, #1c2530 0%, #0d1218 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dw-svg-chamber {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Centro di rotazione mulinelli SVG */
        .dw-spray-arm-top-group {
          transform-origin: 70px 56px;
          will-change: transform;
        }
        .dw-spray-arm-bottom-group {
          transform-origin: 70px 104px;
          will-change: transform;
        }

        @keyframes spin-arm-cw {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-arm-ccw {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }

        /* Getti d'Acqua SVG */
        .dw-lower-jets,
        .dw-upper-jets {
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .is-running:not(.mode-dw-drying):not(.mode-finished) .dw-lower-jets,
        .is-running:not(.mode-dw-drying):not(.mode-finished) .dw-upper-jets {
          opacity: 0.85;
        }

        @keyframes jet-stream-high {
          0% { opacity: 0.4; transform: scaleY(0.92); }
          100% { opacity: 1; transform: scaleY(1.08); }
        }
        @keyframes jet-stream-burst {
          0% { opacity: 0.3; }
          50% { opacity: 0.95; }
          100% { opacity: 0.3; }
        }
        @keyframes jet-stream-soft {
          0% { opacity: 0.3; }
          100% { opacity: 0.6; }
        }
        @keyframes jet-stream-normal {
          0% { opacity: 0.5; }
          100% { opacity: 0.9; }
        }

        /* 1. Modalità Intensivo 75°C */
        .mode-dw-intensive.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 0.65s linear infinite;
        }
        .mode-dw-intensive.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 0.65s linear infinite;
        }
        .mode-dw-intensive.is-running .dw-jet-stream {
          animation: jet-stream-high 0.32s infinite alternate;
        }

        /* 2. Modalità Rapido Zoom */
        .mode-dw-rapid.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 0.85s linear infinite;
        }
        .mode-dw-rapid.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 0.85s linear infinite;
        }
        .mode-dw-rapid.is-running .dw-jet-stream {
          animation: jet-stream-burst 0.45s infinite alternate;
        }

        /* 3. Modalità Normale / Quotidiano */
        .mode-dw-normal.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 1.2s linear infinite;
        }
        .mode-dw-normal.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 1.2s linear infinite;
        }
        .mode-dw-normal.is-running .dw-jet-stream {
          animation: jet-stream-normal 0.6s infinite alternate;
        }

        /* 4. Modalità Eco 45°C */
        .mode-dw-eco.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 1.4s linear infinite;
        }
        .mode-dw-eco.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 1.4s linear infinite;
        }
        .mode-dw-eco.is-running .dw-jet-stream {
          animation: jet-stream-normal 0.8s infinite alternate;
        }

        /* 5. Modalità Prelavaggio / Ammollo a Freddo (P12) */
        .mode-dw-prewash.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 1.8s linear infinite;
        }
        .mode-dw-prewash.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 1.8s linear infinite;
        }
        .mode-dw-prewash.is-running .dw-jet-stream {
          animation: jet-stream-normal 0.9s infinite alternate;
        }

        /* 6. Modalità Delicati & Cristalli 45°C */
        .mode-dw-delicate.is-running .dw-spray-arm-top-group {
          animation: spin-arm-cw 2.5s linear infinite;
        }
        .mode-dw-delicate.is-running .dw-spray-arm-bottom-group {
          animation: spin-arm-ccw 2.5s linear infinite;
        }
        .mode-dw-delicate.is-running .dw-jet-stream {
          opacity: 0.45;
          animation: jet-stream-soft 1.2s infinite alternate;
        }

        /* 7. Modalità Asciugatura: Mulinelli fermi, resistenza incandescente e vapore */
        .dw-svg-heating-element {
          transition: all 0.5s ease;
        }
        .mode-dw-drying.is-running .dw-svg-heating-element {
          stroke: url(#dw-heat-grad) !important;
          stroke-width: 3.2px !important;
          filter: drop-shadow(0 0 6px #ff3d00) drop-shadow(0 0 12px #ff9100);
          animation: pulse-heat-element 1.6s ease-in-out infinite alternate;
        }

        @keyframes pulse-heat-element {
          0% { opacity: 0.65; filter: drop-shadow(0 0 4px #ff3d00); }
          100% { opacity: 1; filter: drop-shadow(0 0 10px #ff3d00) drop-shadow(0 0 16px #ff9100); }
        }

        .dw-drying-steam-group {
          opacity: 0;
          transition: opacity 0.6s ease;
          pointer-events: none;
        }
        .mode-dw-drying.is-running .dw-drying-steam-group {
          opacity: 0.85;
        }

        @keyframes rise-steam {
          0% { transform: translateY(15px); opacity: 0; }
          50% { opacity: 0.7; }
          100% { transform: translateY(-10px); opacity: 0; }
        }

        .mode-dw-drying.is-running .dw-steam-wave {
          animation: rise-steam 2.2s ease-in-out infinite;
        }
        .mode-dw-drying.is-running .dw-steam-2 { animation-delay: 0.7s; }
        .mode-dw-drying.is-running .dw-steam-3 { animation-delay: 1.4s; }

        /* 8. Fine Ciclo: Scintille su stoviglie pulite (Sparkles) */
        .dw-sparkles-group {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.5s ease;
        }
        .mode-finished .dw-sparkles-group {
          opacity: 1;
        }

        @keyframes sparkle-glint {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(90deg); opacity: 1; filter: drop-shadow(0 0 5px #ffffff); }
          100% { transform: scale(0) rotate(180deg); opacity: 0; }
        }

        .dw-sparkle {
          animation: sparkle-glint 1.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .sp-1 { animation-delay: 0s; }
        .sp-2 { animation-delay: 0.5s; }
        .sp-3 { animation-delay: 1s; }
        .sp-4 { animation-delay: 1.4s; }

        .is-paused .dw-spray-arm-top-group,
        .is-paused .dw-spray-arm-bottom-group,
        .is-paused .dw-jet-stream {
          animation-play-state: paused !important;
        }

        /* Display Digitale */
        .digital-panel {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          overflow: hidden;
          width: 100%;
        }

        .timer-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          min-width: 0;
        }

        .digital-timer {
          font-family: "Courier New", Courier, monospace;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 1px;
          color: #ffffff;
          text-shadow: 0 0 14px var(--candy-blue-glow);
          line-height: 1;
          white-space: nowrap;
        }

        .timer-label {
          font-size: 10px;
          color: #90a4ae;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          white-space: nowrap;
        }

        .current-program-name {
          font-size: 13.5px;
          font-weight: 600;
          color: #e0e0e0;
          line-height: 1.3;
          word-break: break-word;
          overflow-wrap: break-word;
          margin-top: 2px;
        }

        .current-phase-name {
          font-size: 12px;
          color: #00d2ff;
          font-weight: 500;
          line-height: 1.25;
          word-break: break-word;
        }

        .cycle-live-description {
          font-size: 11px;
          color: #b0bec5;
          font-style: italic;
          line-height: 1.3;
          margin-top: 2px;
          word-break: break-word;
          overflow-wrap: break-word;
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
        .btn-action.disabled,
        .btn-action[disabled] {
          opacity: 0.28 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          box-shadow: none !important;
          transform: none !important;
          filter: grayscale(0.85);
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
        <div class="add-dish-banner">
          <span style="font-size:16px;">🍽️</span>
          <span><strong>Add-Dish Attivo:</strong> sportello apribile in sicurezza per aggiungere stoviglie dimenticate</span>
        </div>
        ` : ''}

        <!-- Contenitore Grafico e Display -->
        <div class="appliance-container">
          <div class="appliance-visual">
            ${isDishwasher ? `
              <!-- Vasca Lavastoviglie Fotorealistica Animata -->
              <div class="dishwasher-cabinet">
                <!-- Maniglia e Cruscotto Candy Brava -->
                <div class="dishwasher-door-handle">
                  <div class="dw-handle-left">
                    <span class="dw-brand-text">BRAVA</span>
                    <div class="dw-status-led"></div>
                  </div>
                  <div class="dw-handle-right">
                    <div class="dw-add-dish-badge" title="Add-Dish: sportello apribile per inserire stoviglie">
                      <span>+🍽️</span>
                      <span>ADD DISH</span>
                    </div>
                    <div class="dw-handle-latch"></div>
                  </div>
                </div>

                <!-- Vasca Inox e Componenti Interni SVG -->
                <div class="dishwasher-interior">
                  <svg class="dw-svg-chamber" viewBox="0 0 140 120" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="dw-steel-wall" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#24303c"/>
                        <stop offset="50%" stop-color="#18222b"/>
                        <stop offset="100%" stop-color="#0f151c"/>
                      </linearGradient>
                      <linearGradient id="dw-glass-grad" x1="0" y1="0" x2="0.8" y2="1">
                        <stop offset="0%" stop-color="rgba(200, 240, 255, 0.75)"/>
                        <stop offset="40%" stop-color="rgba(100, 200, 255, 0.3)"/>
                        <stop offset="100%" stop-color="rgba(255, 255, 255, 0.5)"/>
                      </linearGradient>
                      <linearGradient id="dw-plate-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#ffffff"/>
                        <stop offset="50%" stop-color="#cfd8dc"/>
                        <stop offset="100%" stop-color="#90a4ae"/>
                      </linearGradient>
                      <linearGradient id="dw-pot-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#78909c"/>
                        <stop offset="35%" stop-color="#eceff1"/>
                        <stop offset="70%" stop-color="#90a4ae"/>
                        <stop offset="100%" stop-color="#546e7a"/>
                      </linearGradient>
                      <linearGradient id="dw-arm-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#b0bec5"/>
                        <stop offset="50%" stop-color="#ffffff"/>
                        <stop offset="100%" stop-color="#78909c"/>
                      </linearGradient>
                      <linearGradient id="dw-heat-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#ff3d00"/>
                        <stop offset="50%" stop-color="#ff9100"/>
                        <stop offset="100%" stop-color="#ff3d00"/>
                      </linearGradient>
                      <radialGradient id="dw-water-fan" cx="50%" cy="100%" r="90%">
                        <stop offset="0%" stop-color="rgba(0, 229, 255, 0.8)"/>
                        <stop offset="60%" stop-color="rgba(0, 180, 255, 0.4)"/>
                        <stop offset="100%" stop-color="rgba(0, 140, 255, 0)"/>
                      </radialGradient>
                    </defs>

                    <!-- Parete di Fondo e Guide Rulli Cestelli -->
                    <rect x="0" y="0" width="140" height="120" fill="url(#dw-steel-wall)" rx="4"/>
                    <line x1="2" y1="36" x2="138" y2="36" stroke="#37474f" stroke-width="1.2" stroke-dasharray="2,3"/>
                    <line x1="2" y1="84" x2="138" y2="84" stroke="#37474f" stroke-width="1.2" stroke-dasharray="2,3"/>

                    <!-- Resistenza Termica Calrod Inferiore (Pavimento) -->
                    <path class="dw-svg-heating-element" d="M 18,114 L 38,114 A 5,5 0 0,0 43,109 A 5,5 0 0,0 38,104 L 25,104 A 5,5 0 0,1 20,99 A 5,5 0 0,1 25,94 L 115,94 A 5,5 0 0,1 120,99 A 5,5 0 0,1 115,104 L 102,104 A 5,5 0 0,0 97,109 A 5,5 0 0,0 102,114 L 122,114" fill="none" stroke="#455a64" stroke-width="2.6" stroke-linecap="round"/>

                    <!-- Pozzetto e Filtro Microforato Inox a Pavimento -->
                    <ellipse cx="70" cy="113" rx="14" ry="4" fill="#212933" stroke="#455a64" stroke-width="1"/>
                    <rect x="62" y="107" width="16" height="6" fill="#37474f" rx="1"/>
                    <line x1="65" y1="109" x2="75" y2="109" stroke="#78909c" stroke-width="0.8"/>
                    <line x1="65" y1="111" x2="75" y2="111" stroke="#78909c" stroke-width="0.8"/>

                    <!-- Getti d'Acqua Inferiori -->
                    <g class="dw-lower-jets">
                      <path class="dw-jet-stream jet-b1" d="M 70,103 L 26,74 L 36,74 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-b2" d="M 70,103 L 67,66 L 73,66 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-b3" d="M 70,103 L 104,72 L 114,72 Z" fill="url(#dw-water-fan)"/>
                    </g>

                    <!-- Mulinello Inferiore Rotante -->
                    <g class="dw-spray-arm-bottom-group">
                      <ellipse cx="70" cy="104" rx="4" ry="2.5" fill="#37474f"/>
                      <path d="M 28,103 C 45,101 58,103 70,104 C 82,105 95,107 112,105 C 108,103 82,102 70,104 C 58,106 32,105 28,103 Z" fill="url(#dw-arm-grad)" stroke="#455a64" stroke-width="0.6"/>
                      <circle cx="34" cy="103" r="1.1" fill="#00d2ff"/>
                      <circle cx="106" cy="105" r="1.1" fill="#00d2ff"/>
                    </g>

                    <!-- Cestello Inferiore e Stoviglie (Piatti, Posate, Pentola) -->
                    <g class="dw-rack-lower-group">
                      <rect x="8" y="80" width="124" height="22" fill="none" stroke="#546e7a" stroke-width="1.2" rx="2"/>
                      <line x1="8" y1="91" x2="132" y2="91" stroke="#455a64" stroke-width="0.8"/>
                      <circle cx="15" cy="101" r="3" fill="#37474f" stroke="#78909c" stroke-width="0.8"/>
                      <circle cx="125" cy="101" r="3" fill="#37474f" stroke="#78909c" stroke-width="0.8"/>

                      <!-- Piatti in rastrelliera -->
                      <ellipse class="dw-dish-plate plate-1" cx="26" cy="74" rx="10" ry="14" fill="url(#dw-plate-grad)" stroke="#b0bec5" stroke-width="0.8"/>
                      <ellipse cx="26" cy="74" rx="7.5" ry="11" fill="none" stroke="#cfd8dc" stroke-width="0.6"/>

                      <ellipse class="dw-dish-plate plate-2" cx="39" cy="74" rx="9" ry="14" fill="url(#dw-plate-grad)" stroke="#b0bec5" stroke-width="0.8"/>
                      <ellipse cx="39" cy="74" rx="6.5" ry="11" fill="none" stroke="#cfd8dc" stroke-width="0.6"/>

                      <ellipse class="dw-dish-plate plate-3" cx="51" cy="77" rx="7.5" ry="11" fill="url(#dw-plate-grad)" stroke="#b0bec5" stroke-width="0.8"/>

                      <!-- Cestello Posate con Forchette, Cucchiai e Coltelli -->
                      <g class="dw-cutlery-basket" transform="translate(65, 70)">
                        <rect x="0" y="10" width="22" height="15" fill="#37474f" stroke="#546e7a" stroke-width="0.8" rx="1.5"/>
                        <line x1="5" y1="10" x2="5" y2="25" stroke="#263238" stroke-width="0.8"/>
                        <line x1="11" y1="10" x2="11" y2="25" stroke="#263238" stroke-width="0.8"/>
                        <line x1="17" y1="10" x2="17" y2="25" stroke="#263238" stroke-width="0.8"/>
                        <!-- Forchetta -->
                        <path d="M 4,12 L 4,3 L 2,0 M 4,0 L 4,3 M 6,0 L 4,3" stroke="#b0bec5" stroke-width="0.8" stroke-linecap="round" fill="none"/>
                        <!-- Cucchiaio -->
                        <path d="M 11,12 L 11,4" stroke="#b0bec5" stroke-width="0.8"/>
                        <ellipse cx="11" cy="2" rx="2.2" ry="3" fill="#cfd8dc"/>
                        <!-- Coltello -->
                        <path d="M 17,12 L 17,1 C 18,2 18,5 17,6" stroke="#b0bec5" stroke-width="0.9" fill="#eceff1"/>
                      </g>

                      <!-- Pentola Inox Rovesciata -->
                      <g class="dw-dish-pot" transform="translate(93, 67)">
                        <rect x="0" y="6" width="30" height="18" rx="3" fill="url(#dw-pot-grad)" stroke="#78909c" stroke-width="0.8"/>
                        <rect x="30" y="11" width="6" height="3" rx="1" fill="#37474f"/>
                        <line x1="3" y1="8" x2="27" y2="8" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
                      </g>
                    </g>

                    <!-- Getti d'Acqua Superiori -->
                    <g class="dw-upper-jets">
                      <path class="dw-jet-stream jet-t1" d="M 70,55 L 24,22 L 34,22 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-t2" d="M 70,55 L 67,12 L 73,12 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-t3" d="M 70,55 L 106,20 L 116,20 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-td1" d="M 70,57 L 44,74 L 54,74 Z" fill="url(#dw-water-fan)"/>
                      <path class="dw-jet-stream jet-td2" d="M 70,57 L 86,74 L 96,74 Z" fill="url(#dw-water-fan)"/>
                    </g>

                    <!-- Mulinello Superiore Rotante -->
                    <g class="dw-spray-arm-top-group">
                      <ellipse cx="70" cy="56" rx="3.5" ry="2" fill="#37474f"/>
                      <path d="M 32,55 C 46,53 58,55 70,56 C 82,57 94,59 108,57 C 105,55 82,54 70,56 C 58,58 35,57 32,55 Z" fill="url(#dw-arm-grad)" stroke="#455a64" stroke-width="0.6"/>
                      <circle cx="38" cy="55" r="1.0" fill="#00d2ff"/>
                      <circle cx="102" cy="57" r="1.0" fill="#00d2ff"/>
                    </g>

                    <!-- Cestello Superiore e Stoviglie (Calici, Tazze, Ciotole) -->
                    <g class="dw-rack-upper-group">
                      <rect x="10" y="30" width="120" height="20" fill="none" stroke="#546e7a" stroke-width="1.2" rx="2"/>
                      <line x1="10" y1="39" x2="130" y2="39" stroke="#455a64" stroke-width="0.8"/>
                      <circle cx="15" cy="48" r="2.5" fill="#37474f" stroke="#78909c" stroke-width="0.7"/>
                      <circle cx="125" cy="48" r="2.5" fill="#37474f" stroke="#78909c" stroke-width="0.7"/>

                      <!-- Calice di Cristallo Sinistro -->
                      <g class="dw-dish-glass glass-1" transform="translate(18, 12) rotate(-10)">
                        <path d="M 2,13 C 1,6 5,2 10,2 C 15,2 19,6 18,13 Z" fill="url(#dw-glass-grad)" stroke="#b0e0ff" stroke-width="0.8"/>
                        <line x1="10" y1="13" x2="10" y2="21" stroke="#b0e0ff" stroke-width="0.9"/>
                        <ellipse cx="10" cy="21" rx="4.5" ry="1.2" fill="url(#dw-glass-grad)" stroke="#b0e0ff" stroke-width="0.7"/>
                        <path d="M 4,9 C 4,6 6,4 9,3" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
                      </g>

                      <!-- Calice di Cristallo Destro -->
                      <g class="dw-dish-glass glass-2" transform="translate(38, 12) rotate(-10)">
                        <path d="M 2,13 C 1,6 5,2 10,2 C 15,2 19,6 18,13 Z" fill="url(#dw-glass-grad)" stroke="#b0e0ff" stroke-width="0.8"/>
                        <line x1="10" y1="13" x2="10" y2="21" stroke="#b0e0ff" stroke-width="0.9"/>
                        <ellipse cx="10" cy="21" rx="4.5" ry="1.2" fill="url(#dw-glass-grad)" stroke="#b0e0ff" stroke-width="0.7"/>
                        <path d="M 4,9 C 4,6 6,4 9,3" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
                      </g>

                      <!-- Tazza Espresso 1 -->
                      <g class="dw-dish-cup cup-1" transform="translate(64, 15)">
                        <path d="M 2,16 L 2,4 C 2,2 4,2 6,2 L 16,2 C 18,2 20,2 20,4 L 20,16 Z" fill="#eceff1" stroke="#b0bec5" stroke-width="0.8"/>
                        <path d="M 20,5 C 23,6 23,12 20,13" fill="none" stroke="#b0bec5" stroke-width="1.2"/>
                      </g>

                      <!-- Tazza Espresso 2 -->
                      <g class="dw-dish-cup cup-2" transform="translate(90, 15)">
                        <path d="M 2,16 L 2,4 C 2,2 4,2 6,2 L 16,2 C 18,2 20,2 20,4 L 20,16 Z" fill="#cfd8dc" stroke="#90a4ae" stroke-width="0.8"/>
                        <path d="M 20,5 C 23,6 23,12 20,13" fill="none" stroke="#90a4ae" stroke-width="1.2"/>
                        <rect x="2" y="8" width="18" height="3" fill="#00d2ff" opacity="0.35"/>
                      </g>

                      <!-- Ciotola Dessert -->
                      <g class="dw-dish-bowl" transform="translate(114, 17)">
                        <path d="M 1,14 C 2,5 7,2 10,2 C 13,2 18,5 19,14 Z" fill="#f5f7fa" stroke="#b0bec5" stroke-width="0.8"/>
                      </g>
                    </g>

                    <!-- Vapori Termici durante Asciugatura -->
                    <g class="dw-drying-steam-group">
                      <path class="dw-steam-wave dw-steam-1" d="M 35,90 Q 25,60 38,30 Q 30,15 35,5" fill="none" stroke="rgba(255, 200, 150, 0.45)" stroke-width="3" stroke-linecap="round"/>
                      <path class="dw-steam-wave dw-steam-2" d="M 70,95 Q 80,65 65,35 Q 75,15 70,5" fill="none" stroke="rgba(255, 200, 150, 0.5)" stroke-width="4" stroke-linecap="round"/>
                      <path class="dw-steam-wave dw-steam-3" d="M 105,90 Q 95,60 108,30 Q 100,15 105,5" fill="none" stroke="rgba(255, 200, 150, 0.45)" stroke-width="3" stroke-linecap="round"/>
                    </g>

                    <!-- Stelle Scintillanti a Fine Ciclo (Sparkles) -->
                    <g class="dw-sparkles-group">
                      <path class="dw-sparkle sp-1" d="M 24,15 L 25,18 L 28,19 L 25,20 L 24,23 L 23,20 L 20,19 L 23,18 Z" fill="#ffffff"/>
                      <path class="dw-sparkle sp-2" d="M 33,68 L 34,71 L 37,72 L 34,73 L 33,76 L 32,73 L 29,72 L 32,71 Z" fill="#00d2ff"/>
                      <path class="dw-sparkle sp-3" d="M 103,70 L 104,73 L 107,74 L 104,75 L 103,78 L 102,75 L 99,74 L 102,73 Z" fill="#ffffff"/>
                      <path class="dw-sparkle sp-4" d="M 48,16 L 49,18 L 51,19 L 49,20 L 48,22 L 47,20 L 45,19 L 47,18 Z" fill="#80d8ff"/>
                    </g>
                  </svg>
                </div>
              </div>
            ` : `
              <!-- Oblò, Cestello e Bucato Dinamico Lavasciuga Animata -->
              <div class="washer-porthole">
                <div class="porthole-glass">
                  <svg class="washer-svg-drum" viewBox="0 0 114 114">
                    <defs>
                      <radialGradient id="drum-metal" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stop-color="#2a333f"/>
                        <stop offset="65%" stop-color="#151b22"/>
                        <stop offset="100%" stop-color="#0b0e12"/>
                      </radialGradient>
                      <linearGradient id="lifter-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stop-color="#78909c"/>
                        <stop offset="50%" stop-color="#cfd8dc"/>
                        <stop offset="100%" stop-color="#455a64"/>
                      </linearGradient>
                      <linearGradient id="spray-tech-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="rgba(0, 229, 255, 0.85)"/>
                        <stop offset="100%" stop-color="rgba(0, 140, 255, 0.1)"/>
                      </linearGradient>
                    </defs>

                    <!-- Fondo Cestello Inox -->
                    <circle cx="57" cy="57" r="54" fill="url(#drum-metal)" stroke="#37474f" stroke-width="1.5"/>

                    <!-- Forature Radiali Cestello -->
                    <g fill="#0d1117" opacity="0.8">
                      <circle cx="57" cy="14" r="1.2"/><circle cx="87" cy="26" r="1.2"/><circle cx="100" cy="57" r="1.2"/>
                      <circle cx="87" cy="87" r="1.2"/><circle cx="57" cy="100" r="1.2"/><circle cx="26" cy="87" r="1.2"/>
                      <circle cx="14" cy="57" r="1.2"/><circle cx="26" cy="26" r="1.2"/>
                      <circle cx="57" cy="27" r="1.1"/><circle cx="78" cy="35" r="1.1"/><circle cx="87" cy="57" r="1.1"/>
                      <circle cx="78" cy="78" r="1.1"/><circle cx="57" cy="87" r="1.1"/><circle cx="35" cy="78" r="1.1"/>
                      <circle cx="27" cy="57" r="1.1"/><circle cx="35" cy="35" r="1.1"/>
                      <circle cx="57" cy="57" r="10" fill="#212933" stroke="#455a64" stroke-width="1"/>
                      <circle cx="57" cy="57" r="4" fill="#0f141a"/>
                    </g>

                    <!-- Gruppo Rotante con Pale Trascinatrici e Bucato Multi-Capo -->
                    <g class="drum-rotating-assembly">
                      <!-- 3 Pale Trascinatrici a 120° -->
                      <polygon points="54,14 60,14 58,38 56,38" fill="url(#lifter-grad)" stroke="#37474f" stroke-width="0.5"/>
                      <polygon points="54,14 60,14 58,38 56,38" fill="url(#lifter-grad)" stroke="#37474f" stroke-width="0.5" transform="rotate(120 57 57)"/>
                      <polygon points="54,14 60,14 58,38 56,38" fill="url(#lifter-grad)" stroke="#37474f" stroke-width="0.5" transform="rotate(240 57 57)"/>

                      <!-- Bucato Realistico -->
                      <g class="laundry-clothes-group">
                        <!-- Camicia / Pantalone Denim Blu -->
                        <path class="cloth-item cloth-blue" d="M 38,62 C 34,56 42,48 48,50 C 54,44 64,46 62,54 C 66,58 64,66 56,68 C 48,70 40,68 38,62 Z" fill="#1e88e5" stroke="#1565c0" stroke-width="0.7"/>
                        <!-- Telo Corallo / Rosso -->
                        <path class="cloth-item cloth-red" d="M 52,66 C 50,58 58,52 66,54 C 74,56 78,64 74,70 C 68,76 56,74 52,66 Z" fill="#e53935" stroke="#c62828" stroke-width="0.7"/>
                        <!-- T-shirt Giallo Sole -->
                        <path class="cloth-item cloth-yellow" d="M 44,72 C 40,68 46,62 52,64 C 58,66 56,76 50,78 C 44,80 40,76 44,72 Z" fill="#fbc02d" stroke="#f57f17" stroke-width="0.6"/>
                        <!-- Capo Bianco / Chiaro -->
                        <path class="cloth-item cloth-white" d="M 60,62 C 58,58 64,54 70,56 C 74,60 72,66 66,66 C 62,66 60,64 60,62 Z" fill="#f5f5f5" stroke="#bdbdbd" stroke-width="0.6"/>
                      </g>
                    </g>

                    <!-- MPS Spray-Tech Getto a Pioggia -->
                    <g class="spray-tech-stream">
                      <path d="M 57,6 L 42,48 L 72,48 Z" fill="url(#spray-tech-grad)"/>
                      <circle cx="48" cy="38" r="0.9" fill="#00e5ff"/>
                      <circle cx="56" cy="44" r="0.8" fill="#00e5ff"/>
                      <circle cx="64" cy="36" r="0.9" fill="#00e5ff"/>
                    </g>
                  </svg>

                  <!-- Strato Onde e Schiuma -->
                  <div class="water-wave">
                    <div class="wave-crest-1"></div>
                    <div class="foam-blanket">
                      <div class="bubbles"></div>
                    </div>
                  </div>

                  <!-- Pennacchi Vapore e Calore -->
                  <div class="steam-plume"></div>
                  <div class="heat-glow"></div>

                  <!-- Lente Convessa Antiriflesso 3D -->
                  <div class="glass-reflection-lens"></div>
                </div>

                <!-- MPS Spray-Tech Nozzle Top -->
                <div class="spray-tech-nozzle" title="Mix Power System (Spray Tech)"></div>

                <!-- Spia Blocco Oblò -->
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
              <span class="btn-start-label">Avvia</span>
            </button>
            <button class="btn-action btn-pause">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              <span class="btn-pause-label">Pausa</span>
            </button>
            <button class="btn-action btn-stop">
              <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
              <span class="btn-stop-label">Stop</span>
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

console.info('%c CANDY-SIMPLYFI-CARD %c v1.3.1 Layout Ottimizzato & No Overflow ', 'background: #0088cc; color: #fff; font-weight: bold; border-radius: 3px 0 0 3px;', 'background: #263238; color: #00d2ff; font-weight: bold; border-radius: 0 3px 3px 0;');
