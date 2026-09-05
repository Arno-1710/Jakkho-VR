using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// Sample component for objects that can be picked up, rotated, and thrown
    /// using the controller's Grip button (Button 2).
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    [RequireComponent(typeof(Collider))]
    public class GrabbableObject : MonoBehaviour, IVRInteractable
    {
        [Header("Visual Feedback")]
        public Material outlineMaterial;

        private Rigidbody _rb;
        private Transform _originalParent;
        private bool _isGrabbed = false;
        private Vector3 _lastPosition;
        private Vector3 _velocity;

        private void Awake()
        {
            _rb = GetComponent<Rigidbody>();
        }

        private void Update()
        {
            if (_isGrabbed)
            {
                _velocity = (transform.position - _lastPosition) / Time.deltaTime;
                _lastPosition = transform.position;
            }
        }

        public void OnPointerEnter()
        {
            // Optional: Enable highlight/outline
        }

        public void OnPointerExit()
        {
            // Optional: Disable highlight/outline
        }

        public void OnPointerClick()
        {
            // Optional: Trigger click effect
        }

        public void OnGrab(Transform handTransform)
        {
            _isGrabbed = true;
            _originalParent = transform.parent;
            transform.SetParent(handTransform);

            _rb.isKinematic = true;
            _lastPosition = transform.position;
        }

        public void OnRelease()
        {
            _isGrabbed = false;
            transform.SetParent(_originalParent);

            _rb.isKinematic = false;
            _rb.linearVelocity = _velocity; // Retain throw momentum
        }
    }
}
