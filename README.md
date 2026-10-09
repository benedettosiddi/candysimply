# Candy Simply-Fi Local - Integrazione Home Assistant 100% Locale

Integrazione completa, affidabile e **100% locale** per Home Assistant dedicata a **Lavasciuga**, **Lavatrice** e **Lavastoviglie** del gruppo Candy / Hoover basate sulla piattaforma **simply-Fi**.

Elimina completamente la dipendenza dall'app ufficiale *simply-Fi* e dai suoi instabili server cloud, comunicando direttamente con il microcontrollore dell'elettrodomestico sulla rete locale (LAN).

---

## Caratteristiche Principali

* **100% Locale e Senza Cloud**: Tutte le comunicazioni avvengono via HTTP direttamente tra Home Assistant e l'indirizzo IP locale dell'elettrodomestico sulla porta 80.
* **Autodiscovery Intelligente (Zero Configurazione IP)**: Rilevamento automatico degli elettrodomestici Candy/Hoover presenti sulla rete tramite **ZeroConf / mDNS**, **DHCP Sniffer**, **SSDP** e scanner di sottorete proattivo: Home Assistant li trova da solo e propone la configurazione con 1 click senza dover cercare manualmente gli indirizzi IP!
* **Supporto Completo per Lavasciuga e Lavastoviglie**:
  * **Lavasciuga**: Gestione completa di programmi di lavaggio, programmi combinati lava & asciuga, solo asciugatura, controllo temperatura, giri di centrifuga, vapore e opzioni speciali.
  * **Lavastoviglie**: Gestione di tutti i cicli (inclusi intensivo, eco, zoom, igienizzante, cristalli, autopulizia), mezzo carico, pastiglie 3-in-1, asciugatura extra e apertura automatica sportello.
* **Tutti i Programmi di Lavaggio e Asciugatura Aggiuntivi**:
  * Include sia i programmi fisici standard della manopola, sia l'intero catalogo dei **programmi speciali scaricabili** estratti dal database dell'app Candy (Igiene 60°, Pulizia Cestello, Anti-Allergie, Capi Neonati, Piumoni, Tende, Capi Scuri, Rimozione Peli Animali, Rinfresca a Vapore, ecc.).
  * Fino a **24 programmi per la lavastoviglie** e oltre **45 programmi e combinazioni per la lavasciuga**.
* **Zero Conflitti di Rete**: Gestione della concorrenza con lock asincrono dedicato per ogni elettrodomestico, proteggendo il microcontrollore della macchina da crash e timeout.
* **Recupero Automatico Chiave Crittografica (XOR Key Discovery)**: Se la macchina risponde in modalità cifrata, l'integrazione applica un attacco a testo noto (*known-plaintext attack*) tollerante alla formattazione CRLF/tab e calcola automaticamente la chiave di 16 caratteri al primo tentativo!
* **Onboarding e Provisioning Wi-Fi Guidato**: Script Python e guida completa per associare l'elettrodomestico alla rete di casa senza dover mai aprire l'app Simply-Fi.
* **Sensori di Allarme e Diagnostica Avanzata**:
  * Mancanza sale rigenerante e mancanza brillantante (per lavastoviglie).
  * Stato oblò / porta aperta e blocco di sicurezza.
  * Codici errore dettagliati con spiegazione in italiano (es. E01, E02, E03, E04...).

---

## Tabella dei Programmi Inclusi

