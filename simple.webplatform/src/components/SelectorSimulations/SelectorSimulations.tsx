import { getLogger } from "@logtape/logtape";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { wsApi } from "../../common/wsApi";
import { useSimulationNav } from "../../hooks/useSimulationNav";
import Footer from "../Footer/Footer";
import Header from "../Header/Header";
import PlayerScreenCanvas from "../WebSocketManager/PlayerScreenCanvas";
import { useWebSocket } from "../WebSocketManager/WebSocketManager";
import SimulationList from "./SimulationList";

const SelectorSimulations = () => {
	const { ws, isWsConnected, gamaless, gama, simulationList } = useWebSocket();
	const { subProjectsList, path, back, reset, handleSimulation } = useSimulationNav();
	const { t } = useTranslation();
	const logger = getLogger(["components", "SelectorSimulation"]);

	// Active Stream Mode
	const [selectedStreamSource, setSelectedStreamSource] = useState<"unity" | "s24" | "tecno" | "standby">("unity");
	const [isUnityActive, setIsUnityActive] = useState<boolean>(false);

	// Interactive Hand Controller Simulation state
	const [joyX, setJoyX] = useState<number>(0);
	const [joyY, setJoyY] = useState<number>(0);
	const [triggerPressed, setTriggerPressed] = useState<boolean>(false);
	const [gripPressed, setGripPressed] = useState<boolean>(false);
	const [recenterPressed, setRecenterPressed] = useState<boolean>(false);

	// Ping Unity Stream Server on mount & periodically
	useEffect(() => {
		const checkUnityStream = async () => {
			try {
				const res = await fetch("http://localhost:8085/snapshot.jpg", { method: "HEAD", mode: "no-cors" });
				setIsUnityActive(true);
			} catch {
				// Unity might not be playing yet
				setIsUnityActive(false);
			}
		};
		checkUnityStream();
		const interval = setInterval(checkUnityStream, 4000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex flex-col items-center justify-between min-h-screen w-full">
			<Header onLogoClick={reset} />

			<div className="w-full max-w-6xl px-4 md:px-8 py-6 flex flex-col items-center gap-8">
				{/* Welcome Hero Banner */}
				<div className="w-full rounded-2xl bg-slate-900/85 border border-cyan-500/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
					<div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
					<div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
						<div>
							<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold mb-3">
								<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
								JAKKHO VR MISSION CONTROL
							</div>
							<h1 className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
								Wireless OpenXR & Dual-Phone Streaming Hub
							</h1>
							<p className="text-sm text-slate-300 max-w-xl mt-2 font-mono leading-relaxed">
								Zero-wire live casting from Unity PC test scene, dual mobile headset rendering, and 80Hz ESP32 DIY VR hand controller telemetry.
							</p>
						</div>

						<div className="flex flex-wrap gap-3 w-full lg:w-auto">
							<Link
								to="/streamPlayerScreen"
								className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all text-decoration-none"
							>
								<span>🖥️</span>
								<span>Fullscreen Casting</span>
							</Link>
							<Link
								to="/simulationManager"
								className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all text-decoration-none"
							>
								<span>🎮</span>
								<span>Multiplayer Sim</span>
							</Link>
						</div>
					</div>
				</div>

				{/* Main Stage: Live VR Viewport + Hand Controller Diagnostic */}
				<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Live Stream Viewport (7 Cols) */}
					<div className="lg:col-span-7 flex flex-col gap-3">
						<div className="flex items-center justify-between px-2">
							<div className="flex items-center gap-2">
								<span className="text-base">📡</span>
								<h2 className="font-mono font-bold text-white text-sm">Live VR Viewport</h2>
							</div>

							{/* Stream Switcher Tabs */}
							<div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
								<button
									type="button"
									onClick={() => setSelectedStreamSource("unity")}
									className={`px-2.5 py-1 rounded-lg transition-all ${
										selectedStreamSource === "unity"
											? "bg-cyan-500 text-slate-950 font-bold"
											: "text-slate-400 hover:text-white"
									}`}
								>
									🖥️ Unity PC
								</button>
								<button
									type="button"
									onClick={() => setSelectedStreamSource("s24")}
									className={`px-2.5 py-1 rounded-lg transition-all ${
										selectedStreamSource === "s24"
											? "bg-cyan-500 text-slate-950 font-bold"
											: "text-slate-400 hover:text-white"
									}`}
								>
									📱 S24
								</button>
								<button
									type="button"
									onClick={() => setSelectedStreamSource("tecno")}
									className={`px-2.5 py-1 rounded-lg transition-all ${
										selectedStreamSource === "tecno"
											? "bg-cyan-500 text-slate-950 font-bold"
											: "text-slate-400 hover:text-white"
									}`}
								>
									📱 Spark 20C
								</button>
							</div>
						</div>

						{/* White Rounded Bezel Frame Container */}
						<div className="w-full h-[360px] md:h-[420px] relative">
							{selectedStreamSource === "unity" ? (
								<PlayerScreenCanvas
									id="unity_pc"
									streamUrl="http://localhost:8085/live.mjpg"
									needsInteractivity={true}
								/>
							) : selectedStreamSource === "s24" ? (
								<PlayerScreenCanvas id="samsung_s24" isPlaceholder needsInteractivity />
							) : selectedStreamSource === "tecno" ? (
								<PlayerScreenCanvas id="tecno_spark20c" isPlaceholder needsInteractivity />
							) : (
								<PlayerScreenCanvas id="standby" isPlaceholder needsInteractivity />
							)}
						</div>
					</div>

					{/* Hand Controller Telemetry & Quick Diagnostics (5 Cols) */}
					<div className="lg:col-span-5 flex flex-col gap-4">
						<div className="flex items-center gap-2 px-2">
							<span className="text-base">🕹️</span>
							<h2 className="font-mono font-bold text-white text-sm">ESP32 Hand Controller Telemetry</h2>
						</div>

						<div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-md flex flex-col gap-4">
							{/* Connection & Baud rate */}
							<div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
									<span className="text-slate-300 font-semibold">Telemetry Bridge:</span>
								</div>
								<span className="text-cyan-400 font-bold">COM5 @ 115200 / UDP 8888</span>
							</div>

							{/* Thumb Joystick 2D Crosshair */}
							<div className="flex flex-col gap-2">
								<div className="flex justify-between text-xs font-mono text-slate-400">
									<span>Analog Thumb Joystick</span>
									<span className="text-cyan-300">
										X: {joyX.toFixed(2)} | Y: {joyY.toFixed(2)}
									</span>
								</div>
								<div className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
									{/* Crosshair lines */}
									<div className="absolute w-full h-[1px] bg-slate-800" />
									<div className="absolute h-full w-[1px] bg-slate-800" />
									<div className="w-20 h-20 rounded-full border border-dashed border-cyan-500/20 absolute" />

									{/* Joystick Knob Dot */}
									<div
										className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 absolute transition-all duration-75 flex items-center justify-center text-[9px] text-slate-950 font-bold"
										style={{
											transform: `translate(${joyX * 45}px, ${-joyY * 45}px)`,
										}}
									>
										🕹️
									</div>
								</div>

								{/* Quick Joystick Simulator Slider for Testing */}
								<div className="grid grid-cols-2 gap-2 mt-1">
									<button
										type="button"
										onMouseDown={() => setJoyY(1)}
										onMouseUp={() => setJoyY(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
									>
										▲ Forward
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyY(-1)}
										onMouseUp={() => setJoyY(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
									>
										▼ Backward
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyX(-1)}
										onMouseUp={() => setJoyX(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
									>
										◀ Strafe Left
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyX(1)}
										onMouseUp={() => setJoyX(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[11px]"
									>
										▶ Strafe Right
									</button>
								</div>
							</div>

							{/* Physical Buttons Indicators */}
							<div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
								<span className="text-xs font-mono text-slate-400">Physical Action Buttons</span>
								<div className="grid grid-cols-3 gap-2 font-mono text-xs">
									<button
										type="button"
										onMouseDown={() => setTriggerPressed(true)}
										onMouseUp={() => setTriggerPressed(false)}
										className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
											triggerPressed
												? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20"
												: "bg-slate-950 border-slate-800 text-slate-400"
										}`}
									>
										<span className="text-sm">🎯</span>
										<span className="font-bold text-[11px]">Trigger</span>
										<span className="text-[9px] text-slate-500">GPIO 25</span>
									</button>

									<button
										type="button"
										onMouseDown={() => setGripPressed(true)}
										onMouseUp={() => setGripPressed(false)}
										className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
											gripPressed
												? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20"
												: "bg-slate-950 border-slate-800 text-slate-400"
										}`}
									>
										<span className="text-sm">✊</span>
										<span className="font-bold text-[11px]">Grip Grab</span>
										<span className="text-[9px] text-slate-500">GPIO 26</span>
									</button>

									<button
										type="button"
										onMouseDown={() => setRecenterPressed(true)}
										onMouseUp={() => setRecenterPressed(false)}
										className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
											recenterPressed
												? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/20"
												: "bg-slate-950 border-slate-800 text-slate-400"
										}`}
									>
										<span className="text-sm">🔄</span>
										<span className="font-bold text-[11px]">Recenter</span>
										<span className="text-[9px] text-slate-500">GPIO 27</span>
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Device Ecosystem Status Matrix */}
				<div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
					{/* Unity VR Test Scene */}
					<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md hover:border-cyan-500/40 transition-all flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-lg">🖥️</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									60 FPS Live
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-sm">Unity VR Test Scene</h3>
							<p className="text-[11px] text-slate-400 mt-1 font-mono">
								Stand-alone VR test environment with physics cube & raycast interaction.
							</p>
						</div>
						<div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
							<span>Stream:</span>
							<span className="text-emerald-400 font-semibold">http://localhost:8085</span>
						</div>
					</div>

					{/* ESP32 DIY VR Controller */}
					<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md hover:border-cyan-500/40 transition-all flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-lg">🕹️</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									80Hz DMP
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-sm">JAKKHO Controller</h3>
							<p className="text-[11px] text-slate-400 mt-1 font-mono">
								6-Axis MPU-6050 quaternion fusion + Joystick + 3 tactile buttons.
							</p>
						</div>
						<div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
							<span>Port:</span>
							<span className="text-cyan-400 font-semibold">COM5 / UDP 8888</span>
						</div>
					</div>

					{/* Samsung Galaxy S24 */}
					<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md hover:border-cyan-500/40 transition-all flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-lg">📱</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									120Hz AMOLED
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-sm">Samsung Galaxy S24</h3>
							<p className="text-[11px] text-slate-400 mt-1 font-mono">
								Low-latency H.265 hardware decoding with Unity Cardboard XR.
							</p>
						</div>
						<div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
							<span>Cast:</span>
							<span className="text-emerald-400 font-semibold">ws://localhost:8082</span>
						</div>
					</div>

					{/* Tecno Spark 20C */}
					<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 backdrop-blur-md hover:border-cyan-500/40 transition-all flex flex-col justify-between">
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="text-lg">📱</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									90Hz Fast LCD
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-sm">Tecno Spark 20C</h3>
							<p className="text-[11px] text-slate-400 mt-1 font-mono">
								Cardboard 6DoF simulation stream with direct ADB TCP/IP connection.
							</p>
						</div>
						<div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
							<span>Cast:</span>
							<span className="text-emerald-400 font-semibold">ws://localhost:8082</span>
						</div>
					</div>
				</div>

				{/* 3-Step Quick Wireless Testing Guide */}
				<div className="w-full rounded-2xl bg-slate-900/50 border border-slate-800 p-6 backdrop-blur-md">
					<h3 className="font-mono font-bold text-white text-sm mb-3 flex items-center gap-2">
						<span>⚡</span>
						<span>Quick Wireless Test Workflow</span>
					</h3>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-slate-300">
						<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
							<div className="text-cyan-400 font-bold mb-1">Step 1: Start Bridge</div>
							<p className="text-slate-400 text-[11px]">
								Run <code className="text-cyan-300">.\start_controller_bridge.ps1</code> in PowerShell to stream ESP32 telemetry on UDP 8888.
							</p>
						</div>
						<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
							<div className="text-cyan-400 font-bold mb-1">Step 2: Press Play in Unity</div>
							<p className="text-slate-400 text-[11px]">
								Open Unity project on Drive H, ensure <code className="text-cyan-300">UnityLiveWebStreamer</code> is on Main Camera, and press Play ▶️.
							</p>
						</div>
						<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
							<div className="text-cyan-400 font-bold mb-1">Step 3: Watch Live</div>
							<p className="text-slate-400 text-[11px]">
								The live viewport in the White Frame above will automatically render the Unity camera stream over Wi-Fi with 0 wires!
							</p>
						</div>
					</div>
				</div>
			</div>

			<Footer />
		</div>
	);
};

export default SelectorSimulations;
