import FolderNotesPlugin from 'src/main';
import { App, EditableFileView, TFile, TFolder } from 'obsidian';
import { getFolder, getFolderNote} from 'src/functions/folderNoteFunctions';
export class TabManager {
    plugin: FolderNotesPlugin;
    app: App;
    constructor(plugin: FolderNotesPlugin) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    resetTabs() {
        if (!this.isEnabled()) return;

        this.app.workspace.iterateAllLeaves((leaf) => {
            if (!(leaf.view instanceof EditableFileView)) return;
            const file = leaf.view?.file;
            if (!file) return;
            // @ts-ignore
            leaf.tabHeaderInnerTitleEl.setText(file.basename);
        });
    }

    updateTabs() {
        if (!this.isEnabled()) return;
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (!(leaf.view instanceof EditableFileView)) return;
            const file = leaf.view?.file;
            if (!file) return;
            const folder = getFolder(this.plugin, file);
            if (!folder) return;
            // @ts-ignore
            leaf.tabHeaderInnerTitleEl.setText(folder.name);
        });
    }

    updateTab(folderPath: string) {
        if (!this.isEnabled()) return;

        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!(folder instanceof TFolder)) return;

        const folderNote = getFolderNote(this.plugin, folder.path);
        if (!folderNote) return;
        
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (!(leaf.view instanceof EditableFileView)) return;
            const file = leaf.view?.file;
            if (!file) return;
            if (file.path === folderNote.path) {
                // @ts-ignore
                leaf.tabHeaderInnerTitleEl.setText(folder.name);
            }
        });
    }

    isEnabled() {
        if (this.plugin.settings.folderNoteName == '{{folder_name}}') return false;
        return this.plugin.settings.tabManagerEnabled;
    }
}