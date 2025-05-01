import FolderNotesPlugin from '../main';
export class ExcludePattern {
	type: string;
	id: string;
	string: string;
	path: string;
	position: number;
	subFolders: boolean;
	disableSync: boolean;
	disableAutoCreate: boolean;
	disableFolderNote: boolean;
	enableCollapsing: boolean;
	excludeFromFolderOverview: boolean;
	hideInSettings: boolean;
	detached: boolean;
	detachedFilePath?: string;
	hideNote: boolean;
	constructor(pattern: string, position: number, id: string | undefined, plugin: FolderNotesPlugin) {
		this.type = 'pattern';
		this.id = id || crypto.randomUUID();
		this.string = pattern;
		this.position = position;
		this.subFolders = plugin.settings.excludePatternDefaultSettings.subFolders;
		this.disableSync = plugin.settings.excludePatternDefaultSettings.disableSync;
		this.disableAutoCreate = plugin.settings.excludePatternDefaultSettings.disableAutoCreate;
		this.disableFolderNote = plugin.settings.excludePatternDefaultSettings.disableFolderNote;
		this.enableCollapsing = plugin.settings.excludePatternDefaultSettings.enableCollapsing;
		this.excludeFromFolderOverview = plugin.settings.excludePatternDefaultSettings.excludeFromFolderOverview;
		this.path = '';
		this.hideInSettings = false;
	}
}
