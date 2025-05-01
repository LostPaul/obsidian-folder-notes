import { TAbstractFile, TFolder, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getFolderNote, getFolder, deleteFolderNote } from 'src/functions/folderNoteFunctions';
import { removeCSSClassFromEL, addCSSClassToTitleEL } from 'src/functions/styleFunctions';
import { getFolderPathFromString } from 'src/functions/utils';

export function handleDelete(file: TAbstractFile, plugin: FolderNotesPlugin) {
	const folder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(file.path));
	if (folder instanceof TFolder) {
		if (plugin.isEmptyFolderNoteFolder(folder)) {
			addCSSClassToTitleEL(folder.path, 'only-has-folder-note', plugin);
		} else {
			removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
		}
	}

	if (file instanceof TFile) {
		const folder = getFolder(plugin, file);
		if (!folder) { return; }
		const folderNote = getFolderNote(plugin, folder.path);
		if (folderNote) { return; }
		removeCSSClassFromEL(folder.path, 'has-folder-note', plugin);
		removeCSSClassFromEL(folder.path, 'only-has-folder-note', plugin);
	}

	if (!(file instanceof TFolder)) { return; }
	const folderNote = getFolderNote(plugin, file.path);
	if (!folderNote) { return; }
	removeCSSClassFromEL(folderNote.path, 'is-folder-note', plugin);
	if (!plugin.settings.syncDelete) { return; }
	deleteFolderNote(plugin, folderNote, false);
}
