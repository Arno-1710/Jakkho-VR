import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVideoStreams } from "../../hooks/useVideoStreams";
import PlayerScreenCanvas from "../WebSocketManager/PlayerScreenCanvas";
import VideoStreamManager from "../WebSocketManager/VideoStreamManager";

const StreamPlayerScreen = () => {
	const { canvasList, sortedKeys } = useVideoStreams();
	const [activeSource, setActiveSource] = useState<string>("unity");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// Remote / Friend Stream Host State
	const [targetHost, setTargetHost] = useState<string>(() => {
		if (typeof window !== "undefined") {
			const p = new URLSearchParams(window.location.search);
			return p.get("host") || "";
		}
		return "";
	});
	const [showHostModal, setShowHostModal] = useState<boolean>(false);
	const [inputHost, setInputHost] = useState<string>(targetHost);

	// Stream Quality & Server Settings State
	const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
	const [httpPort, setHttpPort] = useState<number>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("jakkho_stream_port");
			return saved ? Number(saved) : 8085;
		}
		return 8085;
	});
	const [targetFps, setTargetFps] = useState<number>(60);
	const [streamHeight, setStreamHeight] = useState<number>(1080);
	const [jpgQuality, setJpgQuality] = useState<number>(90);
	const [copiedLink, setCopiedLink] = useState<string | null>(null);

	// Sync fullscreen state with document fullscreen change
	useEffect(() => {
		const handleFsChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener("fullscreenchange", handleFsChange);
		return () => document.removeEventListener("fullscreenchange", handleFsChange);
	}, []);

	// Keyboard shortcuts for full window casting
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "f" || e.key === "F") {
				toggleBrowserFullscreen();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	const toggleBrowserFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		} else {
			document.exitFullscreen().catch(() => {});
		}
	};

	const handleApplyHost = (newHost: string) => {
		const clean = newHost.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
		setTargetHost(clean);
		setShowHostModal(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			if (clean) {
				url.searchParams.set("host", clean);
			} else {
				url.searchParams.delete("host");
			}
			window.history.replaceState({}, "", url.toString());
		}
	};

	const copyToClipboard = (text: string, label: string) => {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(text);
			setCopiedLink(label);
			setTimeout(() => setCopiedLink(null), 2000);
		}
	};

	const resolvedHost = targetHost || (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost");
	const streamUrl = `http://${resolvedHost}:${httpPort}/live.mjpg`;

	return (
		<div className="w-screen h-screen min-h-screen bg-[#0b1f3a] bg-gradient-to-br from-[#121826] to-[#0b1f3a] flex flex-col overflow-hidden text-slate-100">
			{/* Top Floating Cinema Navigation & Control HUD */}
			<header className="w-full flex-shrink-0 bg-[#121826]/95 border-b border-[#1e2e4a] backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-30 shadow-xl">
				{/* Left: Brand & Return link */}
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="px-3 py-1.5 rounded-lg bg-[#0b1f3a] hover:bg-[#152945] text-cyan-400 font-mono text-xs font-semibold flex items-center gap-1.5 border border-[#1e2e4a] transition-all text-decoration-none shadow-sm"
					>
						<span>←</span>
						<span className="hidden sm:inline">Mission Control</span>
					</Link>

					<div className="flex items-center gap-2.5 border-l border-[#1e2e4a] pl-3">
						<Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
							<img
								src="/jakkho_logo_white.png"
								alt="JAKKHO VR"
								className="h-6 md:h-7 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,194,255,0.25)]"
							/>
						</Link>
						<span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold tracking-wider">
							FULLSCREEN CASTING
						</span>
					</div>
				</div>

				{/* Center: Dynamic Stream Source Selector */}
				<div className="flex items-center gap-1 bg-[#0b1f3a]/90 p-1 rounded-xl border border-[#1e2e4a] text-xs font-mono">
					<button
						type="button"
						onClick={() => setActiveSource("unity")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "unity"
								? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						🖥️ {targetHost ? `Stream (${targetHost})` : "Unity Stream"}
					</button>

					{/* Dynamically detected devices */}
					{sortedKeys.map((key, idx) => (
						<button
							key={key}
							type="button"
							onClick={() => setActiveSource(key)}
							className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
								activeSource === key
									? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
									: "text-slate-400 hover:text-white"
							}`}
						>
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
							<span>📱 Headset {idx + 1}</span>
						</button>
					))}

					<button
						type="button"
						onClick={() => setActiveSource("grid")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "grid"
								? "bg-purple-600 text-white font-bold shadow-md shadow-purple-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						🔲 All Streams
					</button>
				</div>

				{/* Right: Connect Friend IP, Settings & Fullscreen */}
				<div className="flex items-center gap-2 font-mono text-xs">
					<button
						type="button"
						onClick={() => {
							setInputHost(targetHost);
							setShowHostModal(true);
						}}
						className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
							targetHost
								? "bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30"
								: "bg-[#0b1f3a] text-cyan-400 border-[#1e2e4a] hover:bg-[#152945]"
						}`}
						title="Connect to a friend's Unity stream or remote IP"
					>
						<span>🌐</span>
						<span>{targetHost ? `Friend: ${targetHost}` : "Friend's Stream"}</span>
					</button>

					<button
						type="button"
						onClick={() => setShowSettingsModal(true)}
						className="px-3 py-1.5 rounded-lg border border-[#1e2e4a] bg-[#0b1f3a] hover:bg-[#152945] text-slate-200 font-semibold flex items-center gap-1.5 transition-all shadow-sm"
						title="Stream Quality, Port & Diagnostics Settings"
					>
						<span>⚙️</span>
						<span className="hidden md:inline">Settings</span>
					</button>

					<button
						type="button"
						onClick={toggleBrowserFullscreen}
						className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all ${
							isFullscreen
								? "bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30"
								: "bg-[#0b1f3a] text-slate-200 border-[#1e2e4a] hover:bg-[#152945]"
						}`}
						title="Toggle Native Browser Fullscreen (Press F)"
					>
						<span>⛶</span>
						<span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Full Window (F)"}</span>
					</button>
				</div>
			</header>

			{/* Main Cinema Viewport (100% of remaining window height) */}
			<main className="w-full flex-1 min-h-0 p-2 md:p-3 flex items-center justify-center relative overflow-hidden bg-[#0b1f3a]">
				{activeSource === "unity" ? (
					<div className="w-full h-full max-w-[98vw] max-h-[88vh] flex items-center justify-center aspect-video">
						<PlayerScreenCanvas
							id="unity_pc"
							streamUrl={streamUrl}
							needsInteractivity={true}
						/>
					</div>
				) : activeSource === "grid" ? (
					<div className="w-full h-full max-w-[98vw] max-h-[88vh] flex items-center justify-center">
						<VideoStreamManager needsInteractivity={true} />
					</div>
				) : canvasList[activeSource] ? (
					<div className="w-full h-full max-w-[98vw] max-h-[88vh] flex items-center justify-center aspect-video">
						<PlayerScreenCanvas id={activeSource} canvas={canvasList[activeSource]} needsInteractivity={true} />
					</div>
				) : (
					<div className="w-full h-full max-w-[98vw] max-h-[88vh] flex items-center justify-center aspect-video">
						<PlayerScreenCanvas
							id="unity_pc"
							streamUrl={streamUrl}
							needsInteractivity={true}
						/>
					</div>
				)}
			</main>

			{/* Friend Stream IP Connector Modal */}
			{showHostModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
					onClick={() => setShowHostModal(false)}
				>
					<div
						className="relative bg-[#121826] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col w-full max-w-md font-mono"
						onClick={(e) => e.stopPropagation()}
					>
						<h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
							<span className="text-cyan-400">🌐</span> Connect Friend's Unity Stream
						</h3>
						<p className="text-xs text-slate-400 mb-4">
							Enter your friend's Wi-Fi IP address or Cloudflare tunnel URL to watch their Unity game live on your screen.
						</p>

						<div className="mb-4">
							<label className="block text-[11px] text-slate-300 font-semibold mb-1.5 uppercase">
								Friend's IP / Hostname:
							</label>
							<input
								type="text"
								value={inputHost}
								onChange={(e) => setInputHost(e.target.value)}
								placeholder="e.g. 192.168.1.45 or friend.trycloudflare.com"
								className="w-full px-3 py-2 rounded-xl bg-[#0b1f3a] border border-[#1e2e4a] text-white text-sm focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
								onKeyDown={(e) => {
									if (e.key === "Enter") handleApplyHost(inputHost);
								}}
							/>
						</div>

						<div className="flex items-center justify-end gap-2">
							{targetHost && (
								<button
									type="button"
									onClick={() => {
										setInputHost("");
										handleApplyHost("");
									}}
									className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
								>
									Reset to My PC
								</button>
							)}
							<button
								type="button"
								onClick={() => setShowHostModal(false)}
								className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => handleApplyHost(inputHost)}
								className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg shadow-cyan-500/30"
							>
								Connect Stream
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Stream Settings & Diagnostics Modal */}
			{showSettingsModal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
					onClick={() => setShowSettingsModal(false)}
				>
					<div
						className="relative bg-[#121826] border border-cyan-500/40 rounded-2xl p-6 shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] overflow-y-auto font-mono"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Header */}
						<div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e2e4a]">
							<h3 className="text-base font-bold text-white flex items-center gap-2">
								<span className="text-cyan-400">⚙️</span> Web Casting & Streamer Settings
							</h3>
							<button
								type="button"
								onClick={() => setShowSettingsModal(false)}
								className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
							>
								✕ Close
							</button>
						</div>

						{/* Settings Table HUD (Identical to Unity Configuration) */}
						<div className="mb-5 overflow-hidden rounded-xl border border-[#1e2e4a] bg-[#0b1f3a]/70">
							<table className="w-full text-left text-xs border-collapse">
								<thead>
									<tr className="bg-[#121826] border-b border-[#1e2e4a] text-slate-400">
										<th className="p-3">Setting</th>
										<th className="p-3">Value</th>
										<th className="p-3">Status / Purpose</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-[#1e2e4a]/60 text-slate-200">
									<tr>
										<td className="p-3 font-semibold text-cyan-300">Enable HTTP MJPEG Server</td>
										<td className="p-3 font-mono">
											<span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
												true (Active)
											</span>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">Starts local Wi-Fi & LAN streaming server</td>
									</tr>
									<tr>
										<td className="p-3 font-semibold text-cyan-300">HTTP Port</td>
										<td className="p-3 font-mono">
											<div className="flex items-center gap-1.5">
												<input
													type="number"
													value={httpPort}
													onChange={(e) => {
														const val = Number(e.target.value);
														setHttpPort(val);
														if (typeof window !== "undefined") {
															localStorage.setItem("jakkho_stream_port", val.toString());
														}
													}}
													className="w-20 px-2 py-1 bg-[#121826] border border-[#1e2e4a] rounded text-cyan-300 text-xs focus:outline-none focus:border-cyan-400"
												/>
												<button
													type="button"
													onClick={() => {
														setHttpPort(8085);
														if (typeof window !== "undefined") {
															localStorage.setItem("jakkho_stream_port", "8085");
														}
													}}
													className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
												>
													Reset (8085)
												</button>
											</div>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">Default port for Unity MJPEG broadcast</td>
									</tr>
									<tr>
										<td className="p-3 font-semibold text-cyan-300">Target FPS</td>
										<td className="p-3 font-mono">
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() => setTargetFps(60)}
													className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
														targetFps === 60
															? "bg-cyan-500 text-slate-950 shadow-sm"
															: "bg-slate-800 text-slate-300 hover:text-white"
													}`}
												>
													60 FPS
												</button>
												<button
													type="button"
													onClick={() => setTargetFps(30)}
													className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
														targetFps === 30
															? "bg-cyan-500 text-slate-950 shadow-sm"
															: "bg-slate-800 text-slate-300 hover:text-white"
													}`}
												>
													30 FPS
												</button>
											</div>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">Smooth, high-framerate 60 FPS VR video</td>
									</tr>
									<tr>
										<td className="p-3 font-semibold text-cyan-300">Stream Height (Resolution)</td>
										<td className="p-3 font-mono">
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() => setStreamHeight(1080)}
													className={`px-2 py-1 rounded text-xs font-bold ${
														streamHeight === 1080 ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
													}`}
												>
													1080p
												</button>
												<button
													type="button"
													onClick={() => setStreamHeight(720)}
													className={`px-2 py-1 rounded text-xs font-bold ${
														streamHeight === 720 ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
													}`}
												>
													720p
												</button>
												<button
													type="button"
													onClick={() => setStreamHeight(480)}
													className={`px-2 py-1 rounded text-xs font-bold ${
														streamHeight === 480 ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-300"
													}`}
												>
													480p
												</button>
											</div>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">High-definition 1080p 16:9 widescreen</td>
									</tr>
									<tr>
										<td className="p-3 font-semibold text-cyan-300">JPG Quality</td>
										<td className="p-3 font-mono">
											<div className="flex items-center gap-2">
												<input
													type="range"
													min="30"
													max="95"
													value={jpgQuality}
													onChange={(e) => setJpgQuality(Number(e.target.value))}
													className="w-24 accent-cyan-400"
												/>
												<span className="font-bold text-cyan-400">{jpgQuality}%</span>
											</div>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">Crisp visual quality with low compression artifacts</td>
									</tr>
									<tr>
										<td className="p-3 font-semibold text-cyan-300">Auto Open Browser On Play</td>
										<td className="p-3 font-mono">
											<span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
												true (Active)
											</span>
										</td>
										<td className="p-3 text-slate-400 text-[11px]">Automatically pops open Chrome/Edge on Play ▶️</td>
									</tr>
								</tbody>
							</table>
						</div>

						{/* Direct Stream Endpoints & 1-Click Copy */}
						<div className="mb-5">
							<h4 className="text-xs font-bold text-slate-300 uppercase mb-2">Direct Stream Endpoints:</h4>
							<div className="space-y-2">
								<div className="flex items-center justify-between p-2 rounded-xl bg-[#0b1f3a] border border-[#1e2e4a]">
									<div>
										<span className="text-[10px] text-slate-400 uppercase block">Live MJPEG Video Stream:</span>
										<code className="text-xs text-cyan-400 font-mono">{streamUrl}</code>
									</div>
									<button
										type="button"
										onClick={() => copyToClipboard(streamUrl, "stream")}
										className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
									>
										{copiedLink === "stream" ? "✓ Copied!" : "📋 Copy"}
									</button>
								</div>

								<div className="flex items-center justify-between p-2 rounded-xl bg-[#0b1f3a] border border-[#1e2e4a]">
									<div>
										<span className="text-[10px] text-slate-400 uppercase block">High-Res Still Snapshot:</span>
										<code className="text-xs text-cyan-400 font-mono">http://{resolvedHost}:{httpPort}/snapshot.jpg</code>
									</div>
									<button
										type="button"
										onClick={() => copyToClipboard(`http://${resolvedHost}:${httpPort}/snapshot.jpg`, "snap")}
										className="px-3 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
									>
										{copiedLink === "snap" ? "✓ Copied!" : "📋 Copy"}
									</button>
								</div>
							</div>
						</div>

						{/* Live Diagnostics & System Health */}
						<div className="p-3 rounded-xl bg-[#0b1f3a]/90 border border-[#1e2e4a] flex items-center justify-between text-xs">
							<div className="flex items-center gap-2">
								<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
								<span className="text-emerald-400 font-bold">Auto-Reconnect Active</span>
								<span className="text-slate-500">|</span>
								<span className="text-slate-300">Fast Probe Loop (<span className="text-cyan-400">800ms</span>)</span>
							</div>
							<div className="text-slate-400 text-[11px]">
								Aspect Ratio: <span className="text-white font-bold">16:9 Widescreen</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default StreamPlayerScreen;

