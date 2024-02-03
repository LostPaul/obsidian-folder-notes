import { TAbstractFile, TFolder, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getFolderNote, getFolder } from 'src/functions/folderNoteFunctions';
import { removeCSSClassFromEL, addCSSClassToTitleEL } from 'src/functions/styleFunctions';
import { getFolderPathFromString } from 'src/functions/utils';

export function handleDelete(file: TAbstractFile, plugin: FolderNotesPlugin) {
    const folder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(file.path));
    if (folder instanceof TFolder) {
        if (plugin.isEmptyFolderNoteFolder(folder)) {
            addCSSClassToTitleEL(folder.path, 'only-has-folder-note');
        } else if (folder.children.length == 0 || folder.children.length > 1) {
            removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

    if (file instanceof TFile) {
        const folder = getFolder(plugin, file);
        if (!folder) { return; }
        removeCSSClassFromEL(folder.path, 'has-folder-note');
        removeCSSClassFromEL(folder.path, 'only-has-folder-note');
    }

    if (!(file instanceof TFolder)) { return; }
    const folderNote = getFolderNote(plugin, file.path);
    if (!folderNote) { return; }
    removeCSSClassFromEL(folderNote.path, 'is-folder-note');
    if (!plugin.settings.syncDelete) { return; }
    plugin.app.vault.delete(folderNote);
}