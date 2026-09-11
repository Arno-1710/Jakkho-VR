using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace DIYVR
{
    /// <summary>
    /// JAKKHO Wireless VR Live Streamer.
    /// Captures the Unity VR / Player Camera output and broadcasts real-time video frames
    /// over Wi-Fi / LAN with zero wires.
    /// 
    /// Features:
    /// 1. Built-in HTTP MJPEG Server (http://0.0.0.0:8085/live.mjpg) - accessible by any browser/phone on Wi-Fi.
    /// 2. WebSocket Streamer (ws://127.0.0.1:8082) for JAKKHO Web Platform integration.
    /// 3. Zero external DLL dependencies - uses standard .NET 2.1 & Unity Engine APIs.
    /// </summary>
    public class UnityLiveWebStreamer : MonoBehaviour
    {
        [Header("Target Camera (Optional)")]
        [Tooltip("Leave empty to auto-detect Main Camera")]
        public Camera targetCamera;

        [Header("HTTP MJPEG Wi-Fi Server")]
        [Tooltip("Enable built-in HTTP MJPEG server for browser & mobile live viewing")]
        public bool enableHttpMjpegServer = true;

        [Tooltip("Port for the local HTTP MJPEG server")]
        public int httpPort = 8085;

        [Header("WebSocket Server (Optional)")]
        [Tooltip("Enable WebSocket streaming to external JAKKHO Web Platform server")]
        public bool enableWebSocketStreaming = false;

        [Tooltip("Target WebSocket URL")]
        public string webSocketUrl = "ws://127.0.0.1:8082/stream/unity_pc";

        [Header("Stream Quality Settings")]
        [Range(15, 60)]
        [Tooltip("Target frames per second for stream")]
        public int targetFps = 60;

        [Range(360, 1080)]
        [Tooltip("Stream vertical resolution (height in pixels)")]
        public int streamHeight = 1080;

        [Range(20, 95)]
        [Tooltip("JPEG compression quality (lower = lower latency, higher = crisper)")]
        public int jpgQuality = 90;

        [Header("Browser Auto-Launch")]
        [Tooltip("Automatically open your web browser to the casting screen when Unity enters Play mode")]
        public bool autoOpenBrowserOnPlay = true;

        [Tooltip("Web port where the JAKKHO Webcasting Platform is hosted (default: 5173 or 3000)")]
        public int webPlatformPort = 5173;

        [Header("Live Diagnostics")]
        public bool isMjpegServerRunning = false;
        public int activeHttpClients = 0;
        public int liveFps = 0;
        public long totalFramesBroadcast = 0;
        public string localStreamUrl = "";
        public string lanStreamUrl = "";

        private Camera _camera;
        private RenderTexture _renderTexture;
        private Texture2D _frameTexture;
        private float _lastFrameTime = 0f;
        private int _fpsCounter = 0;
        private float _fpsTimer = 0f;

        // HTTP MJPEG Server state
        private HttpListener _httpListener;
        private Thread _listenerThread;
        private bool _isListening = false;
        private readonly List<StreamClient> _httpClients = new List<StreamClient>();
        private readonly object _clientsLock = new object();
        private byte[] _latestJpegFrame;
        private readonly object _frameLock = new object();

        // WebSocket state
        private ClientWebSocket _webSocket;
        private CancellationTokenSource _wsCts;
        private bool _isWsSending = false;

        private class StreamClient
        {
            public HttpListenerContext Context;
            public Stream OutputStream;
            public bool IsAlive = true;
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void AutoAttachToMainCamera()
        {
#if UNITY_2023_1_OR_NEWER || UNITY_6000_0_OR_NEWER
            UnityLiveWebStreamer existing = FindAnyObjectByType<UnityLiveWebStreamer>();
#else
            UnityLiveWebStreamer existing = FindObjectOfType<UnityLiveWebStreamer>();
#endif
            if (existing == null)
            {
                Camera mainCam = Camera.main;
                if (mainCam != null)
                {
                    mainCam.gameObject.AddComponent<UnityLiveWebStreamer>();
                    Debug.Log("<color=#00f5d4>[JAKKHO Streamer] Auto-attached UnityLiveWebStreamer to Main Camera.</color>");
                }
                else
                {
                    GameObject streamerGO = new GameObject("JAKKHO_WebCaster");
                    streamerGO.AddComponent<UnityLiveWebStreamer>();
                    DontDestroyOnLoad(streamerGO);
                    Debug.Log("<color=#00f5d4>[JAKKHO Streamer] Spawned standalone JAKKHO_WebCaster in scene.</color>");
                }
            }
        }

        private void Awake()
        {
            FindTargetCamera();
        }

        private void OnEnable()
        {
            UnityEngine.Rendering.RenderPipelineManager.endCameraRendering += OnEndCameraRendering;
        }

        private void OnDisable()
        {
            UnityEngine.Rendering.RenderPipelineManager.endCameraRendering -= OnEndCameraRendering;
        }

        private void FindTargetCamera()
        {
            if (targetCamera != null)
            {
                _camera = targetCamera;
            }
            else
            {
                _camera = GetComponent<Camera>() ?? GetComponentInChildren<Camera>() ?? Camera.main;
                if (_camera == null)
                {
#if UNITY_2023_1_OR_NEWER || UNITY_6000_0_OR_NEWER
                    Camera[] cams = FindObjectsByType<Camera>(FindObjectsSortMode.None);
#else
                    Camera[] cams = FindObjectsOfType<Camera>();
#endif
                    if (cams.Length > 0) _camera = cams[0];
                }
            }
        }

        private void Start()
        {
            FindTargetCamera();
            InitializeTextures();
            CalculateUrls();

            if (enableHttpMjpegServer)
            {
                StartHttpServer();
            }

            if (enableWebSocketStreaming)
            {
                StartCoroutine(WebSocketLoopCoroutine());
            }

            if (autoOpenBrowserOnPlay)
            {
                string targetWebUrl = $"http://localhost:{webPlatformPort}/cast";
                Application.OpenURL(targetWebUrl);
                Debug.Log($"<color=#00f5d4>[JAKKHO Streamer] Auto-opened browser cast at {targetWebUrl}</color>");
            }

            Debug.Log($"<color=#00f5d4>[JAKKHO Streamer] Initialized! Stream URLs:\n- Localhost: {localStreamUrl}\n- LAN (Wi-Fi): {lanStreamUrl}</color>");
        }

#if UNITY_EDITOR
        [UnityEditor.MenuItem("JAKKHO VR/Open Webcast in Browser (5173)", false, 1)]
        public static void OpenWebcastBrowser5173()
        {
            Application.OpenURL("http://localhost:5173/cast");
        }

        [UnityEditor.MenuItem("JAKKHO VR/Open Webcast in Browser (3000)", false, 2)]
        public static void OpenWebcastBrowser3000()
        {
            Application.OpenURL("http://localhost:3000/cast");
        }

        [UnityEditor.MenuItem("JAKKHO VR/Open Direct MJPEG Stream (8085)", false, 3)]
        public static void OpenDirectMjpegStream()
        {
            Application.OpenURL("http://localhost:8085/live.mjpg");
        }
#endif

        private void CalculateUrls()
        {
            localStreamUrl = $"http://localhost:{httpPort}/live.mjpg";
            string lanIp = GetLocalIPAddress();
            lanStreamUrl = $"http://{lanIp}:{httpPort}/live.mjpg";
        }

        private string GetLocalIPAddress()
        {
            try
            {
                var host = Dns.GetHostEntry(Dns.GetHostName());
                foreach (var ip in host.AddressList)
                {
                    if (ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip))
                    {
                        return ip.ToString();
                    }
                }
            }
            catch { }
            return "127.0.0.1";
        }

        private void InitializeTextures()
        {
            int streamWidth = Mathf.RoundToInt(streamHeight * (16f / 9f));
            _renderTexture = new RenderTexture(streamWidth, streamHeight, 24, RenderTextureFormat.ARGB32)
            {
                antiAliasing = 4,
                filterMode = FilterMode.Bilinear
            };
            _frameTexture = new Texture2D(streamWidth, streamHeight, TextureFormat.RGB24, false);
        }

        #region HTTP MJPEG Server

        private void StartHttpServer()
        {
            try
            {
                _httpListener = new HttpListener();
                // Listen on all network interfaces
                _httpListener.Prefixes.Add($"http://*:{httpPort}/");
                _httpListener.Start();
                _isListening = true;
                isMjpegServerRunning = true;

                _listenerThread = new Thread(ListenLoop)
                {
                    IsBackground = true,
                    Name = "JAKKHO_MJPEG_Listener"
                };
                _listenerThread.Start();
                Debug.Log($"<color=#00f5d4>[JAKKHO Streamer] HTTP MJPEG Server started on port {httpPort}</color>");
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[JAKKHO Streamer] Wildcard bind failed ({ex.Message}). Falling back to localhost prefix...");
                try
                {
                    _httpListener = new HttpListener();
                    _httpListener.Prefixes.Add($"http://localhost:{httpPort}/");
                    _httpListener.Prefixes.Add($"http://127.0.0.1:{httpPort}/");
                    _httpListener.Start();
                    _isListening = true;
                    isMjpegServerRunning = true;

                    _listenerThread = new Thread(ListenLoop)
                    {
                        IsBackground = true,
                        Name = "JAKKHO_MJPEG_Listener"
                    };
                    _listenerThread.Start();
                    Debug.Log($"<color=#00f5d4>[JAKKHO Streamer] HTTP MJPEG Server running on localhost:{httpPort}</color>");
                }
                catch (Exception fallbackEx)
                {
                    Debug.LogError($"[JAKKHO Streamer] Failed to start HTTP server: {fallbackEx.Message}");
                    isMjpegServerRunning = false;
                }
            }
        }

        private void ListenLoop()
        {
            while (_isListening && _httpListener != null && _httpListener.IsListening)
            {
                try
                {
                    HttpListenerContext context = _httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessClientRequest, context);
                }
                catch (HttpListenerException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    if (_isListening)
                    {
                        Debug.LogWarning($"[JAKKHO Streamer] Listener error: {ex.Message}");
                    }
                }
            }
        }

        private void ProcessClientRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            string rawUrl = context.Request.RawUrl.ToLower();

            // Handle CORS headers
            context.Response.AddHeader("Access-Control-Allow-Origin", "*");
            context.Response.AddHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
            context.Response.AddHeader("Access-Control-Allow-Headers", "*");
            context.Response.AddHeader("Cross-Origin-Resource-Policy", "cross-origin");

            if (context.Request.HttpMethod == "OPTIONS")
            {
                context.Response.StatusCode = 200;
                context.Response.Close();
                return;
            }

            if (rawUrl.Contains("live.mjpg") || rawUrl.Contains("stream") || rawUrl.Contains("video"))
            {
                // Serve continuous MJPEG stream
                context.Response.ContentType = "multipart/x-mixed-replace; boundary=--jakkho_frame";
                context.Response.StatusCode = 200;
                context.Response.SendChunked = true;

                StreamClient client = new StreamClient
                {
                    Context = context,
                    OutputStream = context.Response.OutputStream,
                    IsAlive = true
                };

                lock (_clientsLock)
                {
                    _httpClients.Add(client);
                    activeHttpClients = _httpClients.Count;
                }

                Debug.Log($"[JAKKHO Streamer] Client connected to live stream. Total clients: {activeHttpClients}");
            }
            else if (rawUrl.Contains("snapshot.jpg") || rawUrl.Contains("frame.jpg"))
            {
                // Serve single snapshot JPEG
                byte[] frame = null;
                lock (_frameLock)
                {
                    frame = _latestJpegFrame;
                }

                if (frame != null && frame.Length > 0)
                {
                    context.Response.ContentType = "image/jpeg";
                    context.Response.ContentLength64 = frame.Length;
                    context.Response.OutputStream.Write(frame, 0, frame.Length);
                }
                else
                {
                    context.Response.StatusCode = 503;
                }
                context.Response.Close();
            }
            else
            {
                // Serve landing diagnostic HTML page
                string html = $@"<!DOCTYPE html>
<html>
<head>
    <title>JAKKHO VR Live Stream</title>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{ margin:0; background:#020617; color:#f8fafc; font-family:monospace; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:100vh; }}
        .frame {{ border:4px solid white; border-radius:24px; overflow:hidden; box-shadow:0 0 40px rgba(6,182,212,0.3); background:#000; max-width:90vw; }}
        img {{ width:100%; max-height:75vh; display:block; object-fit:contain; }}
        .badge {{ background:rgba(6,182,212,0.1); border:1px solid #06b6d4; color:#06b6d4; padding:6px 14px; border-radius:20px; font-weight:bold; margin-bottom:12px; font-size:12px; }}
        .stats {{ display:flex; gap:16px; margin-top:14px; font-size:12px; color:#94a3b8; }}
        .val {{ color:#38bdf8; font-weight:bold; }}
    </style>
</head>
<body>
    <div class='badge'>◆ JAKKHO WIRELESS VR STREAM</div>
    <div class='frame'>
        <img src='/live.mjpg' alt='JAKKHO VR Live Viewport' />
    </div>
    <div class='stats'>
        <div>FPS: <span class='val'>{liveFps}</span></div>
        <div>Resolution: <span class='val'>{streamHeight * 16 / 9}x{streamHeight}</span></div>
        <div>Clients: <span class='val'>{activeHttpClients}</span></div>
        <div>Frames: <span class='val'>{totalFramesBroadcast}</span></div>
    </div>
</body>
</html>";
                byte[] htmlBytes = Encoding.UTF8.GetBytes(html);
                context.Response.ContentType = "text/html; charset=utf-8";
                context.Response.ContentLength64 = htmlBytes.Length;
                context.Response.OutputStream.Write(htmlBytes, 0, htmlBytes.Length);
                context.Response.Close();
            }
        }

        private void BroadcastFrameToHttpClients(byte[] jpegData)
        {
            if (jpegData == null || jpegData.Length == 0) return;

            string header = $"--jakkho_frame\r\nContent-Type: image/jpeg\r\nContent-Length: {jpegData.Length}\r\n\r\n";
            byte[] headerBytes = Encoding.ASCII.GetBytes(header);
            byte[] footerBytes = Encoding.ASCII.GetBytes("\r\n");

            List<StreamClient> deadClients = null;

            lock (_clientsLock)
            {
                if (_httpClients.Count == 0) return;

                for (int i = 0; i < _httpClients.Count; i++)
                {
                    StreamClient client = _httpClients[i];
                    try
                    {
                        client.OutputStream.Write(headerBytes, 0, headerBytes.Length);
                        client.OutputStream.Write(jpegData, 0, jpegData.Length);
                        client.OutputStream.Write(footerBytes, 0, footerBytes.Length);
                        client.OutputStream.Flush();
                    }
                    catch
                    {
                        client.IsAlive = false;
                        if (deadClients == null) deadClients = new List<StreamClient>();
                        deadClients.Add(client);
                    }
                }

                if (deadClients != null)
                {
                    foreach (var dead in deadClients)
                    {
                        _httpClients.Remove(dead);
                        try { dead.Context.Response.Close(); } catch { }
                    }
                    activeHttpClients = _httpClients.Count;
                }
            }
        }

        #endregion

        #region Frame Capture

        private void EnsureResources()
        {
            if (_camera == null)
            {
                FindTargetCamera();
            }

            if (_renderTexture == null || _frameTexture == null)
            {
                InitializeTextures();
            }
        }

        private void OnEndCameraRendering(UnityEngine.Rendering.ScriptableRenderContext context, Camera cam)
        {
            if (cam == _camera || (_camera == null && cam == Camera.main))
            {
                float frameInterval = 1f / targetFps;
                if (Time.time - _lastFrameTime >= frameInterval)
                {
                    _lastFrameTime = Time.time;
                    CaptureFrameFromRenderedCamera(cam);
                }
            }
        }

        private void LateUpdate()
        {
            _fpsTimer += Time.deltaTime;
            if (_fpsTimer >= 1.0f)
            {
                liveFps = _fpsCounter;
                _fpsCounter = 0;
                _fpsTimer = 0f;
            }

            // If using Built-in Render Pipeline (no SRP active), capture from LateUpdate
            if (UnityEngine.Rendering.GraphicsSettings.currentRenderPipeline == null)
            {
                float frameInterval = 1f / targetFps;
                if (Time.time - _lastFrameTime >= frameInterval)
                {
                    _lastFrameTime = Time.time;
                    CaptureFrame();
                }
            }
        }

        private void CaptureFrameFromRenderedCamera(Camera cam)
        {
            EnsureResources();
            if (cam == null || _renderTexture == null || _frameTexture == null) return;

            RenderTexture currentRT = RenderTexture.active;
            if (cam.targetTexture != null)
            {
                Graphics.Blit(cam.targetTexture, _renderTexture);
                RenderTexture.active = _renderTexture;
                _frameTexture.ReadPixels(new Rect(0, 0, _renderTexture.width, _renderTexture.height), 0, 0);
            }
            else
            {
                RenderTexture prevTarget = cam.targetTexture;
                cam.targetTexture = _renderTexture;
                cam.Render();
                cam.targetTexture = prevTarget;

                RenderTexture.active = _renderTexture;
                _frameTexture.ReadPixels(new Rect(0, 0, _renderTexture.width, _renderTexture.height), 0, 0);
            }
            _frameTexture.Apply();
            RenderTexture.active = currentRT;

            ProcessEncodedFrame();
        }

        private void CaptureFrame()
        {
            EnsureResources();
            if (_camera == null || _renderTexture == null || _frameTexture == null) return;

            RenderTexture currentRT = RenderTexture.active;
            RenderTexture.active = _renderTexture;

            RenderTexture prevTarget = _camera.targetTexture;
            _camera.targetTexture = _renderTexture;
            _camera.Render();
            _camera.targetTexture = prevTarget;

            _frameTexture.ReadPixels(new Rect(0, 0, _renderTexture.width, _renderTexture.height), 0, 0);
            _frameTexture.Apply();

            RenderTexture.active = currentRT;

            ProcessEncodedFrame();
        }

        private void ProcessEncodedFrame()
        {
            byte[] jpgBytes = _frameTexture.EncodeToJPG(jpgQuality);
            if (jpgBytes != null && jpgBytes.Length > 0)
            {
                _fpsCounter++;
                totalFramesBroadcast++;

                lock (_frameLock)
                {
                    _latestJpegFrame = jpgBytes;
                }

                if (_httpClients.Count > 0)
                {
                    ThreadPool.QueueUserWorkItem(_ => BroadcastFrameToHttpClients(jpgBytes));
                }

                if (enableWebSocketStreaming && _webSocket != null && _webSocket.State == WebSocketState.Open && !_isWsSending)
                {
                    _isWsSending = true;
                    Task.Run(() => SendWebSocketFrameAsync(jpgBytes));
                }
            }
        }

        #endregion

        #region WebSocket Streamer

        private IEnumerator WebSocketLoopCoroutine()
        {
            while (enableWebSocketStreaming)
            {
                if (_webSocket == null || _webSocket.State != WebSocketState.Open)
                {
                    yield return StartCoroutine(ConnectWebSocket());
                }
                yield return new WaitForSeconds(3f);
            }
        }

        private IEnumerator ConnectWebSocket()
        {
            _wsCts = new CancellationTokenSource();
            _webSocket = new ClientWebSocket();

            Task connectTask = null;
            try
            {
                Uri uri = new Uri(webSocketUrl);
                connectTask = _webSocket.ConnectAsync(uri, _wsCts.Token);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[JAKKHO Streamer] Invalid WebSocket URL: {ex.Message}");
                yield break;
            }

            while (!connectTask.IsCompleted)
            {
                yield return null;
            }

            if (_webSocket.State == WebSocketState.Open)
            {
                Debug.Log($"<color=#00f5d4>[JAKKHO Streamer] WebSocket Connected to {webSocketUrl}!</color>");
            }
        }

        private async Task SendWebSocketFrameAsync(byte[] frameData)
        {
            try
            {
                if (_webSocket != null && _webSocket.State == WebSocketState.Open)
                {
                    byte[] packet = new byte[9 + frameData.Length];
                    packet[0] = 0x01; // JPEG Type
                    long pts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                    byte[] ptsBytes = BitConverter.GetBytes(pts);
                    Array.Copy(ptsBytes, 0, packet, 1, 8);
                    Array.Copy(frameData, 0, packet, 9, frameData.Length);

                    ArraySegment<byte> buffer = new ArraySegment<byte>(packet);
                    await _webSocket.SendAsync(buffer, WebSocketMessageType.Binary, true, _wsCts.Token);
                }
            }
            catch
            {
                // Soft fail, will reconnect
            }
            finally
            {
                _isWsSending = false;
            }
        }

        #endregion

        private void OnDestroy()
        {
            _isListening = false;
            if (_httpListener != null)
            {
                try
                {
                    _httpListener.Stop();
                    _httpListener.Close();
                }
                catch { }
                _httpListener = null;
            }

            lock (_clientsLock)
            {
                foreach (var client in _httpClients)
                {
                    try { client.Context.Response.Close(); } catch { }
                }
                _httpClients.Clear();
            }

            _wsCts?.Cancel();
            if (_webSocket != null)
            {
                try { _webSocket.Dispose(); } catch { }
                _webSocket = null;
            }

            if (_renderTexture != null)
            {
                _renderTexture.Release();
                Destroy(_renderTexture);
            }

            if (_frameTexture != null)
            {
                Destroy(_frameTexture);
            }
        }

        private void OnApplicationQuit()
        {
            OnDestroy();
        }
    }
}
