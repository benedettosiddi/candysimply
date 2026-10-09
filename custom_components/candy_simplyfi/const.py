"""Constants for the Candy Simply-Fi Local integration."""

from typing import Final

DOMAIN: Final = "candy_simplyfi"
NAME: Final = "Candy Simply-Fi Local"

# Configuration options
CONF_IP_ADDRESS: Final = "ip_address"
CONF_KEY: Final = "key"
CONF_ENCRYPTED: Final = "encrypted"
CONF_APPLIANCE_TYPE: Final = "appliance_type"
CONF_UPDATE_INTERVAL: Final = "update_interval"
CONF_AUTO_DETECT_KEY: Final = "auto_detect_key"

DEFAULT_UPDATE_INTERVAL: Final = 15  # seconds
DEFAULT_TIMEOUT: Final = 8  # seconds

# Appliance types
APPLIANCE_TYPE_WASHER: Final = "washer"
APPLIANCE_TYPE_WASHER_DRYER: Final = "washer_dryer"
APPLIANCE_TYPE_DISHWASHER: Final = "dishwasher"
APPLIANCE_TYPE_DRYER: Final = "dryer"
APPLIANCE_TYPE_AUTO: Final = "auto"

APPLIANCE_TYPES: Final = {
    APPLIANCE_TYPE_AUTO: "Rilevamento Automatico / Auto Detect",
    APPLIANCE_TYPE_WASHER_DRYER: "Lavasciuga / Washer-Dryer",
    APPLIANCE_TYPE_DISHWASHER: "Lavastoviglie / Dishwasher",
    APPLIANCE_TYPE_WASHER: "Lavatrice / Washing Machine",
    APPLIANCE_TYPE_DRYER: "Asciugatrice / Tumble Dryer",
}


def get_device_model_name(appliance_type: str) -> str:
    """Return friendly model name based on appliance type."""
    if appliance_type == APPLIANCE_TYPE_DISHWASHER:
        return "Lavastoviglie Simply-Fi"
    if appliance_type == APPLIANCE_TYPE_WASHER_DRYER:
        return "Lavasciuga Simply-Fi"
    return "Lavatrice Simply-Fi"


# Machine modes (MachMd) for Washers / Washer-Dryers
WASHER_MODE_IDLE: Final = "1"
WASHER_MODE_RUNNING: Final = "2"
WASHER_MODE_PAUSED: Final = "3"
WASHER_MODE_DELAYED_START: Final = "4"
WASHER_MODE_DELAYED_START_ACTIVE: Final = "5"
WASHER_MODE_ERROR: Final = "6"
WASHER_MODE_FINISHED: Final = "7"

WASHER_MODES: Final = {
    WASHER_MODE_IDLE: "In attesa / Standby",
    WASHER_MODE_RUNNING: "In funzione",
    WASHER_MODE_PAUSED: "In pausa",
    WASHER_MODE_DELAYED_START: "Partenza ritardata",
    WASHER_MODE_DELAYED_START_ACTIVE: "Partenza programmata",
    WASHER_MODE_ERROR: "Errore rilevato",
    WASHER_MODE_FINISHED: "Ciclo terminato",
}

# Program Phases (PrPh) for Washers / Washer-Dryers
WASHER_PHASE_IDLE: Final = "0"
WASHER_PHASE_PREWASH: Final = "1"
WASHER_PHASE_WASH: Final = "2"
WASHER_PHASE_RINSE: Final = "3"
WASHER_PHASE_SPIN: Final = "4"
WASHER_PHASE_DRYING: Final = "5"
WASHER_PHASE_FINISHED: Final = "6"

WASHER_PHASES: Final = {
    WASHER_PHASE_IDLE: "Non avviato",
    WASHER_PHASE_PREWASH: "Prelavaggio",
    WASHER_PHASE_WASH: "Lavaggio",
    WASHER_PHASE_RINSE: "Risciacquo",
    WASHER_PHASE_SPIN: "Centrifuga",
    WASHER_PHASE_DRYING: "Asciugatura",
    WASHER_PHASE_FINISHED: "Fine ciclo / Antipiega",
}

# Dishwasher Modes (StatoDWash)
DISHWASHER_MODE_OFF: Final = "0"
DISHWASHER_MODE_STANDBY: Final = "1"
DISHWASHER_MODE_RUNNING: Final = "2"
DISHWASHER_MODE_PAUSED: Final = "3"
DISHWASHER_MODE_DELAYED_START: Final = "4"
DISHWASHER_MODE_FINISHED: Final = "5"
DISHWASHER_MODE_ERROR: Final = "6"

DISHWASHER_MODES: Final = {
    DISHWASHER_MODE_OFF: "Spenta / Standby",
    DISHWASHER_MODE_STANDBY: "Pronta / Standby",
    DISHWASHER_MODE_RUNNING: "In funzione",
    DISHWASHER_MODE_PAUSED: "In pausa",
    DISHWASHER_MODE_DELAYED_START: "Partenza ritardata",
    DISHWASHER_MODE_FINISHED: "Ciclo terminato",
    DISHWASHER_MODE_ERROR: "Errore",
}

# Drying Modes (DryT) for Washer-Dryers
DRYING_LEVELS: Final = {
    "0": "Nessuna asciugatura",
    "1": "Stiro Facile (Pronto da stirare)",
    "2": "Asciugatura Armadio (Pronto da riporre)",
    "3": "Extra Asciutto (Capi pesanti e spugne)",
    "30": "A tempo: 30 minuti",
    "60": "A tempo: 60 minuti",
    "90": "A tempo: 90 minuti",
    "120": "A tempo: 120 minuti",
}

# Spin speeds (RPM)
SPIN_SPEEDS: Final = ["0", "400", "600", "800", "1000", "1200", "1400", "1600"]

# Temperatures (°C)
TEMPERATURES: Final = ["0", "20", "30", "40", "50", "60", "90"]

# Soil levels
SOIL_LEVELS: Final = {
    "1": "Leggero",
    "2": "Normale",
    "3": "Intenso",
}

# Common Error Descriptions (Candy error codes E0, E01, E02...)
ERROR_CODES: Final = {
    "E0": "Nessun errore (Funzionamento normale)",
    "E01": "Errore blocco porta / Oblò o sportello non chiuso bene",
    "E02": "Errore carico acqua / Rubinetto chiuso o filtro intasato",
    "E03": "Errore scarico acqua / Filtro pompa bloccato o tubo ostruito",
    "E04": "Errore anti-allagamento / Perdita o troppo pieno",
    "E05": "Errore sonda temperatura acqua NTC",
    "E06": "Errore scheda elettronica / Memoria EEPROM",
    "E07": "Errore motore / Blocco rotazione cestello o tachimetrica",
    "E08": "Errore tachimetrica motore",
    "E09": "Errore triac motore / Modulo di potenza",
    "E10": "Errore sensore selettore programmi",
    "E11": "Errore circuito riscaldamento / Resistenza asciugatura",
    "E12": "Errore comunicazione tra schede",
    "E13": "Errore scheda display / Connessione",
    "E14": "Errore riscaldamento acqua / Resistenza lavaggio",
    "E15": "Errore scheda madre / Mancata programmazione",
    "E16": "Errore isolamento resistenza",
    "E17": "Errore tachimetrica motore",
    "E18": "Errore frequenza alimentazione elettrica",
    "E20": "Errore sensore livello acqua / Pressostato",
    "E21": "Errore surriscaldamento asciugatura",
    "E22": "Errore ventola asciugatura",
}
