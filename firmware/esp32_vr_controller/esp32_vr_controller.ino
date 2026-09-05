/*
 * ============================================================================
 *  DIY VR HAND CONTROLLER FIRMWARE (ESP32) - DIAGNOSTIC & PRODUCTION BUILD
 * ============================================================================
 *  Hardware Connections:
 *    - ESP32 Development Board (ESP32-WROOM-32)
 *    - MPU-6050 6-Axis IMU:
 *        * VCC -> 3.3V, GND -> GND, SCL -> GPIO 22, SDA -> GPIO 21, INT -> GPIO 19
 *    - 2-Axis Analog Thumb Joystick:
 *        * VCC -> 3.3V (Do NOT use 5V to protect ADC pins!)
 *        * GND -> GND
 *        * VRX -> GPIO 34 (ADC1_CH6)
 *        * VRY -> GPIO 35 (ADC1_CH7)
 *        * SW  -> GPIO 32 (Joystick Click)
 *    - 3x Push Buttons:
 *        * Button 1 (Trigger)  -> GPIO 25 to GND
 *        * Button 2 (Grip)     -> GPIO 26 to GND
 *        * Button 3 (Recenter) -> GPIO 27 to GND
 * 
 *  Diagnostic Features:
 *    - Automated Hardware Self-Test on startup (I2C scan, MPU check, ADC check, Button check)
 *    - Real-time formatted Serial Dashboard for live sensor verification
 *    - Instant Serial event logger for button presses & joystick clicks
 *    - BLE connection state & MAC address broadcast info for Samsung Galaxy S24
 *    - Interactive Serial Commands: type 'h' for help, 't' for test, 'c' to recalibrate
 * ============================================================================
 */

#include <Wire.h>
#include <I2Cdev.h>
#include <MPU6050_6Axis_MotionApps20.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ==========================================
// PIN DEFINITIONS
// ==========================================
#define I2C_SDA_PIN       21
#define I2C_SCL_PIN       22
#define MPU_INTERRUPT_PIN 19

#define JOY_VRX_PIN       34   // ADC1_CH6
#define JOY_VRY_PIN       35   // ADC1_CH7
#define JOY_SW_PIN        32   // Active LOW

#define BTN_TRIGGER_PIN   25   // Button 1 (Trigger) -> Active LOW
#define BTN_GRIP_PIN      26   // Button 2 (Grip)    -> Active LOW
#define BTN_MENU_PIN      27   // Button 3 (Recenter)-> Active LOW

// ==========================================
// BLE CONFIGURATION & UUIDs
// ==========================================
#define DEVICE_NAME         "DIY_VR_Controller"
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ==========================================
// DATA PACKET STRUCT (20 BYTES)
// ==========================================
struct __attribute__((packed)) VRControllerPacket {
    int16_t qw;         // Quaternion W * 16384
    int16_t qx;         // Quaternion X * 16384
    int16_t qy;         // Quaternion Y * 16384
    int16_t qz;         // Quaternion Z * 16384
    int16_t joyX;       // Joystick X: -512 to +512
    int16_t joyY;       // Joystick Y: -512 to +512
    uint8_t buttons;    // Bit 0: Trigger, Bit 1: Grip, Bit 2: Recenter, Bit 3: JoySW
    uint8_t battery;    // 0 - 100%
    uint16_t timestamp; // Milliseconds counter
};

VRControllerPacket packetData;

// ==========================================
// GLOBAL STATE & SENSORS
// ==========================================
MPU6050 mpu;
bool dmpReady = false;
uint8_t devStatus;
uint16_t packetSize;
uint8_t fifoBuffer[64];
Quaternion q;

volatile bool mpuInterrupt = false;
void IRAM_ATTR dmpDataReady() {
    mpuInterrupt = true;
}

// BLE Variables
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
String bleMacAddress = "";

// Joystick Variables
int joyRawX = 0, joyRawY = 0;
int joyCenterX = 2048;
int joyCenterY = 2048;
const int JOY_DEADZONE = 35;

