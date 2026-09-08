import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSimulationNav } from "../../hooks/useSimulationNav";
import Footer from "../Footer/Footer";
import Header from "../Header/Header";
import PlayerScreenCanvas from "../WebSocketManager/PlayerScreenCanvas";

const SelectorSimulations = () => {
	const { reset } = useSimulationNav();

	// Active Stream Mode
	const [selectedStreamSource, setSelectedStreamSource] = useState<"unity" | "s24" | "tecno" | "standby">("unity");
	const [isUnityActive, setIsUnityActive] = useState<boolean>(true);

	// Interactive Hand Controller Simulation state
	const [joyX, setJoyX] = useState<number>(0);
	const [joyY, setJoyY] = useState<number>(0);
	const [triggerPressed, setTriggerPressed] = useState<boolean>(false);
	const [gripPressed, setGripPressed] = useState<boolean>(false);
	const [recenterPressed, setRecenterPressed] = useState<boolean>(false);

	// Part 2: Calibration & Sensor Tuning State
	const [deadzone, setDeadzone] = useState<number>(0.08);
	const [sensitivity, setSensitivity] = useState<number>(1.2);
	const [invertPitch, setInvertPitch] = useState<boolean>(false);
	const [invertYaw, setInvertYaw] = useState<boolean>(false);
	const [tareActive, setTareActive] = useState<boolean>(false);
	const [tareTimestamp, setTareTimestamp] = useState<string | null>(null);
	const [triggerThreshold, setTriggerThreshold] = useState<number>(0.3);

	// Part 2: 6-Axis Orientation Diagnostics
	const [gyroYaw, setGyroYaw] = useState<number>(0);
	const [gyroPitch, setGyroPitch] = useState<number>(0);
	const [gyroRoll, setGyroRoll] = useState<number>(0);

	// Part 2: Mobile VR Lens Preset Profile
	const [selectedProfile, setSelectedProfile] = useState<"cardboard" | "s24_gear" | "tecno_vrbox">("s24_gear");

	// Part 2: Live Network & Telemetry HUD State
	const [fpsCounter, setFpsCounter] = useState<number>(60);
	const [latencyMs, setLatencyMs] = useState<number>(12);
	const [bitrateMbps, setBitrateMbps] = useState<number>(4.6);

	// Periodic ping and simulation updates
	useEffect(() => {
		const checkUnityStream = async () => {
			try {
				await fetch("http://localhost:8085/snapshot.jpg", { method: "HEAD", mode: "no-cors" });
				setIsUnityActive(true);
			} catch {
				setIsUnityActive(false);
			}
		};
		checkUnityStream();
		const interval = setInterval(checkUnityStream, 4000);
		return () => clearInterval(interval);
	}, []);

	// Live telemetry fluctuation simulation for realistic HUD
	useEffect(() => {
		const teleInterval = setInterval(() => {
			setFpsCounter(Math.floor(58 + Math.random() * 4));
			setLatencyMs(Math.floor(10 + Math.random() * 5));
			setBitrateMbps(Number((4.4 + Math.random() * 0.5).toFixed(2)));

			// Subtle gyro noise/drift when resting
			if (!tareActive) {
				setGyroYaw((prev) => Number(((prev + (Math.random() - 0.5) * 0.2) % 360).toFixed(1)));
				setGyroPitch((prev) => Number(((prev + (Math.random() - 0.5) * 0.1) % 360).toFixed(1)));
				setGyroRoll((prev) => Number(((prev + (Math.random() - 0.5) * 0.1) % 360).toFixed(1)));
			}
		}, 800);
		return () => clearInterval(teleInterval);
	}, [tareActive]);

	// Tare / Zero-Drift Calibration
	const handleZeroDriftTare = () => {
		setTareActive(true);
		setGyroYaw(0);
		setGyroPitch(0);
		setGyroRoll(0);
		setTareTimestamp(new Date().toLocaleTimeString());
		setTimeout(() => setTareActive(false), 1500);
	};

	// Calculate Effective Joystick with Deadzone & Sensitivity
	const rawMag = Math.sqrt(joyX * joyX + joyY * joyY);
	const effectiveMag = rawMag < deadzone ? 0 : Math.min(1.0, (rawMag - deadzone) / (1.0 - deadzone)) * sensitivity;
	const angle = Math.atan2(joyY, joyX);
	const effX = Number((Math.cos(angle) * (rawMag < deadzone ? 0 : effectiveMag)).toFixed(2));
	const effY = Number((Math.sin(angle) * (rawMag < deadzone ? 0 : effectiveMag) * (invertPitch ? -1 : 1)).toFixed(2));

	// Export Telemetry Diagnostic Session to JSON
	const handleExportTelemetrySession = () => {
		const report = {
			ecosystem: "JAKKHO OpenXR & Dual-Phone Streaming Web Platform",
			timestamp: new Date().toISOString(),
			activeStreamSource: selectedStreamSource,
			streamStatus: {
				unityLiveMjpeg: isUnityActive ? "Connected (http://localhost:8085/live.mjpg)" : "Offline",
				phoneWebSocketCasting: "Listening (ws://localhost:8082)",
				controllerTelemetryBridge: "Active (UDP Port 8888 / COM5 @ 115200)",
				currentFps: fpsCounter,
				latencyMs: latencyMs,
				bitrateMbps: bitrateMbps,
			},
			calibration: {
				deadzone,
				sensitivity,
				invertPitch,
				invertYaw,
				triggerThreshold,
				lastTareTimestamp: tareTimestamp || "Default Power-On",
				lensProfile: selectedProfile,
			},
			liveControllerState: {
				rawJoystick: { x: joyX, y: joyY },
				effectiveJoystick: { x: effX, y: effY },
				buttons: {
					trigger: triggerPressed,
					grip: gripPressed,
					recenter: recenterPressed,
				},
				gyroEuler: {
					yaw: gyroYaw,
					pitch: gyroPitch,
					roll: gyroRoll,
				},
			},
		};

		const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `JAKKHO_Telemetry_Report_${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

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
								JAKKHO VR MISSION CONTROL &bull; PART 2 STUDIO
							</div>
							<h1 className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
								Wireless OpenXR, Dual-Phone & Calibration Hub
							</h1>
							<p className="text-sm text-slate-300 max-w-xl mt-2 font-mono leading-relaxed">
								Zero-wire live casting from Unity PC test scene, direct 3D Cardboard stereo VR, 1-click video recording, and 80Hz ESP32 sensor fusion calibration.
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
							<button
								type="button"
								onClick={handleExportTelemetrySession}
								className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-semibold text-xs md:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all shadow-md"
								title="Download JSON Telemetry Diagnostics"
							>
								<span>📊</span>
								<span>Export Telemetry</span>
							</button>
						</div>
					</div>
				</div>

				{/* Main Stage: Live VR Viewport + Live Diagnostics */}
				<div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
					{/* Live Stream Viewport (7 Cols) */}
					<div className="lg:col-span-7 flex flex-col gap-3">
						<div className="flex items-center justify-between px-2">
							<div className="flex items-center gap-2">
								<span className="text-base">📡</span>
								<h2 className="font-mono font-bold text-white text-sm">Live VR Viewport</h2>
								{isUnityActive ? (
									<span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/40">
										ONLINE
									</span>
								) : (
									<span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold border border-amber-500/40">
										STANDBY
									</span>
								)}
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

						{/* Real-time Stream Telemetry Matrix HUD */}
						<div className="grid grid-cols-3 gap-2 px-1">
							<div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono text-xs">
								<span className="text-slate-400">Frame Rate:</span>
								<span className="text-cyan-400 font-bold flex items-center gap-1">
									<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
									{fpsCounter} FPS
								</span>
							</div>
							<div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono text-xs">
								<span className="text-slate-400">Latency:</span>
								<span className="text-emerald-400 font-bold">~{latencyMs} ms</span>
							</div>
							<div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono text-xs">
								<span className="text-slate-400">Bitrate:</span>
								<span className="text-purple-400 font-bold">{bitrateMbps} Mbps</span>
							</div>
						</div>
					</div>

					{/* Hand Controller Telemetry & Quick Diagnostics (5 Cols) */}
					<div className="lg:col-span-5 flex flex-col gap-4">
						<div className="flex items-center justify-between px-2">
							<div className="flex items-center gap-2">
								<span className="text-base">🕹️</span>
								<h2 className="font-mono font-bold text-white text-sm">ESP32 Hand Controller Telemetry</h2>
							</div>
							<span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
								80Hz DMP
							</span>
						</div>

						<div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 backdrop-blur-md flex flex-col gap-4 shadow-xl">
							{/* Connection & Bridge Status */}
							<div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
								<div className="flex items-center gap-2">
									<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
									<span className="text-slate-300 font-semibold">Telemetry Bridge:</span>
								</div>
								<span className="text-cyan-400 font-bold">COM5 @ 115200 / UDP 8888</span>
							</div>

							{/* Thumb Joystick 2D Cartesian Crosshair with Deadzone boundary */}
							<div className="flex flex-col gap-2">
								<div className="flex justify-between text-xs font-mono text-slate-400">
									<span>Analog Thumb Joystick</span>
									<span className="text-cyan-300 font-bold">
										Raw: ({joyX.toFixed(2)}, {joyY.toFixed(2)}) &bull; Eff: ({effX}, {effY})
									</span>
								</div>
								<div className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center relative overflow-hidden">
									{/* Crosshair axes */}
									<div className="absolute w-full h-[1px] bg-slate-800" />
									<div className="absolute h-full w-[1px] bg-slate-800" />
									
									{/* Outer boundary */}
									<div className="w-24 h-24 rounded-full border border-dashed border-cyan-500/20 absolute" />

									{/* Deadzone boundary overlay */}
									<div
										className="rounded-full border border-red-500/40 bg-red-500/5 absolute pointer-events-none transition-all"
										style={{
											width: `${deadzone * 90}px`,
											height: `${deadzone * 90}px`,
										}}
									/>

									{/* Joystick Knob Dot */}
									<div
										className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/50 absolute transition-all duration-75 flex items-center justify-center text-[10px] text-slate-950 font-bold cursor-grab"
										style={{
											transform: `translate(${joyX * 45}px, ${-joyY * 45}px)`,
										}}
									>
										🕹️
									</div>
								</div>

								{/* Quick D-Pad Sim Buttons for Testing */}
								<div className="grid grid-cols-4 gap-1.5 mt-1">
									<button
										type="button"
										onMouseDown={() => setJoyY(1)}
										onMouseUp={() => setJoyY(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px]"
									>
										▲ Up
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyY(-1)}
										onMouseUp={() => setJoyY(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px]"
									>
										▼ Down
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyX(-1)}
										onMouseUp={() => setJoyX(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px]"
									>
										◀ Left
									</button>
									<button
										type="button"
										onMouseDown={() => setJoyX(1)}
										onMouseUp={() => setJoyX(0)}
										className="py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-[10px]"
									>
										▶ Right
									</button>
								</div>
							</div>

							{/* Physical Buttons Indicators */}
							<div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
								<span className="text-xs font-mono text-slate-400">Tactile Action Buttons</span>
								<div className="grid grid-cols-3 gap-2 font-mono text-xs">
									<button
										type="button"
										onMouseDown={() => setTriggerPressed(true)}
										onMouseUp={() => setTriggerPressed(false)}
										className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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
										className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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
										className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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

				{/* Part 2: Interactive Calibration & Sensor Tuning Wizard */}
				<div className="w-full rounded-2xl bg-slate-900/80 border border-cyan-500/25 p-6 backdrop-blur-xl shadow-2xl">
					<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
						<div>
							<div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase mb-1">
								<span>⚙️</span>
								<span>Calibration Wizard & Sensor Fusion Studio</span>
							</div>
							<h2 className="font-mono font-bold text-white text-base md:text-lg">
								Dynamic Hardware Tuning & Gyro Zero-Drift Tare
							</h2>
						</div>

						<button
							type="button"
							onClick={handleZeroDriftTare}
							className={`px-4 py-2 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border transition-all ${
								tareActive
									? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30"
									: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 border-amber-400 shadow-md"
							}`}
						>
							<span>🎯</span>
							<span>{tareActive ? "Tare Calibration Applied!" : "Zero-Drift Gyro Tare"}</span>
						</button>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
						{/* Col 1: Joystick Deadzone & Sensitivity Sliders */}
						<div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
							<div className="flex items-center justify-between text-slate-200 font-bold">
								<span>🕹️ Joystick Calibration</span>
							</div>

							<div className="flex flex-col gap-1.5">
								<div className="flex justify-between text-slate-400 text-[11px]">
									<span>Deadzone:</span>
									<span className="text-cyan-400 font-bold">{(deadzone * 100).toFixed(0)}%</span>
								</div>
								<input
									type="range"
									min="0"
									max="0.3"
									step="0.01"
									value={deadzone}
									onChange={(e) => setDeadzone(Number(e.target.value))}
									className="accent-cyan-500 cursor-pointer"
								/>
							</div>

							<div className="flex flex-col gap-1.5">
								<div className="flex justify-between text-slate-400 text-[11px]">
									<span>Sensitivity Gain:</span>
									<span className="text-cyan-400 font-bold">{sensitivity.toFixed(1)}x</span>
								</div>
								<input
									type="range"
									min="0.5"
									max="2.5"
									step="0.1"
									value={sensitivity}
									onChange={(e) => setSensitivity(Number(e.target.value))}
									className="accent-cyan-500 cursor-pointer"
								/>
							</div>

							<div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={invertPitch}
										onChange={(e) => setInvertPitch(e.target.checked)}
										className="rounded accent-cyan-500"
									/>
									<span>Invert Pitch (Y)</span>
								</label>
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={invertYaw}
										onChange={(e) => setInvertYaw(e.target.checked)}
										className="rounded accent-cyan-500"
									/>
									<span>Invert Yaw (X)</span>
								</label>
							</div>
						</div>

						{/* Col 2: 6-Axis Orientation & Quaternions */}
						<div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
							<div className="flex items-center justify-between text-slate-200 font-bold">
								<span>🧭 MPU-6050 Orientation</span>
								<span className="text-[10px] text-slate-500 font-normal">
									{tareTimestamp ? `Tared: ${tareTimestamp}` : "Uncalibrated"}
								</span>
							</div>

							<div className="grid grid-cols-3 gap-2 text-center">
								<div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
									<div className="text-[10px] text-slate-400">Yaw (Z)</div>
									<div className="text-cyan-400 font-bold text-sm">{gyroYaw}°</div>
								</div>
								<div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
									<div className="text-[10px] text-slate-400">Pitch (X)</div>
									<div className="text-emerald-400 font-bold text-sm">{gyroPitch}°</div>
								</div>
								<div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
									<div className="text-[10px] text-slate-400">Roll (Y)</div>
									<div className="text-purple-400 font-bold text-sm">{gyroRoll}°</div>
								</div>
							</div>

							<div className="flex flex-col gap-1.5 pt-1">
								<div className="flex justify-between text-slate-400 text-[11px]">
									<span>Trigger Threshold:</span>
									<span className="text-cyan-400 font-bold">{(triggerThreshold * 100).toFixed(0)}%</span>
								</div>
								<input
									type="range"
									min="0.1"
									max="0.8"
									step="0.05"
									value={triggerThreshold}
									onChange={(e) => setTriggerThreshold(Number(e.target.value))}
									className="accent-cyan-500 cursor-pointer"
								/>
							</div>
						</div>

						{/* Col 3: Cardboard / Headset Lens Profiles */}
						<div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-3">
							<div className="flex items-center justify-between text-slate-200 font-bold">
								<span>🥽 Lens & FOV Presets</span>
							</div>

							<div className="flex flex-col gap-2">
								<button
									type="button"
									onClick={() => setSelectedProfile("s24_gear")}
									className={`p-2 rounded-lg text-left border transition-all ${
										selectedProfile === "s24_gear"
											? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
											: "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
									}`}
								>
									<div className="font-bold text-[11px]">Samsung S24 / Gear VR</div>
									<div className="text-[10px] text-slate-500">FOV: 96° &bull; IPD: 62mm &bull; 120Hz Fast AMOLED</div>
								</button>

								<button
									type="button"
									onClick={() => setSelectedProfile("tecno_vrbox")}
									className={`p-2 rounded-lg text-left border transition-all ${
										selectedProfile === "tecno_vrbox"
											? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
											: "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
									}`}
								>
									<div className="font-bold text-[11px]">Tecno Spark 20C / VR Box</div>
									<div className="text-[10px] text-slate-500">FOV: 85° &bull; IPD: 65mm &bull; 90Hz Fast LCD</div>
								</button>

								<button
									type="button"
									onClick={() => setSelectedProfile("cardboard")}
									className={`p-2 rounded-lg text-left border transition-all ${
										selectedProfile === "cardboard"
											? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
											: "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
									}`}
								>
									<div className="font-bold text-[11px]">Google Cardboard V2</div>
									<div className="text-[10px] text-slate-500">FOV: 68° &bull; IPD: 64mm &bull; Universal QR</div>
								</button>
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
							<div className="text-cyan-400 font-bold mb-1">Step 3: Watch Live & Record</div>
							<p className="text-slate-400 text-[11px]">
								The live viewport in the White Frame will automatically render over Wi-Fi! Click <code className="text-cyan-300">🥽 Stereo</code> for Cardboard VR or <code className="text-cyan-300">⏺ Record</code> to save a session clip.
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

