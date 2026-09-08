import { useEffect, useRef, useState } from "react";

interface PlayerScreenCanvasProps {
	isPlaceholder?: boolean;
	needsInteractivity?: boolean;
	canvas?: HTMLCanvasElement;
	streamUrl?: string;
	id?: string;
	hideInfos?: boolean;
}

const getDeviceLabel = (rawId: string) => {
	const str = rawId.toLowerCase();
	if (str.includes("unity") || str.includes("pc")) return "Unity VR PC (Wi-Fi Live)";
	if (str.includes("tecno") || str.includes("bg7") || str.includes(".50") || str.includes("50:")) return "Tecno Spark 20C (90Hz)";
	if (str.includes("samsung") || str.includes("s24") || str.includes("sm-s92") || str.includes(".51") || str.includes("51:")) return "Samsung Galaxy S24 (120Hz)";
	if (str.includes("quest")) return "Meta Quest (VR)";
	return `Device: ${rawId}`;
};

const PlayerScreenCanvas = ({ canvas, streamUrl, id, isPlaceholder, hideInfos, needsInteractivity }: PlayerScreenCanvasProps) => {
	const canvasref = useRef<HTMLDivElement>(null);
	const popupref = useRef<HTMLDivElement>(null);
	const stereoRightCanvasRef = useRef<HTMLCanvasElement>(null);
	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [isRecording, setIsRecording] = useState<boolean>(false);
	const [recordDuration, setRecordDuration] = useState<number>(0);
	const [isStereoMode, setIsStereoMode] = useState<boolean>(false);
	const [ipdOffset, setIpdOffset] = useState<number>(64); // mm IPD (default 64mm)
	const [lensZoom, setLensZoom] = useState<number>(1.0); // 0.8x - 1.2x

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const recordedChunksRef = useRef<Blob[]>([]);
	const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const animFrameRef = useRef<number | null>(null);

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

	// Stereo dual-eye canvas mirror loop for WebCodecs canvas
	useEffect(() => {
		if (isStereoMode && canvas && stereoRightCanvasRef.current) {
			const rightCanvas = stereoRightCanvasRef.current;
			const ctx = rightCanvas.getContext("2d");

			const mirrorLoop = () => {
				if (ctx && canvas && canvas.width > 0 && canvas.height > 0) {
					if (rightCanvas.width !== canvas.width || rightCanvas.height !== canvas.height) {
						rightCanvas.width = canvas.width;
						rightCanvas.height = canvas.height;
					}
					ctx.drawImage(canvas, 0, 0);
				}
				animFrameRef.current = requestAnimationFrame(mirrorLoop);
			};

			mirrorLoop();
			return () => {
				if (animFrameRef.current) {
					cancelAnimationFrame(animFrameRef.current);
				}
			};
		}
	}, [isStereoMode, canvas]);

	if (!id) {
		return null;
	}

	// 1-Click Live Video Session Recording
	const handleStartRecording = (e: React.MouseEvent) => {
		e.stopPropagation();
		let stream: MediaStream | null = null;
		if (canvas) {
			stream = canvas.captureStream(30);
		} else if (canvasref.current?.querySelector("canvas")) {
			stream = canvasref.current.querySelector("canvas")!.captureStream(30);
		}

		if (!stream) {
			// For MJPEG image feeds, we capture via synthetic canvas
			const img = canvasref.current?.querySelector("img");
			if (img) {
				const tempCanvas = document.createElement("canvas");
				tempCanvas.width = img.naturalWidth || 1280;
				tempCanvas.height = img.naturalHeight || 720;
				const ctx = tempCanvas.getContext("2d");
				if (ctx) {
					const fps = 30;
					stream = tempCanvas.captureStream(fps);
					const drawInterval = setInterval(() => {
						try {
							ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
						} catch {
							clearInterval(drawInterval);
						}
					}, 1000 / fps);

					const origStop = () => clearInterval(drawInterval);
					startRecordingWithStream(stream, origStop);
					return;
				}
			}
			alert("Live stream capture not available yet.");
			return;
		}

		startRecordingWithStream(stream);
	};

	const startRecordingWithStream = (stream: MediaStream, onCleanup?: () => void) => {
		try {
			recordedChunksRef.current = [];
			const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
				? "video/webm;codecs=vp9"
				: MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
				? "video/webm;codecs=vp8"
				: "video/webm";

			const recorder = new MediaRecorder(stream, { mimeType: mime });
			mediaRecorderRef.current = recorder;

			recorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					recordedChunksRef.current.push(event.data);
				}
			};

			recorder.onstop = () => {
				if (onCleanup) onCleanup();
				const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `JAKKHO_VR_Session_${(id || "feed").replace(/[:.]/g, "_")}_${Date.now()}.webm`;
				a.click();
				URL.revokeObjectURL(url);
			};

			recorder.start(500);
			setIsRecording(true);
			setRecordDuration(0);
			recordIntervalRef.current = setInterval(() => {
				setRecordDuration((prev) => prev + 1);
			}, 1000);
		} catch (err) {
			console.warn("MediaRecorder start failed:", err);
		}
	};

	const handleStopRecording = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
		}
		if (recordIntervalRef.current) {
			clearInterval(recordIntervalRef.current);
			recordIntervalRef.current = null;
		}
		setIsRecording(false);
	};

	// Instant Snapshot
	const handleSnapshot = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!canvas) {
			const img = canvasref.current?.querySelector("img");
			if (img) {
				const c = document.createElement("canvas");
				c.width = img.naturalWidth || 1280;
				c.height = img.naturalHeight || 720;
				const ctx = c.getContext("2d");
				if (ctx) {
					ctx.drawImage(img, 0, 0);
					const url = c.toDataURL("image/png");
					const a = document.createElement("a");
					a.href = url;
					a.download = `JAKKHO_Snap_${(id || "feed").replace(/[:.]/g, "_")}_${Date.now()}.png`;
					a.click();
					return;
				}
			}
			return;
		}
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

	// Direct Mobile Fullscreen Mode for Google Cardboard
	const handleEnterFullscreenVR = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsStereoMode(true);
		setShowPopup(true);
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen().catch(() => {});
		}
	};

	const formatTime = (secs: number) => {
		const m = Math.floor(secs / 60).toString().padStart(2, "0");
		const s = (secs % 60).toString().padStart(2, "0");
		return `${m}:${s}`;
	};

	const [streamImgError, setStreamImgError] = useState<boolean>(false);
	const [streamKey, setStreamKey] = useState<number>(0);

	// Periodic auto-retry when stream is in error state
	useEffect(() => {
		if (streamImgError && streamUrl) {
			const timer = setInterval(() => {
				setStreamKey((k) => k + 1);
				setStreamImgError(false);
			}, 3000);
			return () => clearInterval(timer);
		}
	}, [streamImgError, streamUrl]);

	return (
		<>
			{/* Popup Modal / Fullscreen Stereo VR Dialog */}
			{showPopup && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-xl p-2 md:p-4 w-screen h-screen"
					onClick={() => setShowPopup(false)}
				>
					<div
						className="relative bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-4 shadow-2xl flex flex-col w-[96vw] h-[92vh] max-w-[1920px] max-h-[96vh]"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Modal Top Bar */}
						<div className="w-full flex-shrink-0 flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
							<div className="flex items-center gap-2">
								<span className="font-mono font-bold text-cyan-400 text-sm md:text-base">{getDeviceLabel(id)}</span>
								<span className="text-xs text-slate-400 font-mono hidden sm:inline">({id})</span>
								{isStereoMode && (
									<span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-bold">
										🥽 3D STEREO VR ACTIVE
									</span>
								)}
							</div>

							<div className="flex items-center gap-2">
								{/* IPD Slider when in Stereo mode */}
								{isStereoMode && (
									<div className="hidden sm:flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-lg border border-purple-500/30 text-xs font-mono text-slate-300">
										<span>IPD: {ipdOffset}mm</span>
										<input
											type="range"
											min="56"
											max="72"
											value={ipdOffset}
											onChange={(e) => setIpdOffset(Number(e.target.value))}
											className="w-16 accent-purple-500 cursor-pointer"
										/>
										<span className="ml-2">Zoom: {lensZoom.toFixed(1)}x</span>
										<input
											type="range"
											min="0.8"
											max="1.3"
											step="0.1"
											value={lensZoom}
											onChange={(e) => setLensZoom(Number(e.target.value))}
											className="w-14 accent-cyan-500 cursor-pointer"
										/>
									</div>
								)}

								<button
									type="button"
									onClick={() => setIsStereoMode(!isStereoMode)}
									className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
										isStereoMode
											? "bg-purple-600 text-white border-purple-400"
											: "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
									}`}
								>
									🥽 {isStereoMode ? "Exit Stereo" : "Stereo VR"}
								</button>
								<button
									type="button"
									onClick={() => setShowPopup(false)}
									className="px-3 py-1.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-xs font-semibold"
								>
									Close
								</button>
							</div>
						</div>

						{/* Modal Video Container (Guaranteed Full Height) */}
						<div className="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden rounded-xl bg-slate-950 relative">
							{isStereoMode ? (
								<div className="w-full h-full grid grid-cols-2 gap-1 items-center justify-center bg-black relative min-h-0">
									{/* Center Cardboard Divider Line */}
									<div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-cyan-500/40 z-10" />

									{/* Left Eye */}
									<div className="w-full h-full flex items-center justify-center overflow-hidden relative min-h-0 bg-slate-950">
										<span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-[9px] font-mono text-cyan-400 z-20">
											LEFT EYE (IPD {ipdOffset}mm)
										</span>
										{streamUrl && !streamImgError ? (
											<img
												key={`modal-left-${streamKey}`}
												src={streamUrl}
												alt="Left Eye"
												className="w-full h-full object-contain"
												style={{ transform: `scale(${lensZoom})` }}
												onError={() => setStreamImgError(true)}
											/>
										) : streamUrl && streamImgError ? (
											<div className="flex flex-col items-center justify-center p-4 text-center">
												<div className="w-12 h-12 rounded-full border border-dashed border-cyan-400/40 flex items-center justify-center text-cyan-400 font-mono text-xl mb-2 animate-spin">
													+
												</div>
												<span className="font-mono text-xs text-cyan-300 font-bold">LEFT EYE RETICLE</span>
												<span className="font-mono text-[10px] text-slate-500 mt-1">Standby for Unity stream</span>
											</div>
										) : (
											<div ref={popupref} className="w-full h-full flex items-center justify-center" />
										)}
									</div>

									{/* Right Eye */}
									<div className="w-full h-full flex items-center justify-center overflow-hidden relative min-h-0 bg-slate-950">
										<span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-[9px] font-mono text-purple-400 z-20">
											RIGHT EYE (IPD {ipdOffset}mm)
										</span>
										{streamUrl && !streamImgError ? (
											<img
												key={`modal-right-${streamKey}`}
												src={streamUrl}
												alt="Right Eye"
												className="w-full h-full object-contain"
												style={{ transform: `scale(${lensZoom})` }}
												onError={() => setStreamImgError(true)}
											/>
										) : streamUrl && streamImgError ? (
											<div className="flex flex-col items-center justify-center p-4 text-center">
												<div className="w-12 h-12 rounded-full border border-dashed border-purple-400/40 flex items-center justify-center text-purple-400 font-mono text-xl mb-2 animate-spin">
													+
												</div>
												<span className="font-mono text-xs text-purple-300 font-bold">RIGHT EYE RETICLE</span>
												<span className="font-mono text-[10px] text-slate-500 mt-1">Standby for Unity stream</span>
											</div>
										) : (
											<canvas ref={stereoRightCanvasRef} className="w-full h-full object-contain rounded-xl" />
										)}
									</div>
								</div>
							) : streamUrl && !streamImgError ? (
								<img
									key={`modal-mono-${streamKey}`}
									src={streamUrl}
									alt="JAKKHO Live Stream"
									className="w-full h-full object-contain"
									onError={() => setStreamImgError(true)}
								/>
							) : streamUrl && streamImgError ? (
								<div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
									<div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-3 animate-pulse">
										<span className="text-3xl font-mono text-cyan-400">◆</span>
									</div>
									<h3 className="font-mono font-bold text-base text-cyan-300 uppercase mb-1">
										Unity VR Stream Standby
									</h3>
									<p className="text-xs text-slate-400 max-w-md font-mono mb-4">
										Waiting for Unity Play Mode. Attach <code className="text-cyan-300">UnityLiveWebStreamer</code> to your Camera and press Play ▶️ in Unity.
									</p>
									<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300">
										<span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
										<span>Listening on http://localhost:8085/live.mjpg</span>
									</div>
								</div>
							) : (
								<div ref={popupref} className="flex items-center justify-center overflow-hidden rounded-xl bg-black w-full h-full" />
							)}
						</div>
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
							{/* Stream view: Either MJPEG image or WebCodecs canvas */}
							{isStereoMode ? (
								<div className="w-full h-full grid grid-cols-2 gap-0.5 bg-black rounded-xl overflow-hidden relative">
									<div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-800 z-10" />
									<div className="w-full h-full border-r border-slate-800 overflow-hidden flex items-center justify-center bg-slate-950">
										{streamUrl && !streamImgError ? (
											<img key={`card-left-${streamKey}`} src={streamUrl} alt="Left Eye" className="w-full h-full object-contain" onError={() => setStreamImgError(true)} />
										) : streamUrl && streamImgError ? (
											<div className="text-center font-mono text-[10px] text-cyan-400">LEFT EYE [STANDBY]</div>
										) : (
											<div ref={canvasref} className="w-full h-full" />
										)}
									</div>
									<div className="w-full h-full overflow-hidden flex items-center justify-center bg-slate-950">
										{streamUrl && !streamImgError ? (
											<img key={`card-right-${streamKey}`} src={streamUrl} alt="Right Eye" className="w-full h-full object-contain" onError={() => setStreamImgError(true)} />
										) : streamUrl && streamImgError ? (
											<div className="text-center font-mono text-[10px] text-purple-400">RIGHT EYE [STANDBY]</div>
										) : (
											<canvas ref={stereoRightCanvasRef} className="w-full h-full object-contain" />
										)}
									</div>
								</div>
							) : streamUrl && !streamImgError ? (
								<img
									key={`card-mono-${streamKey}`}
									src={streamUrl}
									alt="JAKKHO Live Stream"
									className="w-full h-full object-contain rounded-xl bg-black"
									onError={() => setStreamImgError(true)}
								/>
							) : streamUrl && streamImgError ? (
								<div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800 relative overflow-hidden">
									<div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-2 animate-pulse">
										<span className="text-2xl font-mono text-cyan-400">◆</span>
									</div>
									<h3 className="font-mono font-bold text-xs text-cyan-300 tracking-wide uppercase mb-1">
										Unity Stream Standby
									</h3>
									<p className="text-[11px] text-slate-400 max-w-xs font-mono mb-2">
										Press Play ▶️ in Unity to stream live camera
									</p>
									<div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
										<span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
										<span>http://localhost:8085/live.mjpg</span>
									</div>
								</div>
							) : (
								<div
									ref={canvasref}
									className="w-full h-full object-cover rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden relative"
								/>
							)}

							{/* Top floating status badges */}
							{!hideInfos && (
								<div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-20">
									<div className="px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md font-mono text-[11px] font-bold text-white border border-cyan-400/50 shadow-md">
										{getDeviceLabel(id)}
									</div>
									<div className="flex items-center gap-2">
										{isRecording && (
											<div className="px-2.5 py-0.5 rounded-lg bg-red-600/90 border border-red-400 text-white font-mono text-[10px] font-bold flex items-center gap-1 animate-pulse">
												<span className="w-2 h-2 rounded-full bg-white" />
												<span>REC {formatTime(recordDuration)}</span>
											</div>
										)}
										<div className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-semibold">
											LIVE
										</div>
									</div>
								</div>
							)}

							{/* Hover Quick Action Bar */}
							<div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex gap-1.5 pointer-events-auto">
								{isRecording ? (
									<button
										type="button"
										onClick={handleStopRecording}
										className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-mono font-bold shadow-lg"
										title="Stop & Save Recording"
									>
										⏹ Stop REC
									</button>
								) : (
									<button
										type="button"
										onClick={handleStartRecording}
										className="px-2 py-1 bg-slate-900/90 hover:bg-red-600 text-white rounded text-[10px] font-mono border border-slate-700"
										title="Record Session"
									>
										⏺ Record
									</button>
								)}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setIsStereoMode(!isStereoMode);
									}}
									className={`px-2 py-1 rounded text-[10px] font-mono border transition-all ${
										isStereoMode
											? "bg-purple-600 text-white border-purple-400 font-bold"
											: "bg-slate-900/90 hover:bg-purple-600 text-white border-slate-700"
									}`}
									title="Toggle Cardboard 3D Stereo VR Mode"
								>
									🥽 Stereo
								</button>
								<button
									type="button"
									onClick={handleEnterFullscreenVR}
									className="px-2 py-1 bg-slate-900/90 hover:bg-purple-600 text-purple-300 rounded text-[10px] font-mono border border-purple-500/40"
									title="Direct Mobile Fullscreen Cardboard VR"
								>
									📱 VR Headset
								</button>
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
								Waiting for Unity PC VR / Samsung S24 / Tecno Spark 20C Wi-Fi stream...
							</p>
							<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300">
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
								<span>Listening on http://localhost:8085 / ws://8082</span>
							</div>
						</div>
					)}
				</div>
			</div>
		</>
	);
};

export default PlayerScreenCanvas;

