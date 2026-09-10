using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DIYVR
{
    /// <summary>
    /// Universal VR Head Tracking for Mobile & PC.
    /// Supports Unity New Input System (AttitudeSensor, Accelerometer, Touchscreen, Mouse)
    /// and Legacy Input with automatic fallback.
    /// </summary>
    [DefaultExecutionOrder(-100)]
    public class VRHeadGyroTracker : MonoBehaviour
    {
        [Header("Tracking Settings")]
        public bool enableSensors = true;
        public float smoothFactor = 25f;

        [Header("Touch / Mouse Drag Look")]
        public bool enableSwipeLook = true;
        public float sensitivity = 0.25f;

        [Header("Calibration")]
        public bool tapToRecenter = true;

        private Quaternion _baseRotation = Quaternion.Euler(90f, 0f, 0f);
        private Quaternion _calibrationOffset = Quaternion.identity;
        private float _touchYaw = 0f;
        private float _touchPitch = 0f;
        private Vector2 _lastTouchPos;
        private bool _isDragging = false;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoAttachToMainCamera()
        {
            Camera mainCam = Camera.main;
            if (mainCam != null && mainCam.GetComponent<VRHeadGyroTracker>() == null)
            {
                mainCam.gameObject.AddComponent<VRHeadGyroTracker>();
                Debug.Log("[DIYVR] Auto-attached VRHeadGyroTracker to Main Camera.");
            }
        }

        private void Start()
        {
            // 1. Enable New Input System Sensors
            #if ENABLE_INPUT_SYSTEM
            try
            {
                if (AttitudeSensor.current != null)
                {
                    InputSystem.EnableDevice(AttitudeSensor.current);
                }
                if (UnityEngine.InputSystem.Accelerometer.current != null)
                {
                    InputSystem.EnableDevice(UnityEngine.InputSystem.Accelerometer.current);
                }
            }
            catch { }
            #endif

            // 2. Enable Legacy Gyroscope if available
            try
            {
                Input.gyro.enabled = true;
                Input.gyro.updateInterval = 0.0167f;
            }
            catch { }

            Recenter();
        }

        private void Update()
        {
            HandleEditorMouse();
            HandleTouchLook();
            ApplyOrientation();
        }

        private void HandleEditorMouse()
        {
            #if ENABLE_INPUT_SYSTEM
            var mouse = Mouse.current;
            if (mouse != null && (mouse.rightButton.isPressed || mouse.leftButton.isPressed))
            {
                Vector2 delta = mouse.delta.ReadValue();
                _touchYaw += delta.x * sensitivity * 0.5f;
                _touchPitch -= delta.y * sensitivity * 0.5f;
                _touchPitch = Mathf.Clamp(_touchPitch, -85f, 85f);
                return;
            }
            #endif

            #if ENABLE_LEGACY_INPUT_MANAGER
            try
            {
                if (Input.GetMouseButton(1) || Input.GetKey(KeyCode.LeftAlt))
                {
                    _touchYaw += Input.GetAxis("Mouse X") * 3.0f;
                    _touchPitch -= Input.GetAxis("Mouse Y") * 3.0f;
                    _touchPitch = Mathf.Clamp(_touchPitch, -85f, 85f);
                }
            }
            catch { }
            #endif
        }

        private void HandleTouchLook()
        {
            #if ENABLE_INPUT_SYSTEM
            var ts = Touchscreen.current;
            if (ts != null && ts.primaryTouch.press.isPressed)
            {
                Vector2 pos = ts.primaryTouch.position.ReadValue();
                Vector2 delta = ts.primaryTouch.delta.ReadValue();

                if (delta.magnitude > 1f && enableSwipeLook)
                {
                    _isDragging = true;
                    _touchYaw += delta.x * sensitivity;
                    _touchPitch -= delta.y * sensitivity;
                    _touchPitch = Mathf.Clamp(_touchPitch, -80f, 80f);
                }

                if (ts.primaryTouch.press.wasReleasedThisFrame)
                {
                    if (!_isDragging && tapToRecenter)
                    {
                        Recenter();
                    }
                    _isDragging = false;
                }
                return;
            }
            #endif

            #if ENABLE_LEGACY_INPUT_MANAGER
            try
            {
                if (Input.touchCount == 1)
                {
                    Touch t = Input.GetTouch(0);
                    if (t.phase == TouchPhase.Began)
                    {
                        _lastTouchPos = t.position;
                        _isDragging = false;
                    }
                    else if (t.phase == TouchPhase.Moved)
                    {
                        Vector2 delta = t.position - _lastTouchPos;
                        if (delta.magnitude > 4f)
                        {
                            _isDragging = true;
                            if (enableSwipeLook)
                            {
                                _touchYaw += delta.x * sensitivity;
                                _touchPitch -= delta.y * sensitivity;
                                _touchPitch = Mathf.Clamp(_touchPitch, -80f, 80f);
                            }
                        }
                        _lastTouchPos = t.position;
                    }
                    else if (t.phase == TouchPhase.Ended)
                    {
                        if (!_isDragging && tapToRecenter) Recenter();
                        _isDragging = false;
                    }
                }
            }
            catch { }
            #endif
        }

        private void ApplyOrientation()
        {
            Quaternion sensorRotation = Quaternion.identity;
            bool hasSensor = false;

            // 1. Try AttitudeSensor (New Input System)
            #if ENABLE_INPUT_SYSTEM
            if (AttitudeSensor.current != null && AttitudeSensor.current.enabled)
            {
                Quaternion raw = AttitudeSensor.current.attitude.ReadValue();
                if (raw != Quaternion.identity)
                {
                    Quaternion converted = new Quaternion(raw.x, raw.y, -raw.z, -raw.w);
                    sensorRotation = _baseRotation * converted;
                    hasSensor = true;
                }
            }
            #endif

            // 2. Try Legacy Gyro
            if (!hasSensor)
            {
                try
                {
                    if (Input.gyro.enabled && Input.gyro.attitude != Quaternion.identity)
                    {
                        Quaternion raw = Input.gyro.attitude;
                        Quaternion converted = new Quaternion(raw.x, raw.y, -raw.z, -raw.w);
                        sensorRotation = _baseRotation * converted;
                        hasSensor = true;
                    }
                }
                catch { }
            }

            if (hasSensor && enableSensors)
            {
                Quaternion finalRot = _calibrationOffset * sensorRotation * Quaternion.Euler(_touchPitch, _touchYaw, 0f);
                transform.localRotation = Quaternion.Slerp(transform.localRotation, finalRot, Time.deltaTime * smoothFactor);
            }
            else
            {
                // Touch Swipe / Editor Mouse direct orientation
                Quaternion directRot = Quaternion.Euler(_touchPitch, _touchYaw, 0f);
                transform.localRotation = Quaternion.Slerp(transform.localRotation, directRot, Time.deltaTime * smoothFactor);
            }
        }

        public void Recenter()
        {
            _calibrationOffset = Quaternion.identity;
            _touchYaw = 0f;
            _touchPitch = 0f;
            Debug.Log("[DIYVR] Headset View Recentered.");
        }
    }
}
