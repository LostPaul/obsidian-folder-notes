import { TFile, TFolder } from 'obsidian';
import type FolderNotesPlugin from '../main';
import {
	getDetachedFolder,
	getExcludedFolder,
	addExcludedFolder,
} from 'src/ExcludeFolders/functions/folderFunctions';
import { getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getFileExplorer } from './utils';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import type FolderOverviewPlugin from 'src/obsidian-folder-overview/src/main';

/**
 * @description Refreshes the CSS classes for all folder notes in the file explorer.
 */
export function refreshAllFolderStyles(forceReload = false, plugin: FolderNotesPlugin): void {
	if (plugin.activeFileExplorer === getFileExplorer(plugin) && !forceReload) { return; }
	plugin.activeFileExplorer = getFileExplorer(plugin);
	plugin.app.vault.getAllLoadedFiles().forEach(async (file) => {
		if (file instanceof TFolder) {
			await updateCSSClassesForFolder(file.path, plugin);
		}
	});
}

/**
 * @description Updates the CSS classes for a specific folder in the file explorer.
 */
export async function updateCSSClassesForFolder(
	folderPath: string,
	plugin: FolderNotesPlugin,
): Promise<void> {
	const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
	if (!folder || !(folder instanceof TFolder)) { return; }

	const folderNote = getFolderNote(plugin, folder.path);
	const detachedFolderNote = getDetachedFolder(plugin, folder.path);

	if (folder.children.length === 0) {
		addCSSClassToFileExplorerEl(folder.path, 'fn-empty-folder', false, plugin);
	}

	if (!folderNote || detachedFolderNote) {
		removeCSSClassFromFileExplorerEL(folder?.path, 'has-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(folder?.path, 'only-has-folder-note', true, plugin);
		return;
	}

	const excludedFolder = getExcludedFolder(plugin, folder.path, true);
	if (excludedFolder?.disableFolderNote) {
		removeCSSClassFromFileExplorerEL(folderNote.path, 'is-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(folder.path, 'has-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(folder?.path, 'only-has-folder-note', true, plugin);
	} else {
		markFolderWithFolderNoteClasses(folder, plugin);
		if (excludedFolder?.showFolderNote) {
			addCSSClassToFileExplorerEl(folder.path, 'show-folder-note-in-explorer', true, plugin);
			unmarkFileAsFolderNote(folderNote, plugin);
			return;
		}
		if (plugin.isEmptyFolderNoteFolder(folder) && getFolderNote(plugin, folder.path)) {
			addCSSClassToFileExplorerEl(folder.path, 'only-has-folder-note', true, plugin);
		} else {
			removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
		}
	}

	markFolderAndNoteWithClasses(folderNote, folder, plugin);
}

/**
 * @description Updates the CSS classes for a folder note file in the file explorer and then also updates the folder it belongs to.
 */
export async function updateCSSClassesForFolderNote(
	filePath: string,
	plugin: FolderNotesPlugin,
): Promise<void> {
	const file = plugin.app.vault.getAbstractFileByPath(filePath);
	if (!file || !(file instanceof TFile)) { return; }

	const folder = getFolder(plugin, file);
	if (!folder || !(folder instanceof TFolder)) { return; }

	updateCSSClassesForFolder(folder.path, plugin);
}

export function markFolderAndNoteWithClasses(
	file: TFile,
	folder: TFolder,
	plugin: FolderNotesPlugin,
): void {
	markFileAsFolderNote(file, plugin);
	markFolderWithFolderNoteClasses(folder, plugin);
}

export function clearFolderAndNoteClasses(
	folder: TFolder,
	file: TFile,
	plugin: FolderNotesPlugin,
): void {
	unmarkFileAsFolderNote(file, plugin);
	clearFolderNoteClassesFromFolder(folder, plugin);
}

export function markFolderWithFolderNoteClasses(folder: TFolder, plugin: FolderNotesPlugin): void {
	addCSSClassToFileExplorerEl(folder.path, 'has-folder-note', false, plugin);
	if (plugin.isEmptyFolderNoteFolder(folder) && getFolderNote(plugin, folder.path)) {
		addCSSClassToFileExplorerEl(folder.path, 'only-has-folder-note', true, plugin);
	} else {
		removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
	}
}

export function markFileAsFolderNote(file: TFile, plugin: FolderNotesPlugin): void {
	addCSSClassToFileExplorerEl(file.path, 'is-folder-note', false, plugin);
}

export function unmarkFileAsFolderNote(file: TFile, plugin: FolderNotesPlugin): void {
	removeCSSClassFromFileExplorerEL(file.path, 'is-folder-note', false, plugin);
}

export function unmarkFolderAsFolderNote(folder: TFolder, plugin: FolderNotesPlugin): void {
	removeCSSClassFromFileExplorerEL(folder.path, 'has-folder-note', false, plugin);
	removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
}

export function clearFolderNoteClassesFromFolder(folder: TFolder, plugin: FolderNotesPlugin): void {
	removeCSSClassFromFileExplorerEL(folder.path, 'has-folder-note', false, plugin);
	removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
}

/**
 * @param path Can be a folder or file path
 * @returns nothing
 */
export async function addCSSClassToFileExplorerEl(
	path: string,
	cssClass: string,
	parent = false,
	plugin: FolderNotesPlugin,
	waitForCreate = false,
	count = 0,
): Promise<void> {
	const fileExplorerItem = getFileExplorerElement(path, plugin);
	const MAX_RETRIES = 5;
	const RETRY_DELAY = 500;

	if (!fileExplorerItem) {
		if (waitForCreate && count < MAX_RETRIES) {
			await new Promise((r) => setTimeout(r, RETRY_DELAY));
			addCSSClassToFileExplorerEl(path, cssClass, parent, plugin, waitForCreate, count + 1);
			return;
		}
		return;
	}
	if (parent) {
		const parentElement = fileExplorerItem?.parentElement;
		if (parentElement) {
			parentElement.addClass(cssClass);
		}
	} else {
		fileExplorerItem.addClass(cssClass);
		document.querySelectorAll(`[data-path='${CSS.escape(path)}']`).forEach((item) => {
			item.addClass(cssClass);
		});
	}
}

/**
 * @param path Can be a folder or file path
 * @param cssClass The CSS class to remove from the file explorer element
 * @returns nothing
 */
export function removeCSSClassFromFileExplorerEL(
	path: string | undefined,
	cssClass: string,
	parent: boolean,
	plugin: FolderNotesPlugin,
): void {
	if (!path) return;
	const fileExplorerItem = getFileExplorerElement(path, plugin);
	document.querySelectorAll(`[data-path='${CSS.escape(path)}']`).forEach((item) => {
		item.removeClass(cssClass);
	});
	if (!fileExplorerItem) { return; }
	if (parent) {
		const parentElement = fileExplorerItem?.parentElement;
		if (parentElement) {
			parentElement.removeClass(cssClass);
		}
		return;
	}
	fileExplorerItem.removeClass(cssClass);

}

export function getFileExplorerElement(
	path: string,
	plugin: FolderNotesPlugin | FolderOverviewPlugin,
): HTMLElement | null {
	const fileExplorer = getFileExplorer(plugin);
	if (!fileExplorer?.view?.fileItems) { return null; }
	const fileExplorerItem = fileExplorer.view.fileItems?.[path];
	return fileExplorerItem?.selfEl ?? fileExplorerItem?.titleEl ?? null;
}

export function showFolderNoteInFileExplorer(path: string, plugin: FolderNotesPlugin): void {
	const excludedFolder = new ExcludedFolder(
		path,
		plugin.settings.excludeFolders.length,
		undefined,
		plugin,
	);
	excludedFolder.subFolders = false;
	excludedFolder.disableSync = false;
	excludedFolder.disableAutoCreate = false;
	excludedFolder.disableFolderNote = false;
	excludedFolder.enableCollapsing = false;
	excludedFolder.excludeFromFolderOverview = false;
	excludedFolder.hideInSettings = true;
	excludedFolder.showFolderNote = true;
	addExcludedFolder(plugin, excludedFolder, false);
	addCSSClassToFileExplorerEl(path, 'show-folder-note-in-explorer', true, plugin);
	updateCSSClassesForFolder(path, plugin);
}

export function hideFolderNoteInFileExplorer(folderPath: string, plugin: FolderNotesPlugin): void {
	plugin.settings.excludeFolders = plugin.settings.excludeFolders.filter(
		(folder) => (folder.path !== folderPath) || !folder.showFolderNote);
	plugin.saveSettings(false);
	removeCSSClassFromFileExplorerEL(folderPath, 'show-folder-note-in-explorer', true, plugin);
	updateCSSClassesForFolder(folderPath, plugin);
}

export function setActiveFolder(folderPath: string, plugin: FolderNotesPlugin): void {
	const fileExplorerItem = getFileExplorerElement(folderPath, plugin);
	if (fileExplorerItem) {
		fileExplorerItem.addClass('fn-is-active');
		plugin.activeFolderDom = fileExplorerItem;
	}
}

export function removeActiveFolder(plugin: FolderNotesPlugin): void {
	if (plugin.activeFolderDom) {
		plugin.activeFolderDom.removeClass('fn-is-active');
		plugin.activeFolderDom?.removeClass('has-focus');
		plugin.activeFolderDom = null;
	}
}
