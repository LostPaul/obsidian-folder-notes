import FolderNotesPlugin from '../main';
export class WhitelistedFolder {
	type: string;
	path: string;
	string: string;
	subFolders: boolean;
	enableSync: boolean;
	enableAutoCreate: boolean;
	enabledFolderNote: boolean;
	disableCollapsing: boolean;
	allowAll: boolean;
	position: number;
	constructor(path: string, position: number, plugin: FolderNotesPlugin) {
		this.type = 'folder';
		this.path = path;
		this.subFolders = plugin.settings.excludeFolderDefaultSettings.subFolders;
		this.position = position;
		this.string = '';
	}
}