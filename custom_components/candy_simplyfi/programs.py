"""Comprehensive database of programs for Candy Simply-Fi appliances."""

from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class WasherProgram:
    id: str
    name_it: str
    name_en: str
    pr: int
    pr_code: Optional[int] = None
    default_temp: int = 40
    max_temp: int = 90
    default_spin: int = 1000
    max_spin: int = 1400
    supports_drying: bool = True
    supports_steam: bool = False
    description: str = ""

@dataclass
class DishwasherProgram:
    id: str
    code: str
    name_it: str
    name_en: str
    temp: int
    duration_approx: int  # minutes
    description: str = ""
    supports_extra_dry: bool = True
    supports_half_load: bool = True
    supports_tabs: bool = True
    supports_open_door: bool = True

# All Washer & Washer-Dryer Programs
WASHER_PROGRAMS: Dict[str, WasherProgram] = {
    # --- Programmi Fisici Selettore Manopola (Knob Dial Programs) ---
    "cottons": WasherProgram(
        id="cottons",
        name_it="Cotone Resistente / Bianchi",
        name_en="Resistant Cottons",
        pr=1,
        pr_code=1,
        default_temp=60,
        max_temp=90,
        default_spin=1400,
        max_spin=1600,
        supports_drying=True,
        supports_steam=True,
        description="Ciclo per cotone resistente, tovaglie e biancheria molto sporca.",
    ),
    "cottons_prewash": WasherProgram(
        id="cottons_prewash",
        name_it="Cotone + Prelavaggio",
        name_en="Cottons + Prewash",
        pr=2,
        pr_code=2,
        default_temp=60,
        max_temp=90,
        default_spin=1400,
        max_spin=1600,
        supports_drying=True,
        description="Cotone con fase di prelavaggio per macchie ostinate.",
    ),
    "eco_40_60": WasherProgram(
        id="eco_40_60",
        name_it="Eco 40-60",
        name_en="Eco 40-60",
        pr=3,
        pr_code=3,
        default_temp=40,
        max_temp=60,
        default_spin=1400,
        max_spin=1400,
        supports_drying=True,
        description="Massima efficienza energetica secondo normativa UE.",
    ),
    "wash_20": WasherProgram(
        id="wash_20",
        name_it="Eco 20°C (Lavaggio a Freddo)",
        name_en="Eco 20°C Wash",
        pr=4,
        pr_code=4,
        default_temp=20,
        max_temp=20,
        default_spin=1000,
        max_spin=1400,
        supports_drying=True,
        description="Lavaggio a bassa temperatura ad alta resa per capi misti.",
    ),
    "synthetics": WasherProgram(
        id="synthetics",
        name_it="Sintetici & Misti Colorati",
        name_en="Synthetics & Mixed",
        pr=5,
        pr_code=5,
        default_temp=40,
        max_temp=60,
        default_spin=1000,
        max_spin=1200,
        supports_drying=True,
        supports_steam=True,
        description="Tessuti sintetici, camicie e fibre miste resistenti.",
    ),
    "daily_59": WasherProgram(
        id="daily_59",
        name_it="Giornaliero 59' / All In One 59'",
        name_en="Daily 59 Min / All In One",
        pr=6,
        pr_code=15,
        default_temp=40,
        max_temp=40,
        default_spin=1000,
        max_spin=1400,
        supports_drying=True,
        supports_steam=True,
        description="Lavaggio energico completo in meno di un'ora.",
    ),
    "rapid_14": WasherProgram(
        id="rapid_14",
        name_it="Rapido 14 Minuti",
        name_en="Rapid 14 Min",
        pr=7,
        pr_code=12,
        default_temp=30,
        max_temp=30,
        default_spin=1000,
        max_spin=1000,
        supports_drying=False,
        description="Rinfresco ultra veloce per carichi leggeri (fino a 1.5kg).",
    ),
    "rapid_30": WasherProgram(
        id="rapid_30",
        name_it="Rapido 30 Minuti",
        name_en="Rapid 30 Min",
        pr=7,
        pr_code=13,
        default_temp=30,
        max_temp=40,
        default_spin=1000,
        max_spin=1200,
        supports_drying=True,
        description="Ciclo veloce per carichi mediamente sporchi fino a 2.5kg.",
    ),
    "rapid_44": WasherProgram(
        id="rapid_44",
        name_it="Rapido 44 Minuti",
        name_en="Rapid 44 Min",
        pr=7,
        pr_code=14,
        default_temp=40,
        max_temp=40,
        default_spin=1000,
        max_spin=1400,
        supports_drying=True,
        description="Ottimo compromesso tempo e pulizia fino a 3.5kg.",
    ),
    "rinse": WasherProgram(
        id="rinse",
        name_it="Solo Risciacqui",
        name_en="Rinse Only",
        pr=8,
        pr_code=10,
        default_temp=0,
        max_temp=0,
        default_spin=1000,
        max_spin=1400,
        supports_drying=False,
        description="3 risciacqui con centrifuga intermedia e finale.",
    ),
    "drain_spin": WasherProgram(
        id="drain_spin",
        name_it="Scarico & Centrifuga",
        name_en="Drain & Spin",
        pr=9,
        pr_code=11,
        default_temp=0,
        max_temp=0,
        default_spin=1000,
        max_spin=1600,
        supports_drying=False,
        description="Scarico rapido dell'acqua con centrifuga finale regolabile.",
    ),
    "delicates": WasherProgram(
        id="delicates",
        name_it="Delicati",
        name_en="Delicates",
        pr=10,
        pr_code=7,
        default_temp=30,
        max_temp=40,
        default_spin=800,
        max_spin=800,
        supports_drying=False,
        description="Capi delicati, pizzo, viscosa e tessuti fini.",
    ),
    "wool_silk": WasherProgram(
        id="wool_silk",
        name_it="Lana & Seta / Lavaggio a Mano",
        name_en="Wool & Silk / Hand Wash",
        pr=11,
        pr_code=8,
        default_temp=30,
        max_temp=40,
        default_spin=800,
        max_spin=800,
        supports_drying=False,
        description="Movimento basculante ultra-delicato per capi in pura lana e seta.",
    ),
    "hygiene_60": WasherProgram(
        id="hygiene_60",
        name_it="Igiene 60°C / Baby Care",
        name_en="Hygiene 60°C / Baby Care",
        pr=12,
        pr_code=21,
        default_temp=60,
        max_temp=60,
        default_spin=1200,
        max_spin=1400,
        supports_drying=True,
        supports_steam=True,
        description="Elimina acari, batteri e allergeni mantenendo 60° costanti.",
    ),
    "easy_iron": WasherProgram(
        id="easy_iron",
        name_it="Stiro Facile / Vapore Refresh",
        name_en="Easy Iron / Steam Refresh",
        pr=13,
        pr_code=45,
        default_temp=30,
        max_temp=40,
        default_spin=800,
        max_spin=1000,
        supports_drying=False,
        supports_steam=True,
        description="Azione combinata di vapore e centrifuga dolce per ridurre le pieghe.",
    ),
    "sport_fitness": WasherProgram(
        id="sport_fitness",
        name_it="Sport & Abbigliamento Tecnico",
        name_en="Sport & Fitness",
        pr=14,
        pr_code=23,
        default_temp=30,
        max_temp=40,
        default_spin=800,
        max_spin=1000,
        supports_drying=False,
        description="Protegge le membrane impermeabili e l'elasticità dei capi sportivi.",
    ),

    # --- Programmi Aggiuntivi Speciali & Downloadable (WA_PROG / DUAL_WM_WD) ---
    "autoclean": WasherProgram(
        id="autoclean",
        name_it="Pulizia Cestello & Sanificazione (Auto-Clean)",
        name_en="Drum Auto-Clean",
        pr=15,
        pr_code=28,
        default_temp=60,
        max_temp=90,
        default_spin=800,
        max_spin=1000,
        supports_drying=False,
        description="Manutenzione vasca, elimina cattivi odori e residui.",
    ),
    "jeans": WasherProgram(
        id="jeans",
        name_it="Jeans & Denim",
        name_en="Jeans & Denim",
        pr=15,
        pr_code=22,
        default_temp=40,
        max_temp=40,
        default_spin=1000,
        max_spin=1200,
        supports_drying=True,
        description="Protegge la trama del denim ed evita righe da centrifuga.",
    ),
    "duvet": WasherProgram(
        id="duvet",
        name_it="Piumoni & Imbottiti",
        name_en="Duvet & Quilts",
        pr=15,
        pr_code=24,
        default_temp=40,
        max_temp=40,
        default_spin=800,
        max_spin=1000,
        supports_drying=True,
        description="Bilanciamento speciale per capi voluminosi e piumini.",
    ),
    "curtains": WasherProgram(
        id="curtains",
        name_it="Tende & Tendaggi",
        name_en="Curtains",
        pr=15,
        pr_code=25,
        default_temp=30,
        max_temp=30,
        default_spin=400,
        max_spin=400,
        supports_drying=False,
        description="Acqua abbondante e centrifuga quasi assente per preservare le pieghe.",
    ),
    "dark_garments": WasherProgram(
        id="dark_garments",
        name_it="Capi Scuri & Neri",
        name_en="Dark Garments",
        pr=15,
        pr_code=26,
        default_temp=30,
        max_temp=40,
        default_spin=1000,
        max_spin=1000,
        supports_drying=True,
        description="Preserva i pigmenti scuri evitando lo sbiadimento.",
    ),
    "shirts": WasherProgram(
        id="shirts",
        name_it="Camicie",
        name_en="Shirts",
        pr=15,
        pr_code=27,
        default_temp=30,
        max_temp=40,
        default_spin=800,
        max_spin=800,
        supports_drying=True,
        supports_steam=True,
        description="Trattamento vapore e rotazione dolce per camicie facili da stirare.",
    ),
    "pet_hair": WasherProgram(
        id="pet_hair",
        name_it="Rimozione Peli di Animali",
        name_en="Pet Hair Removal",
        pr=15,
        pr_code=29,
        default_temp=40,
        max_temp=60,
        default_spin=1000,
        max_spin=1200,
        supports_drying=True,
        description="Ciclo con getti d'acqua e risciacqui mirati per staccare peli da coperte e vestiti.",
    ),

    # --- Programmi Combinati Lavaggio + Asciugatura & Solo Asciugatura (Lavasciuga) ---
    "wd_wash_dry_59": WasherProgram(
        id="wd_wash_dry_59",
        name_it="Lava & Asciuga 59 Minuti (Completo)",
        name_en="Wash & Dry 59 Min",
        pr=15,
        pr_code=40,
        default_temp=30,
        max_temp=40,
        default_spin=1400,
        max_spin=1400,
        supports_drying=True,
        description="Lava e asciuga fino a 1.5kg in soli 59 minuti.",
    ),
    "wd_auto_care": WasherProgram(
        id="wd_auto_care",
        name_it="Auto Care Lava & Asciuga Quotidiano",
        name_en="Auto Care Wash & Dry",
        pr=15,
        pr_code=41,
        default_temp=40,
        max_temp=60,
        default_spin=1400,
        max_spin=1400,
        supports_drying=True,
        description="Ciclo completo di lavaggio e asciugatura continua senza interruzioni.",
    ),
    "wd_dry_cotton": WasherProgram(
        id="wd_dry_cotton",
        name_it="Solo Asciugatura Cotone (Alta Temperatura)",
        name_en="Dry Cottons (High Heat)",
        pr=15,
        pr_code=42,
        default_temp=0,
        max_temp=0,
        default_spin=0,
        max_spin=0,
        supports_drying=True,
        description="Asciugatura potente per lenzuola, tovaglie e spugne.",
    ),
    "wd_dry_synthetic": WasherProgram(
        id="wd_dry_synthetic",
        name_it="Solo Asciugatura Sintetici & Misti (Media Temperatura)",
        name_en="Dry Synthetics (Low Heat)",
        pr=15,
        pr_code=43,
        default_temp=0,
        max_temp=0,
        default_spin=0,
        max_spin=0,
        supports_drying=True,
        description="Asciugatura delicata per fibre sintetiche e capi misti.",
    ),
    "wd_dry_wool": WasherProgram(
        id="wd_dry_wool",
        name_it="Solo Asciugatura Delicata Lana",
        name_en="Dry Wool",
        pr=15,
        pr_code=44,
        default_temp=0,
        max_temp=0,
        default_spin=0,
        max_spin=0,
        supports_drying=True,
        description="Asciugatura a temperatura controllata per capi in lana adatti.",
    ),
    "wd_steam_refresh": WasherProgram(
        id="wd_steam_refresh",
        name_it="Rinfresca a Vapore & Deodora",
        name_en="Steam Refresh & Deodorize",
        pr=15,
        pr_code=45,
        default_temp=0,
        max_temp=0,
        default_spin=0,
        max_spin=0,
        supports_drying=False,
        supports_steam=True,
        description="Elimina odori e distende le pieghe in 25 minuti senza lavare.",
    ),
}

