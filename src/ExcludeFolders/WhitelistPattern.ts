import FolderNotesPlugin from '../main';
export class WhitelistedPattern {
	type: string;
	string: string;
	path: string;
	position: number;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	allowAll: boolean;
    hideInSettings: boolean;
	constructor(pattern: string, position: number, plugin: FolderNotesPlugin) {
		this.type = 'pattern';
		this.subFolders = plugin.settings.excludePatternDefaultSettings.subFolders;
		this.position = position;
		this.string = pattern;
		this.path = '';
	}
}