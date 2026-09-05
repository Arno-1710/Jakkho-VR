import { useEffect, useRef, useState } from "react";
import { HEADSET_COLOR_CLASS, HEADSET_COLOR_NAME } from "../../common/constants";

interface PlayerScreenCanvasProps {
	isPlaceholder?: boolean;
	needsInteractivity?: boolean;
	canvas?: HTMLCanvasElement;
	id?: string;
	hideInfos?: boolean;
}

const getDeviceLabel = (rawId: string) => {
	const str = rawId.toLowerCase();
	if (str.includes("tecno") || str.includes("bg7") || str.includes(".50") || str.includes("50:")) return "Tecno Spark 20C (90Hz)";
	if (str.includes("samsung") || str.includes("s24") || str.includes("sm-s92") || str.includes(".51") || str.includes("51:")) return "Samsung Galaxy S24 (120Hz)";
	if (str.includes("quest")) return "Meta Quest (VR)";
	return `Device: ${rawId}`;
};

const PlayerScreenCanvas = ({ canvas, id, isPlaceholder, hideInfos, needsInteractivity }: PlayerScreenCanvasProps) => {
	const ipIdentifier: string = id ? id.split(":")[0].split(".")[id.split(".").length - 1] : "";
	const canvasref = useRef<HTMLDivElement>(null);
	const popupref = useRef<HTMLDivElement>(null);
	const [showPopup, setShowPopup] = useState<boolean>(false);

	// Attach the managed canvas to the DOM
	useEffect(() => {
		if (canvas) {
			canvas.classList.remove(...canvas.classList);
			canvas.classList.add("object-contain", "rounded-xl", "w-full", "h-full");

			if (showPopup) {
				if (popupref.current) {
					popupref.current.querySelector("canvas")?.remove();
					popupref.current.appendChild(canvas);
					canvas.classList.add("rounded-xl", "max-h-[90dvh]", "max-w-[90dvw]");
				}
			} else if (canvasref.current) {
				canvas.classList.add("w-full", "h-full");
				canvasref.current.querySelector("canvas")?.remove();
				canvasref.current.appendChild(canvas);
			}
		}
	}, [canvas, showPopup]);

	if (!id) {
		return null;
	}

	const handleSnapshot = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!canvas) return;
		try {
			const url = canvas.toDataURL("image/png");
			const a = document.createElement("a");
			a.href = url;
			a.download = `JAKKHO_Stream_${(id || "feed").replace(/[:.]/g, "_")}_${Date.now()}.png`;
			a.click();
		} catch (err) {
			console.warn("Snapshot failed:", err);
		}
	};

	return (
		<>
			{/* Popup Modal */}
			{showPopup && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6"
					onClick={() => setShowPopup(false)}
				>
					<div
						className="relative bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-2xl flex flex-col items-center max-w-[95vw] max-h-[95vh]"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold text-cyan-400">{getDeviceLabel(id)}</span>
								<span className="text-xs text-slate-400 font-mono">({id})</span>
							</div>
							<button
								type="button"
								onClick={() => setShowPopup(false)}
								className="px-3 py-1 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold"
							>
								Close
							</button>
						</div>

						<div ref={popupref} className="flex items-center justify-center overflow-hidden rounded-xl bg-black" />
					</div>
				</div>
			)}

			{/* Main White Bezel Frame */}
			<div className="relative pt-6 w-full h-full flex flex-col items-center justify-center p-2">
				{/* Top JAKKHO Tab Badge */}
				<div className="absolute top-1 left-1/2 -translate-x-1/2 bg-white px-5 py-1 rounded-t-xl shadow-md border-t-2 border-x-2 border-slate-100 flex items-center justify-center gap-1.5 z-30 pointer-events-auto">
					<span className="font-extrabold text-slate-900 tracking-wider text-xs font-mono flex items-center gap-1">
						JAK<span className="text-cyan-500 text-xs">◆</span>KHO
					</span>
				</div>

				{/* Custom White Frame */}
				<div
					className="relative group rounded-2xl p-1.5 bg-white border-4 border-white shadow-2xl transition-all duration-300 flex flex-col items-center justify-center overflow-hidden w-full h-full jakkho-frame-glow cursor-pointer"
					onClick={needsInteractivity && !isPlaceholder ? () => setShowPopup(true) : undefined}
				>
					{!isPlaceholder ? (
						<>
							{/* Canvas holder */}
							<div
								ref={canvasref}
								className="w-full h-full object-cover rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden relative"
							/>

							{/* Top floating badge */}
							{!hideInfos && (
								<div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
									<div className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md font-mono text-[11px] font-bold text-white border border-cyan-400/50 shadow-md">
										{getDeviceLabel(id)}
									</div>
									<div className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-semibold">
										LIVE
									</div>
								</div>
							)}

							{/* Hover Quick Action */}
							<div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1.5">
								<button
									type="button"
									onClick={handleSnapshot}
									className="px-2 py-1 bg-slate-900/90 hover:bg-cyan-600 text-white rounded text-[10px] font-mono border border-slate-700"
									title="Snapshot"
								>
									📷 Snap
								</button>
								<button
									type="button"
									onClick={() => setShowPopup(true)}
									className="px-2 py-1 bg-slate-900/90 hover:bg-cyan-600 text-white rounded text-[10px] font-mono border border-slate-700"
									title="Enlarge"
								>
									⛶ Expand
								</button>
							</div>
						</>
					) : (
						/* High-tech Standby / Waiting Canvas */
						<div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800 relative overflow-hidden">
							<div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 animate-pulse">
								<span className="text-2xl font-mono text-cyan-400">◆</span>
							</div>
							<h3 className="font-mono font-bold text-sm text-cyan-300 tracking-wide uppercase mb-1">
								JAKKHO Standby Stream
							</h3>
							<p className="text-xs text-slate-400 max-w-xs font-mono mb-3">
								Waiting for Samsung S24 / Tecno Spark 20C / Quest stream via ADB or Wi-Fi...
							</p>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300">
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
								<span>Listening on ws://localhost:8082</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default PlayerScreenCanvas;
