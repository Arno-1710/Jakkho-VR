# DIY VR Hand Controller & Samsung Galaxy S24 VR Guide

A complete end-to-end guide for building a DIY VR hand controller with an **ESP32**, **MPU-6050 6-Axis IMU**, **3 push buttons**, and an **analog thumb joystick**, paired wirelessly over **Bluetooth Low Energy (BLE)** to a **Samsung Galaxy S24** VR headset running Unity with Google Cardboard XR.

---

## 1. Hardware Overview & Wiring

### Components:
1. **ESP32 Dev Board** (ESP32-WROOM-32 or NodeMCU-32S)
2. **MPU-6050 Breakout Module** (6-axis Gyroscope + Accelerometer)
3. **2-Axis Analog Thumb Joystick** (with integrated push button `SW`)
4. **3x Tactile Push Buttons** (Trigger, Grip, Recenter/Tare)
5. **Jumper wires / Breadboard / Perfboard**
6. **LiPo Battery / Power Bank** (3.7V - 5V)

---

### Wiring Table

> [!CAUTION]
> **Voltage Warning**: Power the joystick potentiometer from **3.3V** on the ESP32 (NOT 5V) to protect the ESP32's 3.3V-maximum analog inputs (`VRX` / `VRY`).

| Component | Pin on Component | ESP32 Pin | Note |
|---|---|---|---|
| **MPU-6050** | `VCC` | `3V3` | 3.3V Power |
| | `GND` | `GND` | Common Ground |
| | `SCL` | `GPIO 22` | I2C Clock |
| | `SDA` | `GPIO 21` | I2C Data |
| | `INT` | `GPIO 19` | DMP FIFO Interrupt |
| **Joystick** | `VCC` / `5V` | `3V3` | Safe 3.3V reference |
| | `GND` | `GND` | Ground |
| | `VRX` | `GPIO 34` | Horizontal Axis (ADC1_CH6) |
| | `VRY` | `GPIO 35` | Vertical Axis (ADC1_CH7) |
| | `SW` | `GPIO 32` | Joystick Click (Internal Pull-Up) |
| **Button 1 (Trigger)** | Leg 1 / Leg 2 | `GPIO 25` / `GND` | Index Trigger (Internal Pull-Up) |
| **Button 2 (Grip)** | Leg 1 / Leg 2 | `GPIO 26` / `GND` | Grab / Grip (Internal Pull-Up) |
| **Button 3 (Recenter)** | Leg 1 / Leg 2 | `GPIO 27` / `GND` | Align / Tare Yaw (Internal Pull-Up) |

---

## 2. Flashing the ESP32 Firmware

The firmware source is located in [`firmware/esp32_vr_controller/esp32_vr_controller.ino`](file:///d:/Profile/DMIL_VR/firmware/esp32_vr_controller/esp32_vr_controller.ino).

### Using Arduino IDE:
1. Open **Arduino IDE**.
2. Go to **File -> Preferences** and add the ESP32 Board Manager URL:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to **Tools -> Board -> Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
4. Go to **Sketch -> Include Library -> Manage Libraries...** and install:
   - `MPU6050` by Electronic Cats / Jeff Rowberg
   - `I2Cdev` by Jeff Rowberg
5. Select your board: **Tools -> Board -> ESP32 Arduino -> ESP32 Dev Module**.
6. Select your COM port: **Tools -> Port**.
7. Open `esp32_vr_controller.ino` and click **Upload** (Keep the controller flat on a table during the first 5 seconds of boot for auto-calibration).

### Using PlatformIO (VS Code):
1. Open the folder `firmware/esp32_vr_controller` in VS Code with PlatformIO installed.
2. Click **PlatformIO: Build** (`Ctrl+Alt+B`) and **Upload**.

---

## 3. Unity VR Setup for Samsung Galaxy S24

### A. Installing Google Cardboard XR Plugin
1. Open Unity Hub and open/create a new **3D (URP or Built-in)** project in Unity 2022.3 LTS or newer.
2. In Unity, go to **Window -> Package Manager**.
3. Click the `+` icon -> **Add package from git URL...** and enter:
   ```
   https://github.com/googlevr/cardboard-xr-plugin.git
   ```
4. Go to **Edit -> Project Settings -> XR Plug-in Management**:
   - Under the **Android tab**, check **Cardboard XR Plugin**.

### B. Android Build & Samsung S24 Optimization Settings
1. Go to **File -> Build Settings** -> Switch Platform to **Android**.
2. Go to **Player Settings -> Other Settings**:
   - **Color Space**: Linear
   - **Auto Graphics API**: Uncheck, ensure **OpenGLES3** or **Vulkan** is listed first.
   - **Minimum API Level**: Android 10.0 (API 29) or higher.
   - **Target API Level**: Automatic (highest installed, Android 14 / API 34).
   - **Scripting Backend**: IL2CPP
   - **Target Architectures**: ARM64 checked.

### C. Adding Android Bluetooth Permissions
In your project's `Assets/Plugins/Android/AndroidManifest.xml`, include the following permissions for BLE scanning and connection:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.yourcompany.diyvr">
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true" />
</manifest>
```

---

## 4. Unity Scene Hierarchy

Create a scene with the following GameObject hierarchy:

```
XR_Rig (GameObject)
├── Main Camera (Camera + TrackedPoseDriver / Cardboard XR)
│   └── VRS24Manager (Script)
├── VRHandController (GameObject + VRHandController Script)
│   ├── ControllerVisual (3D Wand / Hand Model)
│   ├── LaserPointer (GameObject + VRRaycaster Script + LineRenderer)
│   │   └── ReticleDot (Small Quad / Sphere)
├── Locomotion (CharacterController + VRLocomotion Script)
└── BLEManager (GameObject + BLEControllerReceiver Script)
```

---

## 5. Controls & Interaction

| Input Action | Controller Hardware | In-Editor Simulation (PC) |
|---|---|---|
| **Aim / Point Hand** | Rotate MPU-6050 | Hold **Right Mouse Button** + Move Mouse |
| **Locomotion / Move** | Analog Joystick (VRX, VRY) | **WASD** / Arrow Keys |
| **Snap Turn** | Flick Joystick Left / Right | **A / D** Keys |
| **Trigger / Select UI**| Button 1 (GPIO 25) | **Left Mouse Click** or **Space** |
| **Grab Object** | Button 2 (GPIO 26) | **G** Key |
| **Recenter Orientation**| Button 3 (GPIO 27) | **R** Key (Aligns controller forward to gaze) |
| **Joystick Click** | Joystick SW (GPIO 32) | **Left Shift** Key |