### Lavasciuga e Lavatrice (Oltre 45 Programmi e Varianti)
| ID Programma | Nome Ciclo | Temp (°C) | Centrifuga (RPM) | Asciugatura | Note / Descrizione |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cottons` | Cotone Resistente / Bianchi | 60° (fino a 90°) | 1400 (fino a 1600) | Sì | Lenzuola, tovaglie e cotone pesante |
| `cottons_prewash`| Cotone + Prelavaggio | 60° | 1400 | Sì | Per sporco molto ostinato |
| `eco_40_60` | Eco 40-60 | 40° - 60° | 1400 | Sì | Ciclo standard normativo UE |
| `wash_20` | Eco 20°C (Lavaggio a Freddo) | 20° | 1000 | Sì | Risparmio energetico per carichi misti |
| `synthetics` | Sintetici & Misti Colorati | 40° (fino a 60°) | 1000 | Sì | Camicie e tessuti sintetici |
| `daily_59` | Giornaliero 59' / All In One | 40° | 1000 | Sì | Ciclo completo in 59 minuti |
| `rapid_14` | Rapido 14 Minuti | 30° | 1000 | No | Rinfresco veloce fino a 1.5kg |
| `rapid_30` | Rapido 30 Minuti | 30° | 1000 | Sì | Carichi leggeri fino a 2.5kg |
| `rapid_44` | Rapido 44 Minuti | 40° | 1000 | Sì | Ottimo compromesso fino a 3.5kg |
| `delicates` | Delicati | 30° | 800 | No | Pizzo, seta e fibre delicate |
| `wool_silk` | Lana & Seta / A Mano | 30° | 800 | No | Movimento basculante certificato |
| `hygiene_60` | Igiene 60°C / Baby Care | 60° | 1200 | Sì | Elimina allergeni e batteri |
| `easy_iron` | Stiro Facile / Vapore Refresh | 30° | 800 | No | Riduce al minimo le pieghe |
| `sport_fitness` | Sport & Abbigliamento Tecnico | 30° | 800 | No | Protegge i tessuti traspiranti |
| `autoclean` | Pulizia Cestello (Auto-Clean) | 60° - 90° | 800 | No | Sanificazione e pulizia vasca |
| `jeans` | Jeans & Denim | 40° | 1000 | Sì | Preserva il colore originale |
| `duvet` | Piumoni & Imbottiti | 40° | 800 | Sì | Carichi voluminosi |
| `curtains` | Tende & Tendaggi | 30° | 400 | No | Rotazione lenta per non rovinare le pieghe |
| `dark_garments`| Capi Scuri & Neri | 30° | 1000 | Sì | Anti-sbiadimento |
| `shirts` | Camicie | 30° | 800 | Sì | Con trattamento vapore antipiega |
| `pet_hair` | Rimozione Peli Animali | 40° | 1000 | Sì | Risciacqui speciali per staccare i peli |
| `wd_wash_dry_59`| Lava & Asciuga 59 Minuti | 30° | 1400 | Sì | Lavaggio e asciugatura in 59 min |
| `wd_auto_care` | Auto Care Lava & Asciuga | 40° | 1400 | Sì | Ciclo completo continuo senza stop |
| `wd_dry_cotton` | Solo Asciugatura Cotone | - | - | Alta temp | Per capi in cotone e spugne |
| `wd_dry_synthetic`| Solo Asciugatura Sintetici | - | - | Media temp | Per fibre sintetiche e miste |
| `wd_dry_wool` | Solo Asciugatura Lana | - | - | Bassa temp | Asciugatura delicata lana |
| `wd_steam_refresh`| Rinfresca a Vapore & Deodora | - | - | Vapore | Elimina odori senza lavare in 25 min |

### Lavastoviglie (24 Programmi Completi)
| Codice | Nome Ciclo | Temp (°C) | Durata Indicativa | Descrizione |
| :--- | :--- | :--- | :--- | :--- |
| `P1` | ECO 45°C | 45° | 230 min | Ciclo a massimo risparmio energia e acqua |
| `P2` | Intensivo 75°C | 75° | 130 min | Pentole, padelle e teglie molto incrostate |
| `P3` | Universale 60°C | 60° | 120 min | Ciclo quotidiano standard a pieno carico |
| `P4` | Zoom 39' / Daily 39' | 60° | 39 min | Lavaggio e asciugatura rapidi in classe A |
| `P5` | Rapido 24' | 50° | 24 min | Superveloce per piatti poco sporchi |
| `P6` | Prelavaggio a Freddo | Freddo | 5 min | Ammollo breve per non far seccare lo sporco |
| `P7` | Igienizzante 75°C | 75° | 140 min | Antibatterico per taglieri e biberon |
| `P8` | Intensivo Rapido 60' | 65° | 60 min | Energico in tempo ridotto |
| `P9` | Universale Plus 65°C | 65° | 135 min | Lavaggio giornaliero rinforzato |
| `P10`| Sensore Automatico 55-65°C | 60° | 110 min | Calibra tempo e acqua con sensore torbidità |
| `P11`| Notturno Silenzioso 55°C | 55° | 240 min | Pressione getti ridotta per il minimo rumore |
| `P12`| Delicati & Cristalli 45°C | 45° | 85 min | Bicchieri preziosi, calici e porcellane |
| `P13`| Classe A 1 Ora 60°C | 60° | 60 min | Lavaggio e asciugatura in 60 minuti |
| `P14`| Pulizia Vasca (Self-Clean) | 70° | 45 min | Manutenzione a vuoto con cura-lavastoviglie |
| `P15`| Auto All-in-One 65°C | 65° | 125 min | Gestione automatica carichi misti |
| `P16`| Lavaggio a Vapore 70°C | 70° | 150 min | Azione emolliente del vapore |
| `P17`| Baby Care 70°C | 70° | 120 min | Stoviglie e accessori prima infanzia |
| `P18`| Bicchieri da Vino 40°C | 40° | 70 min | Lucentezza e risciacquo senza aloni |
| `P19`| Stoviglie in Plastica 50°C | 50° | 90 min | Asciugatura specifica per contenitori in plastica |
| `P20`| Bicchieri Party 45°C | 45° | 50 min | Bicchieri e boccali da birra |
| `P21`| Teglie Forno & Filtri Cappa | 75° | 160 min | Getto potenziato per grasso bruciato |
| `P22`| Scongelamento & Rinfresco | Freddo | 20 min | Scongelamento alimenti o piatti impolverati |
| `P23`| Eco Mezzo Carico 45°C | 45° | 140 min | Eco ottimizzato per metà cestello |
| `P24`| Igienizzazione Rapida 50' | 65° | 50 min | Sanificazione e pulizia rapida |

---

## Installazione

### Metodo 1: Copia Manuale
1. Copia la cartella `custom_components/candy_simplyfi` nella cartella `config/custom_components/` della tua installazione di Home Assistant:
   ```text
   homeassistant/
   └── custom_components/
       └── candy_simplyfi/
           ├── __init__.py
           ├── manifest.json
           ├── config_flow.py
           ├── const.py
           ├── coordinator.py
           ├── client.py
           ├── programs.py
           ├── sensor.py
           ├── binary_sensor.py
           ├── switch.py
           ├── select.py
           ├── button.py
           ├── number.py
           ├── strings.json
           └── translations/
               ├── it.json
               └── en.json
   ```
2. Riavvia Home Assistant.
3. Vai in **Impostazioni** -> **Dispositivi e Servizi** -> **Aggiungi Integrazione**.
4. Cerca **Candy Simply-Fi Locale**.

### Metodo 2: Tramite HACS (Custom Repository)
1. Apri HACS -> Sezione **Integrazioni**.
2. Clicca sui tre puntini in alto a destra -> **Repository Personalizzati**.
3. Incolla l'URL del repository e seleziona la categoria **Integrazione**.
4. Clicca su Installa e riavvia Home Assistant.

---

## Strumenti Inclusi (`tools/candy_cli.py`)

All'interno della cartella `tools/` è disponibile un'utilità da riga di comando che funziona su Windows, Mac e Linux:

```bash
# Avvia il menu interattivo
python tools/candy_cli.py

