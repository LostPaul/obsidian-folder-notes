import type { App, Plugin, TFile } from 'obsidian';

import type FolderNotesPlugin from 'src/main';

const ICONIZE_PLUGIN_ID = 'obsidian-icon-folder';

interface PluginManager {
	getPlugin(id: string): unknown;
}

type AppWithPluginManager = App & {
	plugins?: PluginManager;
};

interface IconizePlugin extends Plugin {
	getIconNameFromPath(path: string): string | null | undefined;
	getIconColor?(path: string): string | undefined;
	addFolderIcon(path: string, icon: string): void;
    removeFolderIcon(path: string): void;
	addIconColor?(path: string, iconColor: string): void;
	removeIconColor?(path: string): void;
    api?: {
		removeIconInPath?(path: string): void;
	};
}

let refreshTimeout: number | null = null;

function getIconizePlugin(plugin: FolderNotesPlugin): IconizePlugin | null {
	const app = plugin.app as AppWithPluginManager;
	const iconize = app.plugins?.getPlugin(ICONIZE_PLUGIN_ID);
	if (!iconize || typeof iconize !== 'object') return null;

	const candidate = iconize as Partial<IconizePlugin>;
	if (
		typeof candidate.getIconNameFromPath !== 'function'
		|| typeof candidate.addFolderIcon !== 'function'
		|| typeof candidate.removeFolderIcon !== 'function'
	) {
		return null;
	}

	return iconize as IconizePlugin;
}

function scheduleIconizeRefresh(plugin: FolderNotesPlugin): void {
	if (refreshTimeout !== null) return;

	refreshTimeout = window.setTimeout(() => {
		refreshTimeout = null;
		plugin.app.workspace.trigger('layout-change');
	}, 0);
}

/**
 * Mirrors a folder's directly assigned Iconize icon to its Folder Note.
 */
export function syncFolderNoteIconFromIconize(
	plugin: FolderNotesPlugin,
	folderPath: string,
	folderNote: TFile | null | undefined,
): void {
	if (!folderNote) return;

	const iconize = getIconizePlugin(plugin);
	if (!iconize) return;

	const folderIcon = iconize.getIconNameFromPath(folderPath);
    const noteIcon = iconize.getIconNameFromPath(folderNote.path);

    if (!folderIcon) {
        if (noteIcon) {
            iconize.removeFolderIcon(folderNote.path);
            iconize.api?.removeIconInPath?.(folderNote.path);
            scheduleIconizeRefresh(plugin);
        }

        return;
    }
    
	const folderColor = iconize.getIconColor?.(folderPath);
	const noteColor = iconize.getIconColor?.(folderNote.path);
	let changed = false;

	if (noteIcon !== folderIcon) {
		iconize.addFolderIcon(folderNote.path, folderIcon);
		changed = true;
	}

	if (folderColor !== undefined) {
		if (noteColor !== folderColor && iconize.addIconColor) {
			iconize.addIconColor(folderNote.path, folderColor);
			changed = true;
		}
	} else if (noteColor !== undefined && iconize.removeIconColor) {
		iconize.removeIconColor(folderNote.path);
		changed = true;
	}

	if (changed) {
		scheduleIconizeRefresh(plugin);
	}
}

/**
 * Removes the icon that was mirrored onto a Folder Note once the file
 * stops being that folder's Folder Note.
 */
export function clearFolderNoteIconFromIconize(
	plugin: FolderNotesPlugin,
	folderNote: TFile | null | undefined,
): void {
	if (!folderNote) return;

	const iconize = getIconizePlugin(plugin);
	if (!iconize) return;

	const noteIcon = iconize.getIconNameFromPath(folderNote.path);
	const noteColor = iconize.getIconColor?.(folderNote.path);

	let changed = false;

	if (noteIcon) {
		iconize.removeFolderIcon(folderNote.path);
		iconize.api?.removeIconInPath?.(folderNote.path);
		changed = true;
	}

	if (noteColor !== undefined && iconize.removeIconColor) {
		iconize.removeIconColor(folderNote.path);
		changed = true;
	}

	if (changed) {
		scheduleIconizeRefresh(plugin);
	}
}