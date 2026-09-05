using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// Optimizes the Unity VR Engine settings for the Samsung Galaxy S24 display
    /// (120Hz Dynamic AMOLED 2X, dynamic resolution, prevent screen sleep).
    /// </summary>
    public class VRS24Manager : MonoBehaviour
    {
        [Header("Display Optimization")]
        [Tooltip("Target 120Hz refresh rate on Samsung S24")]
        public int targetFrameRate = 120;

        [Tooltip("Quality Settings: vSync count (0 for manual targetFrameRate)")]
        public int vSyncCount = 0;

        [Tooltip("Render scale for crisp VR text on 1080x2340 / 1440p AMOLED")]
        [Range(0.8f, 1.4f)]
        public float renderScale = 1.0f;

        private void Awake()
        {
            // Prevent screen from sleeping while in VR headset
            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            // Unlock frame rate for 120Hz display
            QualitySettings.vSyncCount = vSyncCount;
            Application.targetFrameRate = targetFrameRate;

            // Set render scale
            #if UNITY_2019_3_OR_NEWER
            UnityEngine.XR.XRSettings.eyeTextureResolutionScale = renderScale;
            #endif

            Debug.Log($"[VRS24Manager] Initialized for Samsung S24: Target FPS = {targetFrameRate}, SleepTimeout = NeverSleep");
        }
    }
}
