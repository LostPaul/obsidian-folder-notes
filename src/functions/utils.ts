import { TFolder, TFile, View } from 'obsidian';
import type { FileExplorerWorkspaceLeaf, FileExplorerView } from 'src/globals';
import { getFolderNote } from './folderNoteFunctions';
import type FolderNotesPlugin from 'src/main';
import type { FileExplorerLeaf, FileTreeItem, TreeNode } from 'obsidian-typings';
import type FolderOverviewPlugin from 'src/obsidian-folder-overview/src/main';

export function getFileNameFromPathString(path: string): string {
	return path.substring(path.lastIndexOf('/') >= 0 ? path.lastIndexOf('/') + 1 : 0);
}

export function getFolderNameFromPathString(path: string): string {
	const PARENT_FOLDER_INDEX = -2;
	const LAST_FOLDER_INDEX = -1;
	if (path.endsWith('.md') || path.endsWith('.canvas')) {
		return path.split('/').slice(PARENT_FOLDER_INDEX)[0];
	}
	return path.split('/').slice(LAST_FOLDER_INDEX)[0];
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
	}
	return folderPath;

}

export function getParentFolderPath(path: string): string {
	return this.getFolderPathFromString(this.getFolderPathFromString(path));
}

export function getFileExplorer(
	plugin: FolderNotesPlugin | FolderOverviewPlugin,
): FileExplorerWorkspaceLeaf {
	// eslint-disable-next-line max-len
	let leaf = plugin.app.workspace.getLeavesOfType('file-explorer')[0] as unknown as FileExplorerWorkspaceLeaf;

	/* make.md plugin integration */
	if (leaf.containerEl.lastChild.dataset.type == 'mk-path-view') {
		plugin.app.workspace.iterateAllLeaves((x) => {
			if (x.tabHeaderEl.dataset.type == 'file-explorer') {
				leaf = x;
			}
		});
	}

	return leaf;
}

export function getFileExplorerView(plugin: FolderNotesPlugin): FileExplorerView {
	return getFileExplorer(plugin).view;
}

export function getFocusedItem(plugin: FolderNotesPlugin): TreeNode<FileTreeItem> | null {
	const fileExplorer = getFileExplorer(plugin) as unknown as FileExplorerLeaf;
	const { focusedItem } = fileExplorer.view.tree;
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
