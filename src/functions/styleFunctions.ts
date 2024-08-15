import { TFile, TFolder } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { getFolderNote } from 'src/functions/folderNoteFunctions';
import { getFileExplorer } from './utils';

export function loadFileClasses(forceReload = false, plugin: FolderNotesPlugin) {
    if (plugin.activeFileExplorer === getFileExplorer() && !forceReload) { return; }
    plugin.activeFileExplorer = getFileExplorer();
    plugin.app.vault.getAllLoadedFiles().forEach(async (file) => {
        if (!(file instanceof TFolder)) { return; }
        const folderNote = getFolderNote(plugin, file.path);
        if (!folderNote) {
            removeCSSClassFromEL(file?.path, 'has-folder-note');
            removeCSSClassFromEL(file?.path, 'only-has-folder-note');
            plugin.isEmptyFolderNoteFolder(file)
            return;
        }

        const excludedFolder = await getExcludedFolder(plugin, file.path, true);
        // cleanup after ourselves
        // Incase settings have changed
        if (excludedFolder?.disableFolderNote) {
            removeCSSClassFromEL(folderNote.path, 'is-folder-note');
            removeCSSClassFromEL(file.path, 'has-folder-note');
            removeCSSClassFromEL(file?.path, 'only-has-folder-note');
        } else {
            console.log('excludedFolder?.hideNote', excludedFolder?.hideNote)
            if (!excludedFolder?.hideNote) {
                addCSSClassToTitleEL(plugin, folderNote.path, 'is-folder-note');
            }
            addCSSClassToTitleEL(plugin, file.path, 'has-folder-note');
            if (plugin.isEmptyFolderNoteFolder(file)) {
                addCSSClassToTitleEL(plugin, file.path, 'only-has-folder-note');
            } else {
                removeCSSClassFromEL(file.path, 'only-has-folder-note');
            }
        }
    });
}

// load classes of specific folder
export async function loadFolderClasses(forceReload = false, folder: TFolder, plugin: FolderNotesPlugin) {
    if (plugin.activeFileExplorer === getFileExplorer() && !forceReload) { return; }
    plugin.activeFileExplorer = getFileExplorer();

    const folderNote = getFolderNote(plugin, folder.path);
    if (!folderNote) {
        removeCSSClassFromEL(folder?.path, 'has-folder-note');
        removeCSSClassFromEL(folder?.path, 'only-has-folder-note');
        plugin.isEmptyFolderNoteFolder(folder)
        return;
    }

    const excludedFolder = await getExcludedFolder(plugin, folder.path, true);
    // cleanup after ourselves
    // Incase settings have changed
    if (excludedFolder?.disableFolderNote) {
        removeCSSClassFromEL(folderNote.path, 'is-folder-note');
        removeCSSClassFromEL(folder.path, 'has-folder-note');
        removeCSSClassFromEL(folder?.path, 'only-has-folder-note');
    } else {
        console.log('excludedFolder', excludedFolder)
        console.log('excludedFolder?.hideNote', excludedFolder?.hideNote)
        if (!excludedFolder?.hideNote) {
            console.log('what')
            addCSSClassToTitleEL(plugin, folderNote.path, 'is-folder-note');
        }
        addCSSClassToTitleEL(plugin, folder.path, 'has-folder-note');
        if (plugin.isEmptyFolderNoteFolder(folder)) {
            addCSSClassToTitleEL(plugin, folder.path, 'only-has-folder-note');
        } else {
            removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

}

export function addCSSClassesToBothFolderAndNote(file: TFile, folder: TFolder) {
    addCSSClassToFolderNote(file);
    addCSSClassesToFolder(folder);
}

export function removeCSSClassesFromBothFolderAndNote(folder: TFolder, file: TFile) {
    removeCSSClassFromFolderNote(file);
    removeCSSClassesFromFolder(folder);
}

export function addCSSClassesToFolder(folder: TFolder) {
    addCSSClassToTitleEL(undefined, folder.path, 'has-folder-note');
    if (this.isEmptyFolderNoteFolder(folder)) {
        addCSSClassToTitleEL(undefined, folder.path, 'only-has-folder-note');
    } else {
        removeCSSClassFromEL(folder.path, 'only-has-folder-note');
    }
}

export function addCSSClassToFolderNote(file: TFile) {
    addCSSClassToTitleEL(undefined, file.path, 'is-folder-note');
}

export function removeCSSClassFromFolderNote(file: TFile) {
    this.removeCSSClassFromEL(file.path, 'is-folder-note');
}

export function removeCSSClassesFromFolder(folder: TFolder) {
    this.removeCSSClassFromEL(folder.path, 'has-folder-note');
    this.removeCSSClassFromEL(folder.path, 'only-has-folder-note');
}

export async function addCSSClassToTitleEL(plugin: FolderNotesPlugin | undefined, path: string, cssClass: string, waitForCreate = false, count = 0) {
    const fileExplorerItem = getEl(path)
    if (!fileExplorerItem) {
        if (waitForCreate && count < 5) {
            // sleep for a second for the file-explorer event to catch up
            // this is annoying as in most scanarios our plugin recieves the event before file explorer
            // If we could guarrantee load order it wouldn't be an issue but we can't
            // realise this is racey and needs to be fixed.
            await new Promise((r) => setTimeout(r, 500));
            addCSSClassToTitleEL(plugin, path, cssClass, waitForCreate, count + 1);
            return;
        }
        return;
    }
    
    const dragManager = plugin?.app.dragManager;
    fileExplorerItem.addClass(cssClass);
    if (cssClass === 'has-folder-note') {
        fileExplorerItem.addEventListener('dragstart', (e) => {
            if (!plugin) return;
            const folderNote = getFolderNote(plugin, path);
            if (folderNote) {
                const dragData = dragManager?.dragFile(e, folderNote);
                // @ts-ignore
                dragManager?.onDragStart(e, dragData);
            }
        });
    }

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