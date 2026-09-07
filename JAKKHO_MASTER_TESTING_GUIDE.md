# 🎮 JAKKHO VR Ecosystem — Complete Master Guide
### Hardware Hand Controller, Unity Test Environment, BLE Connection & Web Live Casting

---

## 📑 Table of Contents
1. [Part 1: Hardware Wiring & ESP32 Firmware](#part-1-hardware-wiring--esp32-firmware)
2. [Part 2: Unity Minimal VR Test Scene Setup (<5MB)](#part-2-unity-minimal-vr-test-scene-setup)
3. [Part 3: Testing Hand Controller & Joystick (PC Simulator & BLE)](#part-3-testing-hand-controller--joystick)
4. [Part 4: Live Hosting & Dual-Device Casting to Web Platform](#part-4-live-hosting--dual-device-casting)
5. [Part 5: Troubleshooting & Quick Reference](#part-5-troubleshooting--quick-reference)

---

## 🛠️ Part 1: Hardware Wiring & ESP32 Firmware

### 1.1 Pin Connection Diagram

| Component | Pin | ESP32 GPIO | Notes |
| :--- | :--- | :--- | :--- |
| **MPU-6050 IMU** | VCC | **3.3V** | Power supply |
| | GND | **GND** | Ground |
| | SCL | **GPIO 22** | I2C Clock |
| | SDA | **GPIO 21** | I2C Data |
| **Analog Joystick** | VCC | **3.3V** | ⚠️ **DO NOT USE 5V** (Protects ESP32 ADC) |
| | GND | **GND** | Ground |
| | VRX (X-Axis) | **GPIO 34** | ADC1 Input (Wi-Fi safe) |
| | VRY (Y-Axis) | **GPIO 35** | ADC1 Input (Wi-Fi safe) |
| | SW (Thumb Click) | **GPIO 32** | Internal Pullup |
| **Button 1 (Trigger)** | Pin 1 / Pin 2 | **GPIO 25** to **GND** | Index finger trigger |
| **Button 2 (Grip)** | Pin 1 / Pin 2 | **GPIO 26** to **GND** | Middle finger grab |
| **Button 3 (Recenter)**| Pin 1 / Pin 2 | **GPIO 27** to **GND** | Reset forward orientation |

> [!CAUTION]
> **Safety Rule**: Always power the Joystick with **3.3V** on the ESP32. Applying 5V into GPIO 34/35 can permanently damage the ESP32 microcontroller pins.

---

### 1.2 Flashing Firmware in Arduino IDE

1. Open **Arduino IDE** (C:\Users\U-ser\AppData\Local\Programs\Arduino IDE\).
2. Open [irmware/esp32_vr_controller/esp32_vr_controller.ino](file:///H:/DMIL_VR/firmware/esp32_vr_controller/esp32_vr_controller.ino).
3. In Arduino IDE Library Manager, install:
   - **MPU6050_light** or **Electronic Cats MPU6050**
4. Connect your ESP32 via micro-USB / USB-C.
5. Select **Tools -> Board -> ESP32 Dev Module** and choose your **COM Port**.
6. Click **Upload** (Arrow button).
7. Open **Tools -> Serial Monitor** (Set baud rate to 115200):
   - You should see: [JAKKHO] BLE Hand Controller Advertising...

---

## 🕹️ Part 2: Unity Minimal VR Test Scene Setup

All Unity scripts are already saved in [H:\DMIL_VR\unity_scripts\Scripts\](file:///H:/DMIL_VR/unity_scripts/Scripts/).

### 2.1 Step-by-Step Unity Hierarchy Setup

In your open Unity 6 project (SampleScene):

`
Hierarchy:
├── ☀️ Directional Light
├── 🟩 Ground (3D Object -> Plane at 0, 0, 0)
├── 📦 Interactive_Cube (3D Object -> Cube at 0, 1, 2)
│     ├── Rigidbody (Mass: 1, Use Gravity: True)
│     └── GrabbableObject (Script)
│
├── 👤 XR_Player (Empty GameObject at 0, 0, 0)
│     ├── CharacterController (Center: 0, 1, 0, Height: 2)
│     ├── VRLocomotion (Script)
│     ├── VRS24Manager (Script)
│     │
│     ├── 🎥 Main Camera (Tag: MainCamera, Position: 0, 1.7, 0)
│     │
│     └── ✋ Right_Hand_Controller (Empty GameObject at 0.2, 1.2, 0.4)
│           ├── VRHandController (Script)
│           ├── VRRaycaster (Script)
│           ├── LineRenderer (Start Width: 0.005, End Width: 0.002)
│           └── 🪄 Visual_Model (3D Object -> Cylinder, Scale: 0.04, 0.08, 0.04)
│
└── 📡 BLE_Manager (Empty GameObject)
      └── BLEControllerReceiver (Script)
`

---

### 2.2 Configuring the Script Inspectors

1. **On XR_Player**:
   - Drag Main Camera into VRLocomotion -> Player Camera.
   - Drag CharacterController into VRLocomotion -> Character Controller.
2. **On Right_Hand_Controller**:
   - Check Is Right Hand: True.
   - Drag LineRenderer into VRRaycaster -> Laser Line.
   - In VRRaycaster, set Laser Material to an unlit Cyan material.
3. **On Interactive_Cube**:
   - Add Rigidbody component.
   - Add GrabbableObject.cs script.

---

## 🧪 Part 3: Testing Hand Controller & Joystick

### 3.1 Offline PC Testing (Mouse & Keyboard Simulator)

[BLEControllerReceiver.cs](file:///H:/DMIL_VR/unity_scripts/Scripts/BLEControllerReceiver.cs) includes a full hardware emulator so you can test everything right now on your PC without needing physical hardware connected!

1. Press **Play ▶️** in Unity.
2. Controls:
   | Action | Keyboard / Mouse Input | Description |
   | :--- | :--- | :--- |
   | **Walk / Strafe** | **W / A / S / D** | Simulates analog thumb joystick |
   | **Aim Controller** | **Hold Right Mouse Button + Move Mouse** | Rotates 6DoF hand controller |
   | **Trigger Pull** | **Left Mouse Click** or **Spacebar** | Fires laser beam / interacts |
   | **Grab Object** | **G Key** | Grabs nearby physics cube |
   | **Recenter Heading** | **R Key** | Resets rotation to center |

3. **Verify Physics Grab**:
   - Walk toward the Cube using **W/A/S/D**.
   - Aim the laser pointer at the Cube (it will turn green).
   - Press **G** to pick up the cube, move your hand, and release **G** to throw it!

---

### 3.2 Real Bluetooth (BLE) Connection to Phone / PC

1. Power on your ESP32 board.
2. In BLEControllerReceiver.cs:
   - Toggle Use Simulator to False.
   - The script scans for BLE Device named **JAKKHO_Hand_R**.
3. When connected:
   - Moving your physical ESP32 in your hand rotates the virtual controller laser in real-time (80Hz).
   - Pushing the thumb joystick moves the player in Unity.
   - Pressing the Trigger & Grip buttons interacts with and grabs objects.
   - Pressing the Recenter button resets forward orientation.

---

## 🌐 Part 4: Live Hosting & Dual-Device Casting to Web Platform

### 4.1 Start the JAKKHO Web Platform

In PowerShell:
`powershell
cd H:\DMIL_VR\simple.webplatform
npm start
`
- Open browser at: **http://localhost:5173/**
- Click **"Open Live Casting"** (http://localhost:5173/streamPlayerScreen).

---

### 4.2 Connect Samsung Galaxy S24 & Tecno Spark 20C

1. **Enable USB Debugging** on both phones:
   - Settings -> About Phone -> Tap "Build Number" 7 times -> System -> Developer Options -> Enable USB Debugging.
2. Connect both phones via USB to your PC.
3. Open a separate PowerShell window:
   `powershell
   & "C:\Users\U-ser\platform-tools\adb.exe" devices
   & "C:\Users\U-ser\platform-tools\adb.exe" tcpip 5555
   `
4. **Deploy the Unity App**:
   - In Unity: **File -> Build Settings -> Platform: Android -> Switch Platform**.
   - Select your Samsung S24 or Tecno Spark 20C and click **Build and Run**.
5. **View Live Stream**:
   - Open http://localhost:5173/streamPlayerScreen.
   - Both phone screens will stream live inside the **JAKKHO White Rounded Bezel Frames** with real-time FPS, resolution, and latency monitoring!

---

## 🔍 Part 5: Troubleshooting & Quick Reference

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **
pm error enoent package.json** | Terminal is in C:\Users\U-ser | Run cd H:\DMIL_VR\simple.webplatform first |
| **Joystick readings stuck at 0 or 4095** | Joystick connected to 5V or wrong pin | Connect Joystick VCC to **3.3V** and VRX/VRY to **GPIO 34/35** |
| **BLE not connecting to phone** | Bluetooth permissions missing | Ensure Location / Nearby Devices permission is granted on Android |
| **Black video stream on browser** | Phone screen is locked | Unlock the phone screen and click "Allow USB Debugging" |
| **High Wi-Fi latency** | Restricted router / 2.4GHz band | Enable **Windows PC 5GHz Mobile Hotspot** and connect both phones to it |

