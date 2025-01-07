import { FuzzySuggestModal, Notice, TFile } from 'obsidian';
import FolderNotesPlugin from 'src/main';
import { createFolderNote } from 'src/functions/folderNoteFunctions';
export class AskForExtensionModal extends FuzzySuggestModal<string> {
    plugin: FolderNotesPlugin
    extension: string
    folderPath: string;
    openFile: boolean;
    useModal: boolean | undefined;
    existingNote: TFile | undefined;
    constructor(plugin: FolderNotesPlugin, folderPath: string, openFile: boolean, extension: string, useModal?: boolean, existingNote?: TFile) {
        super(plugin.app);
        this.plugin = plugin;
        this.folderPath = folderPath;
        this.extension = extension;
        this.openFile = openFile;
        this.useModal = useModal;
        this.existingNote = existingNote;
    }
    
    getItems(): string[] {
        return this.plugin.settings.supportedFileTypes.filter((item) => item.toLowerCase() !== '.ask');
    }

    getItemText(item: string): string {
        return item;
    }

    onChooseItem(item: string, evt: MouseEvent | KeyboardEvent) {
        this.extension = '.' + item;
        createFolderNote(this.plugin, this.folderPath, this.openFile, this.extension, this.useModal, this.existingNote);
        this.close();
    }
}