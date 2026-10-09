"""Unit tests for Candy Simply-Fi programs database and helpers."""

import importlib.util
import os
import sys

prog_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "custom_components", "candy_simplyfi", "programs.py"))
spec = importlib.util.spec_from_file_location("candy_programs", prog_path)
prog_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prog_mod)

WASHER_PROGRAMS = prog_mod.WASHER_PROGRAMS
DISHWASHER_PROGRAMS = prog_mod.DISHWASHER_PROGRAMS
get_washer_program_by_pr = prog_mod.get_washer_program_by_pr
get_dishwasher_program_by_code = prog_mod.get_dishwasher_program_by_code
format_remaining_time = prog_mod.format_remaining_time


def test_dishwasher_programs_count():
    assert len(DISHWASHER_PROGRAMS) >= 20
    assert "P1" in DISHWASHER_PROGRAMS
    assert "P2" in DISHWASHER_PROGRAMS
    assert "P3" in DISHWASHER_PROGRAMS
    assert "P24" in DISHWASHER_PROGRAMS
    
    p1 = get_dishwasher_program_by_code("P1")
    assert p1 is not None
    assert p1.temp == 45
    assert "ECO" in p1.name_it

    p2 = get_dishwasher_program_by_code("p2")
    assert p2 is not None
    assert p2.temp == 75
    assert "Intensivo" in p2.name_it


def test_washer_programs_count():
    assert len(WASHER_PROGRAMS) >= 25
    assert "cottons" in WASHER_PROGRAMS
    assert "wd_wash_dry_59" in WASHER_PROGRAMS
    assert "autoclean" in WASHER_PROGRAMS
    assert "pet_hair" in WASHER_PROGRAMS

    # Check Pr lookup
    prog = get_washer_program_by_pr(1, 1)
    assert prog is not None
    assert prog.pr == 1

    # Check extended program lookup by pr_code
    pet_hair_prog = get_washer_program_by_pr(15, 29)
    assert pet_hair_prog is not None
    assert "Animali" in pet_hair_prog.name_it

    # Check steam refresh lookup (Pr 15, PrCode 45)
    steam_prog = get_washer_program_by_pr(15, 45)
    assert steam_prog is not None
    assert steam_prog.id == "wd_steam_refresh"
    assert "Vapore" in steam_prog.name_it

    # Check easy iron lookup (Pr 13, PrCode 30)
    easy_iron = get_washer_program_by_pr(13, 30)
    assert easy_iron is not None
    assert easy_iron.id == "easy_iron"
    assert "Stiro Facile" in easy_iron.name_it


def test_time_formatting():
    assert format_remaining_time(0) == "Completato / Pronto"
    assert format_remaining_time(3600) == "1h 00m"
    assert format_remaining_time(5400) == "1h 30m"
    assert format_remaining_time(2700) == "45 min"
    assert format_remaining_time(45, is_dishwasher=True) == "45 min"
    assert format_remaining_time("invalid") == "N/D"


if __name__ == "__main__":
    test_dishwasher_programs_count()
    test_washer_programs_count()
    test_time_formatting()
    print("ALL PROGRAM TESTS PASSED 100%!")
