import { getLogger } from "@logtape/logtape";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { wsApi } from "../../common/wsApi";
import { useSimulationNav } from "../../hooks/useSimulationNav";
import Footer from "../Footer/Footer";
import Header from "../Header/Header";
import { useWebSocket } from "../WebSocketManager/WebSocketManager";
import SimulationList from "./SimulationList";

const SelectorSimulations = () => {
	const { ws, isWsConnected, gamaless, gama, simulationList } = useWebSocket();
	const { subProjectsList, path, back, reset, handleSimulation } = useSimulationNav();
	const [loading, setLoading] = useState<boolean>(true);
	const [connectionStatus, setConnectionStatus] = useState<string>("Waiting for connection ...");
	const { t } = useTranslation();
	const logger = getLogger(["components", "SelectorSimulation"]);

	useEffect(() => {
		if (isWsConnected && ws !== null) {
			wsApi.getSimulationInformations(ws);
			setLoading(true);
		}
	}, [isWsConnected, ws]);

	useEffect(() => {
		if (simulationList.length > 0) {
			setLoading(false);
		}
	}, [simulationList]);

	useEffect(() => {
		if (gamaless) return;
		let interval: NodeJS.Timeout;
		if (ws && !gama.connected) {
			interval = setInterval(() => {
				if (ws.readyState !== WebSocket.OPEN) return;
				wsApi.tryConnection(ws);
				logger.info("Trying to connect to GAMA, connection status: {gamaStatus}", { gamaStatus: gama.connected });
			}, 3000);
		}
		return () => {
			clearInterval(interval);
		};
	}, [ws, gama.connected, gamaless, logger.info]);

	useEffect(() => {
		if (gama.connected) {
			setConnectionStatus("");
		} else {
			setConnectionStatus(t("loading"));
		}
	}, [gama.connected, t]);

	const navRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (loading || gamaless || !gama.connected || subProjectsList.length === 0) return;
		navRef.current?.querySelector<HTMLElement>('[data-nav-item="tile"]')?.focus();
	}, [loading, gamaless, gama.connected, subProjectsList]);

	const handleNavKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].includes(e.key)) return;
		const items = Array.from(navRef.current?.querySelectorAll<HTMLElement>("[data-nav-item]") ?? []);
		if (items.length === 0) return;
		e.preventDefault();
		const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
		const current = items.indexOf(document.activeElement as HTMLElement);
		items[current === -1 ? 0 : current + dir]?.focus();
	};

	return (
		<div className="flex flex-col items-center justify-between min-h-screen w-full">
			<Header onLogoClick={reset} />

			{gamaless ? (
				<div className="w-full max-w-5xl px-6 py-8 flex flex-col items-center gap-8">
					{/* Welcome Hero Banner */}
					<div className="w-full rounded-2xl bg-slate-900/80 border border-cyan-500/30 p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
						<div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
						<div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
							<div>
								<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-bold mb-3">
									<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
									JAKKHO VR CONTROL HUB
								</div>
								<h1 className="text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
									Dual-Phone & OpenXR Streaming System
								</h1>
								<p className="text-sm text-slate-300 max-w-xl mt-2 leading-relaxed">
									Headset management, hardware WebCodecs streaming, and ESP32 BLE controller tracking active in standalone mode.
								</p>
							</div>

							<div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
								<Link
									to="/streamPlayerScreen"
									className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all text-decoration-none"
								>
									<span>🖥️</span>
									<span>Open Live Casting</span>
								</Link>
								<Link
									to="/simulationManager"
									className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-semibold text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all text-decoration-none"
								>
									<span>🎮</span>
									<span>Multiplayer Hub</span>
								</Link>
							</div>
						</div>
					</div>

					{/* Device Status Grid */}
					<div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5">
						{/* Samsung Galaxy S24 */}
						<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-cyan-500/40 transition-all">
							<div className="flex items-center justify-between mb-3">
								<span className="text-xl">📱</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									120Hz AMOLED
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-base">Samsung Galaxy S24</h3>
							<p className="text-xs text-slate-400 mt-1 font-mono">
								Low-latency H.265 hardware decoding with Unity Cardboard XR.
							</p>
							<div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
								<span>Status:</span>
								<span className="text-emerald-400 font-semibold">Ready / Port 8082</span>
							</div>
						</div>

						{/* Tecno Spark 20C */}
						<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-cyan-500/40 transition-all">
							<div className="flex items-center justify-between mb-3">
								<span className="text-xl">📱</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									90Hz Fast LCD
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-base">Tecno Spark 20C</h3>
							<p className="text-xs text-slate-400 mt-1 font-mono">
								Cardboard 6DoF simulation stream with direct ADB TCP/IP connection.
							</p>
							<div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
								<span>Status:</span>
								<span className="text-emerald-400 font-semibold">Ready / Port 8082</span>
							</div>
						</div>

						{/* ESP32 DIY Controller */}
						<div className="rounded-xl bg-slate-900/60 border border-slate-800 p-5 backdrop-blur-md hover:border-cyan-500/40 transition-all">
							<div className="flex items-center justify-between mb-3">
								<span className="text-xl">🕹️</span>
								<span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold border border-cyan-500/30">
									80Hz BLE
								</span>
							</div>
							<h3 className="font-mono font-bold text-white text-base">JAKKHO Controller</h3>
							<p className="text-xs text-slate-400 mt-1 font-mono">
								MPU-6050 DMP + Analog Thumb Joystick + 3 Physical Action Buttons.
							</p>
							<div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
								<span>Telemetry:</span>
								<span className="text-cyan-400 font-semibold">ws://localhost:8080</span>
							</div>
						</div>
					</div>
				</div>
			) : loading ? (
				<div className="text-center py-20">
					<div className="animate-spin rounded-full border-4 border-cyan-500 border-t-transparent h-12 w-12 mx-auto mb-4" />
					<h2 className="text-slate-300 font-mono">{t("loading")}</h2>
				</div>
			) : (
				<div
					ref={navRef}
					onKeyDown={handleNavKeyDown}
					className="flex flex-col justify-center items-center size-full rounded-md relative"
				>
					{path.length >= 1 && (
						<button
							type="button"
							data-nav-item="back"
							onClick={() => back()}
							aria-label="Back"
							className="absolute left-[3.1dvw] top-10 bg-transparent border-none p-0 cursor-pointer focus:outline-none hover:scale-110 focus:scale-110 transition-transform duration-200"
						>
							<img src={` /images/Buttons/Button_back.png`} alt="" className="size-[6dvh]" />
						</button>
					)}

					<div className="flex flex-col items-center justify-around h-fit w-full relative">
						<SimulationList list={subProjectsList} handleSimulation={handleSimulation} gama={gama} />
					</div>
					<Link to={"../streamPlayerScreen"} className="rounded-lg absolute bottom-[10dvh]" target="_blank">
						<img
							src={` /images/Buttons/Button_Display.png`}
							alt=""
							className="size-[6dvh] hover:scale-110 transition-transform duration-200"
						/>
					</Link>
					<div className="flex gap-2 mt-6">
						<div className={gama.connected ? "text-green-500" : "text-red-500"}>
							{gama.connected ? "" : connectionStatus}
						</div>
					</div>
				</div>
			)}
			<Footer />
		</div>
	);
};

export default SelectorSimulations;
