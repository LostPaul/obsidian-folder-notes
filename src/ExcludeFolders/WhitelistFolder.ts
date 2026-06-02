import type FolderNotesPlugin from '../main';
export class WhitelistedFolder {
	type: string;
	id: string;
	path: string;
	string: string;
	subFolders: boolean;
	enableSync: boolean = false;
	enableAutoCreate: boolean = false;
	enableFolderNote: boolean = false;
	disableCollapsing: boolean = false;
	showInFolderOverview: boolean = false;
	hideInFileExplorer: boolean = false;
	position: number;
	hideInSettings: boolean = false;
	constructor(path: string, position: number, id: string | undefined, plugin: FolderNotesPlugin) {
		this.type = 'folder';
		this.id = id || crypto.randomUUID();
		this.path = path;
		this.subFolders = plugin.settings.excludeFolderDefaultSettings.subFolders;
		this.position = position;
		this.string = '';
	}
}
