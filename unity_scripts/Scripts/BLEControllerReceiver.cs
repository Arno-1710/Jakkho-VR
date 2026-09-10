using System;
using System.Net;
using System.Net.Sockets;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM || true
using UnityEngine.InputSystem;
#endif

namespace DIYVR
{
    /// <summary>
    /// Receives controller tracking packets via BLE (on Android), UDP (Wi-Fi/Localhost), 
    /// or PC Keyboard/Mouse simulator (compatible with Unity New Input System).
    /// </summary>
    public class BLEControllerReceiver : MonoBehaviour
    {
        public static BLEControllerReceiver Instance { get; private set; }

        [Header("Bluetooth Low Energy (BLE)")]
        public string deviceName = "DIY_VR_Controller";
        public string serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
        public string characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

        [Header("UDP Stream (Wi-Fi / Serial Bridge)")]
        [Tooltip("Receives controller packets sent over UDP port 8888.")]
        public bool enableUdpReceiver = true;
        public int udpPort = 8888;

        [Header("Editor Simulation")]
        [Tooltip("Enables mouse and keyboard simulation only if physical hardware is detached.")]
        public bool enableEditorSimulation = true;

        [Header("Debug Status")]
        public bool isConnected = false;
        public ControllerState CurrentState { get; private set; } = new ControllerState();

        public event Action<ControllerState> OnStateUpdated;

        private UdpClient _udpClient;
        private byte[] _latestPacketBytes = null;
        private readonly object _lock = new object();

        private void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);

            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            InitializeAndroidBLE();
#else
            if (enableUdpReceiver)
            {
                StartUdpReceiver();
            }
#endif
        }

        private void Update()
        {
            // Process latest hardware packet if available
            lock (_lock)
            {
                if (_latestPacketBytes != null && _latestPacketBytes.Length >= 20)
                {
                    CurrentState.UnpackBinaryPacket(_latestPacketBytes);
                    isConnected = true;
                    _latestPacketBytes = null;
                }
            }

#if UNITY_EDITOR
            // Fall back to mouse/keyboard simulation if not connected to hardware
            if (enableEditorSimulation && !isConnected)
            {
                SimulateEditorInputs();
            }
#endif
            OnStateUpdated?.Invoke(CurrentState);
        }

        #region Android BLE Integration

        private void InitializeAndroidBLE()
        {
            Debug.Log("[JAKKHO BLE] Initializing Android BLE Subsystem...");
        }

        public void OnBleDataReceived(byte[] data)
        {
            if (data == null || data.Length < 20) return;
            isConnected = true;
            CurrentState.UnpackBinaryPacket(data);
        }

        #endregion

        #region UDP Receiver

        private void StartUdpReceiver()
        {
            try
            {
                _udpClient = new UdpClient(udpPort);
                _udpClient.BeginReceive(OnUdpPacketReceived, null);
                Debug.Log($"[JAKKHO UDP] Receiver listening on UDP port {udpPort}");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[JAKKHO UDP] UDP Receiver notice: {ex.Message}");
            }
        }

        private void OnUdpPacketReceived(IAsyncResult res)
        {
            try
            {
                if (_udpClient == null) return;
                IPEndPoint remoteIp = new IPEndPoint(IPAddress.Any, udpPort);
                byte[] receivedBytes = _udpClient.EndReceive(res, ref remoteIp);

                if (receivedBytes.Length >= 20)
                {
                    lock (_lock)
                    {
                        _latestPacketBytes = receivedBytes;
                    }
                }

                _udpClient.BeginReceive(OnUdpPacketReceived, null);
            }
            catch (Exception)
            {
                // Port teardown
            }
        }

        #endregion

        #region Editor Simulation (Compatible with New & Old Input Systems)

        private float _simYaw = 0f;
        private float _simPitch = 0f;

        private void SimulateEditorInputs()
        {
            float joyX = 0f;
            float joyY = 0f;
            bool rightMouseDown = false;
            Vector2 mouseDelta = Vector2.zero;
            bool trig = false;
            bool grip = false;
            bool recenter = false;
            bool joyClick = false;

            // 1. Try New Input System (Default in Unity 6)
            var mouse = Mouse.current;
            var keyboard = Keyboard.current;

            if (mouse != null)
            {
                rightMouseDown = mouse.rightButton.isPressed;
                mouseDelta = mouse.delta.ReadValue();
                trig = mouse.leftButton.isPressed;
            }

            if (keyboard != null)
            {
                if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed) joyY += 1f;
                if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed) joyY -= 1f;
                if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed) joyX += 1f;
                if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed) joyX -= 1f;

                if (keyboard.spaceKey.isPressed) trig = true;
                if (keyboard.gKey.isPressed) grip = true;
                if (keyboard.rKey.wasPressedThisFrame) recenter = true;
                if (keyboard.leftShiftKey.isPressed) joyClick = true;
            }

            // Fallback for legacy input if new input system is not initialized
            if (mouse == null && keyboard == null)
            {
                try
                {
                    rightMouseDown = Input.GetMouseButton(1);
                    mouseDelta = new Vector2(Input.GetAxis("Mouse X") * 15f, Input.GetAxis("Mouse Y") * 15f);
                    joyX = Input.GetAxisRaw("Horizontal");
                    joyY = Input.GetAxisRaw("Vertical");
                    trig = Input.GetMouseButton(0) || Input.GetKey(KeyCode.Space);
                    grip = Input.GetKey(KeyCode.G);
                    recenter = Input.GetKeyDown(KeyCode.R);
                    joyClick = Input.GetKey(KeyCode.LeftShift);
                }
                catch { }
            }

            // Aiming (Right Mouse + Drag)
            if (rightMouseDown)
            {
                _simYaw += mouseDelta.x * 0.15f;
                _simPitch -= mouseDelta.y * 0.15f;
                _simPitch = Mathf.Clamp(_simPitch, -85f, 85f);
            }

            CurrentState.RawRotation = Quaternion.Euler(_simPitch, _simYaw, 0f);
            CurrentState.Joystick = new Vector2(joyX, joyY);

            CurrentState.TriggerDown = trig && !CurrentState.TriggerPressed;
            CurrentState.TriggerUp = !trig && CurrentState.TriggerPressed;
            CurrentState.TriggerPressed = trig;

            CurrentState.GripDown = grip && !CurrentState.GripPressed;
            CurrentState.GripUp = !grip && CurrentState.GripPressed;
            CurrentState.GripPressed = grip;

            CurrentState.RecenterDown = recenter;
            CurrentState.RecenterPressed = recenter;
            CurrentState.JoystickClickPressed = joyClick;
        }

        #endregion

        private void OnDestroy()
        {
            if (_udpClient != null)
            {
                _udpClient.Close();
                _udpClient = null;
            }
        }
    }
}
