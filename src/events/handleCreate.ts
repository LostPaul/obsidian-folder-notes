import { TAbstractFile, TFolder, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { createFolderNote, getFolder, getFolderNote } from 'src/functions/folderNoteFunctions';
import { getExcludedFolder } from 'src/ExcludeFolders/functions/folderFunctions';
import { removeCSSClassFromEL, addCSSClassToTitleEL } from 'src/functions/styleFunctions';

export async function handleCreate(file: TAbstractFile, plugin: FolderNotesPlugin) {
    if (!plugin.app.workspace.layoutReady) return;

    const folder = file.parent;
    if (folder instanceof TFolder) {
        if (plugin.isEmptyFolderNoteFolder(folder)) {
            addCSSClassToTitleEL(folder.path, 'only-has-folder-note');
        } else {
            removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

    if (file instanceof TFile) {
        handleFileCreation(file, plugin);
    } else if (file instanceof TFolder && plugin.settings.autoCreate) {
        handleFolderCreation(file, plugin);
    }
}

async function handleFileCreation(file: TFile, plugin: FolderNotesPlugin) {
    const folder = getFolder(plugin, file);
    if (!(folder instanceof TFolder)) { return; }
    const detachedFolder = await getExcludedFolder(plugin, folder.path, true);
    if (detachedFolder) { return; }
    const folderNote = getFolderNote(plugin, folder.path);

    if (folderNote && folderNote.path === file.path) {
        addCSSClassToTitleEL(folder.path, 'has-folder-note');
        addCSSClassToTitleEL(file.path, 'is-folder-note');
        return;
    }
}

async function handleFolderCreation(folder: TFolder, plugin: FolderNotesPlugin) {
    let openFile = plugin.settings.autoCreateFocusFiles;

    const attachmentFolderPath = plugin.app.vault.getConfig('attachmentFolderPath') as string;
    const cleanAttachmentFolderPath = attachmentFolderPath?.replace('./', '') || '';
    const attachmentsAreInRootFolder = attachmentFolderPath === './' || attachmentFolderPath === '';

    if (!plugin.settings.autoCreateForAttachmentFolder) {
        if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === folder.name) return;
    } else if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === folder.name) {
        openFile = false;
    }

    const excludedFolder = await getExcludedFolder(plugin, folder.path, true);
    if (excludedFolder?.disableAutoCreate) return;

    const folderNote = getFolderNote(plugin, folder.path);
    if (folderNote) return;

    createFolderNote(plugin, folder.path, openFile, undefined, true);
    addCSSClassToTitleEL(folder.path, 'has-folder-note');
}