// Button States & History for edge detection
uint8_t lastButtonState = 0;

// Diagnostics Display Mode (0: Compact Dashboard, 1: Verbose Stream, 2: Raw IMU)
int diagnosticMode = 0;

// ==========================================
// BLE SERVER CALLBACKS
// ==========================================
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("\n\n=======================================================");
        Serial.println(" [BLE EVENT] >>> SAMSUNG GALAXY S24 CONNECTED! <<<");
        Serial.println(" Streaming 20-byte VR tracking packets at ~80 Hz...");
        Serial.println("=======================================================\n");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("\n\n=======================================================");
        Serial.println(" [BLE EVENT] >>> PHONE DISCONNECTED <<<");
        Serial.println(" Restarting BLE advertising...");
        Serial.println("=======================================================\n");
    }
};

// ==========================================
// HARDWARE SELF-TEST & DIAGNOSTICS
// ==========================================
bool runI2CScanner() {
    Serial.println("\n--- [1/4] Scanning I2C Bus ---");
    byte error, address;
    int nDevices = 0;
    bool mpuFound = false;

    for (address = 1; address < 127; address++) {
        Wire.beginTransmission(address);
        error = Wire.endTransmission();

        if (error == 0) {
            Serial.printf(" [OK] I2C device found at address 0x%02X", address);
            if (address == 0x68) {
                Serial.print(" (MPU-6050 Default Address)");
                mpuFound = true;
            } else if (address == 0x69) {
                Serial.print(" (MPU-6050 Alternate Address - AD0 High)");
                mpuFound = true;
            }
            Serial.println();
            nDevices++;
        }
    }
    if (nDevices == 0) {
        Serial.println(" [FAIL] No I2C devices found! Check MPU6050 SDA (GPIO 21), SCL (GPIO 22), and 3.3V power.");
    }
    return mpuFound;
}

void testButtonsInitial() {
    Serial.println("\n--- [2/4] Testing Button Pin States ---");
    bool trig = (digitalRead(BTN_TRIGGER_PIN) == LOW);
    bool grip = (digitalRead(BTN_GRIP_PIN) == LOW);
    bool menu = (digitalRead(BTN_MENU_PIN) == LOW);
    bool sw   = (digitalRead(JOY_SW_PIN) == LOW);

    Serial.printf(" - Trigger  (GPIO %d) : %s\n", BTN_TRIGGER_PIN, trig ? "HELD/PRESSED (Check wiring if not pressed)" : "READY (High/Unpressed)");
    Serial.printf(" - Grip     (GPIO %d) : %s\n", BTN_GRIP_PIN, grip ? "HELD/PRESSED (Check wiring if not pressed)" : "READY (High/Unpressed)");
    Serial.printf(" - Recenter (GPIO %d) : %s\n", BTN_MENU_PIN, menu ? "HELD/PRESSED (Check wiring if not pressed)" : "READY (High/Unpressed)");
    Serial.printf(" - Joy SW   (GPIO %d) : %s\n", JOY_SW_PIN, sw ? "HELD/PRESSED (Check wiring if not pressed)" : "READY (High/Unpressed)");
}

void testJoystickInitial() {
    Serial.println("\n--- [3/4] Testing Analog Joystick ADC ---");
    int rawX = analogRead(JOY_VRX_PIN);
    int rawY = analogRead(JOY_VRY_PIN);

    Serial.printf(" - VRX (GPIO %d ADC1) Raw: %d (Expected center ~1800-2300)\n", JOY_VRX_PIN, rawX);
    Serial.printf(" - VRY (GPIO %d ADC1) Raw: %d (Expected center ~1800-2300)\n", JOY_VRY_PIN, rawY);

    if (rawX < 100 || rawX > 4000) {
        Serial.println("   [WARNING] VRX reading is near minimum/maximum! Verify 3.3V and GND connections.");
    }
    if (rawY < 100 || rawY > 4000) {
        Serial.println("   [WARNING] VRY reading is near minimum/maximum! Verify 3.3V and GND connections.");
    }
}

