# 📱 JAKKHO VR: Phone Deployment & Live Web Hosting Master Guide

This guide walks you through building your Unity VR test scene, installing it onto your **Samsung Galaxy S24** or **Tecno Spark 20C**, connecting your **DIY Hand Controller**, and streaming the live VR view directly onto the **JAKKHO Web Platform**.

---

## 📑 Complete Workflow Overview

```
[ ESP32 Hand Controller ]  --(BLE 80Hz)-->  [ Android Phone in VR Headset ]
                                                    │
                                           (USB / Wi-Fi ADB Stream)
                                                    ▼
                                     [ JAKKHO Web Platform (Vite) ]
                                                    │
                                           (WebCodecs H.265 Stream)
                                                    ▼
                                    [ Browser: http://localhost:5173/ ]
```

---

## 🛠️ Phase 1: Prepare Your Phone (Samsung S24 / Tecno)

1. **Enable Developer Options**:
   - On your phone: Open **Settings ➔ About Phone**.
   - Tap **Build Number** 7 times until you see `"You are now a developer!"`.
2. **Enable USB Debugging**:
   - Go to **Settings ➔ System / Additional Settings ➔ Developer Options**.
   - Turn on **USB Debugging**.
   - *(Optional for wireless)* Turn on **Wireless Debugging**.
3. **Plug your phone into your PC via USB cable**:
   - When a prompt appears on your phone screen asking *"Allow USB debugging from this computer?"*, check **"Always allow"** and tap **Allow**.

---

## 🎮 Phase 2: Build and Install from Unity to Your Phone

1. In Unity (`My project (3)`):
   - Click **File ➔ Build Settings...**
2. In the **Platform** list on the left:
   - Select **Android** and click **Switch Platform** *(takes 1-2 minutes on first switch)*.
3. In **Build Settings**:
   - **Run Device**: Click the dropdown and select your connected phone (e.g. `Samsung SM-S921...` or `Tecno BG7...`).
   - Click **Player Settings...** (bottom left):
     - Under **Other Settings**:
       - **Color Space**: `Linear`
       - **Minimum API Level**: `Android 8.0 (API Level 26)` or higher
       - **Target Architecture**: Check **ARM64**
4. Click **Build and Run** (bottom right):
   - Choose a save location (e.g. `H:\DMIL_VR\JakkhoVR.apk`).
   - Unity will compile the APK, automatically install it to your phone, and launch the VR app!

---

## 🌐 Phase 3: Host the Live VR Screen on the Website

1. **Enable Wireless ADB Streaming**:
   Open a PowerShell terminal and run:
   ```powershell
   & "C:\Users\U-ser\platform-tools\adb.exe" devices
   & "C:\Users\U-ser\platform-tools\adb.exe" tcpip 5555
   ```

2. **Start the JAKKHO Web Platform**:
   In PowerShell:
   ```powershell
   cd H:\DMIL_VR\simple.webplatform
   npm start
   ```

3. **Open the Web Stream**:
   - In your PC browser, open: **`http://localhost:5173/streamPlayerScreen`**
   - Your phone’s live VR screen will stream in real-time inside your custom **JAKKHO White Rounded Bezel Frame** at up to 120 FPS!

---

## 🕹️ Phase 4: Connect the ESP32 DIY Hand Controller

1. Turn on your **ESP32 Hand Controller** (powered by battery or USB).
2. The phone running the Unity app will automatically connect to **`DIY_VR_Controller`** over Bluetooth Low Energy (BLE).
3. Put the phone into your VR headset:
   - Moving your physical ESP32 in your hand rotates the laser beam in VR.
   - Pushing the analog joystick walks you around the scene.
   - Pulling the Trigger / Grip buttons grabs objects in VR.
   - Anyone watching your PC or mobile browser on the local Wi-Fi (`http://<PC_IP>:5173/streamPlayerScreen`) sees your exact VR view live!