# Recupera istantaneamente la chiave XOR da un elettrodomestico connesso
python tools/candy_cli.py getkey 192.168.1.150

# Visualizza lo stato telemetrico completo della macchina
python tools/candy_cli.py status 192.168.1.150

# Fai suonare il cicalino di test (Bip)
python tools/candy_cli.py cmd 192.168.1.150 "BM=1"

# Esegui l'onboarding Wi-Fi guidato senza l'app Simply-Fi
python tools/candy_cli.py provision
```

Per la procedura dettagliata di connessione al Wi-Fi, consulta il file [GUIDA_ONBOARDING_WIFI.md](file:///c:/Users/BenedettoSiddi/Sviluppo/candy/GUIDA_ONBOARDING_WIFI.md).

---

## 🎨 Grafica ed Esperienza Utente (Lovelace Cards)

L'integrazione include una **scheda Lovelace personalizzata (`candy-card`)** con rendering fotorealistico e animazioni grafiche dinamiche che riflettono in tempo reale le funzioni e lo stato degli elettrodomestici Candy:

### Funzionalità della Scheda Grafica (`candy-card`):
- 🌀 **Animazione Cestello (Lavasciuga / Lavatrice)**:
  - Rotazione realistica del cestello durante il lavaggio.
  - Centrifuga ultra-rapida con accelerazione visiva durante la fase di centrifuga.
  - Onde d'acqua e schiuma animate all'interno dell'oblò durante i cicli d'acqua.
  - Bagliore termico e onde di calore arancioni animate durante la fase di asciugatura!
  - Spia LED di blocco oblò (verde/rosso).
- 🍽️ **Visualizzazione Lavastoviglie**:
  - Bracci irroratori rotanti e getti d'acqua dinamici ad alta pressione.
  - Indicatori luminosi di avviso per **Mancanza Sale** e **Mancanza Brillantante**.
  - Avviso visivo sportello aperto.
- ⏱️ **Display Digitale stile Candy**:
  - Countdown a 7 segmenti del tempo rimanente.
  - Nome del programma attivo e fase corrente in evidenza.
  - Badge di stato con led pulsante (Standby, In funzione, In pausa, Terminato, Errore).
- 🎛️ **Controlli Interattivi Integrati**:
  - Selettore a tendina dei programmi Candy.
  - Pulsanti rapidi di opzione (Prelavaggio, Igiene+, Risciacquo+, Stiro Facile, Vapore / Mezzo Carico, Pastiglie, Extra Dry).
  - Pulsanti diretti **Avvia**, **Pausa**, **Stop/Reset** e **Bip sonoro**.
- ⚠️ **Banner Allarmi Diagnostici**:
  - Traduzione automatica dei codici di errore (E01...E22) con descrizione dettagliata della causa e risoluzione.

### Come usare la Scheda Grafica Personalizzata (`candy-card`):

La risorsa viene registrata in automatico dall'integrazione al percorso:
`/candy_simplyfi/candy-card.js`

> Se la risorsa non dovesse caricarsi automaticamente in Lovelace:
> Vai su **Impostazioni** -> **Dashboard** -> **Risorse** -> **Aggiungi Risorsa** -> URL: `/candy_simplyfi/candy-card.js` (Tipo: *Modulo JavaScript*).

#### 1. Scheda Lavasciuga Candy:
```yaml
type: custom:candy-card
name: "Candy Lavasciuga Smart Pro"
device_type: washer_dryer
```

#### 2. Scheda Lavastoviglie Candy:
```yaml
type: custom:candy-card
name: "Candy Lavastoviglie Brava"
device_type: dishwasher
```

---

### Schede Native Home Assistant (Alternative Senza Custom Card)
Nella cartella `dashboards/` trovi file completi pronti all'uso:
- `dashboards/candy_washer_dryer_card.yaml`: Scheda completa per Lavasciuga.
- `dashboards/candy_dishwasher_card.yaml`: Scheda completa per Lavastoviglie.
- `dashboards/candy_complete_view.yaml`: Intera vista con grafici storici, badges e automazioni.

#### Esempio Scheda Nativa Stack Lavasciuga:
```yaml
type: vertical-stack
cards:
  - type: entities
    title: 🧺 Lavasciuga Candy
    entities:
      - entity: sensor.candy_lavasciuga_stato
      - entity: sensor.candy_lavasciuga_programma
      - entity: sensor.candy_lavasciuga_fase
      - entity: sensor.candy_lavasciuga_tempo_rimanente
      - entity: binary_sensor.candy_lavasciuga_oblo_bloccato
      - entity: select.candy_lavasciuga_selezione_programma
      - entity: select.candy_lavasciuga_selezione_temperatura
      - entity: select.candy_lavasciuga_selezione_centrifuga
      - entity: select.candy_lavasciuga_selezione_asciugatura
  - type: horizontal-stack
    cards:
      - type: button
        name: Avvia
        icon: mdi:play-circle
        tap_action:
          action: call_service
          service: button.press
          target:
            entity_id: button.candy_lavasciuga_avvia_programma
      - type: button
        name: Pausa
        icon: mdi:pause-circle
        tap_action:
          action: call_service
          service: button.press
          target:
            entity_id: button.candy_lavasciuga_metti_in_pausa
      - type: button
        name: Stop
        icon: mdi:stop-circle
        tap_action:
          action: call_service
          service: button.press
          target:
            entity_id: button.candy_lavasciuga_annulla_stop_ciclo
