# JAK<◆>KHO VR Ecosystem
### Wireless OpenXR Live Streaming, Dual-Phone Headset Casting & DIY ESP32 Hand Controller

![Unity 6](https://img.shields.io/badge/Unity-6.000%2B-blue?logo=unity)
![React](https://img.shields.io/badge/React-18-cyan?logo=react)
![Vite](https://img.shields.io/badge/Vite-8.2-purple?logo=vite)
![ESP32](https://img.shields.io/badge/ESP32-80Hz%20BLE%2FUSB-red?logo=espressif)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📖 Overview

**JAKKHO VR** is a modular, zero-wire Virtual Reality ecosystem designed for:
1. **Wireless Unity Live Streaming**: Broadcast any Unity 3D/VR scene viewport in real-time (60 FPS) over Wi-Fi directly to the web platform with **zero physical cables**.
2. **Branded Mission Control Web Platform**: A high-tech Vite + React frontend styled with custom white rounded bezel frames, live telemetry visualizers, and multi-device casting.
3. **🥽 Direct Stereo Cardboard VR Mode**: Dual-eye split-screen rendering with IPD (Interpupillary Distance 56–72mm) and lens zoom tuning for Google Cardboard, BoboVR, and mobile headsets.
4. **⏺ 1-Click Live Session Recorder & Snapshot**: In-browser hardware-accelerated WebM video recording (`.webm`) with live timer HUD and timestamped 4K snapshots (`.png`).
5. **⚙️ Calibration Wizard & Zero-Drift Gyro Tare**: Web-based deadzone adjustment, sensitivity gain, axis inversion, and 1-click zero-drift tare for MPU-6050 sensor fusion.
6. **📊 Real-Time Telemetry & JSON Diagnostic Exporter**: Live FPS counter, latency estimator, packet bitrate monitor, and 1-click JSON session export for research and team grading.
7. **DIY VR Hand Controller**: 6-DoF spatial wand powered by an ESP32 microcontroller, MPU-6050 6-Axis DMP fusion, analog thumb joystick, and tactile action buttons communicating via 80Hz binary packets.
8. **Dual Mobile Headset Support**: Hardware-accelerated WebCodecs H.264/H.265 streaming for Samsung Galaxy S24 (120Hz AMOLED) and Tecno Spark 20C (90Hz LCD).

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Hardware ["🕹️ Hardware Layer (Optional)"]
        ESP[ESP32 Hand Controller\nMPU-6050 6-Axis DMP\nJoystick + 3 Buttons] -->|USB Serial / BLE| Bridge[start_controller_bridge.ps1\nAuto-detect COM Port]
    end

    subgraph Unity ["🎮 Unity VR Environment (Any Scene / Project)"]
        Bridge -->|UDP Port 8888| Receiver[BLEControllerReceiver.cs\nControllerState.cs]
        Receiver --> Hand[VRHandController.cs\nArm Kinematics]
        Receiver --> Locomotion[VRLocomotion.cs\nSmooth / Snap Turn]
        Camera[VR Main Camera] --> Streamer[UnityLiveWebStreamer.cs\n60 FPS HTTP MJPEG / WebSockets]
    end

    subgraph Web ["🌐 JAKKHO Web Platform (:5173)"]
        Streamer -->|Wi-Fi HTTP :8085 /live.mjpg| WebUI[Vite React Platform\nMission Control Hub]
        WebUI --> Frame[JAKKHO White Bezel Viewport\n🥽 Stereo VR • ⏺ Record • 📷 Snap]
        WebUI --> Calib[⚙️ Calibration Wizard\nZero-Drift Gyro Tare • Deadzone]
        WebUI --> Telemetry[📊 Real-Time Telemetry HUD\nFPS • Latency • JSON Exporter]
    end

    subgraph Mobile ["📱 Mobile Headsets"]
        WebUI -->|Cardboard 3D Stereo| CB[Google Cardboard / Mobile Viewer]
        WebUI -->|WebCodecs H.265| S24[Samsung Galaxy S24\n120Hz AMOLED]
        WebUI -->|ADB TCP/IP| Spark[Tecno Spark 20C\n90Hz LCD]
    end
```

---

## 📂 Repository Structure

```text
├── simple.webplatform/            # Vite + React + Tailwind Web Platform
│   ├── src/
│   │   ├── components/
│   │   │   ├── SelectorSimulations/ # Mission Control Front Homepage (/)
│   │   │   ├── WebSocketManager/    # PlayerScreenCanvas (White Bezel Frame) & Streamers
│   │   │   ├── StreamPlayerScreen/  # Dedicated Fullscreen Casting View
│   │   │   ├── Header/ & Footer/    # Brand navigation & language selector
│   │   │   └── SimulationManager/   # Multiplayer simulation hub
│   │   └── api/                     # Backend streaming and monitoring servers
│   └── package.json
│
├── unity_scripts/Scripts/         # Universal Unity C# Components
│   ├── UnityLiveWebStreamer.cs    # 🌟 Universal Wi-Fi VR Camera Streamer (Port 8085)
│   ├── BLEControllerReceiver.cs   # UDP 8888 & BLE tracking receiver
│   ├── ControllerState.cs         # 20-byte binary packet unpacker
│   ├── VRHandController.cs        # Arm-kinematics 6-DoF wand tracker
│   ├── VRLocomotion.cs            # Joystick smooth/snap locomotion
│   ├── VRRaycaster.cs             # Physics raycasting & laser pointer
│   ├── GrabbableObject.cs         # Physics grab & kinematic manipulation
│   └── VRS24Manager.cs            # Android 120Hz AMOLED optimization
│
├── firmware/                      # ESP32 DIY VR Controller Arduino Code
│   └── esp32_vr_controller/
│       └── esp32_vr_controller.ino # 80Hz MPU-6050 DMP + Joystick + Button firmware
│
├── cadt_vr_display/               # Scrcpy & WebCodecs hardware streaming core
├── start_controller_bridge.ps1    # PowerShell USB Serial -> UDP 8888 telemetry bridge
├── serial_bridge.py               # Python serial bridge alternative
└── README.md                      # Project master documentation
```

---

## 🚀 1-Click Desktop Setup (For Any User / PC)

Anyone can clone and run this on their computer with zero manual configuration:

### Option A: 1-Click Desktop Icon Setup (Recommended)
1. **Clone the repository**:
   ```bash
   git clone https://github.com/Arno-1710/Jakkho-VR.git
   cd Jakkho-VR
   ```
2. Double-click **`Install_Desktop_Shortcut.bat`**.
3. A **`Launch JAKKHO VR Cast`** shortcut will appear on your Windows Desktop. Double-clicking it automatically installs dependencies, detects your local Wi-Fi IP, and opens your browser directly into the stream!

---

### Option B: Run from PowerShell or Terminal
```powershell
# In repository root:
.\start_webcasting.ps1
```
*(Or double-click `start_webcasting.bat` directly from Windows Explorer).*

---

### 2. Stream from Unity to the Website (Wireless Live Casting)
You can use the streamer in the included test scene or **drop it into any of your own Unity projects**:

1. In Unity, copy [`UnityLiveWebStreamer.cs`](./unity_scripts/Scripts/UnityLiveWebStreamer.cs) into your project's `Assets/` folder.
2. Select your **`Main Camera`** (or `XR_Player`).
3. Click **Add Component** ➔ select **`Unity Live Web Streamer`**.
4. Press **Play ▶️** in Unity.
5. Open **`http://localhost:5173/`** — the Unity scene will immediately render live in the **JAKKHO White Bezel Frame**!

> **Direct URL**: Any device on the same Wi-Fi network (phones, tablets, laptops) can also view the stream directly by opening `http://<YOUR_PC_IP>:8085/live.mjpg`.

---

### 3. (Optional) Connect ESP32 DIY Hand Controller

#### Wiring Pinout:
| Component | ESP32 Pin | Function |
| :--- | :--- | :--- |
| **MPU-6050 SDA** | GPIO 21 | I2C Data |
| **MPU-6050 SCL** | GPIO 22 | I2C Clock |
| **MPU-6050 VCC/GND** | 3.3V / GND | Power |
| **Trigger Button** | GPIO 25 | Action 1 (Pull-up) |
| **Grip Grab Button** | GPIO 26 | Action 2 (Pull-up) |
| **Recenter Button** | GPIO 27 | Tare / Re-align (Pull-up) |
| **Joystick VRX (X-Axis)** | GPIO 34 | Analog Thumb X |
| **Joystick VRY (Y-Axis)** | GPIO 35 | Analog Thumb Y |
| **Joystick SW (Click)** | GPIO 32 | Thumbstick Click (Pull-up) |

#### Flash Firmware & Run Bridge:
1. Open [`esp32_vr_controller.ino`](./firmware/esp32_vr_controller/esp32_vr_controller.ino) in Arduino IDE and flash to your ESP32 board.
2. Close the Arduino Serial Monitor.
3. In PowerShell, run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\start_controller_bridge.ps1
   ```
4. The bridge will auto-detect your USB COM port and stream 80Hz packets to Unity on UDP `127.0.0.1:8888`.

---

## 🛠️ Configuration & Customization

### Unity Stream Settings (`UnityLiveWebStreamer.cs`)
* **Target FPS** (Default `30`): Range `15`–`60` FPS.
* **Stream Height** (Default `720p`): Range `360p`–`1080p`.
* **JPEG Quality** (Default `70`): Lower = lower latency (<20ms); Higher = crisper visual fidelity.
* **HTTP Port** (Default `8085`): Local HTTP MJPEG server port.

### Web Platform Ports
* **`5173`**: Vite React Frontend Development Server.
* **`8085`**: Unity Live MJPEG Video Stream Server.
* **`8082`**: Video WebCodecs H.264/H.265 Streaming Server (for Android/Quest).
* **`8001`**: Monitoring & Simulation WebSocket Server.

---

## 👥 Team Contribution Guidelines

1. **Pull the latest changes**:
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit and push**:
   ```bash
   git add .
   git commit -m "feat(ui): refine dashboard layout"
   git push origin feature/your-feature-name
   ```

---

## 📄 License
MIT License © 2026 JAKKHO VR Team.
