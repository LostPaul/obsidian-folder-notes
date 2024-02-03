import { TAbstractFile, TFolder, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { createFolderNote, getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/excludedFolder';
import { removeCSSClassFromEL, addCSSClassToTitleEL } from 'src/functions/styleFunctions';

export function handleCreate(file: TAbstractFile, plugin: FolderNotesPlugin) {
    if (!plugin.app.workspace.layoutReady) return;
    
    const folder = file.parent;
    if (folder instanceof TFolder) {
        if (plugin.isEmptyFolderNoteFolder(folder)) {
            addCSSClassToTitleEL(folder.path, 'only-has-folder-note');
        } else if (folder.children.length == 0 || folder.children.length > 1) {
            removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

    if (file instanceof TFile) {
        const folder = getFolder(plugin, file);
        if (!(folder instanceof TFolder)) { return; }
        const folderNote = getFolderNote(plugin, folder.path);
        if (!folderNote) { return; }
        addCSSClassToTitleEL(folder.path, 'has-folder-note');
        addCSSClassToTitleEL(file.path, 'is-folder-note');
    }
    if (!plugin.app.workspace.layoutReady) return;

    if (!(file instanceof TFolder)) return;

    if (!plugin.settings.autoCreate) return;
    const excludedFolder = getExcludedFolder(plugin, file.path);
    if (excludedFolder?.disableAutoCreate) return;

    const folderNote = getFolderNote(plugin, file.path);
    if (folderNote) return;

    createFolderNote(plugin, file.path, true, undefined, true);
    addCSSClassToTitleEL(file.path, 'has-folder-note');
}