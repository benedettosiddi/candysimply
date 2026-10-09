"""Unit tests for Candy Simply-Fi XOR encryption and key recovery."""

import importlib.util
import json
import os
import sys

client_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "custom_components", "candy_simplyfi", "client.py"))
spec = importlib.util.spec_from_file_location("candy_client", client_path)
client_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client_mod)

decrypt_hex_response = client_mod.decrypt_hex_response
encrypt_payload = client_mod.encrypt_payload
recover_xor_key = client_mod.recover_xor_key
xor_bytes = client_mod.xor_bytes



def test_xor_symmetry():
    key = "1234567890abcdef"
    original = "StartStop=1&Program=P3&TreinUno=1"
    encrypted_hex = encrypt_payload(original, key)
    decrypted = decrypt_hex_response(encrypted_hex, key)
    assert decrypted == original


def test_key_recovery_compact_washer():
    key = "ABCDEF0123456789"
    payload = json.dumps({
        "statusLavatrice": {
            "MachMd": "1",
            "Pr": "1",
            "RemTime": "3600",
            "Temp": "40",
            "SpinSp": "10",
        }
    })
    encrypted_hex = encrypt_payload(payload, key)
    recovered = recover_xor_key(encrypted_hex)
    assert recovered is not None
    recovered_key, data = recovered
    assert recovered_key == key
    assert data["statusLavatrice"]["MachMd"] == "1"


def test_key_recovery_crlf_tabs_washer():
    """Real Candy firmware returns pretty-printed JSON with CRLF and tabs."""
    key = "mysecretkey12345"
    raw_json = '{\r\n\t"statusLavatrice":{\r\n\t\t"MachMd":"2",\r\n\t\t"Pr":"16",\r\n\t\t"RemTime":"1800"\r\n\t}\r\n}'
    encrypted_hex = encrypt_payload(raw_json, key)
    recovered = recover_xor_key(encrypted_hex)
    assert recovered is not None
    recovered_key, data = recovered
    assert recovered_key == key
    assert data["statusLavatrice"]["MachMd"] == "2"


def test_key_recovery_dishwasher():
    key = "dishwashkey99999"
    payload = json.dumps({
        "statusDWash": {
            "StatoDWash": "2",
            "Program": "P1",
            "RemTime": "120",
            "MetaCarico": "0",
            "TreinUno": "1",
        }
    })
    encrypted_hex = encrypt_payload(payload, key)
    recovered = recover_xor_key(encrypted_hex)
    assert recovered is not None
    recovered_key, data = recovered
    assert recovered_key == key
    assert data["statusDWash"]["Program"] == "P1"


def test_key_recovery_dishwasher_pretty():
    key = "candytestkey1234"
    raw_json = '{\r\n\t"statusDWash":{\r\n\t\t"StatoDWash":"1",\r\n\t\t"Program":"P3"\r\n\t}\r\n}'
    encrypted_hex = encrypt_payload(raw_json, key)
    recovered = recover_xor_key(encrypted_hex)
    assert recovered is not None
    recovered_key, data = recovered
    assert recovered_key == key


if __name__ == "__main__":
    test_xor_symmetry()
    test_key_recovery_compact_washer()
    test_key_recovery_crlf_tabs_washer()
    test_key_recovery_dishwasher()
    test_key_recovery_dishwasher_pretty()
    print("ALL ENCRYPTION & KEY RECOVERY TESTS PASSED 100%!")
