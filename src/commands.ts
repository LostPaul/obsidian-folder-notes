import { App } from 'obsidian';
import FolderNotesPlugin from './main';
export class Commands {
    plugin: FolderNotesPlugin;
    app: App;
    constructor(app: App, plugin: FolderNotesPlugin) {
        this.plugin = plugin;
        this.app = app;
    }
    registerCommands() {
    }
}