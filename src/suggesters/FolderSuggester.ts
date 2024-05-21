// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes and https://github.com/SilentVoid13/Templater

import { TAbstractFile, TFolder } from 'obsidian';
import { TextInputSuggest } from './Suggest';
import FolderNotesPlugin from '../main';
export enum FileSuggestMode {
    TemplateFiles,
    ScriptFiles,
}

export class FolderSuggest extends TextInputSuggest<TFolder> {
	constructor(
        public inputEl: HTMLInputElement,
        private plugin: FolderNotesPlugin,
		private whitelistSuggester: boolean,
		public folder?: TFolder,
	) {
		super(inputEl);
	}


	get_error_msg(mode: FileSuggestMode): string {
		switch (mode) {
			case FileSuggestMode.TemplateFiles:
				return 'Templates folder doesn\'t exist';
			case FileSuggestMode.ScriptFiles:
				return 'User Scripts folder doesn\'t exist';
		}
	}

	getSuggestions(input_str: string): TFolder[] {
		const folders: TFolder[] = [];
		const lower_input_str = input_str.toLowerCase();
		let files: TAbstractFile[] = [];
		if (this.folder) {
			files = this.folder.children;
		} else {
			files = this.plugin.app.vault.getAllLoadedFiles();
		}
		files.forEach((folder: TAbstractFile) => {
			if (
				folder instanceof TFolder &&
                folder.path.toLowerCase().contains(lower_input_str) &&
                (!this.plugin.settings.excludeFolders.find((f) => f.path === folder.path) || this.whitelistSuggester) 
			) {
				folders.push(folder);
			}
		});

		return folders;
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.path;
		this.inputEl.trigger('input');
		this.close();
	}
}
