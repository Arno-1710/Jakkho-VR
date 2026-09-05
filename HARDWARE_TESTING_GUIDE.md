# Hardware Diagnostic & Testing Guide (ESP32 Serial & Bluetooth)

This guide explains how to verify every hardware component (MPU-6050, 3 Buttons, Joystick) using the **ESP32 Serial Monitor** and how to test and verify the **Bluetooth connection to your Samsung Galaxy S24**.

---

## 1. Testing Hardware via Arduino Serial Monitor

1. Connect the ESP32 to your PC via USB.
2. Open **Arduino IDE** (or VS Code Serial Monitor).
3. Select **Tools -> Serial Monitor** and set the baud rate to **`115200 baud`**.
4. Press the **EN / RST** button on your ESP32.

### A. Boot & Automated Self-Test Output

Upon boot, the firmware will automatically execute a 4-step self-test:

```text
=======================================================
       DIY VR HAND CONTROLLER - BOOT & SELF TEST       
=======================================================

--- [1/4] Scanning I2C Bus ---
 [OK] I2C device found at address 0x68 (MPU-6050 Default Address)

--- [2/4] Testing Button Pin States ---
 - Trigger  (GPIO 25) : READY (High/Unpressed)
 - Grip     (GPIO 26) : READY (High/Unpressed)
 - Recenter (GPIO 27) : READY (High/Unpressed)
 - Joy SW   (GPIO 32) : READY (High/Unpressed)

--- [3/4] Testing Analog Joystick ADC ---
 - VRX (GPIO 34 ADC1) Raw: 2048 (Expected center ~1800-2300)
 - VRY (GPIO 35 ADC1) Raw: 2055 (Expected center ~1800-2300)
[JOYSTICK] Calibrating neutral center... (Do NOT touch the joystick)
[JOYSTICK] Center Calibrated -> CenterX: 2048 | CenterY: 2055

--- [4/4] Initializing MPU-6050 DMP Sensor Fusion ---
 [OK] MPU-6050 connection confirmed.
 [OK] MPU-6050 DMP 6-Axis motion processor initialized!

--- Starting Bluetooth Low Energy (BLE) Stack ---
=======================================================
 [READY] BLE Device Name : 'DIY_VR_Controller'
 [READY] ESP32 MAC Addr : 30:AE:A4:XX:XX:XX
 [READY] Open Samsung S24 Bluetooth / nRF Connect / Unity VR
 [TIP]   Type 'h' in Serial Monitor for interactive commands!
=======================================================
```

---

### B. Interactive Serial Commands

You can send single-letter commands directly into the Serial Monitor text box:

| Command | Action |
|---|---|
| **`h`** | Prints the help menu with all available diagnostic commands. |
| **`t`** | Runs the full hardware self-test suite (I2C bus scan, button states, ADC readings). |
| **`c`** | Re-calibrates the joystick center position (useful if joystick drifts). |
| **`b`** | Displays BLE device name, MAC address, Service UUID, and connection status. |
| **`0`** | Switches to **Compact Live Dashboard** (real-time stream of Quaternions, Joystick, and Buttons). |
| **`1`** | Switches to **Raw Sensor Values** (displays raw accelerometer and gyroscope integers). |

---

### C. Live Real-Time Testing

1. **Button Testing**:
   - Press **Button 1 (Trigger)** $\rightarrow$ Serial outputs `[EVENT] --> Button 1 (TRIGGER / GPIO 25) PRESSED`.
   - Press **Button 2 (Grip)** $\rightarrow$ Serial outputs `[EVENT] --> Button 2 (GRIP / GPIO 26) PRESSED`.
   - Press **Button 3 (Recenter)** $\rightarrow$ Serial outputs `[EVENT] --> Button 3 (RECENTER / GPIO 27) PRESSED`.
   - Press the **Joystick Stick Down** $\rightarrow$ Serial outputs `[EVENT] --> Joystick Switch (SW / GPIO 32) CLICKED`.

2. **Joystick Testing**:
   - Push joystick Forward $\rightarrow$ `JOY: Y` moves towards `+512`.
   - Pull joystick Backward $\rightarrow$ `JOY: Y` moves towards `-512`.
   - Push joystick Right $\rightarrow$ `JOY: X` moves towards `+512`.
   - Push joystick Left $\rightarrow$ `JOY: X` moves towards `-512`.

3. **MPU-6050 Rotation Testing**:
   - Rotate the controller in your hand $\rightarrow$ Observe `QUAT:( W, X, Y, Z)` values update smoothly in real time.

---

## 2. Testing Bluetooth Connection to Samsung Galaxy S24

You can test and verify that your Samsung Galaxy S24 discovers and communicates with the ESP32 in **under 2 minutes** without writing any phone code, using the industry-standard BLE diagnostic tool.

### Method 1: Instant Verification using "nRF Connect for Mobile" (Recommended)

1. On your **Samsung Galaxy S24**, install **[nRF Connect for Mobile](https://play.google.com/store/apps/details?id=no.nordicsemi.android.mcp)** from Google Play Store (free, by Nordic Semiconductor).
2. Open **nRF Connect** and make sure Bluetooth and Location permissions are enabled.
3. Tap **SCAN** in the top right.
4. Look for the device named **`DIY_VR_Controller`**.
5. Tap **CONNECT**:
   - In the ESP32 Serial Monitor, you will instantly see:
     ```text
     =======================================================
      [BLE EVENT] >>> SAMSUNG GALAXY S24 CONNECTED! <<<
      Streaming 20-byte VR tracking packets at ~80 Hz...
     =======================================================
     ```
6. In nRF Connect, tap on the **Unknown Service** (`4fafc201-1fb5-459e-8fcc-c5c9c331914b`).
7. Tap the **Three Downward Arrows icon** (Enable Notifications) next to Characteristic `beb5483e-36e1-4688-b7f5-ea07361b26a8`.
8. You will see the **20-byte binary packet** updating continuously (80 times per second) with live quaternion and button data!

---

### Method 2: Testing with Unity Google Cardboard App

When running your custom Unity app on the Samsung Galaxy S24:
1. Launch the Cardboard VR app.
2. The [`BLEControllerReceiver.cs`](file:///d:/Profile/DMIL_VR/unity_scripts/Scripts/BLEControllerReceiver.cs) script connects automatically to `DIY_VR_Controller`.
3. The 3D virtual controller wand inside the VR scene will immediately synchronize with your physical hand movement.
