import { TFolder, TFile, View } from 'obsidian';
import { FileExplorerWorkspaceLeaf, FileExplorerView } from 'src/globals';
import { getFolderNote } from './folderNoteFunctions';
import FolderNotesPlugin from 'src/main';
import { FileExplorerLeaf } from 'obsidian-typings';
import FolderOverviewPlugin from 'src/obsidian-folder-overview/src/main';

export function getFileNameFromPathString(path: string): string {
	return path.substring(path.lastIndexOf('/') >= 0 ? path.lastIndexOf('/') + 1 : 0);
}

export function getFolderNameFromPathString(path: string): string {
	if (path.endsWith('.md') || path.endsWith('.canvas')) {
		return path.split('/').slice(-2)[0];
	} else {
		return path.split('/').slice(-1)[0];
	}
}

export function removeExtension(name: string): string {
	return name.replace(/\.[^/.]+$/, '');
}

export function getExtensionFromPathString(path: string): string {
	return path.slice(path.lastIndexOf('.') >= 0 ? path.lastIndexOf('.') : 0);
}

export function getFolderPathFromString(path: string): string {
	const subString = path.lastIndexOf('/') >= 0 ? path.lastIndexOf('/') : 0;
	const folderPath = path.substring(0, subString);
	if (folderPath === '') {
		return '/';
	} else {
		return folderPath;
	}
}

export function getParentFolderPath(path: string): string {
	return this.getFolderPathFromString(this.getFolderPathFromString(path));
}

export function getFileExplorer(plugin: FolderNotesPlugin | FolderOverviewPlugin) {
	return plugin.app.workspace.getLeavesOfType('file-explorer')[0] as any as FileExplorerWorkspaceLeaf;
}

export function getFileExplorerView(plugin: FolderNotesPlugin) {
	return getFileExplorer(plugin).view;
}

export function getFocusedItem(plugin: FolderNotesPlugin) {
	const fileExplorer = getFileExplorer(plugin) as any as FileExplorerLeaf;
	const focusedItem = fileExplorer.view.tree.focusedItem;
	return focusedItem;
}

export function getFileExplorerActiveFolder(): TFolder | null {
	// Check if the active view is a file explorer.
	const view = this.app.workspace.getActiveViewOfType(View);
	if (view?.getViewType() !== 'file-explorer') return null;
	// Check if there is a focused or active item in the file explorer.
	const fe = view as FileExplorerView;
	const activeFileOrFolder =
		fe.tree.focusedItem?.file ?? fe.activeDom?.file;
	if (!(activeFileOrFolder instanceof TFolder)) return null;
	return activeFileOrFolder as TFolder;
}

export function getFileExplorerActiveFolderNote(): TFile | null {
	const folder = getFileExplorerActiveFolder();
	if (!folder) return null;
	// Is there any folder note for the active folder?
	const folderNote = getFolderNote(this.plugin, folder.path);
	if (!(folderNote instanceof TFile)) return null;
	return folderNote;
}
