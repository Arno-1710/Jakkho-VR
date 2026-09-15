import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface HeaderProps {
	onLogoClick?: () => void;
}

const Header = ({ onLogoClick }: HeaderProps) => {
	const location = useLocation();
	const [connectedStatus, setConnectedStatus] = useState<{
		isUnityOnline: boolean;
		deviceText: string;
		isLive: boolean;
	}>({
		isUnityOnline: false,
		deviceText: "Scanning for connected devices...",
		isLive: false,
	});

	// Dynamic detection of connected streams & hardware (fast active probe)
	useEffect(() => {
		let isMounted = true;
		const checkConnections = async () => {
			let unityFound = false;
			const host = typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost";
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 1000);
				await fetch(`http://${host}:8085/snapshot.jpg?t=${Date.now()}`, {
					method: "HEAD",
					mode: "no-cors",
					signal: controller.signal,
				});
				clearTimeout(timeoutId);
				unityFound = true;
			} catch {
				unityFound = false;
			}

			if (!isMounted) return;

			if (unityFound) {
				setConnectedStatus({
					isUnityOnline: true,
					deviceText: "Unity VR PC Stream (Wi-Fi 60 FPS)",
					isLive: true,
				});
			} else {
				setConnectedStatus({
					isUnityOnline: false,
					deviceText: "Standby • Waiting for Stream",
					isLive: false,
				});
			}
		};

		checkConnections();
		const interval = setInterval(checkConnections, connectedStatus.isLive ? 2500 : 900);
		return () => {
			isMounted = false;
			clearInterval(interval);
		};
	}, [connectedStatus.isLive]);

	const navItems = [
		{ label: "Live Casting", path: "/streamPlayerScreen", icon: "🖥️" },
		{ label: "Multiplayer & Sim", path: "/simulationManager", icon: "🎮" },
		{ label: "Hub Home", path: "/", icon: "🏠" },
	];

	return (
		<header className="w-full flex items-center justify-between px-6 md:px-8 py-3.5 bg-[#121826]/90 backdrop-blur-xl border-b border-[#1e2e4a] shadow-xl z-40 sticky top-0">
			{/* Brand Badge */}
			<div className="flex items-center gap-4">
				{onLogoClick ? (
					<button
						type="button"
						onClick={onLogoClick}
						className="flex items-center gap-2.5 bg-transparent border-none p-0 cursor-pointer text-left focus:outline-none group"
					>
						<img
							src="/jakkho_logo_white.png"
							alt="Logo"
							className="h-7 md:h-8 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,194,255,0.3)] group-hover:brightness-110 transition-all"
						/>
						<span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-wider uppercase">
							VR Platform
						</span>
					</button>
				) : (
					<Link to="/" className="flex items-center gap-2.5 text-decoration-none group">
						<img
							src="/jakkho_logo_white.png"
							alt="Logo"
							className="h-7 md:h-8 w-auto object-contain drop-shadow-[0_2px_12px_rgba(0,194,255,0.3)] group-hover:brightness-110 transition-all"
						/>
						<span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 tracking-wider uppercase">
							VR Platform
						</span>
					</Link>
				)}

				{/* Dynamic Connected Device Indicator */}
				<div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#1e2e4a] text-[11px] font-mono">
					<span
						className={`w-2.5 h-2.5 rounded-full ${
							connectedStatus.isLive ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" : "bg-amber-400"
						}`}
					/>
					<span className={connectedStatus.isLive ? "text-emerald-400 font-semibold" : "text-slate-400"}>
						{connectedStatus.deviceText}
					</span>
				</div>
			</div>

			{/* Navigation Tabs */}
			<nav className="flex items-center gap-2">
				{navItems.map((item) => {
					const isActive = location.pathname === item.path;
					return (
						<Link
							key={item.path}
							to={item.path}
							className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 text-decoration-none ${
								isActive
									? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 font-bold"
									: "bg-[#0b1f3a]/80 text-slate-300 hover:text-white hover:bg-[#152945] border border-[#1e2e4a]"
							}`}
						>
							<span>{item.icon}</span>
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>
		</header>
	);
};

export default Header;

