import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useVideoStreams } from "../../hooks/useVideoStreams";
import PlayerScreenCanvas from "../WebSocketManager/PlayerScreenCanvas";
import VideoStreamManager from "../WebSocketManager/VideoStreamManager";

const StreamPlayerScreen = () => {
	const { canvasList, sortedKeys } = useVideoStreams();
	const [activeSource, setActiveSource] = useState<string>("unity");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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
						🖥️ Unity Stream
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

				{/* Right: Quick Actions & Browser Fullscreen */}
				<div className="flex items-center gap-2 font-mono text-xs">
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
				{(() => {
					const streamUrl = typeof window !== "undefined" ? `http://${window.location.hostname || "localhost"}:8085/live.mjpg` : "http://localhost:8085/live.mjpg";
					return activeSource === "unity" ? (
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
					);
				})()}
			</main>
		</div>
	);
};

export default StreamPlayerScreen;