void calibrateJoystick() {
    long sumX = 0, sumY = 0;
    const int SAMPLES = 60;
    
    Serial.println("[JOYSTICK] Calibrating neutral center... (Do NOT touch the joystick)");
    for (int i = 0; i < SAMPLES; i++) {
        sumX += analogRead(JOY_VRX_PIN);
        sumY += analogRead(JOY_VRY_PIN);
        delay(10);
    }
    joyCenterX = sumX / SAMPLES;
    joyCenterY = sumY / SAMPLES;
    Serial.printf("[JOYSTICK] Center Calibrated -> CenterX: %d | CenterY: %d\n", joyCenterX, joyCenterY);
}

void readJoystick(int16_t &outX, int16_t &outY) {
    joyRawX = analogRead(JOY_VRX_PIN);
    joyRawY = analogRead(JOY_VRY_PIN);

    int deltaX = joyRawX - joyCenterX;
    int deltaY = joyRawY - joyCenterY;

    int scaledX = (deltaX * 512) / 2048;
    int scaledY = (deltaY * 512) / 2048;

    if (abs(scaledX) < JOY_DEADZONE) scaledX = 0;
    if (abs(scaledY) < JOY_DEADZONE) scaledY = 0;

    outX = (int16_t)constrain(scaledX, -512, 512);
    outY = (int16_t)constrain(scaledY, -512, 512);
}

uint8_t readButtonsWithEvents() {
    uint8_t btnState = 0;

    bool trig = (digitalRead(BTN_TRIGGER_PIN) == LOW);
    bool grip = (digitalRead(BTN_GRIP_PIN) == LOW);
    bool menu = (digitalRead(BTN_MENU_PIN) == LOW);
    bool joySW= (digitalRead(JOY_SW_PIN) == LOW);

    if (trig)  btnState |= (1 << 0);
    if (grip)  btnState |= (1 << 1);
    if (menu)  btnState |= (1 << 2);
    if (joySW) btnState |= (1 << 3);

    // Detect state changes and print instant feedback
    if (btnState != lastButtonState) {
        if ((btnState & (1 << 0)) && !(lastButtonState & (1 << 0))) Serial.println(" [EVENT] --> Button 1 (TRIGGER / GPIO 25) PRESSED");
        if (!(btnState & (1 << 0)) && (lastButtonState & (1 << 0))) Serial.println(" [EVENT] <-- Button 1 (TRIGGER / GPIO 25) RELEASED");

        if ((btnState & (1 << 1)) && !(lastButtonState & (1 << 1))) Serial.println(" [EVENT] --> Button 2 (GRIP / GPIO 26) PRESSED");
        if (!(btnState & (1 << 1)) && (lastButtonState & (1 << 1))) Serial.println(" [EVENT] <-- Button 2 (GRIP / GPIO 26) RELEASED");

        if ((btnState & (1 << 2)) && !(lastButtonState & (1 << 2))) Serial.println(" [EVENT] --> Button 3 (RECENTER / GPIO 27) PRESSED");
        if (!(btnState & (1 << 2)) && (lastButtonState & (1 << 2))) Serial.println(" [EVENT] <-- Button 3 (RECENTER / GPIO 27) RELEASED");

        if ((btnState & (1 << 3)) && !(lastButtonState & (1 << 3))) Serial.println(" [EVENT] --> Joystick Switch (SW / GPIO 32) CLICKED");
        if (!(btnState & (1 << 3)) && (lastButtonState & (1 << 3))) Serial.println(" [EVENT] <-- Joystick Switch (SW / GPIO 32) RELEASED");

        lastButtonState = btnState;
    }

    return btnState;
}

