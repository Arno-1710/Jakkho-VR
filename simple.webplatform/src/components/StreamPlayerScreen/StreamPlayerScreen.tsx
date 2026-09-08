import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PlayerScreenCanvas from "../WebSocketManager/PlayerScreenCanvas";
import VideoStreamManager from "../WebSocketManager/VideoStreamManager";

const StreamPlayerScreen = () => {
	const [activeSource, setActiveSource] = useState<"unity" | "s24" | "tecno" | "grid">("unity");
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
		<div className="w-screen h-screen min-h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100">
			{/* Top Floating Cinema Navigation & Control HUD */}
			<header className="w-full flex-shrink-0 bg-slate-900/90 border-b border-cyan-500/30 backdrop-blur-md px-4 py-2.5 flex items-center justify-between z-30 shadow-xl">
				{/* Left: Brand & Return link */}
				<div className="flex items-center gap-3">
					<Link
						to="/"
						className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all text-decoration-none shadow-sm"
					>
						<span>←</span>
						<span className="hidden sm:inline">Mission Control</span>
					</Link>

					<div className="flex items-center gap-2 border-l border-slate-800 pl-3">
						<span className="font-extrabold text-white font-mono text-sm tracking-wider flex items-center gap-1">
							JAK<span className="text-cyan-400 text-xs">◆</span>KHO
						</span>
						<span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold">
							FULLSCREEN CASTING
						</span>
					</div>
				</div>

				{/* Center: Stream Source Selector */}
				<div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
					<button
						type="button"
						onClick={() => setActiveSource("unity")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "unity"
								? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						🖥️ Unity PC
					</button>
					<button
						type="button"
						onClick={() => setActiveSource("s24")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "s24"
								? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						📱 S24
					</button>
					<button
						type="button"
						onClick={() => setActiveSource("tecno")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "tecno"
								? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						📱 Spark 20C
					</button>
					<button
						type="button"
						onClick={() => setActiveSource("grid")}
						className={`px-3 py-1 rounded-lg transition-all ${
							activeSource === "grid"
								? "bg-purple-600 text-white font-bold shadow-md shadow-purple-500/25"
								: "text-slate-400 hover:text-white"
						}`}
					>
						🔲 Multi Grid
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
								: "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
						}`}
						title="Toggle Native Browser Fullscreen (Press F)"
					>
						<span>⛶</span>
						<span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Full Window (F)"}</span>
					</button>
				</div>
			</header>

			{/* Main Cinema Viewport (100% of remaining window height) */}
			<main className="w-full flex-1 min-h-0 p-2 md:p-4 flex items-center justify-center relative overflow-hidden bg-slate-950">
				{activeSource === "unity" ? (
					<div className="w-full h-full max-w-7xl flex items-center justify-center">
						<PlayerScreenCanvas
							id="unity_pc"
							streamUrl="http://localhost:8085/live.mjpg"
							needsInteractivity={true}
						/>
					</div>
				) : activeSource === "s24" ? (
					<div className="w-full h-full max-w-7xl flex items-center justify-center">
						<PlayerScreenCanvas id="samsung_s24" isPlaceholder needsInteractivity={true} />
					</div>
				) : activeSource === "tecno" ? (
					<div className="w-full h-full max-w-7xl flex items-center justify-center">
						<PlayerScreenCanvas id="tecno_spark20c" isPlaceholder needsInteractivity={true} />
					</div>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<VideoStreamManager needsInteractivity={true} />
					</div>
				)}
			</main>
		</div>
	);
};

export default StreamPlayerScreen;

