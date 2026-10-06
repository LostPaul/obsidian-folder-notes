import type FolderNotesPlugin from '../main';
import { generateId } from '../functions/generateId';
export class ExcludedFolder {
	type: string;
	id: string;
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
	detached: boolean = false;
	detachedFilePath?: string;
	showFolderNote: boolean;
	constructor(path: string, position: number, id: string | undefined, plugin: FolderNotesPlugin) {
		this.type = 'folder';
		this.id = id || generateId();
		this.path = path;
		this.subFolders = plugin.settings.excludeFolderDefaultSettings.subFolders;
		this.disableSync = plugin.settings.excludeFolderDefaultSettings.disableSync;
		this.disableAutoCreate = plugin.settings.excludeFolderDefaultSettings.disableAutoCreate;
		this.disableFolderNote = plugin.settings.excludeFolderDefaultSettings.disableFolderNote;
		this.enableCollapsing = plugin.settings.excludeFolderDefaultSettings.enableCollapsing;
		this.position = position;
		// eslint-disable-next-line max-len
		this.excludeFromFolderOverview = plugin.settings.excludeFolderDefaultSettings.excludeFromFolderOverview;
		this.string = '';
		this.hideInSettings = false;
		this.showFolderNote = plugin.settings.excludeFolderDefaultSettings.showFolderNote;
	}
}
