#!/usr/bin/env python3
"""Candy Washer-Dryer Real-Time Knob Mapping Tool.

Polls http://192.168.2.73/http-read.json?encrypted=0 and records
telemetry changes as the user turns the physical program dial.
"""

import json
import os
import sys
import time
import urllib.request

HOST = sys.argv[1] if len(sys.argv) > 1 else "192.168.2.73"
URL = f"http://{HOST}/http-read.json?encrypted=0"
MAPPING_FILE = os.path.join(os.path.dirname(__file__), "..", "washer_dial_map.json")


def fetch_status():
    req = urllib.request.Request(URL, headers={"User-Agent": "CandyMapper/1.0"})
    with urllib.request.urlopen(req, timeout=3) as resp:
        data = json.loads(resp.read().decode("utf-8", "ignore"))
        return data.get("statusLavatrice", {})


def main():
    print("=" * 65)
    print("  CANDY WASHER-DRYER REAL-TIME KNOB MAPPING TOOL")
    print(f"  Target: {URL}")
    print("=" * 65)
    print("In attesa di rilevare le posizioni della manopola...")
    print("Gira la manopola posizione per posizione.\n")

    history = {}
    if os.path.exists(MAPPING_FILE):
        try:
            with open(MAPPING_FILE, "r") as f:
                history = json.load(f)
            print(f"Caricate {len(history)} posizioni precedentemente salvate in washer_dial_map.json.\n")
        except Exception:
            history = {}

    last_pr = None
    last_pr_code = None

    while True:
        try:
            st = fetch_status()
            pr = st.get("Pr")
            pr_code = st.get("PrCode")
            temp = st.get("Temp")
            spin_raw = st.get("SpinSp", 0)
            try:
                spin_int = int(spin_raw)
                spin_rpm = spin_int * 100 if spin_int < 20 else spin_int
            except Exception:
                spin_rpm = 0
            dry_t = st.get("DryT", "0")
            rem_time = st.get("RemTime", "0")
            del_val = st.get("DelVal", "0")
            mach_md = st.get("MachMd", "0")

            state_key = f"Pr_{pr}"

            if pr != last_pr or pr_code != last_pr_code:
                last_pr = pr
                last_pr_code = pr_code

                record = {
                    "pr": int(pr) if pr is not None else None,
                    "pr_code": int(pr_code) if pr_code is not None else None,
                    "temp": int(temp) if temp is not None else None,
                    "spin_rpm": spin_rpm,
                    "dry_t": dry_t,
                    "rem_time_raw": rem_time,
                    "del_val": del_val,
                    "mach_md": mach_md,
                    "label": history.get(state_key, {}).get("label", ""),
                }
                history[state_key] = record

                with open(MAPPING_FILE, "w") as f:
                    json.dump(history, f, indent=2)

                print("-" * 65)
                print(f"📍 RILEVATA POSIZIONE MANOPOLA: Pr = {pr} (PrCode = {pr_code})")
                print(f"   • Temperatura default : {temp}°C")
                print(f"   • Centrifuga default  : {spin_rpm} RPM")
                print(f"   • Asciugatura DryT    : {dry_t}")
                print(f"   • Tempo Stimato       : RemTime={rem_time}s / DelVal={del_val}min")
                print(f"   • Stato Macchina      : MachMd={mach_md}")
                if record["label"]:
                    print(f"   • Etichetta Assegnata : \"{record['label']}\"")
                print("-" * 65)

            time.sleep(1)

        except KeyboardInterrupt:
            print("\nMapping terminato dall'utente.")
            break
        except Exception as e:
            # Silent retry on transient ESP timeout
            time.sleep(1)


if __name__ == "__main__":
    main()
