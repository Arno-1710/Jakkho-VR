using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace DIYVR
{
    /// <summary>
    /// Handles VR Player Locomotion using the DIY Controller's Analog Joystick
    /// or PC Keyboard (WASD / Arrows) when testing on PC.
    /// Supports Smooth Movement, Snap Turning, and Smooth Turning.
    /// </summary>
    public class VRLocomotion : MonoBehaviour
    {
        public enum TurnType
        {
            SnapTurn,
            SmoothTurn
        }

        [Header("Locomotion Mode")]
        public TurnType turnType = TurnType.SnapTurn;

        [Header("Movement Settings")]
        public float moveSpeed = 3.5f;
        public Transform forwardReference; // Head Camera or Hand Controller

        [Header("Turn Settings")]
        public float snapTurnAngle = 45.0f;
        public float smoothTurnSpeed = 90.0f;
        public float turnDeadzone = 0.5f;

        [Header("Player Components")]
        public CharacterController characterController;

        private bool _canSnapTurn = true;

        private void Start()
        {
            if (characterController == null)
                characterController = GetComponent<CharacterController>();

            if (forwardReference == null && Camera.main != null)
                forwardReference = Camera.main.transform;
        }

        private void Update()
        {
            if (forwardReference == null && Camera.main != null)
                forwardReference = Camera.main.transform;

            Vector2 joy = Vector2.zero;

            // 1. Read from BLE / UDP Controller if connected
            if (BLEControllerReceiver.Instance != null)
            {
                joy = BLEControllerReceiver.Instance.CurrentState.Joystick;
            }

            // 2. Direct Keyboard Input Fallback
            if (joy == Vector2.zero)
            {
                #if ENABLE_INPUT_SYSTEM
                var kb = Keyboard.current;
                if (kb != null)
                {
                    if (kb.wKey.isPressed || kb.upArrowKey.isPressed) joy.y += 1f;
                    if (kb.sKey.isPressed || kb.downArrowKey.isPressed) joy.y -= 1f;
                    if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) joy.x += 1f;
                    if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) joy.x -= 1f;
                }
                #endif

                #if ENABLE_LEGACY_INPUT_MANAGER
                try
                {
                    joy.x = Input.GetAxisRaw("Horizontal");
                    joy.y = Input.GetAxisRaw("Vertical");
                }
                catch { }
                #endif
            }

            HandleMovement(joy);
            HandleTurning(joy.x);
        }

        private void HandleMovement(Vector2 joy)
        {
            if (forwardReference == null || joy == Vector2.zero) return;

            // Get forward and right relative to the reference transform (flattened on Y)
            Vector3 forward = forwardReference.forward;
            forward.y = 0;
            forward.Normalize();

            Vector3 right = forwardReference.right;
            right.y = 0;
            right.Normalize();

            Vector3 moveDirection = (forward * joy.y) + (right * joy.x);

            if (characterController != null && characterController.enabled)
            {
                moveDirection.y = Physics.gravity.y * Time.deltaTime;
                characterController.Move(moveDirection * moveSpeed * Time.deltaTime);
            }
            else
            {
                transform.position += moveDirection * (moveSpeed * Time.deltaTime);
            }
        }

        private void HandleTurning(float joyX)
        {
            if (turnType == TurnType.SnapTurn)
            {
                if (Mathf.Abs(joyX) > turnDeadzone)
                {
                    if (_canSnapTurn)
                    {
                        float angle = Mathf.Sign(joyX) * snapTurnAngle;
                        transform.Rotate(0, angle, 0);
                        _canSnapTurn = false;
                    }
                }
                else
                {
                    _canSnapTurn = true;
                }
            }
            else // SmoothTurn
            {
                if (Mathf.Abs(joyX) > 0.15f)
                {
                    float angle = joyX * smoothTurnSpeed * Time.deltaTime;
                    transform.Rotate(0, angle, 0);
                }
            }
        }
    }
}
