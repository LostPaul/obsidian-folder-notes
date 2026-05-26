import { TFile } from 'obsidian';
import type FolderNotesPlugin from './main';
import { getFolderNote } from './functions/folderNoteFunctions';
import { getDetachedFolder, getExcludedFolder } from './ExcludeFolders/functions/folderFunctions';

const API_VERSION = '1.0.0';

/**
 * Public API exposed by the folder-notes plugin on its instance as `plugin.api`.
 *
 * External plugins can access it via:
 *   app.plugins.plugins['folder-notes']?.api
 *
 * The API is available after folder-notes has finished onload (settings loaded).
 * It is safe to call synchronously from any point after layout-ready.
 */
export interface FolderNotesApi {
	/** Semver-ish version string for feature detection. */
	version: string;

	/**
	 * Returns the folder note TFile for the given folder path only if the
	 * folder's note is enabled — i.e., the folder is not detached and not
	 * excluded with `disableFolderNote`. Matches the plugin's own UI
	 * gating (the rules that decide whether `.has-folder-note` gets
	 * applied in the file explorer).
	 *
	 * Returns null if:
	 *   - the folder does not exist or has no folder note
	 *   - the folder is detached
	 *   - the folder is excluded with disableFolderNote
	 */
	getEnabledFolderNote(folderPath: string): TFile | null;
}

export function getApi(plugin: FolderNotesPlugin): FolderNotesApi {
	return {
		version: getVersion(),
		getEnabledFolderNote: (folderPath) => getEnabledFolderNote(plugin, folderPath),
	};
}

function getVersion(): string {
	return API_VERSION;
}

function getEnabledFolderNote(plugin: FolderNotesPlugin, folderPath: string): TFile | null {
	const note = getFolderNote(plugin, folderPath);
	if (!note) return null;
	if (getDetachedFolder(plugin, folderPath)) return null;
	const excluded = getExcludedFolder(plugin, folderPath, true);
	if (excluded?.disableFolderNote) return null;
	return note;
}
