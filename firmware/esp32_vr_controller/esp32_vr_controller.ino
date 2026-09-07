/*
 * ============================================================================
 *  JAKKHO DIY VR HAND CONTROLLER FIRMWARE (ESP32) - BULLETPROOF BOOT BUILD
 * ============================================================================
 *  Hardware Connections:
 *    - ESP32 Development Board (ESP32-WROOM-32)
 *    - MPU-6050 6-Axis IMU:
 *        * VCC -> 3.3V, GND -> GND, SCL -> GPIO 22, SDA -> GPIO 21, INT -> GPIO 19
 *    - 2-Axis Analog Thumb Joystick:
 *        * VCC -> 3.3V (DO NOT USE 5V!)
 *        * GND -> GND
 *        * VRX -> GPIO 34 (ADC1_CH6)
 *        * VRY -> GPIO 35 (ADC1_CH7)
 *        * SW  -> GPIO 32 (Joystick Thumb Click)
 *    - 3x Push Buttons:
 *        * Button 1 (Trigger)  -> GPIO 25 to GND
 *        * Button 2 (Grip)     -> GPIO 26 to GND
 *        * Button 3 (Recenter) -> GPIO 27 to GND
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
// 20-BYTE BINARY PACKET STRUCT
// ==========================================
struct __attribute__((packed)) VRControllerPacket {
    int16_t qw;         // Offset 0  (2 bytes) - Quat W * 16384
    int16_t qx;         // Offset 2  (2 bytes) - Quat X * 16384
    int16_t qy;         // Offset 4  (2 bytes) - Quat Y * 16384
    int16_t qz;         // Offset 6  (2 bytes) - Quat Z * 16384
    int16_t joyX;       // Offset 8  (2 bytes) - Joystick X: -512 to +512
    int16_t joyY;       // Offset 10 (2 bytes) - Joystick Y: -512 to +512
    uint8_t buttons;    // Offset 12 (1 byte)  - Bit 0:Trig, 1:Grip, 2:Recenter, 3:JoySW
    uint8_t battery;    // Offset 13 (1 byte)  - 0 to 100%
    uint16_t timestamp; // Offset 14 (2 bytes) - Milliseconds counter
    uint16_t reserved;  // Offset 16 (2 bytes) - Alignment padding
    uint16_t checksum;  // Offset 18 (2 bytes) - CRC / Checksum
};

VRControllerPacket packetData;

// ==========================================
// SENSORS & GLOBAL STATE
// ==========================================
MPU6050 mpu;
bool mpuAvailable = false;
bool dmpReady = false;
uint8_t devStatus;
uint16_t packetSize = 42;
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

// Joystick Variables
int joyRawX = 2048, joyRawY = 2048;
int joyCenterX = 2048;
int joyCenterY = 2048;
const int JOY_DEADZONE = 30;

// ==========================================
// BLE CALLBACKS
// ==========================================
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
    }
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
    }
};

// ==========================================
// SENSOR HELPERS
// ==========================================
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

uint8_t readButtons() {
    uint8_t btnState = 0;
    if (digitalRead(BTN_TRIGGER_PIN) == LOW) btnState |= (1 << 0);
    if (digitalRead(BTN_GRIP_PIN) == LOW)    btnState |= (1 << 1);
    if (digitalRead(BTN_MENU_PIN) == LOW)    btnState |= (1 << 2);
    if (digitalRead(JOY_SW_PIN) == LOW)      btnState |= (1 << 3);
    return btnState;
}

// ==========================================
// SETUP
// ==========================================
void setup() {
    Serial.begin(115200);
    delay(200);

    // 1. Initialize GPIOs
    pinMode(BTN_TRIGGER_PIN, INPUT_PULLUP);
    pinMode(BTN_GRIP_PIN, INPUT_PULLUP);
    pinMode(BTN_MENU_PIN, INPUT_PULLUP);
    pinMode(JOY_SW_PIN, INPUT_PULLUP);
    pinMode(MPU_INTERRUPT_PIN, INPUT);

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    // Initial neutral packet
    packetData.qw = 16384; // 1.0f in scaled format
    packetData.qx = 0;
    packetData.qy = 0;
    packetData.qz = 0;
    packetData.joyX = 0;
    packetData.joyY = 0;
    packetData.buttons = 0;
    packetData.battery = 100;
    packetData.timestamp = 0;
    packetData.reserved = 0;
    packetData.checksum = 0xAA55;

    // 2. Calibrate initial center
    joyCenterX = analogRead(JOY_VRX_PIN);
    joyCenterY = analogRead(JOY_VRY_PIN);
    if (joyCenterX < 500 || joyCenterX > 3500) joyCenterX = 2048;
    if (joyCenterY < 500 || joyCenterY > 3500) joyCenterY = 2048;

    // 3. Initialize I2C with Timeout Guard
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, 400000);
    Wire.setTimeOut(50); // 50ms timeout prevents hanging if MPU is disconnected

    // Check MPU
    Wire.beginTransmission(0x68);
    if (Wire.endTransmission() == 0) {
        mpuAvailable = true;
    } else {
        Wire.beginTransmission(0x69);
        if (Wire.endTransmission() == 0) mpuAvailable = true;
    }

    if (mpuAvailable) {
        mpu.initialize();
        devStatus = mpu.dmpInitialize();
        if (devStatus == 0) {
            mpu.setXGyroOffset(51);
            mpu.setYGyroOffset(8);
            mpu.setZGyroOffset(21);
            mpu.setXAccelOffset(-1150);
            mpu.setYAccelOffset(-50);
            mpu.setZAccelOffset(1060);

            mpu.CalibrateAccel(4);
            mpu.CalibrateGyro(4);
            mpu.setDMPEnabled(true);
            attachInterrupt(digitalPinToInterrupt(MPU_INTERRUPT_PIN), dmpDataReady, RISING);
            dmpReady = true;
            packetSize = mpu.dmpGetFIFOPacketSize();
        }
    }

    // 4. Initialize BLE
    try {
        BLEDevice::init(DEVICE_NAME);
        pServer = BLEDevice::createServer();
        pServer->setCallbacks(new MyServerCallbacks());

        BLEService *pService = pServer->createService(SERVICE_UUID);
        pCharacteristic = pService->createCharacteristic(
            CHARACTERISTIC_UUID,
            BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
        );
        pCharacteristic->addDescriptor(new BLE2902());
        pService->start();

        BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
        pAdvertising->addServiceUUID(SERVICE_UUID);
        pAdvertising->setScanResponse(true);
        BLEDevice::startAdvertising();
    } catch (...) {}
}

// ==========================================
// MAIN LOOP
// ==========================================
unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL_MS = 12; // ~80 Hz

void loop() {
    // BLE Auto-reconnect advertising
    if (!deviceConnected && oldDeviceConnected) {
        delay(200);
        if (pServer) pServer->startAdvertising();
        oldDeviceConnected = deviceConnected;
    }
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }

    // Read MPU DMP if active
    if (dmpReady && mpuAvailable) {
        if (mpu.dmpGetCurrentFIFOPacket(fifoBuffer)) {
            mpu.dmpGetQuaternion(&q, fifoBuffer);
            packetData.qw = (int16_t)(q.w * 16384.0f);
            packetData.qx = (int16_t)(q.x * 16384.0f);
            packetData.qy = (int16_t)(q.y * 16384.0f);
            packetData.qz = (int16_t)(q.z * 16384.0f);
        }
    }

    // 80Hz Packet Stream
    unsigned long now = millis();
    if (now - lastSendTime >= SEND_INTERVAL_MS) {
        lastSendTime = now;

        int16_t jX = 0, jY = 0;
        readJoystick(jX, jY);
        packetData.joyX = jX;
        packetData.joyY = jY;
        packetData.buttons = readButtons();
        packetData.battery = 100;
        packetData.timestamp = (uint16_t)(now & 0xFFFF);

        // 1. Send over USB Serial (for PC Unity via Bridge)
        Serial.write((uint8_t*)&packetData, sizeof(VRControllerPacket));

        // 2. Send over BLE (for Android VR / Phone)
        if (deviceConnected && pCharacteristic) {
            pCharacteristic->setValue((uint8_t*)&packetData, sizeof(VRControllerPacket));
            pCharacteristic->notify();
        }
    }
}
