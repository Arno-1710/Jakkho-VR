import { useVideoGrid } from "../../hooks/useVideoGrid";
import { useVideoStreams } from "../../hooks/useVideoStreams";
import PlayerScreenCanvas from "./PlayerScreenCanvas.tsx";

// Standard Widescreen 16:9 Aspect Ratio (1920x1080 / 16:9)
const STREAM_ASPECT_RATIO = 16 / 9;

interface VideoStreamManagerProps {
	needsInteractivity?: boolean;
	selectedCanvas?: string;
	hideInfos?: boolean; // boolean to be passed down as a prop to player screen canvas
}

// The React component
const VideoStreamManager = ({ needsInteractivity, selectedCanvas, hideInfos }: VideoStreamManagerProps) => {
	const { canvasList, sortedKeys } = useVideoStreams(selectedCanvas);

	// Dynamic grid: one cell per live stream, sized to the container by useVideoGrid.
	const streamCount = sortedKeys.length;
	const { containerRef, cols, rows, cellWidth, cellHeight } = useVideoGrid(streamCount, STREAM_ASPECT_RATIO);
	// Letterbox the stream aspect into the measured cell so each tile fits exactly (no overflow, no distortion).
	const tileWidth = Math.min(cellWidth, cellHeight * STREAM_ASPECT_RATIO);
	const tileHeight = tileWidth / STREAM_ASPECT_RATIO;

	return selectedCanvas ? (
		<div className="w-fit">
			<p>amount of streams: {Object.keys(canvasList).length}</p>
			{Object.entries(canvasList).map(([key, canvas]) => (
				<PlayerScreenCanvas key={key} id={key} canvas={canvas} needsInteractivity={needsInteractivity} hideInfos />
			))}
		</div>
	) : (
		<div className="w-full h-full flex flex-col items-center justify-center p-2">
			<div
				ref={containerRef}
				id="canvascontainer"
				className="w-full h-full grid gap-4 place-items-center p-2"
				style={{
					gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
					gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
				}}
			>
				{sortedKeys.map((key) => (
					<div key={key} style={{ width: tileWidth, height: tileHeight }} className="flex items-center justify-center aspect-video w-full h-full">
						<PlayerScreenCanvas id={key} canvas={canvasList[key]} needsInteractivity={true} hideInfos={hideInfos} />
					</div>
				))}
				{streamCount === 0 && (
					<div style={{ width: tileWidth, height: tileHeight }} className="flex items-center justify-center aspect-video w-full h-full">
						<PlayerScreenCanvas
							id="unity_pc"
							streamUrl="http://localhost:8085/live.mjpg"
							needsInteractivity={needsInteractivity}
							hideInfos={hideInfos}
						/>
					</div>
				)}
			</div>
		</div>
	);
};

export default VideoStreamManager;
