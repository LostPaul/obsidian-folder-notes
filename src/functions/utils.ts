import { TFile, TFolder } from 'obsidian';
import { FileExplorerWorkspaceLeaf } from 'src/globals';
import FolderNotesPlugin from 'src/main';
import { FileExplorerLeaf } from 'obsidian-typings';

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

export function getFileExplorer(plugin: FolderNotesPlugin) {
	return plugin.app.workspace.getLeavesOfType('file-explorer')[0] as any as FileExplorerWorkspaceLeaf;
}

export function getFileExplorerView(plugin: FolderNotesPlugin) {
	return getFileExplorer(plugin).view;
}

export function getFocusedItem(plugin: FolderNotesPlugin) {
	const fileExplorer = getFileExplorer(plugin) as any as FileExplorerLeaf;
	const focusedItem = fileExplorer.view.tree.focusedItem
	return focusedItem;
}