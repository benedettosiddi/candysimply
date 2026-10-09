# Guida per l'Integrazione Ufficiale in Home Assistant Core

Questa guida descrive i requisiti e i passaggi operativi per trasformare questa integrazione da componente personalizzato (**Custom Component HACS**) a **integrazione ufficiale nativa di Home Assistant Core** (inclusa direttamente in ogni installazione di Home Assistant senza passare da HACS).

---

## 1. Architettura Richiesta da Home Assistant Core

Home Assistant ha regole architetturali rigorose (definite dal team di Nabu Casa e dalla community) per accettare nuove integrazioni nel repository ufficiale [`home-assistant/core`](https://github.com/home-assistant/core):

### A. Separazione della Libreria Client (Regola Fondamentale)
- **Regola**: Il codice che comunica via HTTP/socket con l'elettrodomestico (`client.py`) **non deve risiedere all'interno di Home Assistant**, ma deve essere un pacchetto Python autonomo pubblicato su [PyPI](https://pypi.org/) (es. `candy-simplyfi-client` o `aiocandy`).
- **Implementazione**:
  1. I file `client.py` e `programs.py` vengono impacchettati in una repository separata (es. `github.com/benedettosiddi/aiocandy`).
  2. Il pacchetto viene pubblicato su PyPI (`pip install aiocandy`).
  3. Nel `manifest.json` dell'integrazione viene specificata la dipendenza:
     ```json
     "requirements": ["aiocandy==1.0.0"]
     ```
  4. L'integrazione importa poi semplicemente `from aiocandy import CandyLocalClient, WasherProgram, DishwasherProgram`.

### B. Standard di Codice e Tipizzazione Rigorosa
- **Tipizzazione completa**: Annotazioni di tipo Python (Type Hints) al 100% senza `Any` ingiustificati (`mypy --strict`).
- **Linter & Formattazione**: Rispetto delle regole del linter `ruff` adottato da Home Assistant Core.
- **Asyncio puro**: Nessuna chiamata bloccante nel thread loop principale (l'integrazione attuale usa già esclusivamente `aiohttp` non bloccante).

### C. Copertura Test (Pytest)
- Copertura di test minima dell'85-95% con mock completi sia delle risposte HTTP standard che dei casi limite (dispositivo offline, payload corrotto, timeout, chiave errata).

---

## 2. Documentazione Ufficiale per `home-assistant.io`

Per essere accettata in Core, ogni integrazione **deve avere una pagina di documentazione corrispondente** pronta per essere unita nel repository [`home-assistant/home-assistant.io`](https://github.com/home-assistant/home-assistant.io).

Abbiamo già predisposto il file completo e conforme agli standard:
👉 [`docs/home_assistant_official_docs.markdown`](file:///c:/Users/BenedettoSiddi/Sviluppo/candy/docs/home_assistant_official_docs.markdown)

Questo file contiene:
- Header YAML con metadati ufficiali (`ha_category`, `ha_iot_class: Local Polling`, `ha_config_flow: true`, `ha_platforms`, `ha_integration_type: device`).
- Descrizione, prerequisiti di rete, guida al Config Flow via interfaccia grafica.
- Elenco dettagliato di tutte le entità fornite (`sensor`, `binary_sensor`, `select`, `switch`, `button`, `number`).
- Esempi di automazioni YAML.
- Sezione di risoluzione problemi (Troubleshooting) per la manopola Wi-Fi e le chiavi cifrate.

---

## 3. Checklist Home Assistant Integration Quality Scale

Home Assistant valuta le integrazioni secondo la [Quality Scale](https://developers.home-assistant.io/docs/integration_quality_scale_index/):

| Regola | Requisito | Stato Nostra Integrazione |
| :--- | :--- | :--- |
| `config-flow` | Configurazione completa via interfaccia grafica (UI) senza YAML | ✅ Conforme (`config_flow.py`) |
| `test-before-setup` | Test della connessione all'IP prima di creare la voce | ✅ Conforme (validazione in step `async_step_user`) |
| `unique-id` | Identificativo univoco per ogni entità basato su MAC / Host | ✅ Conforme |
| `device-info` | Registrazione del dispositivo con costruttore, modello e link IP | ✅ Conforme (`DeviceInfo` con Candy/Hoover) |
| `coordinator` | Uso di `DataUpdateCoordinator` centralizzato per il polling | ✅ Conforme (`CandyDataUpdateCoordinator`) |
| `async` | Utilizzo esclusivo di chiamate asincrone non bloccanti | ✅ Conforme (`aiohttp`) |
| `translations` | Stringhe e traduzioni localizzate in `strings.json` e `it.json` | ✅ Conforme |
| `entity-category` | Categorie diagnostiche e di configurazione assegnate | ✅ Conforme |
| `reauth-flow` | Riconnessione fluida se la chiave o l'IP cambiano | ✅ Conforme |
| `diagnostics` | Piattaforma diagnostica per il download del JSON di debug | 📝 Opzionale (aggiungibile prima della PR Core) |

---

## 4. Procedura Passo-Passo per aprire la Pull Request su Home Assistant Core

Quando vorrai proporre l'integrazione ufficialmente in Home Assistant:

### Passo 1: Pubblicare la libreria PyPI
1. Crea un repository GitHub denominato `aiocandy`.
2. Sposta `client.py` con un semplice `pyproject.toml`.
3. Esegui il build e carica su PyPI:
   ```bash
   pip install build twine
   python -m build
   twine upload dist/*
   ```

### Passo 2: Fork e Clone di `home-assistant/core`
```bash
git clone https://github.com/<tuo-utente>/core.git
cd core
git checkout -b add-candy-simplyfi
```

### Passo 3: Copiare i file nella cartella componenti di Home Assistant
Copia la cartella `custom_components/candy_simplyfi` in `homeassistant/components/candy_simplyfi`.
Aggiorna il file `manifest.json`:
```json
{
  "domain": "candy_simplyfi",
  "name": "Candy Simply-Fi Local",
  "codeowners": ["@benedettosiddi"],
  "config_flow": true,
  "documentation": "https://www.home-assistant.io/integrations/candy_simplyfi",
  "integration_type": "device",
  "iot_class": "local_polling",
  "requirements": ["aiocandy==1.0.0"]
}
```

### Passo 4: Eseguire la validazione automatica di Home Assistant (`hassfest`)
```bash
python -m script.hassfest
pytest tests/components/candy_simplyfi
```

### Passo 5: Aprire la PR su GitHub
1. Apri la Pull Request sul repository `home-assistant/core` con titolo:
   `Add Candy Simply-Fi local integration`
2. Apri contemporaneamente la Pull Request sul repository `home-assistant/home-assistant.io` con la documentazione presente in `docs/home_assistant_official_docs.markdown`.
