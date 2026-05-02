import { describe, expect, it } from "vitest";
import {
	createProjectData,
	createProjectSnapshot,
	hasProjectUnsavedChanges,
	normalizeProjectEditor,
	PROJECT_VERSION,
	resolveProjectMedia,
	validateProjectData,
} from "./projectPersistence";

describe("projectPersistence media compatibility", () => {
	it("accepts legacy projects with a single videoPath", () => {
		const project = {
			version: 1,
			videoPath: "/tmp/screen.webm",
			editor: {},
		};

		expect(validateProjectData(project)).toBe(true);
		expect(resolveProjectMedia(project)).toEqual({
			screenVideoPath: "/tmp/screen.webm",
		});
	});

	it("creates version 2 projects with explicit media", () => {
		const project = createProjectData(
			{
				screenVideoPath: "/tmp/screen.webm",
				webcamVideoPath: "/tmp/webcam.webm",
			},
			{
				wallpaper: "/wallpapers/wallpaper1.jpg",
				shadowIntensity: 0,
				showBlur: false,
				motionBlurAmount: 0,
				borderRadius: 0,
				padding: 50,
				cropRegion: { x: 0, y: 0, width: 1, height: 1 },
				zoomRegions: [],
				trimRegions: [],
				speedRegions: [],
				annotationRegions: [],
				aspectRatio: "16:9",
				webcamLayoutPreset: "picture-in-picture",
				webcamMaskShape: "circle",
				webcamPosition: null,
				exportQuality: "good",
				exportFormat: "mp4",
				gifFrameRate: 15,
				gifLoop: true,
				gifSizePreset: "medium",
			},
		);

		expect(project.version).toBe(PROJECT_VERSION);
		expect(project.media).toEqual({
			screenVideoPath: "/tmp/screen.webm",
			webcamVideoPath: "/tmp/webcam.webm",
		});
		expect(validateProjectData(project)).toBe(true);
	});

	it("normalizes webcam mask shape values safely", () => {
		expect(normalizeProjectEditor({ webcamMaskShape: "rounded" }).webcamMaskShape).toBe("rounded");
		expect(
			normalizeProjectEditor({ webcamMaskShape: "not-a-real-shape" as never }).webcamMaskShape,
		).toBe("rectangle");
	});

	it("normalizes blur region type and mosaic block size safely", () => {
		const editor = normalizeProjectEditor({
			annotationRegions: [
				{
					id: "annotation-1",
					startMs: 0,
					endMs: 500,
					type: "blur",
					content: "",
					position: { x: 10, y: 10 },
					size: { width: 20, height: 20 },
					style: {
						color: "#fff",
						backgroundColor: "transparent",
						fontSize: 32,
						fontFamily: "Inter",
						fontWeight: "bold",
						fontStyle: "normal",
						textDecoration: "none",
						textAlign: "center",
					},
					zIndex: 1,
					blurData: {
						type: "mosaic",
						shape: "rectangle",
						color: "black",
						intensity: 999,
						blockSize: 999,
					},
				},
				{
					id: "annotation-2",
					startMs: 0,
					endMs: 500,
					type: "blur",
					content: "",
					position: { x: 10, y: 10 },
					size: { width: 20, height: 20 },
					style: {
						color: "#fff",
						backgroundColor: "transparent",
						fontSize: 32,
						fontFamily: "Inter",
						fontWeight: "bold",
						fontStyle: "normal",
						textDecoration: "none",
						textAlign: "center",
					},
					zIndex: 2,
					blurData: {
						type: "invalid" as never,
						shape: "rectangle",
						color: "invalid" as never,
						intensity: 10,
						blockSize: 0,
					},
				},
			],
		});

		expect(editor.annotationRegions[0].blurData?.type).toBe("mosaic");
		expect(editor.annotationRegions[0].blurData?.color).toBe("black");
		expect(editor.annotationRegions[0].blurData?.intensity).toBe(40);
		expect(editor.annotationRegions[0].blurData?.blockSize).toBe(48);
		expect(editor.annotationRegions[1].blurData?.type).toBe("blur");
		expect(editor.annotationRegions[1].blurData?.color).toBe("white");
		expect(editor.annotationRegions[1].blurData?.blockSize).toBe(4);
	});

	it("normalizes figure region kind and fill safely", () => {
		const baseRegion = {
			startMs: 0,
			endMs: 500,
			type: "figure" as const,
			content: "",
			position: { x: 10, y: 10 },
			size: { width: 20, height: 20 },
			style: {
				color: "#fff",
				backgroundColor: "transparent",
				fontSize: 32,
				fontFamily: "Inter",
				fontWeight: "bold" as const,
				fontStyle: "normal" as const,
				textDecoration: "none" as const,
				textAlign: "center" as const,
			},
		};

		const editor = normalizeProjectEditor({
			annotationRegions: [
				// Legacy arrow with no kind field — must default to "arrow".
				{
					...baseRegion,
					id: "annotation-1",
					zIndex: 1,
					figureData: {
						arrowDirection: "right",
						color: "#34B27B",
						strokeWidth: 4,
					},
				},
				// Tampered kind — must fall back to "arrow", not propagate.
				{
					...baseRegion,
					id: "annotation-2",
					zIndex: 2,
					figureData: {
						kind: "garbage" as never,
						arrowDirection: "right",
						color: "#34B27B",
						strokeWidth: 4,
					},
				},
				// Valid rectangle with valid 8-digit fill — preserved verbatim.
				{
					...baseRegion,
					id: "annotation-3",
					zIndex: 3,
					figureData: {
						kind: "rectangle" as const,
						arrowDirection: "right" as const,
						color: "#34B27B",
						strokeWidth: 4,
						fill: "#34b27b33",
					},
				},
				// Valid ellipse with malformed fill — fill must drop to undefined,
				// other fields preserved.
				{
					...baseRegion,
					id: "annotation-4",
					zIndex: 4,
					figureData: {
						kind: "ellipse" as const,
						arrowDirection: "right" as const,
						color: "#34B27B",
						strokeWidth: 4,
						fill: "not-a-hex" as never,
					},
				},
				// Non-string fill — must drop to undefined without throwing.
				{
					...baseRegion,
					id: "annotation-5",
					zIndex: 5,
					figureData: {
						kind: "rectangle" as const,
						arrowDirection: "right" as const,
						color: "#34B27B",
						strokeWidth: 4,
						fill: 0xff0000 as never,
					},
				},
			],
		});

		expect(editor.annotationRegions[0].figureData?.kind).toBe("arrow");
		expect(editor.annotationRegions[0].figureData?.fill).toBeUndefined();

		expect(editor.annotationRegions[1].figureData?.kind).toBe("arrow");

		expect(editor.annotationRegions[2].figureData?.kind).toBe("rectangle");
		expect(editor.annotationRegions[2].figureData?.fill).toBe("#34b27b33");

		expect(editor.annotationRegions[3].figureData?.kind).toBe("ellipse");
		expect(editor.annotationRegions[3].figureData?.fill).toBeUndefined();
		expect(editor.annotationRegions[3].figureData?.color).toBe("#34B27B");
		expect(editor.annotationRegions[3].figureData?.strokeWidth).toBe(4);

		expect(editor.annotationRegions[4].figureData?.fill).toBeUndefined();
	});

	it("accepts the dual frame webcam layout preset", () => {
		expect(normalizeProjectEditor({ webcamLayoutPreset: "dual-frame" }).webcamLayoutPreset).toBe(
			"dual-frame",
		);
	});

	it("falls back from dual frame to picture in picture for portrait aspect ratios", () => {
		expect(
			normalizeProjectEditor({
				aspectRatio: "9:16",
				webcamLayoutPreset: "dual-frame",
			}).webcamLayoutPreset,
		).toBe("picture-in-picture");
	});

	it("clears webcamPosition when the normalized preset is not picture in picture", () => {
		expect(
			normalizeProjectEditor({
				webcamLayoutPreset: "dual-frame",
				webcamPosition: { cx: 0.2, cy: 0.8 },
			}).webcamPosition,
		).toBeNull();
	});
});