# All Dishwasher Programs (Lavastoviglie P1 .. P24+)
DISHWASHER_PROGRAMS: Dict[str, DishwasherProgram] = {
    "P1": DishwasherProgram(
        id="P1",
        code="P1",
        name_it="ECO 45°C",
        name_en="ECO 45°C",
        temp=45,
        duration_approx=230,
        description="Massima efficienza energetica ed idrica (normativa EN 50242).",
    ),
    "P2": DishwasherProgram(
        id="P2",
        code="P2",
        name_it="Intensivo 75°C",
        name_en="Intensive 75°C",
        temp=75,
        duration_approx=130,
        description="Per pentole, padelle e stoviglie molto incrostate.",
    ),
    "P3": DishwasherProgram(
        id="P3",
        code="P3",
        name_it="Universale / Normale 60°C",
        name_en="Universal 60°C",
        temp=60,
        duration_approx=120,
        description="Ciclo quotidiano standard per carichi normalmente sporchi.",
    ),
    "P4": DishwasherProgram(
        id="P4",
        code="P4",
        name_it="Zoom 39' / Daily 39' (60°C)",
        name_en="Zoom 39 Min",
        temp=60,
        duration_approx=39,
        description="Ciclo rapido completo in classe A in soli 39 minuti.",
    ),
    "P5": DishwasherProgram(
        id="P5",
        code="P5",
        name_it="Rapido 24' (50°C)",
        name_en="Rapid 24 Min",
        temp=50,
        duration_approx=24,
        supports_extra_dry=False,
        description="Lavaggio ultrarapido per stoviglie poco sporche subito dopo il pasto.",
    ),
    "P6": DishwasherProgram(
        id="P6",
        code="P6",
        name_it="Prelavaggio / Ammollo a Freddo (5 Min)",
        name_en="Prewash / Cold Rinse",
        temp=0,
        duration_approx=5,
        supports_extra_dry=False,
        supports_half_load=False,
        description="Risciacquo breve a freddo per evitare che i residui si secchino.",
    ),
    "P7": DishwasherProgram(
        id="P7",
        code="P7",
        name_it="Igienizzante Antibatterico 75°C",
        name_en="Sanitizing 75°C",
        temp=75,
        duration_approx=140,
        description="Azione antibatterica testata per taglieri, piatti e accessori neonati.",
    ),
    "P8": DishwasherProgram(
        id="P8",
        code="P8",
        name_it="Intensivo Rapido 60' (65°C)",
        name_en="Intensive Rapid 60 Min",
        temp=65,
        duration_approx=60,
        description="Lavaggio energico veloce per carichi con unto e grasso.",
    ),
    "P9": DishwasherProgram(
        id="P9",
        code="P9",
        name_it="Universale Plus 65°C",
        name_en="Universal Plus 65°C",
        temp=65,
        duration_approx=135,
        description="Lavaggio quotidiano potenziato per sporco ostinato.",
    ),
    "P10": DishwasherProgram(
        id="P10",
        code="P10",
        name_it="Sensore Automatico Quotidiano (55-65°C)",
        name_en="Auto Daily Sensor",
        temp=60,
        duration_approx=110,
        description="Sensore ottico di torbidità per calibrare tempo e consumo.",
    ),
    "P11": DishwasherProgram(
        id="P11",
        code="P11",
        name_it="Notturno Silenzioso 55°C",
        name_en="Night Silent 55°C",
        temp=55,
        duration_approx=240,
        description="Pressione getti ridotta per il minimo rumore durante le ore notturne.",
    ),
    "P12": DishwasherProgram(
        id="P12",
        code="P12",
        name_it="Delicati & Cristalli 45°C",
        name_en="Delicates & Crystal 45°C",
        temp=45,
        duration_approx=85,
        description="Pressione e temperatura controllate per bicchieri preziosi e porcellane.",
    ),
    "P13": DishwasherProgram(
        id="P13",
        code="P13",
        name_it="Classe A 1 Ora (60°C)",
        name_en="Class A 1 Hour",
        temp=60,
        duration_approx=60,
        description="Ciclo di lavaggio e asciugatura in 60 minuti.",
    ),
    "P14": DishwasherProgram(
        id="P14",
        code="P14",
        name_it="Pulizia Vasca / Manutenzione 70°C (Self-Clean)",
        name_en="Self-Clean / Machine Care",
        temp=70,
        duration_approx=45,
        description="Programma speciale di manutenzione e sgrassaggio a vuoto con cura-lavastoviglie.",
    ),
    "P15": DishwasherProgram(
        id="P15",
        code="P15",
        name_it="Auto All-in-One 65°C",
        name_en="Auto All-in-One",
        temp=65,
        duration_approx=125,
        description="Sensore intelligente per carichi misti (piatti e padelle insieme).",
    ),
    "P16": DishwasherProgram(
        id="P16",
        code="P16",
        name_it="Lavaggio a Vapore 70°C (Steam Wash)",
        name_en="Steam Wash 70°C",
        temp=70,
        duration_approx=150,
        description="Azione combinata di vapore e alta pressione contro il cibo incrostato.",
    ),
    "P17": DishwasherProgram(
        id="P17",
        code="P17",
        name_it="Baby Care 70°C",
        name_en="Baby Care 70°C",
        temp=70,
        duration_approx=120,
        description="Igienizzazione speciale biberon, ciucci e stoviglie prima infanzia.",
    ),
    "P18": DishwasherProgram(
        id="P18",
        code="P18",
        name_it="Bicchieri & Calici da Vino 40°C",
        name_en="Wine Glasses & Goblets",
        temp=40,
        duration_approx=70,
        description="Risciacquo brillante senza macchie di calcare e aloni.",
    ),
    "P19": DishwasherProgram(
        id="P19",
        code="P19",
        name_it="Stoviglie in Plastica 50°C",
        name_en="Plastic Care 50°C",
        temp=50,
        duration_approx=90,
        description="Asciugatura speciale per contenitori e stoviglie in plastica.",
    ),
    "P20": DishwasherProgram(
        id="P20",
        code="P20",
        name_it="Bicchieri da Birra & Party 45°C",
        name_en="Beer & Party Glasses",
        temp=45,
        duration_approx=50,
        description="Ciclo rapido per bicchieri e calici da festa.",
    ),
    "P21": DishwasherProgram(
        id="P21",
        code="P21",
        name_it="Teglie, Leccarde & Filtri Cappa 75°C",
        name_en="Cookware & Baking Trays",
        temp=75,
        duration_approx=160,
        description="Pressione potenziata sul cesto inferiore per rimuovere grasso bruciato.",
    ),
    "P22": DishwasherProgram(
        id="P22",
        code="P22",
        name_it="Scongelamento Delicato / Rinfresco",
        name_en="Defrost & Refresh",
        temp=0,
        duration_approx=20,
        description="Scongelamento delicato e rinfresco stoviglie impolverate.",
    ),
    "P23": DishwasherProgram(
        id="P23",
        code="P23",
        name_it="Eco Mezzo Carico 45°C",
        name_en="Eco Half Load",
        temp=45,
        duration_approx=140,
        description="Consumo minimo per mezzo cestello.",
    ),
    "P24": DishwasherProgram(
        id="P24",
        code="P24",
        name_it="Igienizzazione Rapida 50' (65°C)",
        name_en="Fast Hygiene 50 Min",
        temp=65,
        duration_approx=50,
        description="Igiene e sanificazione rapida in soli 50 minuti.",
    ),
}

