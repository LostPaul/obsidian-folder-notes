import type { WorkspaceLeaf, App } from 'obsidian';

interface ExcalidrawPlugin {
	setExcalidrawView(leaf: WorkspaceLeaf): void;
}

export async function openExcalidrawView(
	app: App,
	leaf: WorkspaceLeaf,
): Promise<void> {
	const { excalidraw, excalidrawEnabled } = await getExcalidrawPlugin(app);
	if (excalidrawEnabled && excalidraw) {
		excalidraw.setExcalidrawView(leaf);
	}
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