it("creates stable snapshots for identical project state", () => {
	const media = {
		screenVideoPath: "/tmp/screen.webm",
		webcamVideoPath: "/tmp/webcam.webm",
	};
	const editor = normalizeProjectEditor({
		wallpaper: "/wallpapers/wallpaper1.jpg",
		shadowIntensity: 0,
		showBlur: false,
		motionBlurAmount: 0,
		borderRadius: 0,
		padding: 50,
		cropRegion: { x: 0, y: 0, width: 1, height: 1 },
		zoomRegions: [],
		trimRegions: [],
		speedRegions: [],
		annotationRegions: [],
		aspectRatio: "16:9",
		webcamLayoutPreset: "picture-in-picture",
		webcamMaskShape: "circle",
		exportQuality: "good",
		exportFormat: "mp4",
		gifFrameRate: 15,
		gifLoop: true,
		gifSizePreset: "medium",
	});

	expect(createProjectSnapshot(media, editor)).toBe(createProjectSnapshot(media, editor));
});

it("detects unsaved changes from differing snapshots", () => {
	expect(hasProjectUnsavedChanges(null, null)).toBe(false);
	expect(hasProjectUnsavedChanges("same", "same")).toBe(false);
	expect(hasProjectUnsavedChanges("current", "baseline")).toBe(true);
});

