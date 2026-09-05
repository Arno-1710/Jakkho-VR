using UnityEngine;

namespace DIYVR
{
    public enum Handedness
    {
        RightHand,
        LeftHand
    }

    /// <summary>
    /// Controls the 3D VR hand/wand model by applying rotation from the ESP32
    /// and simulating realistic 6-DoF position using an arm-kinematics model.
    /// </summary>
    public class VRHandController : MonoBehaviour
    {
        [Header("References")]
        [Tooltip("Main VR Camera (Player Head)")]
        public Transform headCamera;
        [Tooltip("3D Visual model of the hand or wand")]
        public Transform controllerVisual;

        [Header("Hand Configuration")]
        public Handedness handedness = Handedness.RightHand;

        [Header("Arm Model Parameters")]
        public Vector3 defaultShoulderOffset = new Vector3(0.18f, -0.15f, -0.05f); // Right shoulder
        public float upperArmLength = 0.28f;
        public float forearmLength = 0.26f;
        public float smoothingFactor = 18.0f;

        [Header("Calibration / Recenter")]
        private Quaternion _yawOffset = Quaternion.identity;

        private void Start()
        {
            if (headCamera == null && Camera.main != null)
            {
                headCamera = Camera.main.transform;
            }
        }

        private void LateUpdate()
        {
            if (BLEControllerReceiver.Instance == null) return;

            ControllerState state = BLEControllerReceiver.Instance.CurrentState;

            // 1. Handle Recenter / Tare button (Button 3)
            if (state.RecenterDown)
            {
                RecenterController(state.RawRotation);
            }

            // 2. Compute Calibrated Controller Rotation
            Quaternion controllerRotation = _yawOffset * state.RawRotation;

            // 3. Compute Simulated Arm / Hand Position
            Vector3 handPosition = CalculateArmModelPosition(controllerRotation);

            // 4. Smoothly apply transform
            transform.position = Vector3.Lerp(transform.position, handPosition, Time.deltaTime * smoothingFactor);
            transform.rotation = Quaternion.Slerp(transform.rotation, controllerRotation, Time.deltaTime * smoothingFactor);
        }

        /// <summary>
        /// Simulates shoulder-to-wrist kinematic chain based on head & controller rotation.
        /// </summary>
        private Vector3 CalculateArmModelPosition(Quaternion controllerRot)
        {
            if (headCamera == null) return transform.position;

            // Compute shoulder pivot in world space
            Vector3 shoulderOffset = defaultShoulderOffset;
            if (handedness == Handedness.LeftHand)
            {
                shoulderOffset.x = -shoulderOffset.x;
            }

            Vector3 headPos = headCamera.position;
            Quaternion headYaw = Quaternion.Euler(0, headCamera.eulerAngles.y, 0);
            Vector3 shoulderPos = headPos + (headYaw * shoulderOffset);

            // Compute arm direction influenced by controller pitch and yaw
            Vector3 controllerForward = controllerRot * Vector3.forward;
            Vector3 controllerUp = controllerRot * Vector3.up;

            // Calculate elbow position
            Vector3 elbowPos = shoulderPos + (Vector3.down * (upperArmLength * 0.7f)) + (controllerForward * (upperArmLength * 0.5f));

            // Calculate wrist / hand position
            Vector3 handPos = elbowPos + (controllerForward * forearmLength) + (controllerUp * 0.05f);

            return handPos;
        }

        /// <summary>
        /// Recalibrates controller yaw to align with head gaze direction.
        /// </summary>
        public void RecenterController(Quaternion rawRot)
        {
            if (headCamera == null) return;

            float headYaw = headCamera.eulerAngles.y;
            float rawYaw = rawRot.eulerAngles.y;
            float deltaYaw = headYaw - rawYaw;

            _yawOffset = Quaternion.Euler(0, deltaYaw, 0);
            Debug.Log($"[DIYVR] Controller Recentered! Head Yaw: {headYaw:F1}°, Offset: {deltaYaw:F1}°");
        }
    }
}
