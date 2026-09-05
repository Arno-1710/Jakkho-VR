using UnityEngine;

namespace DIYVR
{
    public interface IVRInteractable
    {
        void OnPointerEnter();
        void OnPointerExit();
        void OnPointerClick();
        void OnGrab(Transform handTransform);
        void OnRelease();
    }
}
