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
            addCSSClassToTitleEL(plugin, folder.path, 'only-has-folder-note');
        } else {
            removeCSSClassFromEL(folder.path, 'only-has-folder-note');
        }
    }

    if (file instanceof TFile) {
        const folder = getFolder(plugin, file);
        if (!(folder instanceof TFolder)) { return; }
        const folderNote = getFolderNote(plugin, folder.path);

        if (folderNote && folderNote.path === file.path) {
            addCSSClassToTitleEL(plugin, folder.path, 'has-folder-note');
            addCSSClassToTitleEL(plugin, file.path, 'is-folder-note');
            return;
        }

    }
    if (!plugin.app.workspace.layoutReady) return;

    if (!(file instanceof TFolder)) return;

    if (!plugin.settings.autoCreate) return;
    let openFile = plugin.settings.autoCreateFocusFiles;

    const attachmentFolderPath = plugin.app.vault.getConfig('attachmentFolderPath') as string;
    const cleanAttachmentFolderPath = attachmentFolderPath?.replace('./', '') || '';
    const attachmentsAreInRootFolder = attachmentFolderPath === './' || attachmentFolderPath === '';

    if (!plugin.settings.autoCreateForAttachmentFolder) {
        if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === file.name) return;
    } else if (!attachmentsAreInRootFolder && cleanAttachmentFolderPath === file.name) {
        openFile = false;
    }

    const excludedFolder = await getExcludedFolder(plugin, file.path, true);
    if (excludedFolder?.disableAutoCreate) return;

    const folderNote = getFolderNote(plugin, file.path);
    if (folderNote) return;

    createFolderNote(plugin, file.path, openFile, undefined, true);
    addCSSClassToTitleEL(plugin, file.path, 'has-folder-note');
}