using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// Handles VR Player Locomotion using the DIY Controller's Analog Joystick.
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
        public float moveSpeed = 3.0f;
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
            if (BLEControllerReceiver.Instance == null) return;
            ControllerState state = BLEControllerReceiver.Instance.CurrentState;

            HandleMovement(state.Joystick);
            HandleTurning(state.Joystick.x);
        }

        private void HandleMovement(Vector2 joy)
        {
            if (forwardReference == null) return;

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
                // Apply simple gravity
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
