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
    assert len(WASHER_PROGRAMS) >= 15
    assert "cottons_resistant" in WASHER_PROGRAMS
    assert "cottons_standard" in WASHER_PROGRAMS
    assert "synthetics_colored" in WASHER_PROGRAMS
    assert "wool" in WASHER_PROGRAMS
    assert "delicates" in WASHER_PROGRAMS
    assert "rinse" in WASHER_PROGRAMS
    assert "drain_spin" in WASHER_PROGRAMS
    assert "drain_only" in WASHER_PROGRAMS
    assert "steam_refresh" in WASHER_PROGRAMS
    assert "drying" in WASHER_PROGRAMS

    # Check verified dial lookups
    p1 = get_washer_program_by_pr(1, 65)
    assert p1 is not None and p1.id == "cottons_resistant"

    p2 = get_washer_program_by_pr(2, 2)
    assert p2 is not None and p2.id == "cottons_standard"

    p3 = get_washer_program_by_pr(3, 3)
    assert p3 is not None and p3.id == "synthetics_colored"

    p4 = get_washer_program_by_pr(4, 5)
    assert p4 is not None and p4.id == "wool"

    p5 = get_washer_program_by_pr(5, 4)
    assert p5 is not None and p5.id == "delicates"

    p7 = get_washer_program_by_pr(7, 35)
    assert p7 is not None and p7.id == "rinse"

    p8_spin = get_washer_program_by_pr(8, 129, spin_val=1000)
    assert p8_spin is not None and p8_spin.id == "drain_spin"

    p8_drain = get_washer_program_by_pr(8, 129, spin_val=0)
    assert p8_drain is not None and p8_drain.id == "drain_only"

    p9_refresh = get_washer_program_by_pr(9, 17, spin_val=0)
    assert p9_refresh is not None and p9_refresh.id == "steam_refresh"

    p9_wash = get_washer_program_by_pr(9, 17, spin_val=1000)
    assert p9_wash is not None and p9_wash.id == "steam_easy_iron"

    p10 = get_washer_program_by_pr(10, 0)
    assert p10 is not None and p10.id == "drying" and p10.is_dry_only


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