```

### Card Lavastoviglie Candy
```yaml
type: vertical-stack
cards:
  - type: entities
    title: 🍽️ Lavastoviglie Candy
    entities:
      - entity: sensor.candy_lavastoviglie_simply_fi_stato_elettrodomestico
      - entity: sensor.candy_lavastoviglie_simply_fi_programma_attivo
      - entity: sensor.candy_lavastoviglie_simply_fi_tempo_rimanente
      - entity: binary_sensor.candy_lavastoviglie_simply_fi_mancanza_sale_rigenerante
      - entity: binary_sensor.candy_lavastoviglie_simply_fi_mancanza_brillantante
      - entity: select.candy_lavastoviglie_simply_fi_seleziona_programma_lavastoviglie
      - entity: switch.candy_lavastoviglie_simply_fi_opzione_pastiglie_3_in_1
      - entity: switch.candy_lavastoviglie_simply_fi_opzione_mezzo_carico
      - entity: switch.candy_lavastoviglie_simply_fi_opzione_asciugatura_extra
      - entity: switch.candy_lavastoviglie_simply_fi_apertura_automatica_sportello
  - type: horizontal-stack
    cards:
      - type: button
        name: Avvia Ciclo
        icon: mdi:play
        tap_action:
          action: call_service
          service: button.press
          target:
            entity_id: button.candy_lavastoviglie_simply_fi_avvia_programma_selezionato
      - type: button
        name: Annulla
        icon: mdi:stop
        tap_action:
          action: call_service
          service: button.press
          target:
            entity_id: button.candy_lavastoviglie_simply_fi_annulla_stop_ciclo
