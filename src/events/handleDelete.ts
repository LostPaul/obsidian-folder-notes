import { TAbstractFile, TFolder, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getFolderNote, getFolder } from 'src/functions/folderNoteFunctions';

export function handleDelete(file: TAbstractFile, plugin: FolderNotesPlugin) {
    const folder = this.app.vault.getAbstractFileByPath(this.getFolderPathFromString(file.path));
    if (folder instanceof TFolder) {
        if (this.isEmptyFolderNoteFolder(folder)) {
            this.addCSSClassToTitleEL(folder.path, 'only-has-folder-note');
        } else if (folder.children.length == 0 || folder.children.length > 1) {
            this.removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

    if (file instanceof TFile) {
        const folder = getFolder(this, file);
        if (!folder) { return; }
        this.removeCSSClassFromEL(folder.path, 'has-folder-note');
        this.removeCSSClassFromEL(folder.path, 'only-has-folder-note');
    }

    if (!(file instanceof TFolder)) { return; }
    const folderNote = getFolderNote(this, file.path);
    if (!folderNote) { return; }
    this.removeCSSClassFromEL(folderNote.path, 'is-folder-note');
    if (!this.settings.syncDelete) { return; }
    this.app.vault.delete(folderNote);
}