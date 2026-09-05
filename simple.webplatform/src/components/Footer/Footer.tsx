const Footer = () => {
	return (
		<footer className="w-full py-4 px-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md text-xs font-mono text-slate-400 mt-auto z-30">
			<div className="flex items-center gap-2">
				<span className="font-bold text-white">JAK<span className="text-cyan-400">◆</span>KHO VR</span>
				<span>•</span>
				<span>CADT Innovation & Digital Media Lab</span>
			</div>

			<div className="flex items-center gap-4 text-[11px] text-slate-500">
				<span>WebCodecs H.265 / H.264</span>
				<span>•</span>
				<span>ESP32 80Hz BLE Telemetry</span>
				<span>•</span>
				<span>Samsung S24 & Tecno Spark 20C</span>
			</div>
		</footer>
	);
};

export default Footer;
