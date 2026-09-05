using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// Receives controller packets via Bluetooth Low Energy (BLE) or UDP fallback,
    /// and provides an in-editor simulation mode for rapid testing.
    /// </summary>
    public class BLEControllerReceiver : MonoBehaviour
    {
        public static BLEControllerReceiver Instance { get; private set; }

        [Header("Connection Settings")]
        [Tooltip("The Target BLE Device Name broadcast by the ESP32")]
        public string deviceName = "DIY_VR_Controller";
        public string serviceUUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
        public string characteristicUUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

        [Header("UDP Stream Fallback (Optional)")]
        public bool enableUdpReceiver = false;
        public int udpPort = 8888;

        [Header("Editor Simulation")]
        [Tooltip("Enables mouse and keyboard simulation of the VR controller in the Unity Editor.")]
        public bool enableEditorSimulation = true;

        [Header("Debug")]
        public bool isConnected = false;
        public ControllerState CurrentState { get; private set; } = new ControllerState();

        public event Action<ControllerState> OnStateUpdated;

        private UdpClient _udpClient;
        private byte[] _packetBuffer = new byte[64];

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
#if UNITY_EDITOR
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
            Debug.Log("[DIYVR] Initializing Android BLE Subsystem...");
            try
            {
                using (AndroidJavaClass unityPlayer = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                {
                    AndroidJavaObject activity = unityPlayer.GetStatic<AndroidJavaObject>("currentActivity");
                    // Call native Android Bluetooth helper or initiate scan
                    Debug.Log("[DIYVR] Android Activity context acquired for BLE.");
                }
            }
            catch (Exception ex)
            {
                Debug.LogWarning("[DIYVR] Native BLE initialization exception: " + ex.Message);
            }
        }

        /// <summary>
        /// Native Android / Plugin callback receiving byte payload from ESP32 characteristic notification.
        /// </summary>
        public void OnBleDataReceived(byte[] data)
        {
            if (data == null || data.Length < 20) return;
            isConnected = true;
            CurrentState.UnpackBinaryPacket(data);
        }

        #endregion

        #region UDP Fallback

        private void StartUdpReceiver()
        {
            try
            {
                _udpClient = new UdpClient(udpPort);
                _udpClient.BeginReceive(OnUdpPacketReceived, null);
                Debug.Log($"[DIYVR] UDP Receiver listening on port {udpPort}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[DIYVR] Failed to bind UDP Receiver: {ex.Message}");
            }
        }

        private void OnUdpPacketReceived(IAsyncResult res)
        {
            try
            {
                IPEndPoint remoteIp = new IPEndPoint(IPAddress.Any, udpPort);
                byte[] receivedBytes = _udpClient.EndReceive(res, ref remoteIp);

                if (receivedBytes.Length >= 20)
                {
                    isConnected = true;
                    CurrentState.UnpackBinaryPacket(receivedBytes);
                }

                _udpClient.BeginReceive(OnUdpPacketReceived, null);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[DIYVR] UDP receive error: {ex.Message}");
            }
        }

        #endregion

        #region Editor Simulation

        private float _simYaw = 0f;
        private float _simPitch = 0f;

        private void SimulateEditorInputs()
        {
            // Right-click + Mouse drag to rotate controller in Editor
            if (Input.GetMouseButton(1))
            {
                _simYaw += Input.GetAxis("Mouse X") * 3.0f;
                _simPitch -= Input.GetAxis("Mouse Y") * 3.0f;
                _simPitch = Mathf.Clamp(_simPitch, -85f, 85f);
            }

            CurrentState.RawRotation = Quaternion.Euler(_simPitch, _simYaw, 0f);

            // WASD / Arrow keys for analog joystick
            float joyX = Input.GetAxisRaw("Horizontal");
            float joyY = Input.GetAxisRaw("Vertical");
            CurrentState.Joystick = new Vector2(joyX, joyY);

            // Buttons: Left Click = Trigger, G = Grip, R = Recenter, Space = Joystick SW
            bool trig = Input.GetMouseButton(0) || Input.GetKey(KeyCode.Space);
            bool grip = Input.GetKey(KeyCode.G);
            bool recenter = Input.GetKeyDown(KeyCode.R);
            bool joyClick = Input.GetKey(KeyCode.LeftShift);

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
