# Guida Completa Onboarding Wi-Fi e Connessione Locale Candy Simply-Fi

Questa guida spiega passo-passo come connettere la **Lavasciuga**, **Lavatrice** e **Lavastoviglie** Candy / Hoover alla rete Wi-Fi di casa in modo **100% locale**, senza dover combattere con l'app ufficiale *simply-Fi* (nota per crash, blocchi e disconnessioni dai server cloud).

---

## Indice
1. [Requisiti della Rete Wi-Fi](#1-requisiti-della-rete-wi-fi)
2. [Metodo A: Onboarding 100% Locale (Senza App Ufficiale)](#2-metodo-a-onboarding-100-locale-senza-app-ufficiale)
3. [Metodo B: Elettrodomestico Già Connesso al Wi-Fi](#3-metodo-b-elettrodomestico-già-connesso-al-wi-fi)
4. [Come Mettere la Macchina in Modalità Pairing Wi-Fi](#4-come-mettere-la-macchina-in-modalità-pairing-wi-fi)
5. [La Regola d'Oro del Controllo Remoto Candy](#5-la-regola-doro-del-controllo-remoto-candy)
6. [Recupero Automatico della Chiave Crittografica (XOR Key)](#6-recupero-automatico-della-chiave-crittografica-xor-key)
7. [Aggiunta in Home Assistant](#7-aggiunta-in-home-assistant)
8. [Risoluzione Problemi Comuni](#8-risoluzione-problemi-comuni)

---

## 1. Requisiti della Rete Wi-Fi

I chip Wi-Fi installati negli elettrodomestici Candy / Hoover hanno requisiti specifici:
* **Frequenza solo 2.4 GHz**: Gli elettrodomestici **NON** supportano la banda 5 GHz. Se il tuo router usa un unico nome (SSID) per 2.4 GHz e 5 GHz con *Band Steering*, separa temporaneamente le bande o disattiva la 5 GHz durante l'onboarding.
* **Sicurezza WPA2-PSK (AES)**: Non utilizzare WPA3 esclusivo o reti aperte senza password. La modalità mista WPA2/WPA3 è supportata, ma WPA2 puro garantisce il 100% di successo.
* **DHCP attivo**: L'elettrodomestico deve poter ricevere un indirizzo IP automaticamente dal router.
* **IP Statico / Prenotazione DHCP (Consigliato)**: Una volta connesso, assegna un IP fisso all'elettrodomestico tramite le impostazioni DHCP del tuo router (es. `192.168.1.150`).

---

## 2. Metodo A: Onboarding 100% Locale (Senza App Ufficiale)

Questo metodo utilizza lo strumento incluso `tools/candy_cli.py` per inviare direttamente all'elettrodomestico le credenziali del tuo Wi-Fi di casa.

### Passaggi:
1. **Attiva la modalità Access Point (Pairing) sull'elettrodomestico**:
   - Consulta la [Sezione 4](#4-come-mettere-la-macchina-in-modalità-pairing-wi-fi) per la combinazione di tasti corretta.
   - La spia Wi-Fi inizierà a lampeggiare velocemente o il display mostrerà `APP` / `AP`.

2. **Collegati alla rete Wi-Fi dell'elettrodomestico**:
   - Da PC o smartphone, cerca le reti Wi-Fi disponibili.
   - Troverai una rete aperta senza password con nome simile a:
     - `CANDY_WASHING_xxxx`
     - `CANDYDISHWASHING-xxxx`
     - `WIFIDISHWASHING-xxxx`
     - `CANDY-xxxx`
   - Connettiti a questa rete. (Se il sistema operativo avvisa "Internet non disponibile", seleziona "Mantieni connessione Wi-Fi").

3. **Esegui lo strumento di provisioning**:
   Apri il terminale nella cartella del progetto ed esegui:
   ```bash
   python tools/candy_cli.py provision
   ```

4. **Segui i passaggi a schermo**:
   - Conferma l'indirizzo IP predefinito della macchina (`192.168.0.1`).
   - Inserisci il nome della tua rete Wi-Fi domestica (SSID a 2.4 GHz).
   - Inserisci la password della tua rete Wi-Fi.
   - Lo strumento genererà automaticamente una chiave crittografica a 16 caratteri e la inietterà nella macchina.

5. **Salva la chiave stampata a video**:
   Lo strumento mostrerà:
   ```text
   [SUCCESS] CONFIGURAZIONE INVIATA CON SUCCESSO!
   Chiave crittografica generata per Home Assistant: xxxxxxxxxxxxxxxx
   ```
   L'elettrodomestico riavvierà il modulo Wi-Fi e si collegherà alla tua rete di casa.

---

---

## 3. Metodo B: Elettrodomestico Già Connesso al Wi-Fi (Autodiscovery Zero-Configuration)

Se l'elettrodomestico è già connesso alla rete Wi-Fi di casa (perché precedentemente associato o configurato):

> [!TIP]
> **NUOVO: Rilevamento Automatico (Non serve cercare l'IP a mano!)**
> L'integrazione dispone di **Autodiscovery nativo** a triplo protocollo (**ZeroConf / mDNS, DHCP Sniffer, SSDP**) e **scanner proattivo di sottorete LAN**:
> 1. Quando apri Home Assistant, l'integrazione rileva automaticamente la presenza dell'elettrodomestico e fa comparire la notifica:
>    *"Nuovo dispositivo scoperto: Candy Simply-Fi (192.168.1.X) - Configura"*.
> 2. Se apri la schermata di configurazione manuale, troverai già un menu a tendina con gli elettrodomestici Candy rilevati sulla tua rete!
> 3. Se il tuo router dovesse cambiare IP all'elettrodomestico, l'integrazione aggiornerà l'IP in automatico in background senza bloccare le entità.

Se invece preferisci fare un controllo diagnostico manuale da riga di comando:
1. Trova l'indirizzo IP locale assegnato all'elettrodomestico dal tuo router (es. `192.168.1.85`).
2. Esegui il test diagnostico e recupero chiave:
   ```bash
   python tools/candy_cli.py getkey 192.168.1.85
   ```
3. Lo strumento interroga l'elettrodomestico ed esegue l'attacco a testo noto (*known-plaintext attack*), decodificando istantaneamente la chiave segreta di 16 caratteri.
4. Puoi verificare lo stato completo eseguendo:
   ```bash
   python tools/candy_cli.py status 192.168.1.85
   ```

---

## 4. Come Mettere la Macchina in Modalità Pairing Wi-Fi

### A) Lavasciuga e Lavatrice Candy / Hoover
1. Ruota la manopola fisica dei programmi sulla posizione contrassegnata come **WI-FI** (o **SMART TOUCH** / **REMOTO**).
2. Tieni premuto il pulsante **AVVIO / PAUSA** (oppure **OPZIONI** a seconda del pannello) per circa **5-10 secondi**.
3. Il display digitale mostrerà la scritta lampeggiante `APP` e l'icona Wi-Fi lampeggerà velocemente a indicare che l'hotspot è attivo.

### B) Lavastoviglie Candy / Hoover
1. Accendi la lavastoviglie con il tasto di accensione.
2. Tieni premuto il tasto **WI-FI** (oppure la combinazione **P + AVVIO**) per **5 secondi**.
3. La macchina emette una sequenza di bip e la spia del Wi-Fi inizia a lampeggiare a intermittenza rapida, indicando l'apertura dell'hotspot.

---

## 5. La Regola d'Oro del Controllo Remoto Candy

> [!IMPORTANT]
> **Sulle lavatrici e lavasciuga Candy, la manopola fisica comanda sulla scheda di rete!**
> 
> * Se la manopola fisica è posizionata su un ciclo tradizionale (es. Cotone 60°), la macchina invierà la telemetria ma **ignorerà qualsiasi comando di avvio inviato da Home Assistant** per motivi di sicurezza meccanica.
> * Per poter selezionare programmi da Home Assistant, variare temperature, giri o avviare il ciclo:
>   **La manopola fisica DEVE essere posizionata sulla tacca `WI-FI`!**
> * Quando la manopola è su `WI-FI`, l'entità sensore `binary_sensor.candy_controllo_remoto_abilitato` diventa `ON` e puoi lanciare qualsiasi programma (inclusi tutti i cicli scaricabili speciali ed extra asciugatura).

---

## 6. Recupero Automatico della Chiave Crittografica (XOR Key)

Candy protegge i messaggi HTTP con un cifrario simmetrico XOR a chiave ripetuta (16 caratteri alfanumerici). 

Poiché la risposta JSON dell'elettrodomestico inizia sempre con un'intestazione nota (`{"statusLavatrice":{` oppure `{\r\n\t"statusLavatrice":` o `{"statusDWash":{`), la formula matematica:
$$\text{Chiave} = \text{TestoCifrato} \oplus \text{TestoInChiaroNoto}$$
permette di calcolare con precisione assoluta la chiave crittografica in meno di 1 secondo!

**La nostra integrazione Home Assistant include questo algoritmo all'interno del Config Flow**:
* Durante la configurazione in Home Assistant, puoi semplicemente lasciare vuoto il campo della chiave.
* L'integrazione interrogherà la macchina, calcolerà la chiave al primo tentativo e la memorizzerà automaticamente.

---

## 7. Aggiunta in Home Assistant (Procedura con Autodiscovery)

1. Copia la cartella `custom_components/candy_simplyfi` all'interno della cartella `custom_components` del tuo Home Assistant (es. `/config/custom_components/candy_simplyfi`).
2. Riavvia Home Assistant.
3. **Se l'elettrodomestico è connesso alla rete**: Home Assistant ti mostrerà direttamente una notifica di **dispositivo scoperto** sulla dashboard di benvenuto! Clicca semplicemente su **Configura**.
4. Se procedi manualmente:
   - Vai su **Impostazioni** -> **Dispositivi e Servizi** -> **Aggiungi Integrazione**.
   - Cerca **Candy Simply-Fi Locale**.
   - Seleziona l'elettrodomestico dall'elenco rilevato automaticamente (oppure inserisci l'IP se la rete è su VLAN separata).
   - Lascia la chiave vuota se desideri il calcolo automatico.
   - Clicca su **Invia**. Il dispositivo verrà aggiunto con tutti i sensori, interruttori e selettori di programmi!

---

## 8. Risoluzione Problemi Comuni

| Sintomo | Causa Probabile | Soluzione |
| :--- | :--- | :--- |
| **Impossibile connettersi all'IP** | L'elettrodomestico è spento o in standby profondo | Accendere il display dell'elettrodomestico o verificare l'IP assegnato dal router. |
| **I comandi di avvio non partono** | Manopola fisica non posizionata su WI-FI | Posizionare la manopola fisica su WI-FI per consentire l'accettazione dei comandi. |
| **Allarme sale o brillantante attivo** | Contenitori esauriti nella lavastoviglie | Rabboccare sale rigenerante o brillantante nella lavastoviglie. |
| **L'hotspot dell'elettrodomestico scompare subito** | Timeout modalità pairing (circa 5 minuti) | Ripetere la pressione prolungata del tasto Wi-Fi/Avvio. |
| **Errore E01 o Oblò non bloccato** | Sportello o oblò non agganciato saldamente | Spingere l'oblò o lo sportello fino allo scatto. |
