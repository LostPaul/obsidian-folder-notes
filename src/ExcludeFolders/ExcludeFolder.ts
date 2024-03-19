import FolderNotesPlugin from '../main';
export class ExcludedFolder {
	type: string;
	path: string;
	string: string;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	position: number;
	excludeFromFolderOverview: boolean;
    hideInSettings: boolean;
	constructor(path: string, position: number, plugin: FolderNotesPlugin) {
		this.type = 'folder';
		this.path = path;
		this.subFolders = plugin.settings.excludeFolderDefaultSettings.subFolders;
		this.disableSync = plugin.settings.excludeFolderDefaultSettings.disableSync;
		this.disableAutoCreate = plugin.settings.excludeFolderDefaultSettings.disableAutoCreate;
		this.disableFolderNote = plugin.settings.excludeFolderDefaultSettings.disableFolderNote;
		this.enableCollapsing = plugin.settings.excludeFolderDefaultSettings.enableCollapsing;
		this.position = position;
		this.excludeFromFolderOverview = plugin.settings.excludeFolderDefaultSettings.excludeFromFolderOverview;
		this.string = '';
        this.hideInSettings = false;
	}
}