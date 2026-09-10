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

	const resolvedHost = targetHost || (typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost");
	const streamUrl = `http://${resolvedHost}:8085/live.mjpg`;

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

					<div className="flex items-center gap-2 border-l border-[#1e2e4a] pl-3">
						<span className="font-extrabold text-white font-mono text-sm tracking-wider flex items-center gap-1">
							JAK<span className="text-cyan-400 text-xs">◆</span>KHO
						</span>
						<span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
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

				{/* Right: Connect Friend IP & Fullscreen */}
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
		</div>
	);
};

export default StreamPlayerScreen;

