import type { WorkspaceLeaf, App, TFile } from 'obsidian';

interface ExcalidrawPlugin {
	setExcalidrawView(leaf: WorkspaceLeaf): void;
	openDrawing(file: TFile): void;
	getBlankDrawing(): Promise<string>;
}

export async function openExcalidrawView(
	app: App,
	file: TFile,
): Promise<void> {
	const { excalidraw, excalidrawEnabled } = await getExcalidrawPlugin(app);
	if (excalidrawEnabled && excalidraw) {
		excalidraw.openDrawing(file);
	}
}

export async function getDefaultTemplate(app: App): Promise<string> {
	const { excalidraw, excalidrawEnabled } = await getExcalidrawPlugin(app);
	if (excalidrawEnabled && excalidraw) {
		return excalidraw.getBlankDrawing();
	}
	return '';
}

export async function getExcalidrawPlugin(
	app: App,
): Promise<{ excalidraw: ExcalidrawPlugin | null; excalidrawEnabled: boolean }> {
	const { plugins: pluginManager } = app as App & {
		plugins: {
			plugins: Record<string, unknown>;
			enabledPlugins: Set<string>;
		};
	};
	const excalidraw = (
		pluginManager.plugins[
			'obsidian-excalidraw-plugin'
		] as unknown as ExcalidrawPlugin | undefined
	);
	const excalidrawEnabled = pluginManager.enabledPlugins.has('obsidian-excalidraw-plugin');
	return {
		excalidraw: excalidraw ?? null,
		excalidrawEnabled,
	};
}
