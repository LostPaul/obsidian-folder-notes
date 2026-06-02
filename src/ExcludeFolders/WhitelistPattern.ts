import type FolderNotesPlugin from '../main';
export class WhitelistedPattern {
	type: string;
	id: string;
	string: string;
	path: string;
	position: number;
	subFolders: boolean;
	enableSync: boolean = false;
	enableAutoCreate: boolean = false;
	enableFolderNote: boolean = false;
	disableCollapsing: boolean = false;
	showInFolderOverview: boolean = false;
	hideInFileExplorer: boolean = false;
	hideInSettings: boolean = false;
	constructor(
		pattern: string,
		position: number,
		id: string | undefined,
		plugin: FolderNotesPlugin,
	) {
		this.type = 'pattern';
		this.id = id || crypto.randomUUID();
		this.subFolders = plugin.settings.excludePatternDefaultSettings.subFolders;
		this.position = position;
		this.string = pattern;
		this.path = '';
	}
}