def get_washer_program_by_pr(pr_val: int, pr_code_val: Optional[int] = None) -> Optional[WasherProgram]:
    """Find washer program matching Pr and optionally PrCode."""
    if pr_code_val is not None:
        for prog in WASHER_PROGRAMS.values():
            if prog.pr_code == pr_code_val:
                return prog
    for prog in WASHER_PROGRAMS.values():
        if prog.pr == pr_val:
            return prog
    return None

def get_dishwasher_program_by_code(code_str: str) -> Optional[DishwasherProgram]:
    """Find dishwasher program matching code like 'P1', 'P2', '1', etc."""
    clean_code = str(code_str).strip().upper()
    if not clean_code.startswith("P"):
        clean_code = f"P{clean_code}"
    return DISHWASHER_PROGRAMS.get(clean_code)

def format_remaining_time(raw_val: any, is_dishwasher: bool = False) -> str:
    """Format remaining time into human readable '1h 30m' or '45 min' string."""
    try:
        val = int(raw_val)
    except (ValueError, TypeError):
        return "N/D"

    if val <= 0:
        return "Completato / Pronto"

    if is_dishwasher:
        # Dishwashers transmit RemTime in minutes directly
        minutes = val
    else:
        # Candy washers transmit RemTime in seconds
        minutes = round(val / 60)

    hours = minutes // 60
    rem_min = minutes % 60
    if hours > 0:
        return f"{hours}h {rem_min:02d}m"
    return f"{rem_min} min"
