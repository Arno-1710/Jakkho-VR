using System;
using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// Represents the instantaneous state of the DIY VR Hand Controller.
    /// </summary>
    [Serializable]
    public class ControllerState
    {
        public Quaternion RawRotation = Quaternion.identity;
        public Vector2 Joystick = Vector2.zero; // X: -1.0 to +1.0, Y: -1.0 to +1.0
        
        public bool TriggerPressed;
        public bool GripPressed;
        public bool RecenterPressed;
        public bool JoystickClickPressed;

        public bool TriggerDown;
        public bool TriggerUp;
        public bool GripDown;
        public bool GripUp;
        public bool RecenterDown;
        public bool RecenterUp;

        public int BatteryPercentage = 100;
        public float Timestamp;

        private uint _lastButtons;

        /// <summary>
        /// Unpacks raw 20-byte binary packet received from ESP32.
        /// </summary>
        public void UnpackBinaryPacket(byte[] data)
        {
            if (data == null || data.Length < 20) return;

            // 1. Quaternions (int16_t scaled by 16384.0f)
            short rawW = BitConverter.ToInt16(data, 0);
            short rawX = BitConverter.ToInt16(data, 2);
            short rawY = BitConverter.ToInt16(data, 4);
            short rawZ = BitConverter.ToInt16(data, 6);

            float qw = rawW / 16384.0f;
            float qx = rawX / 16384.0f;
            float qy = rawY / 16384.0f;
            float qz = rawZ / 16384.0f;

            // Coordinate mapping from MPU-6050 (Right-handed, Z-up or Y-up) to Unity (Left-handed, Y-up, Z-forward)
            // MPU6050 DMP Standard: X=Pitch/Roll, Y=Pitch/Roll, Z=Yaw
            RawRotation = new Quaternion(-qx, -qz, -qy, qw);

            // 2. Joystick axes (int16_t in range -512 to +512)
            short rawJoyX = BitConverter.ToInt16(data, 8);
            short rawJoyY = BitConverter.ToInt16(data, 10);

            Joystick = new Vector2(
                Mathf.Clamp(rawJoyX / 512.0f, -1.0f, 1.0f),
                Mathf.Clamp(rawJoyY / 512.0f, -1.0f, 1.0f)
            );

            // 3. Buttons (uint8_t bitfield)
            byte currentButtons = data[12];

            bool trig = (currentButtons & (1 << 0)) != 0;
            bool grip = (currentButtons & (1 << 1)) != 0;
            bool menu = (currentButtons & (1 << 2)) != 0;
            bool joySw = (currentButtons & (1 << 3)) != 0;

            TriggerDown = trig && !TriggerPressed;
            TriggerUp = !trig && TriggerPressed;
            TriggerPressed = trig;

            GripDown = grip && !GripPressed;
            GripUp = !grip && GripPressed;
            GripPressed = grip;

            RecenterDown = menu && !RecenterPressed;
            RecenterUp = !menu && RecenterPressed;
            RecenterPressed = menu;

            JoystickClickPressed = joySw;
            _lastButtons = currentButtons;

            // 4. Battery & Timestamp
            BatteryPercentage = data[13];
            ushort timeMs = BitConverter.ToUInt16(data, 14);
            Timestamp = timeMs / 1000.0f;
        }
    }
}
