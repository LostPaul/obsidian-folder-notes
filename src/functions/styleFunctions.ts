import { TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from '../main';
import { getDetachedFolder, getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getFileExplorer } from './utils';
import FolderOverviewPlugin from 'src/obsidian-folder-overview/src/main';

export function loadFileClasses(forceReload = false, plugin: FolderNotesPlugin) {
	if (plugin.activeFileExplorer === getFileExplorer(plugin) && !forceReload) { return; }
	plugin.activeFileExplorer = getFileExplorer(plugin);
	plugin.app.vault.getAllLoadedFiles().forEach(async (file) => {
		if (!(file instanceof TFolder)) { return; }
		const folderNote = getFolderNote(plugin, file.path);
		if (!folderNote) {
			removeCSSClassFromEL(file?.path, 'has-folder-note', plugin);
			removeCSSClassFromEL(file?.path, 'only-has-folder-note', plugin);
			plugin.isEmptyFolderNoteFolder(file);
			return;
		}

		const excludedFolder = getExcludedFolder(plugin, file.path, true);
		// cleanup after ourselves
		// Incase settings have changed
		if (excludedFolder?.disableFolderNote) {
			removeCSSClassFromEL(folderNote.path, 'is-folder-note', plugin);
			removeCSSClassFromEL(file.path, 'has-folder-note', plugin);
			removeCSSClassFromEL(file?.path, 'only-has-folder-note', plugin);
		} else {
			if (!excludedFolder?.hideNote) {
				addCSSClassToTitleEL(folderNote.path, 'is-folder-note', plugin);
			}
			addCSSClassesToFolder(file, plugin);
		}
	});
}


export async function applyCSSClassesToFolder(folderPath: string, plugin: FolderNotesPlugin) {
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) { return; }

	const folderNote = getFolderNote(plugin, folder.path);
	const detachedFolderNote = getDetachedFolder(plugin, folder.path);

	if (!folderNote || detachedFolderNote) {
		removeCSSClassFromEL(folder?.path, 'has-folder-note', plugin);
		removeCSSClassFromEL(folder?.path, 'only-has-folder-note', plugin);
		return;
	}

	const excludedFolder = getExcludedFolder(plugin, folder.path, true);

	if (excludedFolder?.disableFolderNote) {
		removeCSSClassFromEL(folderNote.path, 'is-folder-note', plugin);
		removeCSSClassFromEL(folder.path, 'has-folder-note', plugin);
		removeCSSClassFromEL(folder?.path, 'only-has-folder-note', plugin);
	} else {
		if (!excludedFolder?.hideNote) {
			addCSSClassToFolderNote(folderNote, plugin);
		}
		addCSSClassesToFolder(folder, plugin);
		if (plugin.isEmptyFolderNoteFolder(folder)) {
			addCSSClassToTitleEL(folder.path, 'only-has-folder-note', plugin);
		} else {
			removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
		}
	}

	addCSSClassesToBothFolderAndNote(folderNote, folder, plugin);
}

export async function applyCSSClassesToFolderNote(filePath: string, plugin: FolderNotesPlugin) {
	const file = plugin.app.vault.getAbstractFileByPath(filePath);
	if (!file || !(file instanceof TFile)) { return; }

	const folder = getFolder(plugin, file);
	if (!folder || !(folder instanceof TFolder)) { return; }

	applyCSSClassesToFolder(folder.path, plugin);

}

export function addCSSClassesToBothFolderAndNote(file: TFile, folder: TFolder, plugin: FolderNotesPlugin) {
	addCSSClassToFolderNote(file, plugin);
	addCSSClassesToFolder(folder, plugin);
}

export function removeCSSClassesFromBothFolderAndNote(folder: TFolder, file: TFile, plugin: FolderNotesPlugin) {
	removeCSSClassFromFolderNote(file, plugin);
	removeCSSClassesFromFolder(folder, plugin);
}

export function addCSSClassesToFolder(folder: TFolder, plugin: FolderNotesPlugin) {
	addCSSClassToTitleEL(folder.path, 'has-folder-note', plugin);
	if (plugin.isEmptyFolderNoteFolder(folder)) {
		addCSSClassToTitleEL(folder.path, 'only-has-folder-note', plugin);
	} else {
		removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
	}
}

export function addCSSClassToFolderNote(file: TFile, plugin: FolderNotesPlugin) {
	addCSSClassToTitleEL(file.path, 'is-folder-note', plugin);
}

export function removeCSSClassFromFolderNote(file: TFile, plugin: FolderNotesPlugin) {
	removeCSSClassFromEL(file.path, 'is-folder-note', plugin);
}

export function removeCSSClassesFromFolder(folder: TFolder, plugin: FolderNotesPlugin) {
	removeCSSClassFromEL(folder.path, 'has-folder-note', plugin);
	removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
}

export async function addCSSClassToTitleEL(path: string, cssClass: string, plugin: FolderNotesPlugin, waitForCreate = false, count = 0) {
	const fileExplorerItem = getEl(path, plugin);
	if (!fileExplorerItem) {
		if (waitForCreate && count < 5) {
			// sleep for a second for the file-explorer event to catch up
			// this is annoying as in most scanarios our plugin recieves the event before file explorer
			// If we could guarrantee load order it wouldn't be an issue but we can't
			// realise this is racey and needs to be fixed.
			await new Promise((r) => setTimeout(r, 500));
			addCSSClassToTitleEL(path, cssClass, plugin, waitForCreate, count + 1);
			return;
		}
		return;
	}
	fileExplorerItem.addClass(cssClass);
	const viewHeaderItems = document.querySelectorAll(`[data-path='${CSS.escape(path)}']`);
	viewHeaderItems.forEach((item) => {
		item.addClass(cssClass);
	});
}

export function removeCSSClassFromEL(path: string | undefined, cssClass: string, plugin: FolderNotesPlugin) {
	if (!path) return;
	const fileExplorerItem = getEl(path, plugin);
	const viewHeaderItems = document.querySelectorAll(`[data-path='${CSS.escape(path)}']`);
	viewHeaderItems.forEach((item) => {
		item.removeClass(cssClass);
	});
	if (!fileExplorerItem) { return; }
	fileExplorerItem.removeClass(cssClass);
}

export function getEl(path: string, plugin: FolderNotesPlugin | FolderOverviewPlugin): HTMLElement | null {
	const fileExplorer = getFileExplorer(plugin);
	if (!fileExplorer) { return null; }
	if (!fileExplorer.view) { return null; }
	if (!fileExplorer.view.fileItems) { return null; }
	const fileExplorerItem = fileExplorer.view.fileItems?.[path];
	if (!fileExplorerItem) { return null; }
	if (fileExplorerItem.selfEl) return fileExplorerItem.selfEl;
	return fileExplorerItem.titleEl;
}
