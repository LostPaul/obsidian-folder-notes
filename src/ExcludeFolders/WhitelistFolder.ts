import FolderNotesPlugin from '../main';
export class WhitelistedFolder {
	type: string;
	id: string;
	path: string;
	string: string;
	subFolders: boolean;
	enableSync: boolean;
	enableAutoCreate: boolean;
	enableFolderNote: boolean;
	enableCollapsing: boolean;
	showInFolderOverview: boolean;
	position: number;
	hideInSettings: boolean;
	constructor(path: string, position: number, id: string | undefined, plugin: FolderNotesPlugin) {
		this.type = 'folder';
		this.id = id || crypto.randomUUID();
		this.path = path;
		this.subFolders = plugin.settings.excludeFolderDefaultSettings.subFolders;
		this.position = position;
		this.string = '';
	}
}