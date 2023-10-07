import { WorkspaceLeaf, App } from "obsidian";

export async function openExcalidrawView(leaf: WorkspaceLeaf) {
    const {excalidraw, excalidrawEnabled} = await getExcalidrawPlugin(this.app);
    if (excalidrawEnabled) {
        excalidraw.setExcalidrawView(leaf);
    }
}

export async function getExcalidrawPlugin(app: App) {
    const excalidraw = (app as any).plugins.plugins['obsidian-excalidraw-plugin'];
    const excalidrawEnabled = (app as any).plugins.enabledPlugins.has(
		'obsidian-excalidraw-plugin'
	);
    return {
        excalidraw,
        excalidrawEnabled
    }
}