describe("wallpaper legacy normalization", () => {
	it("rewrites pre-fix packaged paths (resources/assets/wallpapers/…)", () => {
		const normalized = normalizeProjectEditor({
			wallpaper: "file:///opt/Openscreen/resources/assets/wallpapers/wallpaper5.jpg",
		});
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper5.jpg");
	});

	it("rewrites new packaged layout (resources/wallpapers/…)", () => {
		const normalized = normalizeProjectEditor({
			wallpaper: "file:///opt/Openscreen/resources/wallpapers/wallpaper3.jpg",
		});
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper3.jpg");
	});

	it("rewrites unpackaged dev layout (public/wallpapers/…)", () => {
		const normalized = normalizeProjectEditor({
			wallpaper: "file:///home/user/project/public/wallpapers/wallpaper1.jpg",
		});
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper1.jpg");
	});

	it("rewrites Windows-style file URLs with drive letter", () => {
		const normalized = normalizeProjectEditor({
			wallpaper: "file:///C:/Users/me/openscreen/resources/wallpapers/wallpaper2.jpg",
		});
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper2.jpg");
	});

	it("leaves canonical relative paths untouched", () => {
		const normalized = normalizeProjectEditor({ wallpaper: "/wallpapers/wallpaper2.jpg" });
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper2.jpg");
	});

	it("leaves data URIs untouched", () => {
		const dataUri = "data:image/png;base64,AAA";
		expect(normalizeProjectEditor({ wallpaper: dataUri }).wallpaper).toBe(dataUri);
	});

	it("leaves colors and gradients untouched", () => {
		expect(normalizeProjectEditor({ wallpaper: "#1a1a2e" }).wallpaper).toBe("#1a1a2e");
		expect(
			normalizeProjectEditor({ wallpaper: "linear-gradient(90deg, red, blue)" }).wallpaper,
		).toBe("linear-gradient(90deg, red, blue)");
	});

	it("does NOT rewrite user files outside the known install layout", () => {
		const userPath = "file:///home/user/Pictures/wallpapers/wallpaper1.jpg";
		expect(normalizeProjectEditor({ wallpaper: userPath }).wallpaper).toBe(userPath);
	});

	it("falls back to default for bundled paths outside WALLPAPER_PATHS", () => {
		const normalized = normalizeProjectEditor({
			wallpaper: "file:///opt/Openscreen/resources/wallpapers/wallpaper99.jpg",
		});
		expect(normalized.wallpaper).toBe("/wallpapers/wallpaper1.jpg");
	});
});