// ==========================================
// SERIAL USER INTERACTION & COMMANDS
// ==========================================
void handleSerialCommands() {
    if (Serial.available() > 0) {
        char cmd = Serial.read();
        while (Serial.available() > 0) Serial.read(); // Clear remaining

        if (cmd == 'h' || cmd == 'H' || cmd == '?') {
            Serial.println("\n========== SERIAL MONITOR COMMANDS ==========");
            Serial.println("  't' : Run Full Hardware Self-Test");
            Serial.println("  'c' : Recalibrate Joystick Center");
            Serial.println("  '0' : Compact Live Status Dashboard (Default)");
            Serial.println("  '1' : Raw MPU-6050 & Accel Values");
            Serial.println("  'b' : Print BLE Device Information");
            Serial.println("=============================================\n");
        } else if (cmd == 't' || cmd == 'T') {
            runI2CScanner();
            testButtonsInitial();
            testJoystickInitial();
        } else if (cmd == 'c' || cmd == 'C') {
            calibrateJoystick();
        } else if (cmd == '0') {
            diagnosticMode = 0;
            Serial.println("\n[MODE] Switched to Compact Live Dashboard.");
        } else if (cmd == '1') {
            diagnosticMode = 1;
            Serial.println("\n[MODE] Switched to Raw Sensor Values.");
        } else if (cmd == 'b' || cmd == 'B') {
            Serial.println("\n========== BLE BROADCAST INFORMATION ==========");
            Serial.printf(" Device Name : %s\n", DEVICE_NAME);
            Serial.printf(" MAC Address : %s\n", bleMacAddress.c_str());
            Serial.printf(" Service UUID: %s\n", SERVICE_UUID);
            Serial.printf(" Charac UUID : %s\n", CHARACTERISTIC_UUID);
            Serial.printf(" Status      : %s\n", deviceConnected ? "CONNECTED TO PHONE" : "ADVERTISING (Waiting for Phone)");
            Serial.println("===============================================\n");
        }
    }
}

// ==========================================
// SETUP
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(1500);

    Serial.println("\n=======================================================");
    Serial.println("       DIY VR HAND CONTROLLER - BOOT & SELF TEST       ");
    Serial.println("=======================================================");

    // 1. Initialize GPIOs
    pinMode(BTN_TRIGGER_PIN, INPUT_PULLUP);
    pinMode(BTN_GRIP_PIN, INPUT_PULLUP);
    pinMode(BTN_MENU_PIN, INPUT_PULLUP);
    pinMode(JOY_SW_PIN, INPUT_PULLUP);
    pinMode(MPU_INTERRUPT_PIN, INPUT);

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // 2. Hardware Self-Tests
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000);
    bool i2cOk = runI2CScanner();
    testButtonsInitial();
    testJoystickInitial();
    calibrateJoystick();

    // 3. Initialize MPU6050 DMP
    Serial.println("\n--- [4/4] Initializing MPU-6050 DMP Sensor Fusion ---");
    mpu.initialize();
    if (mpu.testConnection()) {
        Serial.println(" [OK] MPU-6050 connection confirmed.");
    } else {
        Serial.println(" [FAIL] MPU-6050 connection failed! Check SDA/SCL pull-ups.");
    }

    devStatus = mpu.dmpInitialize();
    mpu.setXGyroOffset(51);
    mpu.setYGyroOffset(8);
    mpu.setZGyroOffset(21);
    mpu.setXAccelOffset(-1150);
    mpu.setYAccelOffset(-50);
    mpu.setZAccelOffset(1060);

    if (devStatus == 0) {
        mpu.CalibrateAccel(6);
        mpu.CalibrateGyro(6);
        mpu.setDMPEnabled(true);
        attachInterrupt(digitalPinToInterrupt(MPU_INTERRUPT_PIN), dmpDataReady, RISING);
        dmpReady = true;
        packetSize = mpu.dmpGetFIFOPacketSize();
        Serial.println(" [OK] MPU-6050 DMP 6-Axis motion processor initialized!");
    } else {
        Serial.printf(" [FAIL] DMP Initialization failed with code: %d\n", devStatus);
    }

    // 4. Initialize BLE
    Serial.println("\n--- Starting Bluetooth Low Energy (BLE) Stack ---");
    BLEDevice::init(DEVICE_NAME);
    bleMacAddress = BLEDevice::getAddress().toString().c_str();

    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_READ   |
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pCharacteristic->addDescriptor(new BLE2902());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("=======================================================");
    Serial.printf(" [READY] BLE Device Name : '%s'\n", DEVICE_NAME);
    Serial.printf(" [READY] ESP32 MAC Addr : %s\n", bleMacAddress.c_str());
    Serial.println(" [READY] Open Samsung S24 Bluetooth / nRF Connect / Unity VR");
    Serial.println(" [TIP]   Type 'h' in Serial Monitor for interactive commands!");
    Serial.println("=======================================================\n");
}

