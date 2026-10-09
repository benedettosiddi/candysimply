---
title: Candy Simply-Fi Local
description: Instructions on how to integrate Candy and Hoover Simply-Fi appliances locally with Home Assistant.
ha_category:
  - Hub
ha_release: 2024.11
ha_iot_class: Local Polling
ha_config_flow: true
ha_codeowners:
  - '@benedettosiddi'
ha_domain: candy_simplyfi
ha_platforms:
  - binary_sensor
  - button
  - number
  - select
  - sensor
  - switch
ha_integration_type: device
---

The **Candy Simply-Fi Local** integration allows you to monitor and control Candy and Hoover smart appliances (such as washer-dryers, washing machines, and dishwashers) completely locally over your home Wi-Fi network, without depending on external cloud services or the vendor's proprietary mobile app.

## Prerequisites

1. The appliance must already be connected to your local Wi-Fi network (2.4 GHz).
2. It is strongly recommended to configure a static IP or DHCP reservation on your home router for each appliance.
3. For newer models (built after 2018–2019), communication is encrypted with a 16-character hexadecimal key (derived from the serial number or retrieved automatically by this integration during pairing).

{% note %}
Physical Safety Notice: To accept remote cycle start and configuration commands over Wi-Fi, the appliance dial knob must be set to the **Wi-Fi** position.
{% endnote %}

## Supported Devices

- **Washer-Dryers (Lavasciuga)**: Full control of wash cycles, spin speeds, water temperatures, and timed/sensor drying levels.
- **Washing Machines (Lavatrici)**: Monitoring and cycle selection across all programs and options.
- **Dishwashers (Lavastoviglie)**: Program selection, options (half load, 3-in-1 tablets, extra dry, automatic door opening), and salt/rinse-aid status.

## Configuration

{% include integrations/config_flow.md %}

1. Browse to your Home Assistant instance.
2. Go to **Settings** > **Devices & Services**.
3. In the bottom right corner, select **Add Integration**.
4. Search for **Candy Simply-Fi Local** and select it.
5. Follow the on-screen configuration wizard:
   - **IP Address**: Enter the local IP address of your appliance (e.g., `192.168.1.50`).
   - **Appliance Type**: Choose between *Washer-Dryer*, *Washing Machine*, *Dishwasher*, or *Auto Detect*.
   - **Encryption Key**: Enter your 16-character key, or leave blank to enable auto-detection.
   - **Use Encryption**: Enable if your model uses XOR payload encryption.

## Entities

The integration creates a structured device with the following entities:

### Sensors

- **Status (`sensor.<device>_status`)**: Current operational state (*Standby*, *Running*, *Paused*, *Delayed Start*, *Finished*, *Fault*).
- **Active Program (`sensor.<device>_program`)**: Current program name with duration and description.
- **Remaining Time (`sensor.<device>_remaining_time`)**: Formatted cycle time countdown (`HH:MM`).
- **Cycle Phase (`sensor.<device>_program_phase`)**: Active phase (*Prewash*, *Main Wash*, *Rinse*, *Spin*, *Drying*, *Anti-crease*).
- **Water Temperature (`sensor.<device>_temperature`)**: Actual bath water temperature.
- **Spin Speed (`sensor.<device>_spin_speed`)**: Centrifuge RPM rate.
- **Drying Level (`sensor.<device>_drying_level`)**: Target drying setting (*Iron*, *Cupboard*, *Extra Dry*, or timed minutes).
- **Error Code (`sensor.<device>_error_code`)**: Diagnostic fault code (from `E01` to `E22`) with human-readable fault explanation.

### Binary Sensors

- **Running (`binary_sensor.<device>_running`)**: Indicates if a program is actively in progress.
- **Porthole / Door Locked (`binary_sensor.<device>_door_locked`)**: Indicates whether safety door lock is engaged.
- **Door Open (`binary_sensor.<device>_door_open`)**: Indicates if the dishwasher door is open.
- **Missing Salt (`binary_sensor.<device>_missing_salt`)**: Warning indicator when regenerative water softener salt is depleted.
- **Missing Rinse Aid (`binary_sensor.<device>_missing_rinse_aid`)**: Warning indicator when rinse aid reservoir is empty.
- **Remote Control Enabled (`binary_sensor.<device>_remote_control`)**: Confirms physical dial knob is turned to Wi-Fi mode.
- **Problem / Fault (`binary_sensor.<device>_problem`)**: Flags hardware or drainage malfunctions.

### Select Entities

- **Program (`select.<device>_program`)**: Full program library containing all standard and special cycles.
- **Temperature (`select.<device>_temperature`)**: Selectable wash temperatures (Cold to 90°C).
- **Spin Speed (`select.<device>_spin_speed`)**: Spin speed steps (No spin up to 1600 RPM).
- **Drying Level (`select.<device>_drying_level`)**: Drying target settings for washer-dryers.

### Switches

- Washer options: *Prewash*, *Hygiene+*, *Extra Rinse*, *Easy Iron (Anti-crease)*, *Steam Treatment*.
- Dishwasher options: *Half Load*, *3-in-1 Detergent Tabs*, *Extra Dry*, *Smart Open Door*, *Eco Mode*.

### Buttons

- **Start Program (`button.<device>_start_program`)**: Transmits and starts the staged program with all selected options.
- **Pause (`button.<device>_pause`)**: Pauses the current cycle.
- **Stop / Reset (`button.<device>_stop_reset`)**: Cancels the running cycle and drains the tub.
- **Buzzer / Beep (`button.<device>_buzzer`)**: Triggers the machine's audible chime.

### Numbers

- **Delayed Start (`number.<device>_delay_start`)**: Sets scheduled departure delay from 0 to 24 hours.

## Automation Examples

### Notify smartphone when cycle completes

```yaml
alias: "Candy: Laundry Finished Notification"
trigger:
  - platform: state
    entity_id: sensor.candy_washer_dryer_status
    from: "Running"
    to: "Finished"
action:
  - service: notify.notify
    data:
      title: "Candy Washer-Dryer"
      message: "The laundry cycle is complete! Don't forget to unload the clothes."
```

### Dishwasher salt refill alert

```yaml
alias: "Candy: Dishwasher Refill Salt Alert"
trigger:
  - platform: state
    entity_id: binary_sensor.candy_dishwasher_missing_salt
    to: "on"
action:
  - service: notify.notify
    data:
      title: "Candy Dishwasher"
      message: "Regenerating salt is low. Please refill the salt reservoir."
```

## Troubleshooting

- **Device not responding**: Ensure the machine has an active Wi-Fi connection and its IP address has not changed. Check router signal strength.
- **Commands ignored**: Make sure the physical dial is turned to the **Wi-Fi** position. When set to any other mechanical program position, the appliance firmware locks out remote write commands for safety.
- **Garbled responses or decryption error**: Verify that the 16-character encryption key matches your unit's serial number or use the auto-detect feature.