```

---

## Esempi di Automazioni

### Notifica quando il ciclo è completato
```yaml
alias: "Notifica Fine Lavaggio Candy"
trigger:
  - platform: state
    entity_id: binary_sensor.candy_lavasciuga_simply_fi_in_funzione
    from: "on"
    to: "off"
action:
  - service: notify.notify
    data:
      title: "🧺 Lavaggio Completato!"
      message: "Il ciclo di lavaggio e asciugatura Candy è terminato. Puoi ritirare i capi."
```

### Avviso mancanza sale lavastoviglie
```yaml
alias: "Avviso Sale Lavastoviglie Esaurito"
trigger:
  - platform: state
    entity_id: binary_sensor.candy_lavastoviglie_simply_fi_mancanza_sale_rigenerante
    to: "on"
action:
  - service: notify.notify
    data:
      title: "🧂 Allarme Lavastoviglie"
      message: "Il sale rigenerante nella lavastoviglie Candy è quasi esaurito. Ricordati di fare il rabbocco!"
```

---

## 🏛️ Sottomissione Ufficiale a Home Assistant Core

Se desideri proporre questa integrazione come **componente ufficiale nativo di Home Assistant Core** (senza HACS):

- 📖 **Guida Completa alla Sottomissione Core**: Consulta [`GUIDA_INTEGRAZIONE_UFFICIALE_CORE.md`](file:///c:/Users/BenedettoSiddi/Sviluppo/candy/GUIDA_INTEGRAZIONE_UFFICIALE_CORE.md) per i requisiti architetturali, la checklist di qualità (Quality Scale) e i passaggi per aprire la Pull Request su `home-assistant/core`.
- 📄 **Documentazione per `home-assistant.io`**: Il file formattato secondo gli standard del sito ufficiale di Home Assistant è pronto all'uso in [`docs/home_assistant_official_docs.markdown`](file:///c:/Users/BenedettoSiddi/Sviluppo/candy/docs/home_assistant_official_docs.markdown).

