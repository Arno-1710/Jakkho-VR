import { Link, useLocation } from "react-router-dom";
import LanguageSelector from "../LanguageSelector/LanguageSelector";

interface HeaderProps {
	onLogoClick?: () => void;
}

const Header = ({ onLogoClick }: HeaderProps) => {
	const location = useLocation();

	const navItems = [
		{ label: "Live Casting", path: "/streamPlayerScreen", icon: "🖥️" },
		{ label: "Multiplayer & Sim", path: "/simulationManager", icon: "🎮" },
		{ label: "Hub Home", path: "/", icon: "🌐" },
	];

	return (
		<header className="w-full flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-xl z-40 sticky top-0">
			{/* Brand Badge */}
			<div className="flex items-center gap-4">
				{onLogoClick ? (
					<button
						type="button"
						onClick={onLogoClick}
						className="flex items-center gap-2 bg-transparent border-none p-0 cursor-pointer text-left focus:outline-none"
					>
						<div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
							<span className="text-white font-extrabold text-base font-mono">◆</span>
						</div>
						<div>
							<div className="font-extrabold text-xl tracking-wider text-white font-mono flex items-center gap-1">
								JAK<span className="text-cyan-400">◆</span>KHO
							</div>
							<div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
								VR Platform
							</div>
						</div>
					</button>
				) : (
					<Link to="/" className="flex items-center gap-2 text-decoration-none">
						<div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
							<span className="text-white font-extrabold text-base font-mono">◆</span>
						</div>
						<div>
							<div className="font-extrabold text-xl tracking-wider text-white font-mono flex items-center gap-1">
								JAK<span className="text-cyan-400">◆</span>KHO
							</div>
							<div className="text-[10px] text-slate-400 uppercase font-mono tracking-widest">
								VR Platform
							</div>
						</div>
					</Link>
				)}

				<div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-[11px] font-mono text-cyan-300/80">
					<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
					<span>Samsung S24 & Tecno Dual Ready</span>
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
									? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30"
									: "bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
							}`}
						>
							<span>{item.icon}</span>
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			{/* Right Controls */}
			<div className="flex items-center gap-3">
				<LanguageSelector />
			</div>
		</header>
	);
};

export default Header;