// ==========================================
// MAIN LOOP
// ==========================================
unsigned long lastSendTime = 0;
unsigned long lastDashboardTime = 0;
const unsigned long SEND_INTERVAL_MS = 12; // ~80 Hz

void loop() {
    // 1. Process Serial User Commands
    handleSerialCommands();

    // 2. Handle BLE Connection Re-advertising
    if (!deviceConnected && oldDeviceConnected) {
        delay(500);
        pServer->startAdvertising();
        Serial.println("\n[BLE] Advertising restarted. Visible to Samsung S24.");
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // 3. Read MPU-6050 DMP Quaternions
    if (dmpReady) {
        if (mpu.dmpGetCurrentFIFOPacket(fifoBuffer)) {
            mpu.dmpGetQuaternion(&q, fifoBuffer);

            packetData.qw = (int16_t)(q.w * 16384.0f);
            packetData.qx = (int16_t)(q.x * 16384.0f);
            packetData.qy = (int16_t)(q.y * 16384.0f);
            packetData.qz = (int16_t)(q.z * 16384.0f);
        }
    }

    // 4. Update Inputs & Send BLE Packet (~80Hz)
    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;

        int16_t jX = 0, jY = 0;
        readJoystick(jX, jY);
        packetData.joyX = jX;
        packetData.joyY = jY;
        packetData.buttons = readButtonsWithEvents();
        packetData.battery = 100;
        packetData.timestamp = (uint16_t)(now & 0xFFFF);

        // Transmit over BLE
        if (deviceConnected) {
            pCharacteristic->setValue((uint8_t*)&packetData, sizeof(VRControllerPacket));
            pCharacteristic->notify();
        }
    }

    // 5. Formatted Live Serial Dashboard (every 250ms)
    if (now - lastDashboardTime >= 250) {
        lastDashboardTime = now;

        if (diagnosticMode == 0) {
            // Live Status Dashboard
            bool bTrig = (packetData.buttons & (1 << 0)) != 0;
            bool bGrip = (packetData.buttons & (1 << 1)) != 0;
            bool bMenu = (packetData.buttons & (1 << 2)) != 0;
            bool bJoy  = (packetData.buttons & (1 << 3)) != 0;

            Serial.printf("[STATUS] BLE: %-12s | QUAT:(%5.2f,%5.2f,%5.2f,%5.2f) | JOY: X=%4d Y=%4d (Raw:%4d,%4d) | BTNS: [TRIG:%d GRIP:%d REC:%d SW:%d]\r",
                deviceConnected ? "CONNECTED" : "ADVERTISING",
                q.w, q.x, q.y, q.z,
                packetData.joyX, packetData.joyY,
                joyRawX, joyRawY,
                bTrig, bGrip, bMenu, bJoy
            );
        } else if (diagnosticMode == 1) {
            // Raw sensor dump
            int16_t ax, ay, az, gx, gy, gz;
            mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
            Serial.printf("[RAW SENSORS] Accel:(%6d,%6d,%6d) | Gyro:(%6d,%6d,%6d) | JoyRaw:(%4d,%4d)\n",
                ax, ay, az, gx, gy, gz, joyRawX, joyRawY
            );
        }
    }
}
