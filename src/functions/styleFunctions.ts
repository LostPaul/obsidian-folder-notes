import { TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { getFolderNote } from 'src/functions/folderNoteFunctions';
import { getFileExplorer } from './utils';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';

export function loadFileClasses(forceReload = false, plugin: FolderNotesPlugin) {
    if (plugin.activeFileExplorer === getFileExplorer() && !forceReload) { return; }
    plugin.activeFileExplorer = getFileExplorer();
    plugin.app.vault.getAllLoadedFiles().forEach((file) => {
        if (!(file instanceof TFolder)) { return; }
        const folderNote = getFolderNote(plugin, file.path);
        if (!folderNote) {
            removeCSSClassFromEL(file?.path, 'has-folder-note');
            removeCSSClassFromEL(file?.path, 'only-has-folder-note');
            return;
        }

        const excludedFolder = getExcludedFolder(plugin, file.path);
        // cleanup after ourselves
        // Incase settings have changed
        if (excludedFolder?.disableFolderNote) {
            removeCSSClassFromEL(folderNote.path, 'is-folder-note');
            removeCSSClassFromEL(file.path, 'has-folder-note');
            removeCSSClassFromEL(file?.path, 'only-has-folder-note');
        } else {
            addCSSClassToTitleEL(folderNote.path, 'is-folder-note');
            addCSSClassToTitleEL(file.path, 'has-folder-note');
            if (plugin.isEmptyFolderNoteFolder(file)) {
                addCSSClassToTitleEL(file.path, 'only-has-folder-note');
            } else {
                removeCSSClassFromEL(file.path, 'only-has-folder-note');
            }
        }
    });
}

export function applyCSSClassesToFolder(folderPath: string, plugin: FolderNotesPlugin) {
    const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
    if (!folder || !(folder instanceof TFolder)) { return; }
    const excludedFolder = getExcludedFolder(plugin, folder.path);
    if (excludedFolder?.disableFolderNote) {
        return;
    }
    const folderNote = getFolderNote(plugin, folder.path);
    if (!folderNote) { return; }
    addCSSClassesToBothFolderAndNote(folderNote, folder, plugin);
}

export function addCSSClassesToBothFolderAndNote(file: TFile, folder: TFolder, plugin: FolderNotesPlugin) {
    addCSSClassToFolderNote(file);
    addCSSClassesToFolder(folder, plugin);
}

export function removeCSSClassesFromBothFolderAndNote(folder: TFolder, file: TFile) {
    removeCSSClassFromFolderNote(file);
    removeCSSClassesFromFolder(folder);
}

export function addCSSClassesToFolder(folder: TFolder, plugin: FolderNotesPlugin) {
    addCSSClassToTitleEL(folder.path, 'has-folder-note');
    if (plugin.isEmptyFolderNoteFolder(folder)) {
        addCSSClassToTitleEL(folder.path, 'only-has-folder-note');
    } else {
        removeCSSClassFromEL(folder.path, 'only-has-folder-note');
    }
}

export function addCSSClassToFolderNote(file: TFile) {
    addCSSClassToTitleEL(file.path, 'is-folder-note');
}

export function removeCSSClassFromFolderNote(file: TFile) {
    removeCSSClassFromEL(file.path, 'is-folder-note');
}

export function removeCSSClassesFromFolder(folder: TFolder) {
    removeCSSClassFromEL(folder.path, 'has-folder-note');
    removeCSSClassFromEL(folder.path, 'only-has-folder-note');
}

export async function addCSSClassToTitleEL(path: string, cssClass: string, waitForCreate = false, count = 0) {
    const fileExplorerItem = getEl(path);
    if (!fileExplorerItem) {
        if (waitForCreate && count < 5) {
            // sleep for a second for the file-explorer event to catch up
            // this is annoying as in most scanarios our plugin recieves the event before file explorer
            // If we could guarrantee load order it wouldn't be an issue but we can't
            // realise this is racey and needs to be fixed.
            await new Promise((r) => setTimeout(r, 500));
            addCSSClassToTitleEL(path, cssClass, waitForCreate, count + 1);
            return;
        }
        return;
    }
    fileExplorerItem.addClass(cssClass);
    const viewHeaderItems = document.querySelectorAll(`[data-path="${path}"]`);
    viewHeaderItems.forEach((item) => {
        item.addClass(cssClass);
    });
}

export function removeCSSClassFromEL(path: string | undefined, cssClass: string) {
    if (!path) return;
    const fileExplorerItem = getEl(path);
    const viewHeaderItems = document.querySelectorAll(`[data-path="${path}"]`);
    viewHeaderItems.forEach((item) => {
        item.removeClass(cssClass);
    });
    if (!fileExplorerItem) { return; }
    fileExplorerItem.removeClass(cssClass);
}

export function getEl(path: string): HTMLElement | null {
    const fileExplorer = getFileExplorer();
    if (!fileExplorer) { return null; }
    const fileExplorerItem = fileExplorer.view.fileItems[path];
    if (!fileExplorerItem) { return null; }
    if (fileExplorerItem.selfEl) return fileExplorerItem.selfEl;
    return fileExplorerItem.titleEl;
}