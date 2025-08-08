import { TFolder, TFile, type TAbstractFile } from 'obsidian';
import type FolderNotesPlugin from 'src/main';
import { getFolderNote, getFolder, deleteFolderNote } from 'src/functions/folderNoteFunctions';
import {
	removeCSSClassFromFileExplorerEL,
	addCSSClassToFileExplorerEl,
	hideFolderNoteInFileExplorer,
} from 'src/functions/styleFunctions';
import { getFolderPathFromString } from 'src/functions/utils';

export function handleDelete(file: TAbstractFile, plugin: FolderNotesPlugin): void {
	const folder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(file.path));
	if (folder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(folder) && getFolderNote(plugin, folder.path)) {
			addCSSClassToFileExplorerEl(folder.path, 'only-has-folder-note', true, plugin);
		} else {
			removeCSSClassFromFileExplorerEL(folder.path, 'only-has-folder-note', true, plugin);
		}
	}

	if (file instanceof TFile) {
		const folderNoteFolder = getFolder(plugin, file);
		if (!folderNoteFolder) { return; }
		const folderNote = getFolderNote(plugin, folderNoteFolder.path);
		if (folderNote) { return; }
		removeCSSClassFromFileExplorerEL(folderNoteFolder.path, 'has-folder-note', false, plugin);
		removeCSSClassFromFileExplorerEL(
			folderNoteFolder.path, 'only-has-folder-note', true, plugin,
		);
		hideFolderNoteInFileExplorer(folderNoteFolder.path, plugin);
	}

	if (!(file instanceof TFolder)) { return; }
	const folderNote = getFolderNote(plugin, file.path);
	if (!folderNote) { return; }
	removeCSSClassFromFileExplorerEL(folderNote.path, 'is-folder-note', false, plugin);
	if (!plugin.settings.syncDelete) { return; }
	deleteFolderNote(plugin, folderNote, false);
}
