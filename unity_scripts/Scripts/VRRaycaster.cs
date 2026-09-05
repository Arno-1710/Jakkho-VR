using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;

namespace DIYVR
{
    /// <summary>
    /// Projects a laser pointer ray from the controller tip, interacts with
    /// World Space UI elements and 3D objects implementing IVRInteractable.
    /// </summary>
    [RequireComponent(typeof(LineRenderer))]
    public class VRRaycaster : MonoBehaviour
    {
        [Header("Raycast Settings")]
        public float maxRayDistance = 25.0f;
        public LayerMask interactionLayers = ~0;

        [Header("Visuals")]
        public Transform reticleDot;
        public Color normalColor = new Color(0f, 0.7f, 1f, 0.6f);
        public Color hoverColor = new Color(0f, 1f, 0.4f, 0.9f);
        public Color clickColor = new Color(1f, 0.2f, 0.2f, 1.0f);

        private LineRenderer _lineRenderer;
        private IVRInteractable _currentInteractable;
        private IVRInteractable _grabbedObject;
        private Button _currentUIButton;

        private void Awake()
        {
            _lineRenderer = GetComponent<LineRenderer>();
            _lineRenderer.positionCount = 2;
            _lineRenderer.startWidth = 0.005f;
            _lineRenderer.endWidth = 0.001f;
        }

        private void Update()
        {
            if (BLEControllerReceiver.Instance == null) return;
            ControllerState state = BLEControllerReceiver.Instance.CurrentState;

            PerformRaycast(state);
            HandleInteractions(state);
        }

        private void PerformRaycast(ControllerState state)
        {
            Ray ray = new Ray(transform.position, transform.forward);
            RaycastHit hit;

            Vector3 endPoint = transform.position + (transform.forward * maxRayDistance);
            bool isHit = Physics.Raycast(ray, out hit, maxRayDistance, interactionLayers);

            if (isHit)
            {
                endPoint = hit.point;

                if (reticleDot != null)
                {
                    reticleDot.gameObject.SetActive(true);
                    reticleDot.position = hit.point;
                    reticleDot.rotation = Quaternion.LookRotation(hit.normal);
                }

                // Check for 3D Interactable
                IVRInteractable interactable = hit.collider.GetComponent<IVRInteractable>();
                if (interactable != _currentInteractable)
                {
                    _currentInteractable?.OnPointerExit();
                    _currentInteractable = interactable;
                    _currentInteractable?.OnPointerEnter();
                }

                // Check for World Space UI Button
                _currentUIButton = hit.collider.GetComponent<Button>();

                // Set laser color based on hover
                SetLaserColor((_currentInteractable != null || _currentUIButton != null) ? hoverColor : normalColor);
            }
            else
            {
                if (reticleDot != null) reticleDot.gameObject.SetActive(false);

                if (_currentInteractable != null)
                {
                    _currentInteractable.OnPointerExit();
                    _currentInteractable = null;
                }
                _currentUIButton = null;
                SetLaserColor(normalColor);
            }

            _lineRenderer.SetPosition(0, transform.position);
            _lineRenderer.SetPosition(1, endPoint);
        }

        private void HandleInteractions(ControllerState state)
        {
            // 1. Trigger Click (Button 1)
            if (state.TriggerDown)
            {
                SetLaserColor(clickColor);

                if (_currentUIButton != null && _currentUIButton.interactable)
                {
                    _currentUIButton.onClick.Invoke();
                }

                _currentInteractable?.OnPointerClick();
            }

            // 2. Grip Grab / Release (Button 2)
            if (state.GripDown && _currentInteractable != null)
            {
                _grabbedObject = _currentInteractable;
                _grabbedObject.OnGrab(transform);
            }
            else if (state.GripUp && _grabbedObject != null)
            {
                _grabbedObject.OnRelease();
                _grabbedObject = null;
            }
        }

        private void SetLaserColor(Color col)
        {
            _lineRenderer.startColor = col;
            _lineRenderer.endColor = new Color(col.r, col.g, col.b, 0.1f);
        }
    }
}
