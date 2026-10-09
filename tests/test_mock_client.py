"""Async integration test testing CandyLocalClient against a mock appliance."""

import asyncio
import importlib.util
import json
import os
import sys
from aiohttp import web

client_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "custom_components", "candy_simplyfi", "client.py"))
spec = importlib.util.spec_from_file_location("candy_client", client_path)
client_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client_mod)

CandyLocalClient = client_mod.CandyLocalClient
encrypt_payload = client_mod.encrypt_payload

TEST_KEY = "0123456789ABCDEF"
MOCK_WASHER_STATUS = '{\r\n\t"statusLavatrice":{\r\n\t\t"WiFiStatus":"1",\r\n\t\t"MachMd":"2",\r\n\t\t"Pr":"16",\r\n\t\t"PrPh":"2",\r\n\t\t"RemTime":"2400",\r\n\t\t"Temp":"60",\r\n\t\t"SpinSp":"12",\r\n\t\t"DryT":"0",\r\n\t\t"CodiceErrore":"E0"\r\n\t}\r\n}'


async def mock_read_handler(request):
    enc = request.query.get("encrypted", "0")
    # Simulate real Candy appliance that requires encrypted=1 and rejects encrypted=0 with 400
    if enc == "0":
        return web.Response(status=400, text="BAD REQUEST")
    cipher_hex = encrypt_payload(MOCK_WASHER_STATUS, TEST_KEY)
    return web.Response(text=cipher_hex)


async def mock_write_handler(request):
    return web.Response(text='{"status":"SUCCESS"}')


async def run_integration_test():
    app = web.Application()
    app.router.add_get("/http-read.json", mock_read_handler)
    app.router.add_get("/http-write.json", mock_write_handler)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 8765)
    await site.start()

    try:
        # Test 1: Client with auto-recovery of key over network when device requires encryption
        client = CandyLocalClient(host="127.0.0.1:8765", key=None)
        status = await client.async_read_status()
        assert status is not None
        assert "statusLavatrice" in status
        assert client.key == TEST_KEY
        assert client.use_encryption is True
        print(f"[TEST 1 PASS] Key successfully auto-recovered over HTTP: {client.key}")

        # Test 2: Start washer program write (encrypted)
        write_ok = await client.async_start_program_washer(
            pr=16,
            pr_code=21,
            temp=60,
            spin=1200,
        )
        assert write_ok is True
        print("[TEST 2 PASS] Start program command encrypted and sent properly!")

        # Test 3: Stop / Reset
        stop_ok = await client.async_stop_or_reset()
        assert stop_ok is True
        print("[TEST 3 PASS] Stop/Reset command sent successfully!")

        # Test 4: Beep
        beep_ok = await client.async_beep_buzzer()
        assert beep_ok is True
        print("[TEST 4 PASS] Buzzer chime command sent successfully!")

        await client.close()
        print("\nALL CLIENT INTEGRATION TESTS PASSED 100%!")

    finally:
        await runner.cleanup()


if __name__ == "__main__":
    asyncio.run(run_integration_test())
